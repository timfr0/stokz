import json
from datetime import date
from pathlib import Path

import pandas as pd
import pytest

from stokz_forecast.config import Settings
from stokz_forecast.pipeline import build_dashboard_artifacts, build_demo_batch, write_dashboard_artifacts
from stokz_forecast.portfolio import Holding, PortfolioSnapshot
from stokz_forecast.reviews import build_daily_review
from stokz_forecast.signals import classify_signal
from stokz_forecast.stock_details import build_stock_detail_records
from stokz_forecast.timesfm_adapter import TimesFMAdapter


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


def _settings(*, calibration_enabled: bool, calibration_model_path: Path | None = None) -> Settings:
    return Settings(
        data_provider='yfinance',
        data_lookback_days=120,
        data_auto_adjust=True,
        timesfm_backend='placeholder',
        timesfm_model_path=None,
        timesfm_repo_id=None,
        forecast_horizon_days=2,
        ticker_universe=('SMCI', 'DELL'),
        chart_history_days=30,
        calibration_enabled=calibration_enabled,
        calibration_model_path=calibration_model_path or Path('generated/models/calibration-model.json'),
    )


def _portfolio() -> PortfolioSnapshot:
    return PortfolioSnapshot(
        as_of_date=date(2026, 4, 5),
        holdings=[Holding(ticker='DELL', shares=16)],
        watchlist=('SMCI', 'DELL'),
    )


def _patch_base_forecasts(monkeypatch, *values: float) -> None:
    forecast_values = iter(values)
    monkeypatch.setattr(TimesFMAdapter, 'forecast_next_return', lambda self, history: next(forecast_values))


def test_build_demo_batch_returns_one_prediction_per_ticker():
    batch = build_demo_batch()
    assert len(batch.predictions) == 10


def test_build_dashboard_artifacts_applies_overlay_outputs_when_model_available(monkeypatch, tmp_path):
    from stokz_forecast import pipeline

    _patch_base_forecasts(monkeypatch, 0.006, -0.006)
    model_path = tmp_path / 'models' / 'calibration-model.json'
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.write_text(json.dumps({'stub': True}), encoding='utf-8')

    def _fake_load_overlay_model(path: Path):
        assert path == model_path
        return {'stub': True}

    def _fake_apply_overlay_model(model_artifact, feature_snapshot, base_predicted_return):
        if feature_snapshot['ticker'] == 'SMCI':
            return {
                'adjusted_predicted_return': 0.009,
                'adjusted_confidence_score': 0.91,
                'event_risk': 'moderate',
                'calibration_reason_codes': ['predicted_return', 'news_score'],
            }
        return {
            'adjusted_predicted_return': -0.004,
            'adjusted_confidence_score': 0.19,
            'event_risk': 'high',
            'calibration_reason_codes': ['community_score', 'days_to_earnings'],
        }

    monkeypatch.setattr(pipeline, 'load_overlay_model', _fake_load_overlay_model, raising=False)
    monkeypatch.setattr(pipeline, 'apply_overlay_model', _fake_apply_overlay_model, raising=False)

    artifacts = build_dashboard_artifacts(
        settings=_settings(calibration_enabled=True, calibration_model_path=model_path),
        bars_loader=lambda *args, **kwargs: _fake_bars(),
        portfolio=_portfolio(),
        research_context_builder=_fake_research_context,
    )

    assert len(artifacts.batch.predictions) == 2
    assert len(artifacts.setups) == 2
    assert len(artifacts.chart_series) == 2
    assert {event['ticker'] for event in artifacts.notification_events} == {'SMCI', 'DELL'}

    predictions = {prediction.ticker: prediction for prediction in artifacts.batch.predictions}
    smci = predictions['SMCI']
    dell = predictions['DELL']

    assert smci.base_predicted_return == 0.006
    assert smci.adjusted_predicted_return == 0.009
    assert smci.predicted_return == 0.009
    assert smci.adjusted_confidence_score == 0.91
    assert smci.event_risk == 'moderate'
    assert smci.calibration_reason_codes == ['predicted_return', 'news_score']
    assert smci.calibration_status == 'applied'
    assert classify_signal(predicted_return=smci.base_predicted_return).confidence_label == 'medium'
    assert smci.confidence_label == 'high'

    assert dell.base_predicted_return == -0.006
    assert dell.adjusted_predicted_return == -0.004
    assert dell.predicted_return == -0.004
    assert dell.adjusted_confidence_score == 0.19
    assert dell.event_risk == 'high'
    assert dell.calibration_reason_codes == ['community_score', 'days_to_earnings']
    assert dell.calibration_status == 'applied'

    assert all(prediction.base_predicted_return is not None for prediction in artifacts.batch.predictions)
    assert all(prediction.adjusted_predicted_return is not None for prediction in artifacts.batch.predictions)


