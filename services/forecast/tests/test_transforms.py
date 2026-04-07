import math

import pandas as pd

from stokz_forecast.transforms import compute_log_returns


def test_compute_log_returns_adds_expected_values():
    df = pd.DataFrame({'close': [100.0, 110.0]})
    out = compute_log_returns(df)
    assert round(float(out.loc[1, 'log_return']), 6) == round(math.log(1.1), 6)
