# Stokz Calibration Overlay Implementation Plan

> **For agentic workers:** Use an execution-focused implementation skill or subagent workflow to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep TimesFM frozen as the base forecaster, then add a small calibration overlay that adjusts predicted return, confidence, and event risk using market regime, price structure, earnings timing, news sentiment, and Reddit/X sentiment.

**Architecture:** The pipeline should keep generating a base TimesFM forecast first. A new calibration lane will build reusable feature snapshots, persist training rows and resolved outcomes, train a lightweight overlay model from that history, and apply the overlay only when a validated model artifact is present. If calibration is disabled, missing, or broken, the system must fall straight back to today’s TimesFM-only behavior.

**Tech Stack:** Python 3.12, numpy, pandas, pytest, yfinance, existing TimesFM adapter, Next.js 14, TypeScript, GitHub PR stack.

---

## PR stack

1. `calibration/stage-1-context-foundation` → **PR title:** `feat: add calibration context foundation`
2. `calibration/stage-2-history-labeling` → **PR title:** `feat: add calibration history and labeling`
3. `calibration/stage-3-overlay-inference` → **PR title:** `feat: add calibration overlay inference`
4. `calibration/stage-4-review-ui` → **PR title:** `feat: surface calibration data in review and UI`

## File map

### Existing files to modify
- `services/forecast/src/stokz_forecast/config.py` — add calibration feature flags, model/data paths, and training thresholds.
- `services/forecast/src/stokz_forecast/data_models.py` — add calibration-aware prediction/setup payload fields.
- `services/forecast/src/stokz_forecast/pipeline.py` — insert feature extraction and optional overlay application between base TimesFM output and setup generation.
- `services/forecast/src/stokz_forecast/cli.py` — add training/status/backfill commands for the calibration lane.
- `services/forecast/src/stokz_forecast/signals.py` — accept calibrated return/confidence/event-risk inputs instead of assuming only raw TimesFM output.
- `services/forecast/src/stokz_forecast/stock_details.py` — stop owning private copies of sentiment/event-risk math once reusable calibration context helpers exist.
- `services/forecast/src/stokz_forecast/reviews.py` — surface calibration status and adjusted-vs-base readings in the review artifact.
- `services/forecast/tests/test_pipeline_shapes.py` — extend artifact-shape coverage for calibration fields.
- `services/forecast/tests/test_signals.py` — extend signal/setup expectations for adjusted confidence and event risk.
- `apps/web/src/lib/types.ts` — add calibration fields to the typed artifact contract.
- `apps/web/src/components/stock-detail-page.tsx` — show calibration status, base vs adjusted move, and calibration reasons.

### New files to create
- `services/forecast/src/stokz_forecast/research.py` — shared news/community/earnings enrichment helpers currently trapped in `stock_details.py`.
- `services/forecast/src/stokz_forecast/calibration_features.py` — build a deterministic feature snapshot from prediction, trend, volatility, earnings, and sentiment data.
- `services/forecast/src/stokz_forecast/calibration_history.py` — write/read feature rows, resolved outcomes, and training/eval datasets.
- `services/forecast/src/stokz_forecast/calibration_model.py` — train/load/apply the lightweight overlay model.
- `services/forecast/tests/test_research.py` — test sentiment/event-risk extraction without network calls.
- `services/forecast/tests/test_calibration_features.py` — test feature snapshot construction and fallback behavior.
- `services/forecast/tests/test_calibration_history.py` — test append/merge/label logic.
- `services/forecast/tests/test_calibration_model.py` — test train/load/predict fallback behavior.
- `docs/superpowers/plans/stages/2026-04-12-calibration-stage-1.md`
- `docs/superpowers/plans/stages/2026-04-12-calibration-stage-2.md`
- `docs/superpowers/plans/stages/2026-04-12-calibration-stage-3.md`
- `docs/superpowers/plans/stages/2026-04-12-calibration-stage-4.md`

## Constraints and guardrails

- Do **not** retrain or mutate TimesFM. The overlay consumes TimesFM outputs, it does not replace the base model.
- Every stage must be mergeable on its own and leave the daily-refresh pipeline runnable.
- New network-heavy enrichment must have deterministic test seams and safe fallbacks.
- Calibration inference must be optional and feature-flagged until evaluation proves it is better than base.
- The repo currently has forecast tests only under `services/forecast/tests`; keep new backend coverage there.
- UI work should not ship until artifact contracts are stable.

## Verification gates shared across all PRs

