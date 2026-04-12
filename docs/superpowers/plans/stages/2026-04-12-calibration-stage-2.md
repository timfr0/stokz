# Calibration Stage 2

- **Branch:** `calibration/stage-2-history-labeling`
- **PR title:** `feat: add calibration history and labeling`

## Scope
- persist calibration feature snapshots into generated history
- resolve realized outcomes and label rows for training
- add calibration status and backfill CLI commands

## Out of scope
- learned overlay application
- UI changes

## Verification
- `python -m pytest tests/test_calibration_history.py tests/test_pipeline_shapes.py -q`
- `python -m pytest -q`
- `python -m stokz_forecast.cli calibration-status`

## Merge condition
- history rows write cleanly, unresolved rows can be backfilled, and label fields are trustworthy
