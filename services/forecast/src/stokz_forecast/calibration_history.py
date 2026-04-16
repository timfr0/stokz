from __future__ import annotations

import math
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import pandas as pd

from .data_models import ForecastPrediction
from .evaluation import read_json_array, write_json_array


def build_feature_rows(predictions: list[ForecastPrediction]) -> list[dict[str, Any]]:
    recorded_at = datetime.now(UTC).isoformat()
    rows: list[dict[str, Any]] = []
    for prediction in predictions:
        row = {
            'ticker': prediction.ticker,
            'as_of_date': prediction.as_of_date.isoformat(),
            'target_date': prediction.target_date.isoformat(),
            'predicted_return': round(prediction.predicted_return, 6),
            'base_predicted_return': round(
                prediction.base_predicted_return if prediction.base_predicted_return is not None else prediction.predicted_return,
                6,
            ),
            'adjusted_predicted_return': round(
                prediction.adjusted_predicted_return if prediction.adjusted_predicted_return is not None else prediction.predicted_return,
                6,
            ),
            'adjusted_confidence_score': round(prediction.adjusted_confidence_score, 6)
            if prediction.adjusted_confidence_score is not None
            else None,
            'event_risk': prediction.event_risk,
            'calibration_reason_codes': prediction.calibration_reason_codes,
            'baseline_return': round(prediction.baseline_return, 6),
            'calibration_enabled': prediction.calibration_enabled,
            'calibration_status': prediction.calibration_status,
            'calibration_features': prediction.calibration_features,
            'recorded_at': recorded_at,
        }
        for key, value in prediction.calibration_features.items():
            row.setdefault(key, value)
        rows.append(row)
    return rows


def read_feature_rows(path: Path) -> list[dict[str, Any]]:
    return read_json_array(path)


def append_feature_rows(path: Path, rows: list[dict[str, Any]]) -> Path:
    existing = read_feature_rows(path)
    merged: dict[tuple[str, str, str], dict[str, Any]] = {}
    for row in existing:
        key = (str(row.get('ticker')), str(row.get('as_of_date')), str(row.get('target_date')))
        merged[key] = row
    for row in rows:
        key = (str(row.get('ticker')), str(row.get('as_of_date')), str(row.get('target_date')))
        merged[key] = row

    ordered_rows = sorted(merged.values(), key=lambda row: (str(row.get('as_of_date')), str(row.get('ticker')), str(row.get('target_date'))))
    write_json_array(path, ordered_rows)
    return path


def _normalize_price_frame(price_frame: pd.DataFrame) -> pd.DataFrame:
    if price_frame.empty:
        return pd.DataFrame(columns=['ticker', 'trade_date', 'close'])

    frame = price_frame.copy()
    frame['ticker'] = frame['ticker'].astype(str).str.upper()
    frame['trade_date'] = pd.to_datetime(frame['trade_date']).dt.date
    frame['close'] = pd.to_numeric(frame['close'], errors='coerce')
    return frame.dropna(subset=['close']).sort_values(['ticker', 'trade_date']).reset_index(drop=True)[['ticker', 'trade_date', 'close']]


def _direction_hit(predicted_return: float, realized_return: float, threshold: float = 0.001) -> int:
    if abs(predicted_return) <= threshold and abs(realized_return) <= threshold:
        return 1
    if predicted_return > threshold and realized_return > 0:
        return 1
    if predicted_return < -threshold and realized_return < 0:
        return 1
    return 0


def _derive_event_risk_target(predicted_return: float, realized_return: float, realized_volatility: float | None) -> str:
    expected_move = max(abs(predicted_return), abs(realized_volatility or 0.0), 0.01)
    actual_move = abs(realized_return)
    if actual_move >= max(expected_move * 1.8, 0.04):
        return 'high'
    if actual_move >= max(expected_move * 1.2, 0.02):
        return 'moderate'
    return 'low'


def attach_realized_outcomes(rows: list[dict[str, Any]], price_frame: pd.DataFrame) -> list[dict[str, Any]]:
    normalized_prices = _normalize_price_frame(price_frame)
    by_ticker: dict[str, pd.DataFrame] = {
        ticker: group.reset_index(drop=True)
        for ticker, group in normalized_prices.groupby('ticker', sort=False)
    }
    resolved_at = datetime.now(UTC).isoformat()
    updated_rows: list[dict[str, Any]] = []

    for row in rows:
        if row.get('actual_return_1d') is not None:
            updated_rows.append(row)
            continue

        ticker = str(row.get('ticker', '')).upper()
        as_of_raw = row.get('as_of_date')
        if not ticker or not as_of_raw or ticker not in by_ticker:
            updated_rows.append(row)
            continue

        ticker_prices = by_ticker[ticker]
        as_of_date = date.fromisoformat(str(as_of_raw))
        current_match = ticker_prices.loc[ticker_prices['trade_date'] == as_of_date]
        if current_match.empty:
            updated_rows.append(row)
            continue

        next_match = ticker_prices.loc[ticker_prices['trade_date'] > as_of_date].head(1)
        if next_match.empty:
            updated_rows.append(row)
            continue

        current_close = float(current_match.iloc[-1]['close'])
        next_close = float(next_match.iloc[0]['close'])
        realized_return = math.log(next_close / current_close)
        predicted_return = float(row.get('base_predicted_return') or row.get('predicted_return') or 0.0)
        realized_volatility = row.get('realized_volatility')
        if realized_volatility is None and isinstance(row.get('calibration_features'), dict):
            realized_volatility = row['calibration_features'].get('realized_volatility')

        updated = dict(row)
        updated['resolved_target_date'] = next_match.iloc[0]['trade_date'].isoformat()
        updated['actual_return_1d'] = round(realized_return, 6)
        updated['delta_return_target'] = round(realized_return - predicted_return, 6)
        updated['hit_label'] = _direction_hit(predicted_return, realized_return)
        updated['event_risk_target'] = _derive_event_risk_target(predicted_return, realized_return, float(realized_volatility) if realized_volatility is not None else None)
        updated['resolved_at'] = resolved_at
        updated_rows.append(updated)

    return updated_rows


def summarize_feature_history(rows: list[dict[str, Any]]) -> dict[str, Any]:
    labeled_rows = [row for row in rows if row.get('actual_return_1d') is not None]
    latest_as_of_date = max((str(row.get('as_of_date')) for row in rows), default=None)
    return {
        'feature_row_count': len(rows),
        'labeled_row_count': len(labeled_rows),
        'latest_as_of_date': latest_as_of_date,
    }


def write_labeled_rows(path: Path, rows: list[dict[str, Any]]) -> Path:
    write_json_array(path, rows)
    return path
