# Stokz Forecast Service

Python service for the Stokz daily ingest -> transform -> forecast -> setup -> notification pipeline.

## Responsibilities
- pull real daily bars from `yfinance`
- compute close-to-close log returns
- run the TimesFM adapter with a deterministic fallback path
- map forecasts into portfolio-aware setup recommendations
- export dashboard artifacts for setups and chart overlays
- generate notification payloads only for actionable setups

## Windows Commands
```powershell
Set-Location C:\Users\timfr\.openclaw\workspace\stokz\services\forecast
C:\Users\timfr\AppData\Local\Programs\Python\Python312\python.exe -m pip install -e .[dev]
C:\Users\timfr\AppData\Local\Programs\Python\Python312\python.exe -m pytest -q
C:\Users\timfr\AppData\Local\Programs\Python\Python312\python.exe -m stokz_forecast.cli export-demo
C:\Users\timfr\AppData\Local\Programs\Python\Python312\python.exe -m stokz_forecast.cli export-artifacts
```

## Runtime Notes
- `STOKZ_TIMESFM_BACKEND=placeholder` keeps the pipeline runnable with the rolling-mean fallback.
- `STOKZ_TIMESFM_BACKEND=timesfm` will attempt the real runtime path using `STOKZ_TIMESFM_MODEL_PATH` and `STOKZ_TIMESFM_REPO_ID`.
- If import or runtime init fails, the adapter drops back to `timesfm-fallback` and still emits valid setup and chart artifacts.

## Output Artifacts
- `generated/portfolio-setups.json`
- `generated/chart-series.json`

These are the current source of truth for the dashboard. Database wiring can come later when the storage model is ready.