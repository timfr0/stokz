# Calibration Stage 1

- **Branch:** `calibration/stage-1-context-foundation`
- **PR title:** `feat: add calibration context foundation`

## Scope
- extract shared news, community, earnings, and sentiment helpers into `research.py`
- add calibration feature snapshot builders and config flags
- attach calibration metadata to pipeline outputs without changing decisions

## Out of scope
- training history
- learned overlay inference
- UI changes

## Verification
- `python -m pytest tests/test_research.py tests/test_calibration_features.py tests/test_pipeline_shapes.py -q`
- `python -m pytest -q`

## Merge condition
- pipeline artifacts are shape-stable and TimesFM-only decisions are unchanged
