import math
from pathlib import Path

import pandas as pd

from stokz_forecast.calibration_history import append_feature_rows, attach_realized_outcomes, read_feature_rows


def test_append_feature_rows_merges_on_ticker_and_as_of_date(tmp_path: Path):
    path = tmp_path / 'calibration-history.json'
    append_feature_rows(path, [{'ticker': 'AMD', 'as_of_date': '2026-04-10', 'target_date': '2026-04-11', 'predicted_return': 0.01}])
    append_feature_rows(path, [{'ticker': 'AMD', 'as_of_date': '2026-04-10', 'target_date': '2026-04-11', 'predicted_return': 0.02}])
    rows = read_feature_rows(path)
    assert len(rows) == 1
    assert rows[0]['predicted_return'] == 0.02


def test_attach_realized_outcomes_sets_delta_return_and_hit_label():
    rows = [
        {
            'ticker': 'AMD',
            'as_of_date': '2026-04-10',
            'target_date': '2026-04-11',
            'predicted_return': 0.01,
            'base_predicted_return': 0.01,
            'realized_volatility': 0.015,
        }
    ]
    price_frame = pd.DataFrame(
        [
            {'ticker': 'AMD', 'trade_date': '2026-04-10', 'close': 100.0},
            {'ticker': 'AMD', 'trade_date': '2026-04-11', 'close': 110.0},
        ]
    )

    updated_rows = attach_realized_outcomes(rows, price_frame)

    assert updated_rows[0]['actual_return_1d'] > 0
    assert updated_rows[0]['delta_return_target'] > 0
    assert updated_rows[0]['hit_label'] == 1
    assert updated_rows[0]['event_risk_target'] == 'high'
    assert updated_rows[0]['resolved_target_date'] == '2026-04-11'


def test_attach_realized_outcomes_resolves_to_target_horizon_not_next_trading_day():
    rows = [
        {
            'ticker': 'AMD',
            'as_of_date': '2026-04-10',
            'target_date': '2026-04-12',
            'predicted_return': 0.01,
            'base_predicted_return': 0.01,
        }
    ]
    price_frame = pd.DataFrame(
        [
            {'ticker': 'AMD', 'trade_date': '2026-04-10', 'close': 100.0},
            {'ticker': 'AMD', 'trade_date': '2026-04-11', 'close': 101.0},
            {'ticker': 'AMD', 'trade_date': '2026-04-14', 'close': 105.0},
        ]
    )

    updated_rows = attach_realized_outcomes(rows, price_frame)

    assert updated_rows[0]['resolved_target_date'] == '2026-04-14'
    assert math.isclose(updated_rows[0]['actual_return_1d'], round(math.log(105.0 / 100.0), 6), rel_tol=0.0, abs_tol=1e-9)


def test_attach_realized_outcomes_preserves_zero_base_prediction():
    rows = [
        {
            'ticker': 'AMD',
            'as_of_date': '2026-04-10',
            'target_date': '2026-04-11',
            'predicted_return': 0.03,
            'base_predicted_return': 0.0,
        }
    ]
    price_frame = pd.DataFrame(
        [
            {'ticker': 'AMD', 'trade_date': '2026-04-10', 'close': 100.0},
            {'ticker': 'AMD', 'trade_date': '2026-04-11', 'close': 100.0},
        ]
    )

    updated_rows = attach_realized_outcomes(rows, price_frame)

    assert updated_rows[0]['actual_return_1d'] == 0.0
    assert updated_rows[0]['delta_return_target'] == 0.0
