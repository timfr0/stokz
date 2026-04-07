from datetime import date

import pandas as pd

from stokz_forecast.data_sources import load_daily_bars


def test_load_daily_bars_normalizes_single_ticker_output():
    frame = pd.DataFrame(
        {
            'Open': [100.0, 101.5],
            'High': [102.0, 103.0],
            'Low': [99.5, 100.5],
            'Close': [101.0, 102.75],
            'Volume': [1_000_000, 1_250_000],
        },
        index=pd.to_datetime(['2026-04-01', '2026-04-02']),
    )

    def fake_download(*args, **kwargs):
        return frame

    bars = load_daily_bars(
        tickers=['smci'],
        lookback_days=30,
        end_date=date(2026, 4, 2),
        auto_adjust=True,
        download_fn=fake_download,
    )

    assert list(bars.columns) == ['ticker', 'trade_date', 'open', 'high', 'low', 'close', 'volume']
    assert bars['ticker'].tolist() == ['SMCI', 'SMCI']
    assert bars['trade_date'].astype(str).tolist() == ['2026-04-01', '2026-04-02']
    assert bars['close'].tolist() == [101.0, 102.75]
