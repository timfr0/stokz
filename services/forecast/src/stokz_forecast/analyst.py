from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


@dataclass(frozen=True)
class AnalystDecision:
    decision: str
    confidence: str
    evidence_quality: str
    rationale: str
    approved_adjustments: list[dict[str, Any]]
    deferred_adjustments: list[dict[str, Any]]

    def to_record(self) -> dict[str, Any]:
        return asdict(self)


def evaluate_tomorrow_adjustments(
    horizon_summary: dict[int, dict[str, float]],
    proposed_adjustments: list[dict[str, Any]],
) -> AnalystDecision:
    one_day = horizon_summary.get(1, {})
    three_day = horizon_summary.get(3, {})
    hit_rate = float(one_day.get('hit_rate', 0.0))
    three_day_mae = float(three_day.get('mae', 0.0))
    sample_count = float(one_day.get('samples', 0.0))

    approved: list[dict[str, Any]] = []
    deferred: list[dict[str, Any]] = []

    for adjustment in proposed_adjustments:
        parameter = adjustment.get('parameter')
        if sample_count < 3:
            deferred.append({**adjustment, 'analyst_note': 'Not enough rolling samples yet.'})
            continue
        if parameter == 'buy_threshold' and hit_rate >= 0.55:
            deferred.append({**adjustment, 'analyst_note': '1D hit rate is not weak enough to justify immediate tightening.'})
            continue
        if parameter == 'horizon_weight_3d' and three_day_mae <= 0.02:
            deferred.append({**adjustment, 'analyst_note': '3D MAE is not yet bad enough to force a weighting cut.'})
            continue
        approved.append(adjustment)

    if approved and not deferred:
        return AnalystDecision(
            decision='approve',
            confidence='medium',
            evidence_quality='moderate',
            rationale='Rolling metrics support the proposed bounded changes without obvious overreaction.',
            approved_adjustments=approved,
            deferred_adjustments=deferred,
        )

    if approved and deferred:
        return AnalystDecision(
            decision='partial',
            confidence='medium',
            evidence_quality='mixed',
            rationale='Some adjustments are justified, but others need more samples or stronger evidence.',
            approved_adjustments=approved,
            deferred_adjustments=deferred,
        )

    return AnalystDecision(
        decision='defer',
        confidence='medium',
        evidence_quality='limited',
        rationale='The system should keep collecting evidence before changing thresholds or weights.',
        approved_adjustments=approved,
        deferred_adjustments=deferred,
    )
