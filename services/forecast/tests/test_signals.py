from stokz_forecast.signals import classify_signal


def test_classify_signal_returns_long_when_prediction_clears_threshold():
    signal = classify_signal(predicted_return=0.012, threshold=0.001)
    assert signal.direction == 'LONG'


def test_classify_signal_returns_flat_inside_threshold():
    signal = classify_signal(predicted_return=0.0002, threshold=0.001)
    assert signal.direction == 'FLAT'
