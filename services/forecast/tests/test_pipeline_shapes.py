import json
from datetime import date

import pandas as pd

from stokz_forecast.config import Settings
from stokz_forecast.pipeline import build_dashboard_artifacts, build_demo_batch, write_dashboard_artifacts
from stokz_forecast.portfolio import Holding, PortfolioSnapshot


def _fake_bars() -> pd.DataFrame:
    rows: list[dict[str, object]] = []
    smci_closes = [100.0, 101.8, 103.2, 104.9, 107.4]
    dell_closes = [110.0, 108.6, 107.4, 105.8, 103.9]
    for offset, close in enumerate(smci_closes):
        rows.append(
            {
                'ticker': 'SMCI',
                'trade_date': date(2026, 4, 1 + offset),
                'open': close - 1.0,
                'high': close + 1.5,
                'low': close - 1.5,
                'close': close,
                'volume': 1_000_000 + offset * 10_000,
            }
        )
    for offset, close in enumerate(dell_closes):
        rows.append(
            {
                'ticker': 'DELL',
                'trade_date': date(2026, 4, 1 + offset),
                'open': close + 0.8,
                'high': close + 1.2,
                'low': close - 1.6,
                'close': close,
                'volume': 900_000 + offset * 12_000,
            }
        )
    return pd.DataFrame(rows)


def _fake_research_context(**kwargs):
    return {
        'news_items': [{'title': 'SMCI upgrade', 'summary': 'Strong demand'}],
        'community_items': [{'title': 'SMCI stock thread', 'summary': 'Bullish setup'}],
        'news_score': 2,
        'community_score': 1,
        'news_bias': 'supportive',
        'community_label': 'positive',
        'earnings_date': '2026-04-12',
        'days_to_earnings': 7,
        'event_risk': 'high',
    }


def test_build_demo_batch_returns_one_prediction_per_ticker():
    batch = build_demo_batch()
    assert len(batch.predictions) == 10


def test_build_dashboard_artifacts_exports_setups_charts_and_notifications():
    settings = Settings(
        data_provider='yfinance',
        data_lookback_days=120,
        data_auto_adjust=True,
        timesfm_backend='placeholder',
        timesfm_model_path=None,
        timesfm_repo_id=None,
        forecast_horizon_days=2,
        ticker_universe=('SMCI', 'DELL'),
        chart_history_days=30,
        calibration_enabled=True,
    )
    portfolio = PortfolioSnapshot(
        as_of_date=date(2026, 4, 5),
        holdings=[Holding(ticker='DELL', shares=16)],
        watchlist=('SMCI', 'DELL'),
    )

    artifacts = build_dashboard_artifacts(
        settings=settings,
        bars_loader=lambda *args, **kwargs: _fake_bars(),
        portfolio=portfolio,
        research_context_builder=_fake_research_context,
    )

    assert len(artifacts.batch.predictions) == 2
    assert len(artifacts.setups) == 2
    assert len(artifacts.chart_series) == 2
    assert {setup.portfolio_action for setup in artifacts.setups} == {'BUY', 'SELL'}
    assert {event['ticker'] for event in artifacts.notification_events} == {'SMCI', 'DELL'}
    assert all(series.forecast_points for series in artifacts.chart_series)
    assert all(prediction.base_predicted_return == prediction.predicted_return for prediction in artifacts.batch.predictions)
    assert all(prediction.adjusted_predicted_return == prediction.predicted_return for prediction in artifacts.batch.predictions)
    assert all(prediction.calibration_status == 'context_only' for prediction in artifacts.batch.predictions)
    assert all(prediction.calibration_features for prediction in artifacts.batch.predictions)


def test_write_dashboard_artifacts_appends_calibration_history(tmp_path):
    settings = Settings(
        data_provider='yfinance',
        data_lookback_days=120,
        data_auto_adjust=True,
        timesfm_backend='placeholder',
        timesfm_model_path=None,
        timesfm_repo_id=None,
        forecast_horizon_days=2,
        ticker_universe=('SMCI', 'DELL'),
        chart_history_days=30,
        calibration_enabled=True,
    )
    portfolio = PortfolioSnapshot(
        as_of_date=date(2026, 4, 5),
        holdings=[Holding(ticker='DELL', shares=16)],
        watchlist=('SMCI', 'DELL'),
    )

    artifacts = build_dashboard_artifacts(
        settings=settings,
        bars_loader=lambda *args, **kwargs: _fake_bars(),
        portfolio=portfolio,
        research_context_builder=_fake_research_context,
    )
    paths = write_dashboard_artifacts(artifacts, output_dir=tmp_path)
    calibration_rows = json.loads(paths['calibration_history'].read_text(encoding='utf-8'))

    assert len(calibration_rows) == 2
    assert {row['ticker'] for row in calibration_rows} == {'SMCI', 'DELL'}
    assert all('calibration_features' in row for row in calibration_rows)
