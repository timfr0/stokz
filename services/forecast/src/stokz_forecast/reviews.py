from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from .data_models import DashboardArtifacts, SetupRecommendation


def _reviews_dir(base_dir: Path) -> Path:
    return base_dir / 'reviews'


def _round(value: float, digits: int = 4) -> float:
    return round(float(value), digits)


def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _entry_price_target(setup: SetupRecommendation) -> float:
    return round(setup.current_close * (1 - min(abs(setup.predicted_return) * 0.35, 0.03)), 2)


def _first_horizon_metric(setup: SetupRecommendation, field: str) -> float | None:
    horizon = next((item for item in setup.horizon_forecasts if item.horizon_days == 1), None)
    if horizon is None:
        return None
    return getattr(horizon, field)


def _map_setup(setup: SetupRecommendation) -> dict[str, Any]:
    return {
        'ticker': setup.ticker,
        'portfolioAction': setup.portfolio_action,
        'setupLabel': setup.setup_label,
        'predictedReturn': _round(setup.predicted_return, 6),
        'confidenceLabel': setup.confidence_label,
        'trendBias': setup.trend_bias,
        'convictionScore': int(setup.conviction_score),
        'currentClose': _round(setup.current_close),
        'entryPriceTarget': _entry_price_target(setup),
        'targetClose': _round(setup.target_close if setup.target_close is not None else setup.current_close),
        'oneDayHitRate': _first_horizon_metric(setup, 'measured_hit_rate'),
        'oneDayMae': _first_horizon_metric(setup, 'measured_mae'),
        'notes': setup.notes,
    }


def _market_regime(buy_count: int, sell_count: int, average_predicted_return: float) -> str:
    if buy_count >= sell_count + 2 and average_predicted_return > 0.0015:
        return 'constructive risk-on'
    if sell_count >= buy_count + 2 and average_predicted_return < -0.0015:
        return 'defensive tape'
    if average_predicted_return > 0:
        return 'selective upside bias'
    if average_predicted_return < 0:
        return 'cautious downside bias'
    return 'mixed tape'


def _analyst_decision(buy_count: int, sell_count: int, average_predicted_return: float) -> str:
    if buy_count > sell_count and average_predicted_return > 0:
        return 'Press the best longs, but keep entries disciplined.'
    if sell_count > buy_count and average_predicted_return < 0:
        return 'Trim weak exposure and keep new adds on a leash.'
    return 'Stay selective, the board is mixed rather than clean.'


def _risk_posture(buy_count: int, sell_count: int, hold_count: int) -> str:
    if sell_count >= 2:
        return 'Risk is not gone. Respect the trim list and do not turn watchlist names into forced trades.'
    if buy_count >= 4 and hold_count <= 3:
        return 'Constructive enough to add, but only on names with real confirmation and clean liquidity.'
    return 'Keep size honest, let the best setups earn more risk, and leave soft HOLD names alone.'


def _operator_summary(regime: str, buy_count: int, sell_count: int, average_hit_rate: float | None) -> str:
    hit_rate_text = f'{average_hit_rate * 100:.1f}% 1D hit rate' if average_hit_rate is not None else 'limited 1D hit-rate history'
    return (
        f'The board reads {regime}, with {buy_count} buy setups and {sell_count} risk-reduction names. '
        f'Current evaluation history shows {hit_rate_text}, so the edge looks real but still young.'
    )


def _next_session_plan(top_longs: list[SetupRecommendation], risk_reductions: list[SetupRecommendation]) -> str:
    buy_names = ', '.join(setup.ticker for setup in top_longs[:3]) or 'no standout longs'
    sell_names = ', '.join(setup.ticker for setup in risk_reductions[:2]) or 'no urgent trims'
    return f'Open with {buy_names} on the main board, keep {sell_names} marked for risk control, and let weaker holds prove themselves before touching them.'


