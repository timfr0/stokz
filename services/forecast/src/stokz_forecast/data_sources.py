from __future__ import annotations

from collections.abc import Callable
from datetime import date, timedelta

import pandas as pd
import yfinance as yf

from .config import Settings
from .data_models import DailyBar

DownloadFn = Callable[..., pd.DataFrame]
NORMALIZED_COLUMNS = ['ticker', 'trade_date', 'open', 'high', 'low', 'close', 'volume']


def _default_downloader(ticker: str, start: date, end: date, auto_adjust: bool) -> pd.DataFrame:
    return yf.download(
        tickers=ticker,
        start=start.isoformat(),
        end=end.isoformat(),
        interval='1d',
        auto_adjust=auto_adjust,
        progress=False,
        group_by='column',
        threads=False,
    )


def _flatten_columns(frame: pd.DataFrame) -> pd.DataFrame:
    output = frame.copy()
    if isinstance(output.columns, pd.MultiIndex):
        flattened: list[str] = []
        for column in output.columns:
            parts = [str(part) for part in column if str(part)]
            flattened.append(parts[0] if parts else 'value')
        output.columns = flattened
    output.columns = [str(column).strip().lower() for column in output.columns]
    return output


def _normalize_history_frame(frame: pd.DataFrame, ticker: str) -> pd.DataFrame:
    if frame.empty:
        return pd.DataFrame(columns=NORMALIZED_COLUMNS)

    normalized = _flatten_columns(frame).reset_index()
    normalized.columns = [str(column).strip().lower() for column in normalized.columns]
    date_column = 'date' if 'date' in normalized.columns else 'datetime' if 'datetime' in normalized.columns else 'index'
    normalized = normalized.rename(columns={date_column: 'trade_date'})

    output = pd.DataFrame(
        {
            'ticker': ticker.upper(),
            'trade_date': pd.to_datetime(normalized['trade_date']).dt.date,
            'open': pd.to_numeric(normalized.get('open'), errors='coerce'),
            'high': pd.to_numeric(normalized.get('high'), errors='coerce'),
            'low': pd.to_numeric(normalized.get('low'), errors='coerce'),
            'close': pd.to_numeric(normalized.get('close'), errors='coerce'),
            'volume': pd.to_numeric(normalized.get('volume'), errors='coerce'),
        }
    )
    return output.dropna(subset=['close']).sort_values('trade_date').reset_index(drop=True)[NORMALIZED_COLUMNS]


def frame_to_daily_bars(frame: pd.DataFrame) -> list[DailyBar]:
    return [
        DailyBar(
            ticker=str(row['ticker']),
            trade_date=pd.Timestamp(row['trade_date']).date(),
            open=float(row['open']) if pd.notna(row['open']) else None,
            high=float(row['high']) if pd.notna(row['high']) else None,
            low=float(row['low']) if pd.notna(row['low']) else None,
            close=float(row['close']),
            volume=int(row['volume']) if pd.notna(row['volume']) else None,
        )
        for row in frame.to_dict(orient='records')
    ]


def _load_daily_bars_frame(
    tickers: list[str] | tuple[str, ...],
    lookback_days: int,
    end_date: date | None = None,
    auto_adjust: bool = True,
    download_fn: DownloadFn | None = None,
) -> pd.DataFrame:
    effective_end = end_date or date.today()
    start_date = effective_end - timedelta(days=max(lookback_days * 2, lookback_days + 14))
    download = download_fn or _default_downloader

    frames: list[pd.DataFrame] = []
    for symbol in tickers:
        raw = download(
            ticker=str(symbol).upper(),
            start=start_date,
            end=effective_end + timedelta(days=1),
            auto_adjust=auto_adjust,
        )
        normalized = _normalize_history_frame(raw, ticker=str(symbol))
        if not normalized.empty:
            frames.append(normalized.tail(lookback_days))

    if not frames:
        return pd.DataFrame(columns=NORMALIZED_COLUMNS)

    return pd.concat(frames, ignore_index=True).sort_values(['ticker', 'trade_date']).reset_index(drop=True)


def load_daily_bars(
    tickers: list[str] | tuple[str, ...] | None = None,
    lookback_days: int | None = None,
    end_date: date | None = None,
    auto_adjust: bool = True,
    download_fn: DownloadFn | None = None,
    *,
    ticker: str | None = None,
    settings: Settings | None = None,
    downloader: DownloadFn | None = None,
):
    if settings is not None or ticker is not None:
        if settings is None or ticker is None:
            raise TypeError('ticker and settings must be provided together')
        frame = _load_daily_bars_frame(
            tickers=[ticker.upper()],
            lookback_days=settings.data_lookback_days,
            end_date=end_date,
            auto_adjust=settings.data_auto_adjust,
            download_fn=downloader or download_fn,
        )
        return frame_to_daily_bars(frame)

    if tickers is None or lookback_days is None:
        raise TypeError('load_daily_bars requires either tickers/lookback_days or ticker/settings inputs')

    return _load_daily_bars_frame(
        tickers=tickers,
        lookback_days=lookback_days,
        end_date=end_date,
        auto_adjust=auto_adjust,
        download_fn=download_fn,
    )