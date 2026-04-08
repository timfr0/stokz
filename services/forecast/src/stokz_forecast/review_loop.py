from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from .analyst import evaluate_tomorrow_adjustments
from .data_models import DashboardArtifacts
from .evaluation import read_json_array, summarize_horizon_metrics
from .research import build_market_research
from .risk import assess_risk
from .strategy_tuner import propose_adjustments
from .summary_writer import build_operator_summary


def _reviews_root(base_dir: Path) -> Path:
    return base_dir / 'reviews'


def _review_day_dir(base_dir: Path, review_date: date) -> Path:
    return _reviews_root(base_dir) / review_date.isoformat()


def _review_index_path(base_dir: Path) -> Path:
    return _reviews_root(base_dir) / 'index.json'


def _top_hits_and_misses(setups: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    ranked = sorted(setups, key=lambda setup: abs(float(setup['predicted_return'])), reverse=True)
    hits = ranked[:3]
    misses = sorted(
        setups,
        key=lambda setup: float((setup.get('horizon_forecasts') or [{}])[0].get('measured_mae') or 0),
        reverse=True,
    )[:3]
    return hits, misses


def _build_review_index_entry(review_payload: dict[str, Any]) -> dict[str, Any]:
    return {
        'review_date': review_payload['review_date'],
        'generated_at': review_payload['generated_at'],
        'spy_regime': review_payload['market_context']['broad_market']['spy_context']['regime'],
        'spy_move': review_payload['market_context']['broad_market']['spy_context']['estimated_daily_move'],
        'news_items': review_payload['news_log']['items'][:6],
        'analyst_decision': review_payload['analyst_decision'],
        'risk_assessment': review_payload['risk_assessment'],
        'top_hits': review_payload['top_hits'],
        'top_misses': review_payload['top_misses'],
        'tomorrow_config': review_payload['tomorrow_config'],
        'operator_summary': review_payload['operator_summary'],
    }


def _refresh_review_index(base_dir: Path) -> Path:
    reviews_root = _reviews_root(base_dir)
    reviews_root.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, Any]] = []
    for child in sorted(reviews_root.iterdir(), reverse=True):
        if not child.is_dir():
            continue
        review_json = child / 'review.json'
        if not review_json.exists():
            continue
        try:
            payload = json.loads(review_json.read_text(encoding='utf-8'))
        except Exception:
            continue
        entries.append(_build_review_index_entry(payload))
    index_path = _review_index_path(base_dir)
    index_path.write_text(json.dumps(entries, indent=2), encoding='utf-8')
    return index_path


def _daily_summary_markdown(review: dict[str, Any]) -> str:
    lines = [
        f"# Stokz Daily Review, {review['review_date']}",
        '',
        '## Desk roles involved',
        '- market_researcher',
        '- forecast_operator',
        '- evaluator',
        '- analyst',
        '- risk_manager',
        '- strategy_tuner',
        '- summary_writer',
        '',
        '## Market context',
        f"- SPY regime: {review['market_context']['broad_market']['spy_context']['regime']}",
        f"- SPY move: {review['market_context']['broad_market']['spy_context']['estimated_daily_move']}",
        f"- QQQ move: {review['market_context']['broad_market']['qqq_context']['estimated_daily_move']}",
        '',
        '## What worked',
    ]
    for item in review['top_hits']:
        lines.append(f"- {item['ticker']}: {item['portfolio_action']} setup, forecast {item['predicted_return']:+.2%}, target {item['target_close']:.2f}")
    lines.extend(['', '## Where we missed or need caution'])
    for item in review['top_misses']:
        lines.append(f"- {item['ticker']}: watch horizon error and event risk before trusting extended targets.")
    lines.extend(['', '## Risk manager'])
    lines.append(f"- Risk level: {review['risk_assessment']['risk_level']}")
    lines.append(f"- Trade posture: {review['risk_assessment']['trade_posture']}")
    for flag in review['risk_assessment']['flags']:
        lines.append(f"- {flag}")
    lines.extend(['', '## Analyst decision'])
    lines.append(f"- Decision: {review['analyst_decision']['decision']}")
    lines.append(f"- Evidence quality: {review['analyst_decision']['evidence_quality']}")
    lines.append(f"- Rationale: {review['analyst_decision']['rationale']}")
    lines.extend(['', '## Tomorrow recommendation block'])
    for adjustment in review['tomorrow_config']['adjustments']:
        lines.append(f"- {adjustment['parameter']}: {adjustment['direction']} — {adjustment['reason']}")
    return '\n'.join(lines)


