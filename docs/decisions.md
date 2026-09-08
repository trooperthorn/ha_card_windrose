# Decisions

Dated decisions for this fork, with the alternative considered and why.

## 2026-09-08: dashboard "lit-element deprecated import" warning is not this card's bug

Sean reported a browser console warning on his dashboard:

```
The main 'lit-element' module entrypoint is deprecated. Please update your
imports to use the 'lit' package...
```

with a stack trace naming `config-template-card`, and a preceding log line
`WINDROSE-CARD Version 2.7.0`.

Investigated by grepping this repository for `lit-element` (case-sensitive,
all tracked files except `package-lock.json`). No source file imports from
the deprecated `lit-element` entrypoint. [`src/card/WindRoseCard.ts`](../src/card/WindRoseCard.ts)
imports from `"lit"` and `"lit/decorators.js"`, which is the current,
non-deprecated path. The `WINDROSE-CARD Version 2.7.0` line the same console
capture shows is this card's own `console.info` banner (every custom Lovelace
card prints one on load); it is unrelated to the warning that follows it in
the log, which the browser attributes to a different card entirely
(`config-template-card`, by Thomas Lovén, a separate HACS resource).

`lit-element` does appear once in `package-lock.json` as a transitive
dependency (the `lit` meta-package depends on `lit-element@^4.2.0`
internally). That is expected and not evidence of a deprecated import in
this card's own code; `lit-element` is not imported anywhere the bundler
would pull user-facing code from it.

Conclusion: no change needed in this repository. The warning should be
reported against `thomasloven/lovelace-config-template-card` (or resolved by
updating that card, if a newer release already fixes it), not here.

## 2026-09-08: baseline gate state before the phased backlog work

Recorded before starting [backlog.md](backlog.md)'s phased plan, so later
readers can tell a pre-existing issue from a regression.

- `npm run lint` did not run at all: ESLint 9.39.4 requires `eslint.config.js`
  (flat config) and the repo only shipped the legacy `.eslintrc.js`. Replaced
  it with [`eslint.config.js`](../eslint.config.js), carrying forward the same
  `eslint:recommended` plus `@typescript-eslint/recommended` rule sets and
  adding explicit browser/node/jest globals (the legacy config declared no
  `env`, so `no-undef` would have flagged `console`, `window`, `document`,
  and similar even had it run). With globals fixed, lint reports 98
  pre-existing errors across files this pass does not touch (`no-explicit-any`
  in the util/Log helpers and `HomeAssistant.ts` type shims, a stray
  `require()` in a test, `no-case-declarations` in `PresetPeriodHelper.ts`,
  one unused parameter). These predate this pass; fixing them is a separate,
  unscoped cleanup, not part of the phased backlog plan. Deleted
  `.eslintignore` (flat config's `ignores` array replaces it).
- `npx jest` (the `test` script itself is a placeholder that always fails;
  `npx jest` is the real entry point) reports 5 pre-existing failures, all in
  `src/matcher/strategy/FullTimeMatcher.test.ts`. Unrelated to any phase in
  the backlog; not investigated further here.
- `npm run typecheck` passes clean.

## 2026-09-08: #226 ("data_period from_date/to_date not possible") is not a missing feature

`from_date` / `to_date` (a fixed absolute date range for `data_period`) were
already released in v2.6.0 (2026-08-23, `git log -1 --format=%cd -- src/config/buttons/Period.ts`)
and are documented in the README's `data_period` table. The upstream issue
was filed 2026-08-31, after that release, so the feature existed when it was
reported.

The reporter's config used `from_date: "2026-01-01Z00:00:00"` — missing the
`T` date/time separator required by ISO 8601 (`Z` sits where `T` belongs).
[`ConfigCheckUtils.checkDateString`](../src/config/ConfigCheckUtils.ts)
validated this by handing the raw string to the browser's native `new
Date(string)` and checking for `NaN`. That parsing is only standardized for
conformant ISO 8601 strings; for a malformed string like this one it is
implementation-defined, confirmed with `node -e "new Date('2026-01-01Z00:00:00').getTime()"`,
which returns a valid (wrong) timestamp in V8 rather than `NaN` -- other
engines are free to reject the same string, which would explain a report
that varies by browser and is hard for the upstream maintainer to reproduce
from a single test.

Fix: `checkDateString` now validates against an explicit ISO 8601 regex
(date-only, or date+`T`+time with optional fractional seconds and an
optional `Z`/offset) before falling back to `new Date()` for the actual
parse, so a malformed string like the reporter's is rejected consistently
with a clear `from_date not in correct ISO format` error instead of parsing
inconsistently per engine. The regex existed already, commented out in the
source with no explanation for why; re-enabling it (broadened slightly to
also accept a bare date, which the README already documents as valid) closes
the gap without narrowing what already worked.

No new config surface was added; this is a validation-correctness fix.

## 2026-09-08: #225 (text_block variables only work for the first windspeed_entities) and a pre-existing min-speed bug found while fixing it

[`WindRoseDirigent.refreshData()`](../src/renderer/WindRoseDirigent.ts) called
`templateParser.addMatchedValues(matchedGroups[activeSpeedEntityIndex])` for
only the active windspeed entity, so `${max-speed}`, `${min-speed}`,
`${average-speed}`, `${wind-description}`, and the percentile variables were
never available for a second or third `windspeed_entities` entry, matching
Sean's real dashboard config in `weather_station.yaml`, which has two
(`Station Windspeed` and `Average Gust Speed`).

Fixed by calling `addMatchedValues` for every entity, each under an index
suffix (`-0`, `-1`, ...), in addition to the existing unsuffixed call for the
active entity (unchanged, so `${max-speed}` keeps meaning "the active
entity" exactly as before). A text_block can now reference
`${max-speed-1}` for the second windspeed entity's gust maximum, for example.

Also added `min-speed-time`/`min-speed-direction` and
`max-speed-time`/`max-speed-direction` (each entity-suffixed too), covering
the second half of #225: pairing the min/max with when and from which
direction it occurred. This required
[`MatchedMeasurements`](../src/matcher/MatchedMeasurements.ts) to actually
track which measurement produced the min/max, which it did not do before.

While adding that tracking, found `minSpeed` was effectively always `0`:
it started at `0` and only updated on `speed < this.minSpeed`, which a
positive wind speed never satisfies on the first measurement, so `${min-speed}`
has always evaluated to `0` for any real (non-negative) speed sensor. Fixed
by seeding `minSpeed`/`maxSpeed` (and the new time/direction fields) from
the first measurement instead of a literal `0`. This changes `${min-speed}`'s
value for existing configs that use it (from always-0 to the actual
minimum); flagged here explicitly since it is a behavior change, not just an
additive one.
