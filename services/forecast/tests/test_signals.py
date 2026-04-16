from datetime import date

from stokz_forecast.data_models import ForecastPrediction
from stokz_forecast.portfolio import Holding, PortfolioSnapshot
from stokz_forecast.signals import build_setup_recommendation, classify_signal


def test_classify_signal_returns_long_when_prediction_clears_threshold():
    signal = classify_signal(predicted_return=0.012, threshold=0.001)
    assert signal.direction == 'LONG'


def test_classify_signal_returns_flat_inside_threshold():
    signal = classify_signal(predicted_return=0.0002, threshold=0.001)
    assert signal.direction == 'FLAT'


def test_classify_signal_prefers_adjusted_confidence_score_when_present():
    signal = classify_signal(predicted_return=0.006, threshold=0.001, confidence_score=0.92)

    assert signal.direction == 'LONG'
    assert signal.confidence_label == 'high'
    assert signal.is_actionable is True


def test_build_setup_recommendation_uses_adjusted_values_for_actionability_and_keeps_base_values():
    prediction = ForecastPrediction(
        ticker='DELL',
        as_of_date=date(2026, 4, 5),
        target_date=date(2026, 4, 6),
        predicted_return=-0.004,
        predicted_direction='bearish',
        baseline_return=0.003,
        model_name='timesfm',
        confidence_label='low',
        signal_direction='SHORT',
        base_predicted_return=0.012,
        adjusted_predicted_return=-0.004,
        adjusted_confidence_score=0.18,
        event_risk='high',
        calibration_reason_codes=['delta_return', 'community_score'],
        calibration_enabled=True,
        calibration_status='applied',
        calibration_features={'predicted_return': 0.012},
        metadata_json={},
    )
    portfolio = PortfolioSnapshot(
        as_of_date=date(2026, 4, 5),
        holdings=[Holding(ticker='DELL', shares=16)],
        watchlist=('DELL',),
    )

    setup = build_setup_recommendation(
        prediction=prediction,
        portfolio=portfolio,
        current_price=103.9,
        realized_volatility=0.02,
    )

    assert setup.portfolio_action == 'SELL'
    assert setup.predicted_return == -0.004
    assert setup.base_predicted_return == 0.012
    assert setup.adjusted_predicted_return == -0.004
    assert setup.adjusted_confidence_score == 0.18
    assert setup.event_risk == 'high'
    assert setup.calibration_reason_codes == ['delta_return', 'community_score']
