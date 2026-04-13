from stokz_forecast.calibration_features import build_feature_snapshot, compute_trend_window_returns


def test_build_feature_snapshot_includes_base_prediction_and_sentiment_inputs():
    snapshot = build_feature_snapshot(
        ticker='AMD',
        predicted_return=0.012,
        baseline_return=0.008,
        realized_volatility=0.024,
        short_trend=0.03,
        medium_trend=0.09,
        days_to_earnings=6,
        news_score=2,
        community_score=1,
        predicted_direction='bullish',
        event_risk='moderate',
    )

    assert snapshot['predicted_return'] == 0.012
    assert snapshot['baseline_return'] == 0.008
    assert snapshot['days_to_earnings'] == 6
    assert snapshot['news_score'] == 2
    assert snapshot['event_risk'] == 'moderate'
    assert snapshot['direction_score'] == 1


def test_compute_trend_window_returns_returns_short_and_medium_windows():
    closes = [float(value) for value in range(100, 126)]
    short_trend, medium_trend = compute_trend_window_returns(closes)

    assert short_trend is not None
    assert medium_trend is not None
    assert short_trend > 0
    assert medium_trend > 0
