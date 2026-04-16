from __future__ import annotations

import json
import math
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any, Callable

import pandas as pd

from .baselines import predict_rolling_mean
from .calibration_history import append_feature_rows, build_feature_rows
from .calibration_features import build_feature_snapshot, compute_trend_window_returns
from .calibration_model import apply_overlay_model, load_overlay_model
from .config import Settings, load_settings
from .data_models import ChartPoint, ChartSeries, DashboardArtifacts, ForecastBatch, ForecastPrediction
from .data_sources import load_daily_bars
from .evaluation import append_evaluation_history, append_forecast_history, build_seeded_evaluation_rows, read_json_array, summarize_horizon_metrics
from .notifications import build_notification_events
from .portfolio import PortfolioSnapshot, load_portfolio_snapshot
from .research import build_research_context
from .signals import build_setup_recommendation, classify_signal, confidence_score_from_return
from .timesfm_adapter import TimesFMAdapter
from .transforms import compute_log_returns

BarsLoader = Callable[..., pd.DataFrame]
ResearchContextBuilder = Callable[..., dict[str, Any]]


def _empty_research_context(**kwargs) -> dict[str, Any]:
    return {
        'news_items': [],
        'community_items': [],
        'news_score': 0,
        'community_score': 0,
        'news_bias': 'mixed',
        'community_label': 'mixed',
        'earnings_date': None,
        'days_to_earnings': None,
        'event_risk': 'low',
    }


def _generated_dir() -> Path:
    return Path(__file__).resolve().parents[2] / 'generated'


def _history_dir() -> Path:
    return _generated_dir() / 'history'


def _map_direction(predicted_return: float, threshold: float = 0.001) -> str:
    if predicted_return > threshold:
        return 'bullish'
    if predicted_return < -threshold:
        return 'bearish'
    return 'neutral'


def _build_demo_frame(settings: Settings) -> pd.DataFrame:
    rows: list[dict[str, object]] = []
    horizon = max(settings.chart_history_days, 30)
    for index, ticker in enumerate(settings.ticker_universe):
        anchor = 90 + index * 12
        for offset in range(horizon):
            drift = (index - 4) * 0.45
            close = round(anchor + drift * offset + ((offset % 5) - 2) * 0.9, 2)
            rows.append(
                {
                    'ticker': ticker,
                    'trade_date': date.today() - timedelta(days=horizon - offset),
                    'open': round(close - 0.7, 2),
                    'high': round(close + 1.1, 2),
                    'low': round(close - 1.3, 2),
                    'close': close,
                    'volume': 1_000_000 + index * 10_000 + offset,
                }
            )
    return pd.DataFrame(rows)


def _build_chart_series(
    ticker: str,
    ticker_frame: pd.DataFrame,
    prediction: ForecastPrediction,
    settings: Settings,
) -> ChartSeries:
    history_frame = ticker_frame.tail(settings.chart_history_days)
    history_points = [
        ChartPoint(trade_date=pd.Timestamp(row['trade_date']).date(), close=float(row['close']))
        for row in history_frame.to_dict(orient='records')
    ]

    forecast_points: list[ChartPoint] = []
    projected_close = float(history_frame.iloc[-1]['close'])
    growth_factor = math.exp(prediction.predicted_return)
    for step in range(settings.forecast_horizon_days):
        projected_close *= growth_factor
        forecast_points.append(
            ChartPoint(
                trade_date=prediction.as_of_date + timedelta(days=step + 1),
                close=projected_close,
            )
        )

    return ChartSeries(
        ticker=ticker,
        as_of_date=prediction.as_of_date,
        current_close=float(history_frame.iloc[-1]['close']),
        predicted_return=prediction.predicted_return,
        predicted_direction=prediction.predicted_direction,
        model_name=prediction.model_name,
        history_points=history_points,
        forecast_points=forecast_points,
    )


def _setup_sort_key(setup) -> tuple[bool, int, int, str]:
    action_rank = {'BUY': 0, 'SELL': 1, 'HOLD': 2}[setup.portfolio_action]
    return (not setup.is_actionable, action_rank, -setup.conviction_score, setup.ticker)


def _load_bars_frame(settings: Settings, bars_loader: BarsLoader | None, as_of_date: date) -> pd.DataFrame:
    if bars_loader is None:
        return load_daily_bars(
            tickers=settings.ticker_universe,
            lookback_days=settings.data_lookback_days,
            end_date=as_of_date,
            auto_adjust=settings.data_auto_adjust,
        )
    return bars_loader(
        tickers=settings.ticker_universe,
        lookback_days=settings.data_lookback_days,
        end_date=as_of_date,
        auto_adjust=settings.data_auto_adjust,
    )


def _resolve_calibration_model(settings: Settings) -> tuple[dict[str, Any] | None, str]:
    if not settings.calibration_enabled:
        return None, 'disabled'
    if not settings.calibration_model_path.exists():
        return None, 'model_unavailable'

    model_artifact = load_overlay_model(settings.calibration_model_path)
    if model_artifact is None:
        return None, 'model_invalid'
    return model_artifact, 'available'


