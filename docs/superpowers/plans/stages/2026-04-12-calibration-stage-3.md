# Calibration Stage 3

- **Branch:** `calibration/stage-3-overlay-inference`
- **PR title:** `feat: add calibration overlay inference`

## Scope
- train and load a lightweight overlay model from labeled history
- apply adjusted return, confidence, and event-risk outputs in `pipeline.py`
- preserve clean fallback behavior when calibration is disabled or missing

## Out of scope
- UI polish
- homepage redesign work

## Verification
- `python -m pytest tests/test_calibration_model.py tests/test_pipeline_shapes.py tests/test_signals.py -q`
- `python -m pytest -q`
- `python -m stokz_forecast.cli daily-refresh`

## Merge condition
- pipeline applies the overlay only when valid and keeps base-vs-adjusted values auditable
