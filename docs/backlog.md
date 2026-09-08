# Backlog: upstream open issues

This fork tracks `aukedejong/lovelace-windrose-card` as `upstream`. As of
2026-09-08 the fork is at the same commit as upstream (`b1ef471`, tag
`v2.7.0`), zero commits ahead or behind. This document triages the 23 issues
open on the upstream tracker at that date.

House rule: never open issues, pull requests, or comments on the upstream
repository. Work here happens only in this fork.

## Phase status (2026-09-08)

| Phase | Covers | Status |
| --- | --- | --- |
| 0 | Investigation: #193 thread, #127 workaround check, moon-entity check, #166 split | Done |
| 1 | #201 (card_height/content_align), #51 (docs) | Done |
| 2 | #207, #165, #211 (corner_info), #125 (already covered, no code) | Done |
| 3 | #226 (real bug found, fixed), #225, #108, #127 (documented instead) | Done |
| 4 | Folded into phase 3 (#225) | Done |
| 5 | #193 (wind speed bar) | Not started: needs the full thread read (done in phase 0) plus a UX decision upstream itself hasn't settled on; not attempting a novel design here. |
| 6 | #90 sun half (done); #171 already covered by existing `background_image`, no code needed | Done |
| 7 | Units-decoupling refactor | Not building. Checked against Sean's real dashboards (`~/workspace/ha-dashboards`): no non-wind use of this card exists, and its only justification (#160, #180) is rejected below. |
| 8 | #180 (lightning), #160 (non-wind data): not building, see table below. #46 (forecast data): verified feasible (real `weather.get_forecasts` service), needs a new provider pipeline, deferred rather than rushed. | Mixed |
| 9 | #156 (heatmap), #91 (timeline), #80 (compass), #90 moon half | Not building, see the table below. |
| extra | #166a (row snapping): unverified frontend API, not built. #166b (hover cross-highlight): feasible, scoped, deferred, see table below. | Investigated |
| ongoing | #117 (iOS scroll bug) | Blocked: no iOS device to reproduce against. |

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
| [127](https://github.com/aukedejong/lovelace-windrose-card/issues/127) | Drive `hours_to_show` from a template/helper (e.g. `input_number`) instead of a static number | - | Not implemented natively; documented workaround instead, see docs/decisions.md. `period_back` is read synchronously (`Period.calculateTimeRange()`), before `hass` is available in that code path, unlike `corner_info`/`text_blocks` entities which go through `EntityStatesProcessor`. Wiring a live entity through would mean extending that processor and its entity-discovery/validation path (`EntityChecker`), a materially bigger change than the config-only fixes in this phase. `config-template-card` (a separate, general-purpose HACS card that templates any card's entire config with Jinja) already does this today for any card, windrose-card included, with no native support needed. |

## Rendering / data-pipeline features (medium)

| # | Title | Effort | Notes |
| --- | --- | --- | --- |
| [226](https://github.com/aukedejong/lovelace-windrose-card/issues/226) | `data_period.from_date` / `to_date` (fixed range) not accepted | S | Done, and not what it looked like: `from_date`/`to_date` already shipped in v2.6.0, before the issue was filed. The reporter's date string was missing the ISO `T` separator; `new Date()` parses that leniently in some engines and rejects it in others. Fixed by validating against an explicit ISO 8601 regex before parsing, see [decisions.md](decisions.md). No schema change needed. |
| [225](https://github.com/aukedejong/lovelace-windrose-card/issues/225) | Text-block variables (`{max-speed}` etc.) only resolve for the first `windspeed_entities` entry | M | Done: every matched group now feeds index-suffixed variables (`max-speed-1`, etc.) alongside the existing unsuffixed active-entity ones, plus new `min-speed-time`/`min-speed-direction`/`max-speed-time`/`max-speed-direction`. Found and fixed a pre-existing bug in the process: `minSpeed` was hardcoded to start at 0 and so was always 0 for any non-negative speed sensor; see [decisions.md](decisions.md). |
| [193](https://github.com/aukedejong/lovelace-windrose-card/issues/193) | Wind speed bar: label overlap at small percentages, inconsistent bar-width scaling | M | 11 comments, so likely has upstream discussion narrowing the actual scaling bug. Read the full thread before touching the renderer; this may be two separate issues (a CSS/collision-detection fix and a real scaling bug). |
| [108](https://github.com/aukedejong/lovelace-windrose-card/issues/108) | Separate time window for the averaging used by dynamic speed-range colors vs. the rose's own period | M | Done: `average_period_back` on a `windspeed_entities` item (requires `dynamic_speed_ranges`). Fetches that entity's own raw average over an independent window, in parallel with the normal display-period fetch; falls back to the existing average-of-the-display-period behavior when unset. See docs/decisions.md. |
| [125](https://github.com/aukedejong/lovelace-windrose-card/issues/125) | Additional info block above/below the rose (mirrors `corner_info` structure) | - | Already supported, no code change needed: `text_blocks.top` / `text_blocks.bottom` render an HTML block above/below the rose with `${...}` template placeholders, including `${min-speed}`, `${max-speed}`, `${average-speed}`, `${wind-description}` (a computed natural-language summary), and any `${entity.attribute}` or `${entity}` reference. Confirmed by reading `src/textblocks/TemplateParser.ts`. The requester filed this before checking, or before `text_blocks` existed; no upstream response on the ticket. Nothing to build. |
| [46](https://github.com/aukedejong/lovelace-windrose-card/issues/46) | Plot `weather.*` forecast data (future), not just historical statistics | M/L | Verified feasible, not built: `weather.get_forecasts` is a real core service (confirmed in `ha-core-reference`, `homeassistant/components/weather/__init__.py`), returning a `Forecast` list with `datetime`, `wind_bearing`, `native_wind_speed`. But `HAMeasurementProvider` is built entirely around history/statistics WS commands for existing sensor history, not a service call returning a list in one response; this needs a parallel provider and a way to feed its output into the existing matcher/renderer pipeline, not a config addition. Sized correctly as M/L, deferred rather than rushed. |
| [90](https://github.com/aukedejong/lovelace-windrose-card/issues/90) (sun half) | Overlay sun position on the rose | M | Done: `sun_position` config draws a marker at `sun.sun`'s azimuth attribute, rotating with the rose the same way the current-direction arrow does. The moon half of this request is not built, see the new-visualization table below. |
| [171](https://github.com/aukedejong/lovelace-windrose-card/issues/171) | Named directional arcs (e.g. paragliding launch-site headings) | - | Already supported, no code needed: the maintainer's own suggested answer on the ticket ("a specific background image could add the information") is a config option this card already has (`rose_config.background_image`, since v1.25.0). A static image with the named arcs baked in sits behind the rose. Building a dynamic, config-driven arc renderer instead would mean a new SVG arc-drawing subsystem (in both rose renderer variants, with counter-rotation to keep labels upright) for a single requester the maintainer already steered toward an existing feature; not worth the maintenance surface it would add. |
| [156](https://github.com/aukedejong/lovelace-windrose-card/issues/156) | Heatmap mode for direction/speed | M/L | Different visualization mode from the current rose; needs its own rendering path, not a variant of the existing one. |

## New card / alternate visualization (checked against Sean's actual dashboards, 2026-09-08: not building these)

Checked `~/workspace/ha-dashboards` (Overview, Mobile, and the shared
`weather_station.yaml`) for real evidence these are wanted, per Sean's
request to verify against his dashboards before applying Phase 7/9. None
are: two are things he tried and explicitly rejected, one has no entity
to back it, and none appear anywhere in his config. Full reasoning in
[decisions.md](decisions.md).

| # | Title | Effort | Status |
| --- | --- | --- | --- |
| [180](https://github.com/aukedejong/lovelace-windrose-card/issues/180) | Lightning strikes (azimuth + distance) plotted like wind data | L | Not building. Sean has real Blitzortung sensors, but his own `docs/card_recommendations.md` already solved this by enabling `show_lightning` on the `weather-radar-card` already in his tree, reasoned as a richer signal than a windrose-shaped plot would give. |
| [80](https://github.com/aukedejong/lovelace-windrose-card/issues/80) | New card: standalone rotating compass/heading indicator | L | Not building. `custom:compass-card` was previously in Sean's dashboard and was removed; `card_recommendations.md` states it "duplicate[s] the windrose card." This issue is that exact idea. |
| [160](https://github.com/aukedejong/lovelace-windrose-card/issues/160) | Repurpose the rose for non-wind data (air quality, etc.) | L | Not building. No non-wind usage anywhere in Sean's dashboards; the units-decoupling refactor this needs (Phase 7) has no other consumer either now that #180 is out. |
| [90](https://github.com/aukedejong/lovelace-windrose-card/issues/90) (moon half) | Overlay moon position on the rose | - | Not building. Sean already shows moon phase/moonrise/moonset via a dedicated astro card. Core also has no moon azimuth/elevation entity to plot (only a phase enum, confirmed against `ha-core-reference`), so there is nothing to feed this even if wanted. Sun overlay is unaffected, see Phase 6. |
| [91](https://github.com/aukedejong/lovelace-windrose-card/issues/91) | New card: direction-over-time line/timeline graph | L | Not building. No evidence of need; a different chart type ("new card request" label), not a windrose variant. |
| [156](https://github.com/aukedejong/lovelace-windrose-card/issues/156) | Heatmap mode for direction/speed | M/L | Not building. No evidence of need anywhere in Sean's dashboards. |

## Interaction / UX ideas (unscoped)

| # | Title | Effort | Notes |
| --- | --- | --- | --- |
| [166](https://github.com/aukedejong/lovelace-windrose-card/issues/166) a | Sections-dashboard row snapping | S? | Not verified, not built: would need `getLayoutOptions()` to return a `grid_rows`-style key. `WindRoseCard.getLayoutOptions()` already returns `grid_columns`; the equivalent for rows is a frontend (`home-assistant/frontend`) API this repo has no local source for, so it cannot be confirmed to exist without guessing at an unverified key, which the house rule here is specifically not to do. |
| [166](https://github.com/aukedejong/lovelace-windrose-card/issues/166) b | Hover/tap cross-highlighting between rose segments and speed-bar steps | M | Split out as its own item. Feasible in principle: `TouchFacesRenderer` already has a per-segment touch/hover mechanism (the percentage-tooltip feature from v2.3.0), so the hit-testing exists; this would extend it to also highlight the matching element in the other renderer (`WindRoseRendererStandaard`/`CenterCalm` <-> `WindBarRenderer`), a cross-cutting change touching three renderer classes. Not attempted in this pass: real UI interaction work worth its own scoped pass and, ideally, visual verification in a browser rather than judged from source alone. |

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
