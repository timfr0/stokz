# Stokz Watchlist + Analysis Design

Date: 2026-04-07
Status: Approved design, pending implementation plan
Source of truth: Google Stitch project `projects/3150647976352949774`
Primary Stitch screens:
- `Market Watchlist`
- `Market Watchlist Mobile`
- `Detailed Model Analysis`

## Goal

Upgrade the Stokz homepage so it:
- becomes meaningfully more mobile friendly
- uses chart-first mobile hierarchy
- shows visible chart scale numbers so users can read trend shape
- exposes more useful trend context in the signal table or mobile signal rows
- moves closer to the approved Stitch watchlist and analysis surfaces
- adds a distinct detailed analysis surface on the same route instead of only showing repeated mini cards

## Product intent

The page should operate as a two-speed trading workspace:
- the top half is a fast-scanning operator watchlist
- the lower half is a slower, deeper model-analysis workspace for the currently selected ticker

The route remains a single homepage for now. We intentionally do not split this into a separate `/analysis` route in this pass.

## Design language

The implementation should follow the approved Stokz Stitch design system:
- warm paper background `#f5f0e8`
- near-black primary `#1a1a1a`
- accent yellow `#ffcc00`
- accent red `#e63b2e`
- accent blue `#0055ff`
- Space Grotesk for headlines, labels, and high-emphasis UI
- Inter for readable body copy
- thick solid borders instead of soft shadows
- offset block shadows for depth
- minimal or no radius
- flat color blocks, no glassmorphism, no soft gradients on surfaces

## Information architecture

The homepage is split into two major surfaces.

### 1. Market Watchlist

Purpose:
- let users scan the board quickly
- compare setups across the current universe
- move into deeper analysis by selecting a ticker

Contents:
- large Stitch-style page header with title, short operator copy, and model/timestamp status
- `ACTIVE SIGNALS` shell with summary stats such as board hit rate and bullish count
- desktop scan table
- full-width chart stack for priority names
- summary/status cards restyled to belong to the same system

### 2. Detailed Model Analysis

Purpose:
- let users inspect one selected ticker in depth
- show large chart context, multi-horizon forecasts, confidence, and notes

Contents:
- ticker selector rail or chip row
- dominant analysis chart for the selected ticker
- key stats for current close, tomorrow entry, target close, predicted return, confidence, and portfolio action
- multi-horizon forecast blocks for `1D`, `3D`, and `5D`
- model note, trend bias, signal direction, conviction, and portfolio context

## Selection model

The page has one shared selected ticker.

Default selection:
- first actionable `BUY` with the highest conviction score
- if no `BUY` exists, highest-conviction forecast overall

Selection updates should stay synchronized across:
- desktop watchlist table row
- watchlist chart stack row/card
- analysis section selector

On mobile:
- tapping a watchlist card updates the selected ticker
- if the analysis section is below the fold, the page may scroll the user to the start of the analysis section after selection
- do not force jumpy scrolling if the analysis section is already visible

## Watchlist surface behavior

### Desktop watchlist table

The desktop table remains the fastest scan surface, but it is cleaned up and made more useful.

Columns:
- `Ticker`
- `Bias`
- `Hit Rate`
- `Entry`
- `Target`
- `Exp. Move`
- `Trend`
- `Score`

Rules:
- remove the tiny sparkline table column
- use explicit trend state text instead of a cryptic micro-chart
- keep row selection obvious with stronger active styling
- keep the table readable without relying on horizontal overflow at common desktop widths

### Desktop chart stack

Below the table, add a chart stack for the priority names instead of the current 2x2 mini-card grid.

Each chart stack row contains:
- ticker
- action badge
- setup label
- full-width chart
- visible y-axis numbers
- stat strip for `Entry`, `Target`, `Hit Rate`, and `Exp. Move`
- explicit trend chip

Priority names:
- the top names shown in the stack should be selected from the current forecasts, biased toward the strongest actionable/high-conviction names
- if fewer names are available than the target stack size, render only the available names

### Mobile watchlist

On mobile, the table is no longer the primary interaction pattern.

Each ticker becomes a chart-first signal card with this order:
- ticker row
- action and bias badges
- full-width chart
- four visible stats
- trend and conviction/footer detail

The four always-visible stats on mobile are:
- `Entry`
- `Target`
- `Hit Rate`
- `Expected Move`

The signal card may be taller. Readability is more important than preserving a compressed table shape.

## Detailed analysis surface behavior

### Desktop analysis

The analysis surface should feel like a separate Stitch-derived workstation rather than a repetition of the watchlist.