def generate_daily_review(artifacts: DashboardArtifacts, base_dir: Path, review_date: date | None = None) -> dict[str, Path]:
    target_date = review_date or date.today()
    day_dir = _review_day_dir(base_dir, target_date)
    day_dir.mkdir(parents=True, exist_ok=True)

    setup_records = [setup.to_record() for setup in artifacts.setups]
    evaluation_rows = read_json_array(base_dir / 'history' / 'evaluation-history.json')
    horizon_summary = summarize_horizon_metrics(evaluation_rows)
    market_context = build_market_research(target_date, tickers=[setup['ticker'] for setup in setup_records])
    top_hits, top_misses = _top_hits_and_misses(setup_records)
    proposed_adjustments = propose_adjustments(horizon_summary)
    tomorrow_config = {
        'generated_at': datetime.now(UTC).isoformat(),
        'adjustments': proposed_adjustments,
        'notes': [
            market_context['broad_market']['spy_context']['note'],
            'Do not auto-promote threshold changes without at least a few rolling days of confirming evidence.',
        ],
    }
    analyst_decision = evaluate_tomorrow_adjustments(horizon_summary, proposed_adjustments).to_record()
    risk_assessment = assess_risk(market_context, horizon_summary).to_record()

    review_payload = {
        'review_date': target_date.isoformat(),
        'generated_at': datetime.now(UTC).isoformat(),
        'roles': {
            'market_researcher': 'Collects market/news/event context, broader tape state, and ticker-specific watch items.',
            'forecast_operator': 'Runs the forecast and artifact pipeline.',
            'evaluator': 'Scores prediction outcomes and error metrics.',
            'analyst': 'Judges whether proposed system changes are justified.',
            'risk_manager': 'Constrains changes when regime or error risk is elevated.',
            'strategy_tuner': 'Proposes bounded threshold and weighting adjustments.',
            'summary_writer': 'Produces operator-facing review summaries.',
        },
        'market_context': market_context,
        'horizon_summary': horizon_summary,
        'top_hits': top_hits,
        'top_misses': top_misses,
        'tomorrow_config': tomorrow_config,
        'analyst_decision': analyst_decision,
        'risk_assessment': risk_assessment,
        'news_log': {
            'items': market_context['major_events']
            + [item['news_note'] for item in market_context['company_watch_items']]
            + [item['earnings_note'] for item in market_context['company_watch_items']]
            + market_context['upcoming_watch_events'],
        },
    }
    review_payload['operator_summary'] = build_operator_summary(review_payload)

    review_json = day_dir / 'review.json'
    review_md = day_dir / 'review.md'
    tomorrow_json = day_dir / 'tomorrow-config.json'
    news_json = day_dir / 'news-log.json'
    market_json = day_dir / 'market-context.json'
    report_md = day_dir / 'report-summary.md'

    review_json.write_text(json.dumps(review_payload, indent=2), encoding='utf-8')
    review_md.write_text(_daily_summary_markdown(review_payload), encoding='utf-8')
    tomorrow_json.write_text(json.dumps(tomorrow_config, indent=2), encoding='utf-8')
    news_json.write_text(json.dumps(review_payload['news_log'], indent=2), encoding='utf-8')
    market_json.write_text(json.dumps(market_context, indent=2), encoding='utf-8')
    report_md.write_text(review_payload['operator_summary'], encoding='utf-8')

    review_index = _refresh_review_index(base_dir)

    return {
        'review_json': review_json,
        'review_md': review_md,
        'tomorrow_config': tomorrow_json,
        'news_log': news_json,
        'market_context': market_json,
        'report_summary': report_md,
        'review_index': review_index,
    }