def test_build_dashboard_artifacts_loads_calibration_model_only_when_enabled(monkeypatch, tmp_path):
    from stokz_forecast import pipeline

    load_calls: list[Path] = []
    model_path = tmp_path / 'models' / 'calibration-model.json'
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.write_text(json.dumps({'stub': True}), encoding='utf-8')

    monkeypatch.setattr(pipeline, 'load_overlay_model', lambda path: load_calls.append(path) or {'stub': True}, raising=False)
    monkeypatch.setattr(
        pipeline,
        'apply_overlay_model',
        lambda model_artifact, feature_snapshot, base_predicted_return: {
            'adjusted_predicted_return': base_predicted_return,
            'adjusted_confidence_score': 0.5,
            'event_risk': feature_snapshot['event_risk'],
            'calibration_reason_codes': [],
        },
        raising=False,
    )

    _patch_base_forecasts(monkeypatch, 0.006, -0.006)
    build_dashboard_artifacts(
        settings=_settings(calibration_enabled=False, calibration_model_path=model_path),
        bars_loader=lambda *args, **kwargs: _fake_bars(),
        portfolio=_portfolio(),
        research_context_builder=_fake_research_context,
    )
    assert load_calls == []

    _patch_base_forecasts(monkeypatch, 0.006, -0.006)
    build_dashboard_artifacts(
        settings=_settings(calibration_enabled=True, calibration_model_path=model_path),
        bars_loader=lambda *args, **kwargs: _fake_bars(),
        portfolio=_portfolio(),
        research_context_builder=_fake_research_context,
    )
    assert load_calls == [model_path]


def test_build_dashboard_artifacts_falls_back_to_base_values_when_model_load_fails(monkeypatch, tmp_path):
    _patch_base_forecasts(monkeypatch, 0.006, -0.006)
    model_path = tmp_path / 'models' / 'calibration-model.json'
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.write_text('{broken-json}', encoding='utf-8')

    artifacts = build_dashboard_artifacts(
        settings=_settings(calibration_enabled=True, calibration_model_path=model_path),
        bars_loader=lambda *args, **kwargs: _fake_bars(),
        portfolio=_portfolio(),
        research_context_builder=_fake_research_context,
    )

    assert len(artifacts.batch.predictions) == 2
    for prediction in artifacts.batch.predictions:
        assert prediction.predicted_return == prediction.base_predicted_return
        assert prediction.adjusted_predicted_return == prediction.base_predicted_return
        assert prediction.adjusted_confidence_score is not None
        assert prediction.confidence_label == classify_signal(predicted_return=prediction.base_predicted_return).confidence_label
        assert prediction.event_risk == 'high'
        assert prediction.calibration_reason_codes == []
        assert prediction.calibration_status == 'model_invalid'

    assert {setup.portfolio_action for setup in artifacts.setups} == {'BUY', 'SELL'}


def test_build_dashboard_artifacts_falls_back_when_overlay_validation_fails(monkeypatch, tmp_path):
    from stokz_forecast import pipeline

    _patch_base_forecasts(monkeypatch, 0.006, -0.006)
    model_path = tmp_path / 'models' / 'calibration-model.json'
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.write_text(json.dumps({'stub': True}), encoding='utf-8')

    monkeypatch.setattr(pipeline, 'load_overlay_model', lambda path: {'stub': True}, raising=False)

    def _raise_value_error(*args, **kwargs):
        raise ValueError('invalid model')

    monkeypatch.setattr(pipeline, 'apply_overlay_model', _raise_value_error, raising=False)

    artifacts = build_dashboard_artifacts(
        settings=_settings(calibration_enabled=True, calibration_model_path=model_path),
        bars_loader=lambda *args, **kwargs: _fake_bars(),
        portfolio=_portfolio(),
        research_context_builder=_fake_research_context,
    )

    assert len(artifacts.batch.predictions) == 2
    for prediction in artifacts.batch.predictions:
        assert prediction.predicted_return == prediction.base_predicted_return
        assert prediction.calibration_status == 'model_invalid'


def test_build_dashboard_artifacts_does_not_swallow_unexpected_overlay_errors(monkeypatch, tmp_path):
    from stokz_forecast import pipeline

    _patch_base_forecasts(monkeypatch, 0.006, -0.006)
    model_path = tmp_path / 'models' / 'calibration-model.json'
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.write_text(json.dumps({'stub': True}), encoding='utf-8')

    monkeypatch.setattr(pipeline, 'load_overlay_model', lambda path: {'stub': True}, raising=False)

    def _raise_runtime_error(*args, **kwargs):
        raise RuntimeError('unexpected overlay bug')

    monkeypatch.setattr(pipeline, 'apply_overlay_model', _raise_runtime_error, raising=False)

    with pytest.raises(RuntimeError, match='unexpected overlay bug'):
        build_dashboard_artifacts(
            settings=_settings(calibration_enabled=True, calibration_model_path=model_path),
            bars_loader=lambda *args, **kwargs: _fake_bars(),
            portfolio=_portfolio(),
            research_context_builder=_fake_research_context,
        )