### Forecast service
```bash
Set-Location C:\Users\timfr\.openclaw\workspace\stokz\services\forecast
C:\Users\timfr\AppData\Local\Programs\Python\Python312\python.exe -m pytest -q
```

### Web app
```bash
Set-Location C:\Users\timfr\.openclaw\workspace\stokz
C:\Users\timfr\AppData\Roaming\npm\pnpm.cmd --filter web lint
C:\Users\timfr\AppData\Roaming\npm\pnpm.cmd --filter web build
```

---

## Chunk 1: Context foundation and reusable feature extraction

### Task 1: Extract shared research/context helpers

**Files:**
- Create: `services/forecast/src/stokz_forecast/research.py`
- Modify: `services/forecast/src/stokz_forecast/stock_details.py`
- Test: `services/forecast/tests/test_research.py`

- [ ] **Step 1: Write the failing research tests**

```python
from stokz_forecast.research import sentiment_score, event_risk_label


def test_sentiment_score_counts_keyword_bias():
    items = [{"title": "AMD upgrade and strong AI demand", "summary": "Bullish setup"}]
    assert sentiment_score(items) > 0


def test_event_risk_goes_high_when_earnings_are_close():
    assert event_risk_label(days_to_earnings=3, news_bias="supportive", news_items=[], community_items=[]) == "high"
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tests/test_research.py -q`
Expected: FAIL because `stokz_forecast.research` does not exist yet.

- [ ] **Step 3: Create `research.py` with extracted helpers**

Implement reusable versions of:
- news fetching
- community search fetching
- sentiment scoring
- sentiment label mapping
- news bias resolution
- earnings date parsing
- days-to-earnings math
- event-risk classification

Keep `stock_details.py` as a thin consumer instead of the source of truth.

- [ ] **Step 4: Rewire `stock_details.py` to import the shared helpers**

Remove duplicated private helper ownership from `stock_details.py` and keep only page-specific assembly there.

- [ ] **Step 5: Re-run the test and the full forecast suite**

Run:
- `python -m pytest tests/test_research.py -q`
- `python -m pytest -q`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add services/forecast/src/stokz_forecast/research.py services/forecast/src/stokz_forecast/stock_details.py services/forecast/tests/test_research.py
git commit -m "refactor: extract reusable research context helpers"
```

### Task 2: Add calibration feature contracts without changing decisions

**Files:**
- Create: `services/forecast/src/stokz_forecast/calibration_features.py`
- Modify: `services/forecast/src/stokz_forecast/data_models.py`
- Modify: `services/forecast/src/stokz_forecast/config.py`
- Modify: `services/forecast/src/stokz_forecast/pipeline.py`
- Test: `services/forecast/tests/test_calibration_features.py`
- Test: `services/forecast/tests/test_pipeline_shapes.py`

- [ ] **Step 1: Write the failing feature snapshot tests**

```python
from stokz_forecast.calibration_features import build_feature_snapshot


def test_build_feature_snapshot_includes_base_prediction_and_sentiment_inputs():
    snapshot = build_feature_snapshot(
        ticker="AMD",
        predicted_return=0.012,
        baseline_return=0.008,
        realized_volatility=0.024,
        short_trend=0.03,
        medium_trend=0.09,
        days_to_earnings=6,
        news_score=2,
        community_score=1,
    )
    assert snapshot["predicted_return"] == 0.012
    assert snapshot["days_to_earnings"] == 6
    assert snapshot["news_score"] == 2
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `python -m pytest tests/test_calibration_features.py tests/test_pipeline_shapes.py -q`
Expected: FAIL because calibration feature builders and fields do not exist.

- [ ] **Step 3: Add calibration config flags**

Add to `Settings` and `load_settings()`:
- `calibration_enabled: bool = False`
- `calibration_model_path: str = 'generated/models/calibration-model.json'`
- `calibration_history_path: str = 'generated/history/calibration-history.json'`
- `calibration_min_training_rows: int = 50`

- [ ] **Step 4: Define calibration-aware payload fields**

Extend prediction/setup records with fields that are safe to ship before inference exists:
- `base_predicted_return`
- `calibration_enabled`
- `calibration_status`
- `calibration_features`

These fields should default to base/no-op values so the current app keeps working.

- [ ] **Step 5: Build feature snapshots in `pipeline.py` without applying them yet**

After TimesFM prediction and before setup generation, compute a deterministic snapshot using trend, volatility, and research inputs, then attach it to metadata only.