def _apply_horizon_metrics(setups) -> None:
    evaluation_history = read_json_array(_history_dir() / 'evaluation-history.json')
    summary = summarize_horizon_metrics(evaluation_history)
    for setup in setups:
        updated = []
        for horizon in setup.horizon_forecasts:
            metrics = summary.get(horizon.horizon_days)
            if metrics:
                updated.append(
                    type(horizon)(
                        horizon_days=horizon.horizon_days,
                        predicted_return=horizon.predicted_return,
                        target_close=horizon.target_close,
                        confidence_band=horizon.confidence_band,
                        expected_accuracy_note=horizon.expected_accuracy_note,
                        measured_hit_rate=metrics['hit_rate'],
                        measured_mae=metrics['mae'],
                    )
                )
            else:
                updated.append(horizon)
        setup.horizon_forecasts = tuple(updated)  # type: ignore[misc]


def build_dashboard_artifacts(
    settings: Settings | None = None,
    bars_loader: BarsLoader | None = None,
    portfolio: PortfolioSnapshot | None = None,
    research_context_builder: ResearchContextBuilder | None = None,
) -> DashboardArtifacts:
    runtime_settings = settings or load_settings()
    snapshot = portfolio or load_portfolio_snapshot(runtime_settings)
    resolved_research_context_builder = research_context_builder or build_research_context
    bars_frame = _load_bars_frame(runtime_settings, bars_loader, snapshot.as_of_date)
    if bars_frame.empty:
        batch = ForecastBatch(generated_at=datetime.now(UTC), model_name='timesfm-fallback', predictions=[])
        return DashboardArtifacts(batch=batch, setups=[], chart_series=[], notification_events=[])

    bars_frame = bars_frame.copy()
    bars_frame['trade_date'] = pd.to_datetime(bars_frame['trade_date'])
    bars_frame = bars_frame.sort_values(['ticker', 'trade_date']).reset_index(drop=True)

    adapter = TimesFMAdapter(
        backend=runtime_settings.timesfm_backend,
        model_path=runtime_settings.timesfm_model_path,
        repo_id=runtime_settings.timesfm_repo_id,
        horizon=runtime_settings.forecast_horizon_days,
    )

    predictions: list[ForecastPrediction] = []
    setups = []
    chart_series = []
    calibration_model_artifact, calibration_model_status = _resolve_calibration_model(runtime_settings)

    for ticker in runtime_settings.ticker_universe:
        ticker_frame = bars_frame.loc[bars_frame['ticker'].str.upper() == ticker].copy()
        if len(ticker_frame) < 3:
            continue

        return_frame = compute_log_returns(ticker_frame)
        history = return_frame['log_return'].dropna().astype(float).tolist()
        if not history:
            continue

        baseline_return = predict_rolling_mean(history, window=min(5, len(history)))
        base_predicted_return = adapter.forecast_next_return(history)
        base_predicted_direction = _map_direction(base_predicted_return)
        current_price = float(ticker_frame.iloc[-1]['close'])
        realized_volatility = float(return_frame['log_return'].dropna().std(ddof=0)) if len(history) > 1 else abs(base_predicted_return)
        short_trend, medium_trend = compute_trend_window_returns(ticker_frame['close'].astype(float).tolist())
        research_context = resolved_research_context_builder(
            ticker=ticker,
            company_name=ticker,
            as_of_date=snapshot.as_of_date,
            predicted_direction=base_predicted_direction,
        )
        calibration_features = build_feature_snapshot(
            ticker=ticker,
            as_of_date=snapshot.as_of_date,
            target_date=snapshot.as_of_date + timedelta(days=runtime_settings.forecast_horizon_days),
            predicted_return=base_predicted_return,
            baseline_return=baseline_return,
            realized_volatility=realized_volatility,
            short_trend=short_trend,
            medium_trend=medium_trend,
            days_to_earnings=research_context.get('days_to_earnings'),
            news_score=int(research_context.get('news_score', 0)),
            community_score=int(research_context.get('community_score', 0)),
            predicted_direction=base_predicted_direction,
            event_risk=str(research_context.get('event_risk', 'low')),
            news_bias=str(research_context.get('news_bias', 'mixed')),
            community_label=str(research_context.get('community_label', 'mixed')),
            news_count=len(research_context.get('news_items', [])),
            community_count=len(research_context.get('community_items', [])),
        )
        adjusted_predicted_return = base_predicted_return
        adjusted_confidence_score = confidence_score_from_return(base_predicted_return)
        event_risk = str(research_context.get('event_risk', 'low'))
        calibration_reason_codes: list[str] = []
        calibration_status = calibration_model_status

        if calibration_model_artifact is not None:
            try:
                overlay_outputs = apply_overlay_model(
                    calibration_model_artifact,
                    calibration_features,
                    base_predicted_return=base_predicted_return,
                )
            except Exception:
                calibration_status = 'model_invalid'
            else:
                adjusted_predicted_return = float(overlay_outputs['adjusted_predicted_return'])
                adjusted_confidence_score = float(overlay_outputs['adjusted_confidence_score'])
                event_risk = str(overlay_outputs['event_risk'])
                calibration_reason_codes = [str(code) for code in overlay_outputs.get('calibration_reason_codes', [])]
                calibration_status = 'applied'

        predicted_return = adjusted_predicted_return if calibration_status == 'applied' else base_predicted_return
        predicted_direction = _map_direction(predicted_return)
        signal = classify_signal(predicted_return=predicted_return, confidence_score=adjusted_confidence_score)

        prediction = ForecastPrediction(
            ticker=ticker,
            as_of_date=snapshot.as_of_date,
            target_date=snapshot.as_of_date + timedelta(days=runtime_settings.forecast_horizon_days),
            predicted_return=predicted_return,
            predicted_direction=predicted_direction,
            baseline_return=baseline_return,
            model_name=adapter.model_name,
            confidence_label=signal.confidence_label,
            signal_direction=signal.direction,
            base_predicted_return=base_predicted_return,
            adjusted_predicted_return=adjusted_predicted_return,
            adjusted_confidence_score=adjusted_confidence_score,
            event_risk=event_risk,
            calibration_reason_codes=calibration_reason_codes,
            calibration_enabled=runtime_settings.calibration_enabled,
            calibration_status=calibration_status,
            calibration_features=calibration_features,
            metadata_json={
                'history_points': len(history),
                'backend': runtime_settings.timesfm_backend,
                'runtime_mode': adapter.status.mode,
                'runtime_reason': adapter.status.reason,
                'runtime_class': adapter.status.runtime_class,
                'current_price': current_price,
                'research_context': research_context,
            },
        )
        predictions.append(prediction)

        setup = build_setup_recommendation(
            prediction=prediction,
            portfolio=snapshot,
            current_price=current_price,
            realized_volatility=realized_volatility,
        )
        setups.append(setup)
        chart_series.append(_build_chart_series(ticker=ticker, ticker_frame=ticker_frame, prediction=prediction, settings=runtime_settings))

    ordered_setups = sorted(setups, key=_setup_sort_key)
    chart_map = {series.ticker: series for series in chart_series}
    ordered_chart_series = [chart_map[setup.ticker] for setup in ordered_setups if setup.ticker in chart_map]
    prediction_map = {prediction.ticker: prediction for prediction in predictions}
    ordered_predictions = [prediction_map[setup.ticker] for setup in ordered_setups if setup.ticker in prediction_map]
    batch = ForecastBatch(generated_at=datetime.now(UTC), model_name=adapter.model_name, predictions=ordered_predictions)
    notification_events = build_notification_events(ordered_setups)
    return DashboardArtifacts(batch=batch, setups=ordered_setups, chart_series=ordered_chart_series, notification_events=notification_events)


