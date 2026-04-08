# Stokz

Stokz is a monorepo for a forecast-assisted swing-trade signal lab. The current workflow is honest: pull real daily bars, run the forecast adapter with a safe TimesFM fallback or live runtime, generate setup/chart artifacts, and render the dashboard from those artifacts.

## Stack
- Next.js 14 + TypeScript + Tailwind CSS
- Python 3.12 forecast service
- yfinance daily bars
- TimesFM 2.5 runtime path with deterministic fallback safety
- Supabase-ready SQL migrations for persistence and notification delivery metadata

## Fixed Universe
SMCI, VRT, CLS, MRVL, DELL, ORCL, ANET, AMD, SYM, AVGO

## Windows Quickstart
```powershell
Set-Location C:\Users\timfr\.openclaw\workspace\stokz
C:\Users\timfr\AppData\Roaming\npm\pnpm.cmd install
C:\Users\timfr\AppData\Roaming\npm\pnpm.cmd --filter web dev
```

```powershell
Set-Location C:\Users\timfr\.openclaw\workspace\stokz\services\forecast
C:\Users\timfr\AppData\Local\Programs\Python\Python312\python.exe -m pip install -e .[dev]
C:\Users\timfr\AppData\Local\Programs\Python\Python312\python.exe -m stokz_forecast.cli runtime-status
C:\Users\timfr\AppData\Local\Programs\Python\Python312\python.exe -m stokz_forecast.cli daily-refresh
C:\Users\timfr\AppData\Local\Programs\Python\Python312\python.exe -m pytest -q
```

## Current Operator Flow
1. Pull daily bars from `yfinance`.
2. Compute close-to-close log returns.
3. Run the TimesFM adapter. If the runtime is unavailable, fallback stays deterministic and still exports valid artifacts.
4. Map forecasts into portfolio-aware `BUY` / `HOLD` / `SELL` setups.
5. Export `services/forecast/generated/portfolio-setups.json`, `chart-series.json`, and notification/history artifacts.
6. Render the dashboard directly from those artifacts.
7. Generate notification events only for actionable setups.
8. Run the dated daily review loop that writes `reviews/YYYY-MM-DD/` artifacts and includes a full desk of roles before tomorrow changes are trusted.

## Daily Desk Roles
- `market_researcher`: collects market/news/event context, broad market movers, and ticker-specific watch items
- `forecast_operator`: runs the prediction/artifact pipeline
- `evaluator`: scores predictions vs outcomes
- `analyst`: decides whether proposed changes are justified
- `risk_manager`: constrains changes when error/regime risk is elevated
- `strategy_tuner`: proposes bounded threshold/weight changes
- `summary_writer`: produces operator-facing report output

## Automation Direction
The system is being built so the daily loop can run without manual intervention:
- midday refresh
- after-close refresh
- dated end-of-day review package
- `five-pm-report` summary generation
- Discord summary/report delivery
- tomorrow recommendation block gated by analyst + risk review

## Honest Status
This is still a forecasting lab, not an auto-trading system. The dashboard surfaces prep and portfolio context. It does not claim execution, brokerage connectivity, or validated alpha.