- [ ] **Step 6: Re-run tests and confirm no artifact behavior change**

Run:
- `python -m pytest tests/test_calibration_features.py tests/test_pipeline_shapes.py -q`
- `python -m pytest -q`

Expected: PASS, with setup actions still matching current TimesFM-only behavior.

- [ ] **Step 7: Commit**

```bash
git add services/forecast/src/stokz_forecast/config.py services/forecast/src/stokz_forecast/data_models.py services/forecast/src/stokz_forecast/pipeline.py services/forecast/src/stokz_forecast/calibration_features.py services/forecast/tests/test_calibration_features.py services/forecast/tests/test_pipeline_shapes.py
git commit -m "feat: add calibration feature contracts"
```

---

## Chunk 2: Training history and resolved outcome labeling

### Task 3: Persist calibration snapshots alongside forecast history

**Files:**
- Create: `services/forecast/src/stokz_forecast/calibration_history.py`
- Modify: `services/forecast/src/stokz_forecast/pipeline.py`
- Modify: `services/forecast/src/stokz_forecast/cli.py`
- Test: `services/forecast/tests/test_calibration_history.py`

- [ ] **Step 1: Write the failing history tests**

```python
from pathlib import Path
from stokz_forecast.calibration_history import append_feature_rows, read_feature_rows


def test_append_feature_rows_merges_on_ticker_and_as_of_date(tmp_path: Path):
    path = tmp_path / "calibration-history.json"
    append_feature_rows(path, [{"ticker": "AMD", "as_of_date": "2026-04-10", "predicted_return": 0.01}])
    append_feature_rows(path, [{"ticker": "AMD", "as_of_date": "2026-04-10", "predicted_return": 0.02}])
    rows = read_feature_rows(path)
    assert len(rows) == 1
    assert rows[0]["predicted_return"] == 0.02
```

- [ ] **Step 2: Run the history tests to verify they fail**

Run: `python -m pytest tests/test_calibration_history.py -q`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement append/read helpers with stable keys**

Use merge keys:
- `ticker`
- `as_of_date`
- `target_date`

Persist rows into `services/forecast/generated/history/calibration-history.json`.

- [ ] **Step 4: Wire daily-refresh writing into `pipeline.py`**

Whenever forecast artifacts are written, also append the calibration feature snapshot rows.

- [ ] **Step 5: Add a CLI command to inspect calibration history counts**

Add `python -m stokz_forecast.cli calibration-status` that prints:
- feature row count
- labeled row count
- latest as-of date
- whether a model artifact exists

- [ ] **Step 6: Re-run tests**

Run:
- `python -m pytest tests/test_calibration_history.py -q`
- `python -m pytest -q`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add services/forecast/src/stokz_forecast/calibration_history.py services/forecast/src/stokz_forecast/pipeline.py services/forecast/src/stokz_forecast/cli.py services/forecast/tests/test_calibration_history.py
git commit -m "feat: store calibration feature history"
```

### Task 4: Resolve actual outcomes and baseline calibration labels

**Files:**
- Modify: `services/forecast/src/stokz_forecast/calibration_history.py`
- Modify: `services/forecast/src/stokz_forecast/cli.py`
- Test: `services/forecast/tests/test_calibration_history.py`
- Test: `services/forecast/tests/test_pipeline_shapes.py`

- [ ] **Step 1: Write the failing label-resolution test**

```python
from stokz_forecast.calibration_history import attach_realized_outcomes


def test_attach_realized_outcomes_sets_delta_return_and_hit_label(tmp_path):
    # Use a tiny fake price frame or seeded closes.
    ...
