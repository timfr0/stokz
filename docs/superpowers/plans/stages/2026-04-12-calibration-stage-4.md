# Calibration Stage 4

- **Branch:** `calibration/stage-4-review-ui`
- **PR title:** `feat: surface calibration data in review and UI`

## Scope
- publish calibration fields into review and stock-detail artifacts
- add TypeScript support for new fields
- surface calibration status, base-vs-adjusted move, event risk, and reasons in the stock page UI

## Out of scope
- additional model training experiments
- brokerage/execution features

## Verification
- `python -m pytest tests/test_pipeline_shapes.py -q`
- `python -m pytest -q`
- `pnpm --filter web lint`
- `pnpm --filter web build`

## Merge condition
- the UI explains the overlay honestly and the artifact contract is stable
