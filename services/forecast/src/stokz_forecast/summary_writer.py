from __future__ import annotations

from typing import Any


def build_operator_summary(review_payload: dict[str, Any]) -> str:
    analyst = review_payload['analyst_decision']
    top_hits = review_payload['top_hits']
    top_misses = review_payload['top_misses']

    lines = [
        f"Stokz daily review, {review_payload['review_date']}",
        f"SPY regime: {review_payload['market_context']['broad_market']['spy_context']['regime']}",
        f"Analyst decision: {analyst['decision']} ({analyst['evidence_quality']})",
        'Top hits:',
    ]
    for item in top_hits[:3]:
        lines.append(f"- {item['ticker']} {item['portfolio_action']} target {item['target_close']:.2f}")
    lines.append('Watch-outs:')
    for item in top_misses[:3]:
        lines.append(f"- {item['ticker']} needs caution on extended horizon trust")
    return '\n'.join(lines)


def build_5pm_report(review_payload: dict[str, Any]) -> str:
    analyst = review_payload['analyst_decision']
    risk = review_payload['risk_assessment']
    top_hits = review_payload['top_hits']
    top_misses = review_payload['top_misses']
    adjustments = review_payload['tomorrow_config']['adjustments']

    lines = [
        f"Stokz 5 PM report, {review_payload['review_date']}",
        f"SPY regime: {review_payload['market_context']['broad_market']['spy_context']['regime']} ({review_payload['market_context']['broad_market']['spy_context']['estimated_daily_move']})",
        f"Risk posture: {risk['trade_posture']} ({risk['risk_level']})",
        f"Analyst: {analyst['decision']} ({analyst['evidence_quality']})",
        '',
        'Best calls today:',
    ]
    for item in top_hits[:3]:
        lines.append(f"- {item['ticker']}: {item['portfolio_action']} | target {item['target_close']:.2f} | forecast {item['predicted_return']:+.2%}")
    lines.append('')
    lines.append('Biggest misses / caution:')
    for item in top_misses[:3]:
        lines.append(f"- {item['ticker']}: watch horizon drift and event sensitivity")
    lines.append('')
    lines.append('Tomorrow adjustments under review:')
    for adjustment in adjustments[:5]:
        lines.append(f"- {adjustment['parameter']}: {adjustment['direction']} — {adjustment['reason']}")
    return '\n'.join(lines)