```

The test must assert these fields are computed:
- `actual_return_1d`
- `delta_return_target`
- `hit_label`
- `event_risk_target`

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `python -m pytest tests/test_calibration_history.py -q`
Expected: FAIL because label attachment does not exist.

- [ ] **Step 3: Implement label-resolution helpers**

Rules:
- `actual_return_1d` = realized next-session close-to-close log return
- `delta_return_target` = `actual_return_1d - base_predicted_return`
- `hit_label` = `1` when prediction sign matches realized sign, else `0`
- `event_risk_target` = `high` when realized absolute move materially exceeds the modeled range, else `moderate/low`

- [ ] **Step 4: Add CLI command for backfill/label refresh**

Add: `python -m stokz_forecast.cli calibration-backfill --end-date YYYY-MM-DD`

This command should update unresolved rows only.

- [ ] **Step 5: Re-run tests and one dry status check**

Run:
- `python -m pytest tests/test_calibration_history.py tests/test_pipeline_shapes.py -q`
- `python -m pytest -q`
- `python -m stokz_forecast.cli calibration-status`

Expected: PASS, and status output shows labeled-row counts.

- [ ] **Step 6: Commit**

```bash
git add services/forecast/src/stokz_forecast/calibration_history.py services/forecast/src/stokz_forecast/cli.py services/forecast/tests/test_calibration_history.py services/forecast/tests/test_pipeline_shapes.py
git commit -m "feat: label calibration history with realized outcomes"
```

---

## Chunk 3: Overlay training and pipeline inference

### Task 5: Train and load a lightweight calibration model

**Files:**
- Create: `services/forecast/src/stokz_forecast/calibration_model.py`
- Modify: `services/forecast/src/stokz_forecast/cli.py`
- Test: `services/forecast/tests/test_calibration_model.py`

- [ ] **Step 1: Write the failing training tests**

```python
from stokz_forecast.calibration_model import train_overlay_model, load_overlay_model


def test_train_overlay_model_writes_coefficients_and_metrics(tmp_path):
    rows = [
        {"predicted_return": 0.01, "news_score": 2, "community_score": 1, "delta_return_target": 0.004, "hit_label": 1},
        {"predicted_return": -0.008, "news_score": -2, "community_score": -1, "delta_return_target": -0.003, "hit_label": 1},
    ]
    artifact = train_overlay_model(rows, tmp_path / "calibration-model.json")
    assert artifact["feature_names"]
    assert "delta_return" in artifact["metrics"]
```

- [ ] **Step 2: Run the model tests to verify they fail**

Run: `python -m pytest tests/test_calibration_model.py -q`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement a minimal but honest overlay model**

Use only current dependencies.

Recommended shape:
- ridge-style linear regression for `delta_return`
- bounded confidence uplift/downgrade score for `delta_confidence`
- simple multiclass thresholding for `event_risk`

Persist a JSON artifact with:
- `version`
- `trained_at`
- `row_count`
- `feature_names`
- `coefficients`
- `metrics`
- `thresholds`

- [ ] **Step 4: Add CLI training entrypoint**

Add: `python -m stokz_forecast.cli calibration-train`

The command should refuse to write a model when `row_count < calibration_min_training_rows`.

- [ ] **Step 5: Re-run tests**

Run:
- `python -m pytest tests/test_calibration_model.py -q`
- `python -m pytest -q`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add services/forecast/src/stokz_forecast/calibration_model.py services/forecast/src/stokz_forecast/cli.py services/forecast/tests/test_calibration_model.py
git commit -m "feat: add calibration model training"
```

### Task 6: Apply overlay outputs in the forecast pipeline behind a flag

**Files:**
- Modify: `services/forecast/src/stokz_forecast/pipeline.py`
- Modify: `services/forecast/src/stokz_forecast/signals.py`
- Modify: `services/forecast/src/stokz_forecast/data_models.py`
- Test: `services/forecast/tests/test_pipeline_shapes.py`
- Test: `services/forecast/tests/test_signals.py`
- Test: `services/forecast/tests/test_calibration_model.py`

- [ ] **Step 1: Write the failing integration tests**

```python
def test_pipeline_uses_base_prediction_when_calibration_disabled():
    ...


def test_pipeline_applies_delta_return_and_confidence_when_model_is_loaded():
    ...
```

Assertions must cover:
- base and adjusted predicted return are both present
- adjusted confidence changes when overlay output exists
- pipeline falls back to base values if model load fails

- [ ] **Step 2: Run targeted tests and verify they fail**

Run: `python -m pytest tests/test_pipeline_shapes.py tests/test_signals.py tests/test_calibration_model.py -q`
Expected: FAIL because pipeline application is not implemented.

- [ ] **Step 3: Load the trained model in `pipeline.py` only when enabled**

Flow:
1. build base prediction from TimesFM
2. build feature snapshot
3. if calibration enabled and model artifact is valid, compute:
   - `adjusted_predicted_return`
   - `adjusted_confidence_score`
   - `event_risk`
   - `calibration_reason_codes`
4. otherwise emit no-op calibration metadata

- [ ] **Step 4: Update signal/setup generation to consume adjusted values**

`signals.py` should stop assuming only `prediction.predicted_return` exists. It should prefer adjusted values for classification/ranking while preserving the base value for auditability.

