from __future__ import annotations

from typing import Any


def propose_adjustments(horizon_summary: dict[int, dict[str, float]]) -> list[dict[str, Any]]:
    adjustments: list[dict[str, Any]] = []
    one_day = horizon_summary.get(1, {})
    three_day = horizon_summary.get(3, {})

    if float(one_day.get('hit_rate', 0.0)) < 0.55:
        adjustments.append(
            {
                'parameter': 'buy_threshold',
                'direction': 'tighten',
                'reason': '1D hit rate is soft, so require stronger upside before fresh BUY actions.',
            }
        )
    else:
        adjustments.append(
            {
                'parameter': 'buy_threshold',
                'direction': 'hold',
                'reason': '1D hit rate is acceptable, so keep short-horizon BUY logic stable.',
            }
        )

    if float(three_day.get('mae', 0.0)) > 0.02:
        adjustments.append(
            {
                'parameter': 'horizon_weight_3d',
                'direction': 'downweight',
                'reason': '3D MAE is elevated, so treat 3D as context instead of a lead trigger.',
            }
        )

    return adjustments
