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