- [ ] **Step 5: Re-run tests and one manual refresh**

Run:
- `python -m pytest tests/test_pipeline_shapes.py tests/test_signals.py tests/test_calibration_model.py -q`
- `python -m pytest -q`
- `python -m stokz_forecast.cli daily-refresh`

Expected: PASS, and generated JSON contains both base and adjusted fields.

- [ ] **Step 6: Commit**

```bash
git add services/forecast/src/stokz_forecast/pipeline.py services/forecast/src/stokz_forecast/signals.py services/forecast/src/stokz_forecast/data_models.py services/forecast/tests/test_pipeline_shapes.py services/forecast/tests/test_signals.py services/forecast/tests/test_calibration_model.py
git commit -m "feat: apply calibration overlay in pipeline"
```

---

## Chunk 4: Review artifacts and UI surfacing

### Task 7: Publish calibration details into review and stock-detail artifacts

**Files:**
- Modify: `services/forecast/src/stokz_forecast/reviews.py`
- Modify: `services/forecast/src/stokz_forecast/stock_details.py`
- Test: `services/forecast/tests/test_pipeline_shapes.py`

- [ ] **Step 1: Write the failing artifact-shape test**

Add assertions for:
- `basePredictedReturn`
- `adjustedPredictedReturn`
- `calibrationStatus`
- `eventRisk`
- `calibrationReasons`

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tests/test_pipeline_shapes.py -q`
Expected: FAIL because artifact fields are not exported yet.

- [ ] **Step 3: Extend review and stock-detail records**

Surface:
- base vs adjusted move
- calibration-enabled flag
- calibration model version/status
- top calibration reasons
- final event-risk classification

- [ ] **Step 4: Re-run tests and manual review generation**

Run:
- `python -m pytest tests/test_pipeline_shapes.py -q`
- `python -m pytest -q`
- `python -m stokz_forecast.cli daily-review`

Expected: PASS, and review artifacts include calibration context.

- [ ] **Step 5: Commit**

```bash
git add services/forecast/src/stokz_forecast/reviews.py services/forecast/src/stokz_forecast/stock_details.py services/forecast/tests/test_pipeline_shapes.py
git commit -m "feat: publish calibration context in artifacts"
```

### Task 8: Surface calibration context in the web UI

**Files:**
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/components/stock-detail-page.tsx`
- Test: `apps/web` build and lint

- [ ] **Step 1: Add the failing TypeScript contract edits**

Add required fields to the `StockDetail` type so TypeScript fails until the component handles them.

- [ ] **Step 2: Run the web build to capture the failure**

Run: `pnpm --filter web build`
Expected: FAIL until `stock-detail-page.tsx` renders the new calibration fields.

- [ ] **Step 3: Add a calibration panel to `stock-detail-page.tsx`**

Show:
- base vs adjusted 1D move
- calibration status/model version
- event risk
- top calibration reasons
- explanation that TimesFM stayed frozen and the overlay only changed trust/positioning

- [ ] **Step 4: Run web verification**

Run:
- `pnpm --filter web lint`
- `pnpm --filter web build`

Expected: PASS.

- [ ] **Step 5: Manual spot check**

Open one stock page and confirm the new calibration box is visible, readable, and does not bury the existing AI summary.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/types.ts apps/web/src/components/stock-detail-page.tsx
git commit -m "feat: show calibration overlay on stock pages"
```

---

## Stage brief generation

Create one small companion brief per PR in `docs/superpowers/plans/stages/`.

Each stage brief should include:
- branch name
- PR title
- scope in 3 bullets
- explicit out-of-scope list
- verification checklist
- merge condition

## Recommended execution order

1. Merge Stage 1 first, because it extracts shared logic and stabilizes feature contracts.
2. Merge Stage 2 next, because training without clean history is fake progress.
3. Merge Stage 3 only after Stage 2 produces enough labeled rows.
4. Merge Stage 4 last, because UI should follow a stable artifact contract.

## Definition of done

The overall project is done when:
- daily-refresh writes calibration feature history automatically
- backfill can resolve actual outcomes for old rows
- training writes a valid overlay model artifact
- pipeline can apply the overlay without mutating TimesFM
- generated artifacts show base vs adjusted values clearly
- the stock-detail page explains the overlay honestly
- all forecast tests pass
- web lint/build pass

Plan complete and saved to `docs/superpowers/plans/2026-04-12-stokz-calibration-overlay.md`. Ready to execute?
