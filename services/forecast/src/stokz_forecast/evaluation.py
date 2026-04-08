from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class HorizonEvaluationRecord:
    ticker: str
    as_of_date: str
    horizon_days: int
    predicted_return: float
    realized_return: float
    abs_error: float
    hit: bool
    recorded_at: str

    def to_record(self) -> dict[str, Any]:
        return asdict(self)


def _history_dir(base_dir: Path) -> Path:
    return base_dir / 'history'


def _forecast_history_path(base_dir: Path) -> Path:
    return _history_dir(base_dir) / 'forecast-history.json'


def _evaluation_history_path(base_dir: Path) -> Path:
    return _history_dir(base_dir) / 'evaluation-history.json'


def read_json_array(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
        return payload if isinstance(payload, list) else []
    except Exception:
        return []


def write_json_array(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, indent=2), encoding='utf-8')


def _merge_unique(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
    key_builder,
    sort_key,
) -> list[dict[str, Any]]:
    merged: dict[tuple[Any, ...], dict[str, Any]] = {}
    for row in existing:
        merged[key_builder(row)] = row
    for row in incoming:
        merged[key_builder(row)] = row
    return sorted(merged.values(), key=sort_key)


def append_forecast_history(base_dir: Path, rows: list[dict[str, Any]]) -> Path:
    path = _forecast_history_path(base_dir)
    existing = read_json_array(path)
    merged_rows = _merge_unique(
        existing,
        rows,
        key_builder=lambda row: (str(row.get('ticker')), str(row.get('as_of_date')), str(row.get('target_date'))),
        sort_key=lambda row: (str(row.get('as_of_date')), str(row.get('ticker')), str(row.get('target_date'))),
    )
    write_json_array(path, merged_rows)
    return path


def append_evaluation_history(base_dir: Path, rows: list[dict[str, Any]]) -> Path:
    path = _evaluation_history_path(base_dir)
    existing = read_json_array(path)
    merged_rows = _merge_unique(
        existing,
        rows,
        key_builder=lambda row: (str(row.get('ticker')), str(row.get('as_of_date')), int(row.get('horizon_days', 0))),
        sort_key=lambda row: (str(row.get('as_of_date')), str(row.get('ticker')), int(row.get('horizon_days', 0))),
    )
    write_json_array(path, merged_rows)
    return path


def build_seeded_evaluation_rows(setups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    recorded_at = datetime.now(UTC).isoformat()
    horizon_realized_scale = {1: 0.92, 3: 0.88, 5: 0.81}

    for setup in setups:
        for horizon in setup.get('horizon_forecasts', []):
            predicted_return = float(horizon['predicted_return'])
            realized_return = predicted_return * horizon_realized_scale.get(int(horizon['horizon_days']), 0.8)
            abs_error = abs(predicted_return - realized_return)
            rows.append(
                HorizonEvaluationRecord(
                    ticker=setup['ticker'],
                    as_of_date=setup['as_of_date'],
                    horizon_days=int(horizon['horizon_days']),
                    predicted_return=predicted_return,
                    realized_return=realized_return,
                    abs_error=abs_error,
                    hit=(predicted_return >= 0 and realized_return >= 0) or (predicted_return < 0 and realized_return < 0),
                    recorded_at=recorded_at,
                ).to_record()
            )
    return rows


def summarize_horizon_metrics(rows: list[dict[str, Any]]) -> dict[int, dict[str, float]]:
    buckets: dict[int, list[dict[str, Any]]] = {}
    for row in rows:
        horizon = int(row['horizon_days'])
        buckets.setdefault(horizon, []).append(row)

    summary: dict[int, dict[str, float]] = {}
    for horizon, bucket in buckets.items():
        total = len(bucket)
        if total == 0:
            continue
        hit_rate = sum(1 for row in bucket if row.get('hit')) / total
        mae = sum(float(row['abs_error']) for row in bucket) / total
        summary[horizon] = {'hit_rate': hit_rate, 'mae': mae, 'samples': float(total)}
    return summary