Structure:
- left selector rail for tickers
- right main analysis canvas

The main analysis canvas includes:
- the largest chart on the page
- key metric strip
- multi-horizon forecast section
- model note and context section

### Mobile analysis

The mobile analysis surface stacks vertically:
- horizontal ticker chip row
- dominant chart
- key metrics
- horizon blocks
- note/context

No side-by-side compression on phone widths.

## Chart behavior

Charts should be more informative without becoming visually noisy.

Rules:
- calculate chart range from the combined visible history and forecast series
- show simple left-side y-axis labels for `max`, `mid`, and `min`
- keep the historical segment visually distinct from the forecast segment
- preserve honest trend presentation rather than smoothing away volatility
- use simple baseline/grid cues so the chart is readable at a glance

If chart data exists:
- historical data uses a solid stroke
- forecast data uses a visually distinct continuation treatment

If chart data is missing:
- render a bordered empty chart state
- keep the rest of the ticker stats visible

## Trend classification

Trend state should be explicit text:
- `UP`
- `STEADY`
- `DOWN`

Recommended threshold:
- `STEADY` when predicted return is between `-0.35%` and `+0.35%`
- `UP` above that range
- `DOWN` below that range

This trend state is used in:
- desktop watchlist table
- mobile watchlist cards
- chart stack rows

## Data mapping

The design should be powered by the existing generated forecast artifacts whenever possible.

Current expected data sources already available in the app:
- forecast list with conviction, bias, action, entry, target, and notes
- chart series with history and forecast points
- multi-horizon forecast metrics including hit rate and MAE
- generated timestamp

No backend or schema redesign is required for this design pass unless implementation reveals a hard blocker.

## Empty and degraded states

If hit rate or MAE is missing:
- display `Waiting for history`

If chart data is missing:
- display an empty chart state inside the same bordered shell
- still show stat rows and trend state

If the selected ticker disappears after refresh:
- reset selection to the default highest-priority fallback ticker

If no actionable `BUY` exists:
- still load the analysis panel using the highest-conviction available ticker

## Responsive behavior

### Desktop
- preserve scan speed and broad board visibility
- favor strong horizontal hierarchy
- keep analysis as a second major workstation below the watchlist

### Tablet
- allow partial collapse from table-heavy layout toward stacked chart rows
- avoid tiny, multi-column density that becomes unreadable

### Mobile
- chart-first stack is the primary layout
- no tiny sparkline-only indicators
- all four default stats remain visible on each signal card
- analysis surface becomes a clean single-column flow

## What is intentionally removed

This pass removes or replaces the following current patterns:
- the tiny trend sparkline in the watchlist table
- the 2x2 mini forecast card grid as the main detail treatment
- repeated small metric blocks that duplicate information without adding clarity

## What stays intentionally unchanged

- single homepage route for this pass
- artifact-backed real forecast workflow
- brutalist visual direction already established in the Stitch project
- honest model framing rather than pretending to show execution systems

## Implementation passes

Recommended implementation order:

1. Extract or reorganize page structure around shared selected-ticker state
2. Rebuild watchlist desktop/mobile hierarchy
3. Upgrade chart rendering to show axes and clearer history/forecast distinction
4. Replace mobile table behavior with signal-card stack
5. Build detailed analysis surface
6. Polish responsive rhythm, badges, borders, and summary blocks to match Stitch more closely

## Testing and verification

### Test-first requirements

Write tests before implementation for the behavior that can be verified without visual inspection:
- default selected ticker logic
- trend classification logic
- chart axis label calculation
- mapping of the four mobile default stats

### Automated checks

Run:
- `pnpm --filter web lint`
- `pnpm --filter web build`

### Manual checks

Verify at minimum:
- `390px` mobile
- `768px` tablet
- `1280px+` desktop

Manual product checks:
- selecting a ticker updates every synced surface
- mobile charts span the available card width
- y-axis numbers are readable
- trend labels render as `UP`, `STEADY`, or `DOWN`
- missing-data states remain clean
- the lower analysis section feels distinct from the watchlist rather than duplicated

## Risks and constraints

- The current homepage is implemented in a single large file, so implementation should likely include targeted component extraction to keep the new design maintainable.
- Adding selection sync across multiple surfaces increases UI state coupling; this should be centralized rather than duplicated in separate local states.
- Mobile readability must win over preserving the current desktop table shape.

## Out of scope for this design

- backend forecast-model changes
- broker or execution workflows
- a separate routed analysis page
- new data sources outside the current generated artifacts
