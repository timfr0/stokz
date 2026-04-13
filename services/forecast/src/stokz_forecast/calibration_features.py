from __future__ import annotations

from datetime import date
from typing import Any, Sequence


_EVENT_RISK_SCORES = {'low': 0, 'moderate': 1, 'high': 2}
_DIRECTION_SCORES = {'bearish': -1, 'neutral': 0, 'bullish': 1}


def compute_trend_window_returns(closes: Sequence[float]) -> tuple[float | None, float | None]:
    if len(closes) < 2:
        return None, None

    last = float(closes[-1])
    short_term = (last / float(closes[-6]) - 1) if len(closes) >= 6 and closes[-6] else None
    medium_term = (last / float(closes[-21]) - 1) if len(closes) >= 21 and closes[-21] else None
    return short_term, medium_term


def build_feature_snapshot(
    *,
    ticker: str,
    predicted_return: float,
    baseline_return: float,
    realized_volatility: float,
    short_trend: float | None,
    medium_trend: float | None,
    days_to_earnings: int | None,
    news_score: int,
    community_score: int,
    predicted_direction: str = 'neutral',
    event_risk: str = 'low',
    news_bias: str = 'mixed',
    community_label: str = 'mixed',
    news_count: int = 0,
    community_count: int = 0,
    as_of_date: date | str | None = None,
    target_date: date | str | None = None,
) -> dict[str, Any]:
    def _normalize_date(value: date | str | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return value.isoformat()

    return {
        'feature_version': 1,
        'ticker': ticker,
        'as_of_date': _normalize_date(as_of_date),
        'target_date': _normalize_date(target_date),
        'predicted_return': round(float(predicted_return), 6),
        'baseline_return': round(float(baseline_return), 6),
        'realized_volatility': round(float(realized_volatility), 6),
        'short_trend': round(float(short_trend), 6) if short_trend is not None else None,
        'medium_trend': round(float(medium_trend), 6) if medium_trend is not None else None,
        'days_to_earnings': days_to_earnings,
        'news_score': int(news_score),
        'community_score': int(community_score),
        'news_count': int(news_count),
        'community_count': int(community_count),
        'event_risk': event_risk,
        'event_risk_score': _EVENT_RISK_SCORES.get(event_risk, 0),
        'predicted_direction': predicted_direction,
        'direction_score': _DIRECTION_SCORES.get(predicted_direction, 0),
        'news_bias': news_bias,
        'community_label': community_label,
    }
