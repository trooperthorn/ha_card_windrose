# Backlog: upstream open issues

This fork tracks `aukedejong/lovelace-windrose-card` as `upstream`. As of
2026-09-08 the fork is at the same commit as upstream (`b1ef471`, tag
`v2.7.0`), zero commits ahead or behind. This document triages the 23 issues
open on the upstream tracker at that date so a future pass can pick items
without re-reading every issue. Nothing in this list has been implemented
yet; this is triage only, done at Sean's request (2026-09-08) to avoid
committing to 20+ undesigned features in one pass.

House rule: never open issues, pull requests, or comments on the upstream
repository. Work here happens only in this fork.

Columns: **Effort** is a rough size for implementing in this fork
(S = config/rendering tweak, M = new rendering path or config surface,
L = new card mode or substantial rework). **Risk** flags anything that
depends on behavior nobody has been able to pin down.

## Confirmed bug

| # | Title | Effort | Notes |
| --- | --- | --- | --- |
| [117](https://github.com/aukedejong/lovelace-windrose-card/issues/117) | Re-entering Home Assistant scrolls the dashboard to top (iOS) | Risk | Open since 2024-12-27, 10 comments. The upstream maintainer reproduced it but could not find a root cause after multiple attempts, including a dependency bump that did not help. No fix on the ticket, no discussion of what triggers it (a `requestUpdate()` side effect during `connectedCallback`, a scroll-into-view call, focus handling, something else). Not something to speculatively patch without an iOS device to verify against; needs live reproduction before any fix attempt is credible. |

## Config-surface additions (small, self-contained)

| # | Title | Effort | Status |
| --- | --- | --- | --- |
| [201](https://github.com/aukedejong/lovelace-windrose-card/issues/201) | Set card height explicitly, plus vertical content alignment | S | Done: `card_height` and `content_align` config, see [operations.md](operations.md). |
| [207](https://github.com/aukedejong/lovelace-windrose-card/issues/207) | Hide or relabel a corner value when its source entity is `unknown` | S | Done: `unknown_value` and `hide_when_unknown` on `corner_info` entries. |
| [211](https://github.com/aukedejong/lovelace-windrose-card/issues/211) | Reposition or reformat corner values that have no label | S/M | Done: when `label` is left out, the value now renders at the label's position instead of leaving a gap above it. |
| [165](https://github.com/aukedejong/lovelace-windrose-card/issues/165) | Color `corner_info` values by value range (reuse `speed_ranges` pattern) | S/M | Done: `value_colors` on `corner_info` entries, same `{from_value, color}` shape as `speed_ranges`. |
| [127](https://github.com/aukedejong/lovelace-windrose-card/issues/127) | Drive `hours_to_show` from a template/helper (e.g. `input_number`) instead of a static number | S/M | Deferred to the data-period phase; see below. |

## Rendering / data-pipeline features (medium)

| # | Title | Effort | Notes |
| --- | --- | --- | --- |
| [226](https://github.com/aukedejong/lovelace-windrose-card/issues/226) | `data_period.from_date` / `to_date` (fixed range) not accepted | S | Done, and not what it looked like: `from_date`/`to_date` already shipped in v2.6.0, before the issue was filed. The reporter's date string was missing the ISO `T` separator; `new Date()` parses that leniently in some engines and rejects it in others. Fixed by validating against an explicit ISO 8601 regex before parsing, see [decisions.md](decisions.md). No schema change needed. |
| [225](https://github.com/aukedejong/lovelace-windrose-card/issues/225) | Text-block variables (`{max-speed}` etc.) only resolve for the first `windspeed_entities` entry | M | Done: every matched group now feeds index-suffixed variables (`max-speed-1`, etc.) alongside the existing unsuffixed active-entity ones, plus new `min-speed-time`/`min-speed-direction`/`max-speed-time`/`max-speed-direction`. Found and fixed a pre-existing bug in the process: `minSpeed` was hardcoded to start at 0 and so was always 0 for any non-negative speed sensor; see [decisions.md](decisions.md). |
| [193](https://github.com/aukedejong/lovelace-windrose-card/issues/193) | Wind speed bar: label overlap at small percentages, inconsistent bar-width scaling | M | 11 comments, so likely has upstream discussion narrowing the actual scaling bug. Read the full thread before touching the renderer; this may be two separate issues (a CSS/collision-detection fix and a real scaling bug). |
| [108](https://github.com/aukedejong/lovelace-windrose-card/issues/108) | Separate time window for the averaging used by dynamic speed-range colors vs. the rose's own period | M | Adds a second, independent `hours_for_average`-style window alongside `hours_to_show`. Config and calculation both need the extra parameter threaded through. |
| [125](https://github.com/aukedejong/lovelace-windrose-card/issues/125) | Additional info block above/below the rose (mirrors `corner_info` structure) | - | Already supported, no code change needed: `text_blocks.top` / `text_blocks.bottom` render an HTML block above/below the rose with `${...}` template placeholders, including `${min-speed}`, `${max-speed}`, `${average-speed}`, `${wind-description}` (a computed natural-language summary), and any `${entity.attribute}` or `${entity}` reference. Confirmed by reading `src/textblocks/TemplateParser.ts`. The requester filed this before checking, or before `text_blocks` existed; no upstream response on the ticket. Nothing to build. |
| [46](https://github.com/aukedejong/lovelace-windrose-card/issues/46) | Plot `weather.*` forecast data (future), not just historical statistics | M/L | Different data source entirely (forecast service call vs. statistics API), so this is closer to a parallel data pipeline than a tweak to the existing one. |
| [90](https://github.com/aukedejong/lovelace-windrose-card/issues/90) | Overlay sun/moon position on the rose | M | Home Assistant already exposes `sun.sun` with azimuth/elevation attributes; feasible as an optional overlay layer using the existing angular-plot machinery. Moon tracking would need an external ephemeris source since core has no moon-position entity (unverified whether one exists in the current core tree; check before promising it). |
| [171](https://github.com/aukedejong/lovelace-windrose-card/issues/171) | Named directional arcs (e.g. paragliding launch-site headings) | M | Requester already published a rough working hack in the issue thread. Real feature: an array of labeled angular ranges drawn as arcs/bands on the rose. |
| [156](https://github.com/aukedejong/lovelace-windrose-card/issues/156) | Heatmap mode for direction/speed | M/L | Different visualization mode from the current rose; needs its own rendering path, not a variant of the existing one. |

## New card / alternate visualization (large, likely out of scope for this fork)

| # | Title | Effort | Notes |
| --- | --- | --- | --- |
| [160](https://github.com/aukedejong/lovelace-windrose-card/issues/160) | Repurpose the rose for non-wind data (air quality, etc.) | L | Would mean decoupling the renderer from wind-specific units and labels throughout. Large refactor for a use case this fork does not need. |
| [91](https://github.com/aukedejong/lovelace-windrose-card/issues/91) | New card: direction-over-time line/timeline graph | L | Explicitly a different chart type ("new card request" label), not a windrose variant. |
| [80](https://github.com/aukedejong/lovelace-windrose-card/issues/80) | New card: standalone rotating compass/heading indicator | L | Also filed as "new card request." Shares some math (angle-to-screen projection) with the rose but is a different UI. |
| [180](https://github.com/aukedejong/lovelace-windrose-card/issues/180) | Lightning strikes (azimuth + distance) plotted like wind data | L | Reporter is already "abusing" the existing wind-speed axis to encode distance, i.e. no native support. A clean implementation needs a distance axis separate from the speed-range axis, which touches the same units-coupling problem as #160. |

## Interaction / UX ideas (unscoped)

| # | Title | Effort | Notes |
| --- | --- | --- | --- |
| [166](https://github.com/aukedejong/lovelace-windrose-card/issues/166) | Grab-bag: sections-dashboard row snapping, hover/tap highlighting between rose segments and speed-bar steps | M | Multiple distinct ideas in one issue; would need to be split into separate, individually scoped changes before implementation. |

## Not actionable as code changes

| # | Title | Why |
| --- | --- | --- |
| [179](https://github.com/aukedejong/lovelace-windrose-card/issues/179) | "Just a big THANK YOU for 2.0.0" | Appreciation post, no request. |
| [96](https://github.com/aukedejong/lovelace-windrose-card/issues/96) | Questions about `matching_strategy` | Support thread (35 comments), not a feature or bug report. |
| [51](https://github.com/aukedejong/lovelace-windrose-card/issues/51) | Firefox/Android custom-element registration error | `Failed to execute 'define' on 'CustomElementRegistry'` is almost always a double-load of the card resource (two dashboard resource entries, or a cached + live copy both registering `windrose-card`), not a defect in the card itself. Worth a one-line troubleshooting note in `docs/operations.md` if Sean ever hits it, not a code fix. |

## Suggested next pass, if Sean wants to proceed

Highest ratio of value to risk, in order: #207 (hide/relabel unknown corner
values), #165 (color corner values by range, config shape already sketched
by the requester), #201 (card height + alignment), #125 (top/bottom info
block reusing the `corner_info` shape). All four are additive config options
that do not touch the existing rendering paths for users who do not set
them, and each has enough detail in its issue thread to scope without
upstream clarification.