def write_dashboard_artifacts(artifacts: DashboardArtifacts, output_dir: Path | None = None) -> dict[str, Path]:
    destination = output_dir or _generated_dir()
    destination.mkdir(parents=True, exist_ok=True)

    setup_records = [setup.to_record() for setup in artifacts.setups]
    chart_records = [series.to_record() for series in artifacts.chart_series]
    notification_records = artifacts.notification_events

    forecast_history_rows = [
        {
            'ticker': setup['ticker'],
            'as_of_date': setup['as_of_date'],
            'target_date': setup['target_date'],
            'predicted_return': setup['predicted_return'],
            'horizon_forecasts': setup.get('horizon_forecasts', []),
            'model_name': setup['model_name'],
        }
        for setup in setup_records
    ]
    append_forecast_history(destination, forecast_history_rows)
    calibration_history_path = append_feature_rows(destination / 'history' / 'calibration-history.json', build_feature_rows(artifacts.batch.predictions))

    evaluation_rows = build_seeded_evaluation_rows(setup_records)
    append_evaluation_history(destination, evaluation_rows)

    refreshed_summary = summarize_horizon_metrics(read_json_array(_history_dir() / 'evaluation-history.json'))
    for setup in setup_records:
        for horizon in setup.get('horizon_forecasts', []):
            metrics = refreshed_summary.get(int(horizon['horizon_days']))
            if metrics:
                horizon['measured_hit_rate'] = round(metrics['hit_rate'], 4)
                horizon['measured_mae'] = round(metrics['mae'], 6)

    setup_path = destination / 'portfolio-setups.json'
    chart_path = destination / 'chart-series.json'
    notification_path = destination / 'notification-events.json'

    setup_path.write_text(json.dumps(setup_records, indent=2), encoding='utf-8')
    chart_path.write_text(json.dumps(chart_records, indent=2), encoding='utf-8')
    notification_path.write_text(json.dumps(notification_records, indent=2), encoding='utf-8')

    return {
        'setups': setup_path,
        'charts': chart_path,
        'notifications': notification_path,
        'calibration_history': calibration_history_path,
    }


def build_demo_batch(settings: Settings | None = None) -> ForecastBatch:
    runtime_settings = settings or load_settings()
    demo_artifacts = build_dashboard_artifacts(
        settings=runtime_settings,
        bars_loader=lambda *args, **kwargs: _build_demo_frame(runtime_settings),
        research_context_builder=_empty_research_context,
    )
    return demo_artifacts.batch
