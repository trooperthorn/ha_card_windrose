# Operations

Configuration keys and their consequences, troubleshooting.

## `card_height` and `content_align`

`card_height` (pixels) gives the card a fixed height instead of the default
behavior, where the rose keeps its own aspect ratio and the card grows or
shrinks to fit it. `content_align` (`top`, `center`, or `bottom`, default
`top`) controls where the rose sits inside that fixed height when it doesn't
fill it. Both are optional; a config that sets neither renders exactly as
before this option existed.

## "Failed to execute 'define' on 'CustomElementRegistry': the name
## "windrose-card" has already been used" in Firefox or Android Chrome

This means the card's JavaScript loaded twice in the same page. It is not a
defect in the card. The two most common causes:

- Two resource entries for the card in the same dashboard (Settings ->
  Dashboards -> Resources), e.g. one added manually and one added by HACS.
- A stale cached copy of the resource competing with a freshly downloaded
  one after an update, particularly on browsers that cache aggressively
  (some in-app Android WebViews).

To fix: check Settings -> Dashboards -> Resources for a duplicate
`windrose-card.js` entry and remove it, or hard-refresh (clear the browser
cache for the Home Assistant origin) after updating the card.