def test_write_dashboard_artifacts_appends_calibration_history(tmp_path):
    artifacts = build_dashboard_artifacts(
        settings=_settings(calibration_enabled=True),
        bars_loader=lambda *args, **kwargs: _fake_bars(),
        portfolio=_portfolio(),
        research_context_builder=_fake_research_context,
    )
    paths = write_dashboard_artifacts(artifacts, output_dir=tmp_path)
    calibration_rows = json.loads(paths['calibration_history'].read_text(encoding='utf-8'))

    assert len(calibration_rows) == 2
    assert {row['ticker'] for row in calibration_rows} == {'SMCI', 'DELL'}
    assert all('calibration_features' in row for row in calibration_rows)


def test_review_and_stock_detail_artifacts_include_calibration_fields(monkeypatch, tmp_path):
    from stokz_forecast import pipeline, reviews, stock_details

    _patch_base_forecasts(monkeypatch, 0.006, -0.006)
    model_path = tmp_path / 'models' / 'calibration-model.json'
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.write_text(json.dumps({'stub': True}), encoding='utf-8')

    monkeypatch.setattr(pipeline, 'load_overlay_model', lambda path: {'stub': True}, raising=False)

    def _fake_apply_overlay_model(model_artifact, feature_snapshot, base_predicted_return):
        if feature_snapshot['ticker'] == 'SMCI':
            return {
                'adjusted_predicted_return': 0.009,
                'adjusted_confidence_score': 0.91,
                'event_risk': 'moderate',
                'calibration_reason_codes': ['predicted_return', 'news_score'],
            }
        return {
            'adjusted_predicted_return': -0.004,
            'adjusted_confidence_score': 0.19,
            'event_risk': 'high',
            'calibration_reason_codes': ['community_score', 'days_to_earnings'],
        }

    monkeypatch.setattr(pipeline, 'apply_overlay_model', _fake_apply_overlay_model, raising=False)
    monkeypatch.setattr(reviews, '_fetch_news_items', lambda tickers, per_ticker=2, max_items=8: [])

    class _FakeTicker:
        def __init__(self, ticker: str):
            self.ticker = ticker
            self.fast_info = {}
            self.info = {
                'shortName': f'{ticker} Corp',
                'sector': 'Technology',
                'industry': 'Software',
            }
            self.calendar = {}

    monkeypatch.setattr(stock_details.yf, 'Ticker', lambda ticker: _FakeTicker(ticker))

    artifacts = build_dashboard_artifacts(
        settings=_settings(calibration_enabled=True, calibration_model_path=model_path),
        bars_loader=lambda *args, **kwargs: _fake_bars(),
        portfolio=_portfolio(),
        research_context_builder=_fake_research_context,
    )

    review = build_daily_review(artifacts)
    review_rows = review['topLongs'] + review['riskReductions'] + review['watchlist']
    review_by_ticker = {row['ticker']: row for row in review_rows}
    assert review_by_ticker['SMCI']['basePredictedReturn'] == pytest.approx(0.006)
    assert review_by_ticker['SMCI']['adjustedPredictedReturn'] == pytest.approx(0.009)
    assert review_by_ticker['SMCI']['calibrationEnabled'] is True
    assert review_by_ticker['SMCI']['calibrationModelVersion'] == 1
    assert review_by_ticker['SMCI']['calibrationStatus'] == 'applied'
    assert review_by_ticker['SMCI']['eventRisk'] == 'moderate'
    assert review_by_ticker['SMCI']['calibrationReasons'] == ['predicted_return', 'news_score']

    stock_rows = build_stock_detail_records(artifacts)
    stock_by_ticker = {row['ticker']: row for row in stock_rows}
    assert stock_by_ticker['SMCI']['basePredictedReturn'] == pytest.approx(0.006)
    assert stock_by_ticker['SMCI']['adjustedPredictedReturn'] == pytest.approx(0.009)
    assert stock_by_ticker['SMCI']['calibrationEnabled'] is True
    assert stock_by_ticker['SMCI']['calibrationModelVersion'] == 1
    assert stock_by_ticker['SMCI']['calibrationStatus'] == 'applied'
    assert stock_by_ticker['SMCI']['eventRisk'] == 'moderate'
    assert stock_by_ticker['SMCI']['calibrationReasons'] == ['predicted_return', 'news_score']
