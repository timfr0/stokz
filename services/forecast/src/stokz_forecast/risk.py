from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class RiskAssessment:
    risk_level: str
    trade_posture: str
    flags: list[str]
    recommendation: str

    def to_record(self) -> dict[str, Any]:
        return asdict(self)


def assess_risk(market_context: dict[str, Any], horizon_summary: dict[int, dict[str, float]]) -> RiskAssessment:
    one_day_hit_rate = float(horizon_summary.get(1, {}).get('hit_rate', 0.0))
    three_day_mae = float(horizon_summary.get(3, {}).get('mae', 0.0))
    spy_regime = market_context['broad_market']['spy_context']['regime']

    flags: list[str] = []
    if one_day_hit_rate < 0.5:
        flags.append('1D accuracy is weak, so avoid over-trusting short-horizon BUY signals.')
    if three_day_mae > 0.02:
        flags.append('3D error is elevated, so farther-out targets should be treated as context only.')
    if 'risk-on' not in spy_regime:
        flags.append('Broad tape is not clearly supportive, so fresh longs deserve tighter thresholds.')

    if flags:
        return RiskAssessment(
            risk_level='guarded',
            trade_posture='selective',
            flags=flags,
            recommendation='Favor higher-quality setups, keep thresholds bounded, and do not loosen risk controls just because the board looks active.',
        )

    return RiskAssessment(
        risk_level='moderate',
        trade_posture='balanced',
        flags=['No major risk escalation from current review metrics.'],
        recommendation='Normal review posture is acceptable, but still avoid aggressive threshold jumps on a single day of evidence.',
    )
