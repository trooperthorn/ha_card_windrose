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

## 2026-09-08: #108 (independent averaging window) implemented, #127 (templated period_back) documented instead

`average_period_back` on a `windspeed_entities` item adds a second,
independent HA fetch (`HAMeasurementProvider.getAveragingSpeed`) for that
entity's own average over its own window, run in parallel with the normal
display-period fetch in `WindRoseDirigent.refreshData()`. It computes a
plain average of the entity's raw values; direction matching is not needed
just to pick a `dynamic_speed_ranges` bucket. When unset (every existing
config), `dynamicRangeAverages[i]` is `undefined` and the code falls back to
`matchedGroups[i].getAverageSpeed()`, exactly the prior behavior.

#127 (drive `period_back` from an entity like an `input_number`) was not
given the same treatment. `Period.calculateTimeRange()` runs synchronously
and has no access to `hass`; the two places in this codebase that do read
live entity values (`corner_info`, `text_blocks`) go through
`EntityStatesProcessor`, which is populated during `entityStateProcessor.init()`
and updated on every `hass` set. Wiring `period_back` the same way means
extending that processor's entity discovery and `EntityChecker`'s
validation, not just adding a config field, a materially larger change than
anything else in this phase. `config-template-card` (thomasloven's card,
already in wide HACS use) achieves the same result today with zero native
code, by templating the whole card config with Jinja before windrose-card
ever sees it. Given a proven, general workaround already exists, native
support was left undone rather than half-built.

## 2026-09-08: Phase 7 (units-decoupling refactor) and Phase 9 (new visualization cards) not built, checked against Sean's real dashboards

Before starting these two phases, checked `~/workspace/ha-dashboards`
(Overview, Mobile, and the shared `weather_station.yaml`, plus
`docs/card_recommendations.md` and `docs/installed_inventory.md`) for
evidence they solve a real problem, per Sean's request to verify against his
dashboards before applying. They do not:

- **#180 (lightning as azimuth+distance)**: Sean has real Blitzortung
  sensors (`geo_location.lightning_strike_*`, distance/count/energy). His
  own dashboard work already addressed this: `docs/card_recommendations.md`
  recommends (and the live config uses) `show_lightning` /
  `lightning_max_age_minutes` on the `weather-radar-card` already installed,
  explicitly reasoned there as richer than a text/glance display would be.
  That is a considered, working answer to the same need #180 describes,
  built on a card meant for spatial overlays rather than windrose-card's
  circular one-axis-per-corner layout.
- **#80 (standalone compass card)**: `custom:compass-card` was previously in
  Sean's Mobile Climate view and was removed. `card_recommendations.md`
  states plainly it "duplicate[s] the windrose card." #80 asks for exactly
  that card.
- **#90's moon half**: Sean already shows moon phase, moonrise, and moonset
  through a dedicated astro card, not windrose-card. Home Assistant's `moon`
  integration also has no azimuth/elevation to plot (only a phase enum,
  confirmed by reading `homeassistant/components/moon/sensor.py` in
  `ha-core-reference`), so there would be nothing to feed an overlay even if
  one were wanted. The sun half of #90 is unaffected by this and stays in
  Phase 6.
- **#160 (non-wind data) and #91/#156 (timeline, heatmap)**: no reference to
  any of these anywhere in Sean's dashboards. The only windrose-card usage
  across all three dashboard files is the one real Davis Vantage weather
  station, showing actual wind data.

Since #180 and #160 were the refactor's only justification, and both are
answered by evidence rather than by design preference, Phase 7 does not get
built either: it would be infrastructure for consumers that do not exist,
carrying real risk against the one live, working card
(`weather_station.yaml`'s `card_mod` block selects the card's SVG output
directly with generic selectors -- `circle + text`, `g > text, rect + text`,
`svg { overflow: visible; }` -- so a broad renderer refactor is exactly the
kind of change that could quietly break it for no benefit).

This is recorded as a decision, not a silent skip: the backlog documents the
issues as "not building" with this reasoning rather than leaving them
unaddressed with no explanation.

## 2026-09-08: Phase 6 -- #90 sun overlay built, #171 already covered by an existing feature

`sun_position` adds an optional marker at the rose's rim, rotated to the
value of an entity's azimuth attribute (`sun.sun`'s `azimuth` by default).
It reuses the exact rotation mechanism `CurrentDirectionRenderer` already
uses for the current-wind-direction arrow: an independently-drawn element,
rotated via an SVG `transform` to a pre-computed angle that already bakes in
`rose_config.windrose_draw_north_offset` and any `compass_direction.auto_rotate`
rotation, computed by `DegreesCalculator` the same way `windDirectionRenderDegrees`
already is. Reading the live entity value goes through `EntityStatesProcessor`,
the same mechanism `corner_info`/`text_blocks`/`compass_direction` use, so
`sun_position` picks up hass updates the same way those do.

`#171` (named directional arcs, e.g. paragliding launch-site headings) turned
out not to need new code. The upstream maintainer's own reply on the ticket
suggests "a specific background image could add the information" -- and this
card has supported `rose_config.background_image` since v1.25.0. A user can
already draw named arcs into a static image and set it as the rose's
background. A dynamic version (config-driven arcs with live labels and
colors) would need a real SVG arc-drawing subsystem duplicated across both
rose renderer variants (`WindRoseRendererStandaard` and
`WindRoseRendererCenterCalm`), plus counter-rotation for the labels the same
way `windDirectionTextGroup`'s children get counter-rotated in
`rotateWindRose()`, for a single requester the maintainer already pointed at
an existing answer. Not built; documented instead.