def build_daily_review(artifacts: DashboardArtifacts) -> dict[str, Any]:
    setups = list(artifacts.setups)
    generated_at = datetime.now(UTC).isoformat()
    review_date = setups[0].as_of_date.isoformat() if setups else date.today().isoformat()

    buy_setups = [setup for setup in setups if setup.portfolio_action == 'BUY']
    sell_setups = [setup for setup in setups if setup.portfolio_action == 'SELL']
    hold_setups = [setup for setup in setups if setup.portfolio_action == 'HOLD']

    bullish_count = sum(1 for setup in setups if setup.predicted_direction == 'bullish')
    bearish_count = sum(1 for setup in setups if setup.predicted_direction == 'bearish')
    one_day_hit_rates = [rate for rate in (_first_horizon_metric(setup, 'measured_hit_rate') for setup in setups) if rate is not None]
    average_hit_rate = _mean(one_day_hit_rates)
    average_predicted_return = _mean([setup.predicted_return for setup in setups]) or 0.0

    top_longs = sorted(buy_setups, key=lambda setup: (-setup.conviction_score, -setup.predicted_return, setup.ticker))[:3]
    risk_reductions = sorted(sell_setups, key=lambda setup: (-setup.conviction_score, setup.predicted_return, setup.ticker))[:3]
    watchlist = sorted(hold_setups, key=lambda setup: (-abs(setup.predicted_return), -setup.conviction_score, setup.ticker))[:3]

    regime = _market_regime(len(buy_setups), len(sell_setups), average_predicted_return)
    decision = _analyst_decision(len(buy_setups), len(sell_setups), average_predicted_return)
    risk_posture = _risk_posture(len(buy_setups), len(sell_setups), len(hold_setups))
    operator_summary = _operator_summary(regime, len(buy_setups), len(sell_setups), average_hit_rate)
    next_session_plan = _next_session_plan(top_longs, risk_reductions)

    return {
        'reviewDate': review_date,
        'generatedAt': generated_at,
        'modelName': artifacts.batch.model_name,
        'marketRegime': regime,
        'analystDecision': decision,
        'riskPosture': risk_posture,
        'operatorSummary': operator_summary,
        'nextSessionPlan': next_session_plan,
        'publishSummary': 'Fresh generated artifacts are ready for GitHub commit and Vercel rebuild.',
        'forecastCount': len(setups),
        'buyCount': len(buy_setups),
        'sellCount': len(sell_setups),
        'holdCount': len(hold_setups),
        'bullishCount': bullish_count,
        'bearishCount': bearish_count,
        'averagePredictedReturn': _round(average_predicted_return, 6),
        'averageOneDayHitRate': _round(average_hit_rate, 4) if average_hit_rate is not None else None,
        'topLongs': [_map_setup(setup) for setup in top_longs],
        'riskReductions': [_map_setup(setup) for setup in risk_reductions],
        'watchlist': [_map_setup(setup) for setup in watchlist],
    }


def build_review_markdown(review: dict[str, Any]) -> str:
    def _format_percent(value: float | None) -> str:
        if value is None:
            return 'n/a'
        return f'{value * 100:+.2f}%'

    def _format_hit_rate(value: float | None) -> str:
        if value is None:
            return 'n/a'
        return f'{value * 100:.1f}%'

    def _section(title: str, rows: list[dict[str, Any]]) -> list[str]:
        if not rows:
            return [f'## {title}', '', '- None today', '']
        lines = [f'## {title}', '']
        for row in rows:
            lines.append(
                f"- {row['portfolioAction']} {row['ticker']} | {row['setupLabel']} | forecast {_format_percent(row['predictedReturn'])} | target ${row['targetClose']:.2f} | conviction {row['convictionScore']}"
            )
        lines.append('')
        return lines

    lines = [
        f"# Stokz Daily Review - {review['reviewDate']}",
        '',
        f"Generated at: {review['generatedAt']}",
        f"Model: {review['modelName']}",
        f"Market regime: {review['marketRegime']}",
        '',
        '## Summary',
        '',
        f"- Analyst decision: {review['analystDecision']}",
        f"- Risk posture: {review['riskPosture']}",
        f"- Operator summary: {review['operatorSummary']}",
        f"- Next session plan: {review['nextSessionPlan']}",
        '',
        '## Board stats',
        '',
        f"- Forecasts: {review['forecastCount']}",
        f"- BUY / HOLD / SELL: {review['buyCount']} / {review['holdCount']} / {review['sellCount']}",
        f"- Bullish vs bearish: {review['bullishCount']} / {review['bearishCount']}",
        f"- Average forecast: {_format_percent(review['averagePredictedReturn'])}",
        f"- Average 1D hit rate: {_format_hit_rate(review['averageOneDayHitRate'])}",
        '',
    ]
    lines.extend(_section('Top longs', review['topLongs']))
    lines.extend(_section('Risk reductions', review['riskReductions']))
    lines.extend(_section('Watchlist holds', review['watchlist']))
    return '\n'.join(lines).strip() + '\n'


def write_daily_review_artifacts(review: dict[str, Any], base_dir: Path) -> dict[str, Path]:
    reviews_dir = _reviews_dir(base_dir)
    reviews_dir.mkdir(parents=True, exist_ok=True)

    review_date = str(review['reviewDate'])
    dated_dir = reviews_dir / review_date
    dated_dir.mkdir(parents=True, exist_ok=True)

    summary_path = dated_dir / 'summary.json'
    report_path = dated_dir / 'report.md'
    latest_report_path = reviews_dir / 'latest-report.md'
    index_path = reviews_dir / 'index.json'

    summary_path.write_text(json.dumps(review, indent=2), encoding='utf-8')

    report_markdown = build_review_markdown(review)
    report_path.write_text(report_markdown, encoding='utf-8')
    latest_report_path.write_text(report_markdown, encoding='utf-8')

    existing_index: list[dict[str, Any]] = []
    if index_path.exists():
        try:
            payload = json.loads(index_path.read_text(encoding='utf-8'))
            if isinstance(payload, list):
                existing_index = [item for item in payload if isinstance(item, dict)]
        except Exception:
            existing_index = []

    updated_index = [review] + [item for item in existing_index if item.get('reviewDate') != review_date]
    updated_index.sort(key=lambda item: str(item.get('reviewDate', '')), reverse=True)
    index_path.write_text(json.dumps(updated_index, indent=2), encoding='utf-8')

    return {
        'index': index_path,
        'summary': summary_path,
        'report': report_path,
        'latest_report': latest_report_path,
    }
