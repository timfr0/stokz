from stokz_forecast.baselines import predict_rolling_mean, predict_zero_return


def test_predict_zero_return_returns_zero():
    assert predict_zero_return([0.02, -0.01, 0.03]) == 0.0


def test_predict_rolling_mean_returns_recent_average():
    result = predict_rolling_mean([0.02, -0.01, 0.03], window=3)
    assert round(result, 6) == round((0.02 - 0.01 + 0.03) / 3, 6)
