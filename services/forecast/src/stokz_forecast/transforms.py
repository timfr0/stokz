from __future__ import annotations

import math

import pandas as pd

from .data_models import DailyBar, ReturnObservation


def coerce_daily_bars(payload: list[DailyBar] | pd.DataFrame) -> list[DailyBar]:
    if isinstance(payload, pd.DataFrame):
        frame = payload.copy()
        if frame.empty:
            return []
        return [
            DailyBar(
                ticker=str(row['ticker']),
                trade_date=pd.Timestamp(row['trade_date']).date(),
                open=float(row['open']) if pd.notna(row.get('open')) else None,
                high=float(row['high']) if pd.notna(row.get('high')) else None,
                low=float(row['low']) if pd.notna(row.get('low')) else None,
                close=float(row['close']),
                volume=int(row['volume']) if pd.notna(row.get('volume')) else None,
            )
            for row in frame.to_dict(orient='records')
        ]
    return payload


def bars_to_frame(bars: list[DailyBar]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                'ticker': bar.ticker,
                'trade_date': bar.trade_date,
                'open': bar.open,
                'high': bar.high,
                'low': bar.low,
                'close': bar.close,
                'volume': bar.volume,
            }
            for bar in bars
        ]
    )


def compute_log_returns(frame: pd.DataFrame) -> pd.DataFrame:
    if 'close' not in frame.columns:
        raise ValueError("compute_log_returns requires a 'close' column")

    output = frame.copy()
    if 'trade_date' in frame.columns:
        output = output.sort_values('trade_date')
    output['log_return'] = output['close'].apply(float).pipe(lambda close: close / close.shift(1)).apply(
        lambda ratio: math.log(ratio) if pd.notna(ratio) else ratio
    )
    return output


def build_return_observations(bars: list[DailyBar] | pd.DataFrame) -> list[ReturnObservation]:
    daily_bars = coerce_daily_bars(bars)
    frame = bars_to_frame(daily_bars)
    if frame.empty:
        return []
    output = compute_log_returns(frame)
    filtered = output.dropna(subset=['log_return'])
    return [
        ReturnObservation(
            ticker=str(row['ticker']),
            trade_date=pd.Timestamp(row['trade_date']).date(),
            log_return=float(row['log_return']),
        )
        for row in filtered.to_dict(orient='records')
    ]
