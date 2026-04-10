from __future__ import annotations

import html
import json
import math
import re
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import yfinance as yf

from .data_models import DashboardArtifacts, SetupRecommendation

_TAG_RE = re.compile(r'<[^>]+>')
_POSITIVE_KEYWORDS = (
    'beat',
    'upgrade',
    'surge',
    'jump',
    'gain',
    'rally',
    'partnership',
    'expansion',
    'strong',
    'growth',
    'ai',
    'record',
    'buy',
    'outperform',
)
_NEGATIVE_KEYWORDS = (
    'miss',
    'downgrade',
    'cut',
    'slump',
    'drop',
    'risk',
    'probe',
    'lawsuit',
    'delay',
    'weak',
    'warning',
    'tariff',
    'fall',
    'sell',
    'underperform',
)


def _details_path(base_dir: Path) -> Path:
    return base_dir / 'stock-details.json'


def _strip_html(value: str | None) -> str:
    if not value:
        return ''
    cleaned = _TAG_RE.sub(' ', value)
    cleaned = html.unescape(cleaned)
    return ' '.join(cleaned.split())


def _round(value: float | int | None, digits: int = 4) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def _entry_price_target(setup: SetupRecommendation) -> float:
    return round(setup.current_close * (1 - min(abs(setup.predicted_return) * 0.35, 0.03)), 2)


def _safe_fast_info(ticker_obj: Any) -> dict[str, Any]:
    try:
        return dict(getattr(ticker_obj, 'fast_info', {}) or {})
    except Exception:
        return {}


def _safe_info(ticker_obj: Any) -> dict[str, Any]:
    try:
        payload = ticker_obj.info or {}
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def _safe_calendar(ticker_obj: Any) -> dict[str, Any]:
    try:
        payload = ticker_obj.calendar or {}
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def _normalize_published_at(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if hasattr(value, 'isoformat'):
        try:
            return value.isoformat()
        except Exception:
            return None
    return None


def _fetch_news_items(ticker: str, limit: int = 4) -> list[dict[str, Any]]:
    try:
        raw_items = yf.Ticker(ticker).get_news(count=limit) or []
    except Exception:
        return []

    items: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    recent_cutoff = datetime.now(UTC).timestamp() - (10 * 24 * 60 * 60)

    for index, raw in enumerate(raw_items):
        if not isinstance(raw, dict):
            continue
        content = raw.get('content', raw)
        if not isinstance(content, dict):
            continue

        title = str(content.get('title') or '').strip()
        url = (
            ((content.get('clickThroughUrl') or {}).get('url'))
            or ((content.get('canonicalUrl') or {}).get('url'))
            or ''
        )
        if not title or not url or url in seen_urls:
            continue

        published_at = _normalize_published_at(content.get('pubDate'))
        if published_at:
            try:
                published_ts = datetime.fromisoformat(published_at.replace('Z', '+00:00')).timestamp()
                if published_ts < recent_cutoff:
                    continue
            except Exception:
                pass

        seen_urls.add(url)
        items.append(
            {
                'id': str(content.get('id') or f'{ticker}:{index}'),
                'ticker': ticker,
                'title': title,
                'summary': _strip_html(str(content.get('summary') or content.get('description') or ''))[:320],
                'source': str((content.get('provider') or {}).get('displayName') or 'Yahoo Finance').strip(),
                'publishedAt': published_at,
                'url': url,
            }
        )
        if len(items) >= limit:
            break

    return items


def _sentiment_score(news_items: list[dict[str, Any]]) -> int:
    score = 0
    for item in news_items:
        text = f"{item.get('title', '')} {item.get('summary', '')}".lower()
        score += sum(1 for keyword in _POSITIVE_KEYWORDS if keyword in text)
        score -= sum(1 for keyword in _NEGATIVE_KEYWORDS if keyword in text)
    return max(-6, min(6, score))


def _resolve_news_bias(direction: str, sentiment_score: int) -> str:
    if abs(sentiment_score) <= 1:
        return 'mixed'
    if direction == 'bullish':
        return 'supportive' if sentiment_score > 0 else 'conflicting'
    if direction == 'bearish':
        return 'supportive' if sentiment_score < 0 else 'conflicting'
    return 'mixed'


def _confidence_score(confidence_label: str, conviction_score: int) -> int:
    base = {'low': 54, 'medium': 68, 'high': 82}[confidence_label]
    return max(35, min(95, round(base * 0.7 + conviction_score * 0.3)))


def _earnings_date(calendar: dict[str, Any]) -> date | None:
    candidate = calendar.get('Earnings Date')
    if isinstance(candidate, list) and candidate:
        first = candidate[0]
        if isinstance(first, datetime):
            return first.date()
        if isinstance(first, date):
            return first
        return None
    if isinstance(candidate, datetime):
        return candidate.date()
    if isinstance(candidate, date):
        return candidate
    return None


def _days_to_earnings(earnings_date: date | None, as_of_date: date) -> int | None:
    if earnings_date is None:
        return None
    return (earnings_date - as_of_date).days


def _event_risk(days_to_earnings: int | None, news_bias: str, news_items: list[dict[str, Any]]) -> str:
    if days_to_earnings is not None and days_to_earnings <= 7:
        return 'high'
    if news_bias == 'conflicting':
        return 'high'
    if days_to_earnings is not None and days_to_earnings <= 21:
        return 'moderate'
    if len(news_items) >= 3:
        return 'moderate'
    return 'low'


def _confidence_adjustment(sentiment_score: int, event_risk: str) -> int:
    adjustment = sentiment_score * 3
    if event_risk == 'high':
        adjustment -= 6
    elif event_risk == 'moderate':
        adjustment -= 2
    return max(-15, min(15, adjustment))


def _scenario_probabilities(direction: str, confidence_label: str, sentiment_score: int) -> tuple[int, int, int]:
    base_case = {'low': 52, 'medium': 60, 'high': 68}[confidence_label]
    if direction == 'bullish':
        bull_case = max(12, min(32, 18 + sentiment_score * 2 + (6 if confidence_label == 'high' else 0)))
        bear_case = max(10, 100 - base_case - bull_case)
    elif direction == 'bearish':
        bear_case = max(12, min(32, 18 + abs(sentiment_score) * 2 + (6 if confidence_label == 'high' else 0)))
        bull_case = max(10, 100 - base_case - bear_case)
    else:
        bull_case = 18
        bear_case = 18
    base_case = 100 - bull_case - bear_case
    return bear_case, base_case, bull_case


def _format_market_cap(value: float | None) -> float | None:
    return None if value is None else round(float(value), 2)


def _build_scenarios(setup: SetupRecommendation, sentiment_score: int, news_bias: str) -> list[dict[str, Any]]:
    short_term = next((item for item in setup.horizon_forecasts if item.horizon_days == 1), None)
    medium_term = next((item for item in setup.horizon_forecasts if item.horizon_days == 3), None)
    long_term = next((item for item in setup.horizon_forecasts if item.horizon_days == 5), None)

    bearish_prob, base_prob, bullish_prob = _scenario_probabilities(setup.predicted_direction, setup.confidence_label, sentiment_score)
    bear_target = round(setup.current_close * math.exp(min(setup.expected_move_range[0] * 1.1, -0.01)), 2)
    base_target = round((medium_term.target_close if medium_term else setup.target_close or setup.current_close), 2)
    bull_anchor = long_term.target_close if long_term else (setup.target_close or setup.current_close)
    bull_target = round(max(bull_anchor, setup.current_close * math.exp(max(setup.expected_move_range[1], abs(setup.predicted_return) + 0.01))), 2)

    return [
        {
            'id': 'bear',
            'label': 'Bear case',
            'probability': bearish_prob,
            'targetPrice': bear_target,
            'summary': 'Headline pressure or weak tape drags price toward the lower end of the modeled range.',
            'tone': 'bear',
        },
        {
            'id': 'base',
            'label': 'Base case',
            'probability': base_prob,
            'targetPrice': base_target,
            'summary': 'The core forecast path holds, with price tracking the model without needing hero-level momentum.',
            'tone': 'base',
        },
        {
            'id': 'bull',
            'label': 'Bull case',
            'probability': bullish_prob,
            'targetPrice': bull_target,
            'summary': 'Supportive tape plus clean news follow-through lets the setup stretch toward the upper band.',
            'tone': 'bull',
        },
    ]


def _build_reasons(setup: SetupRecommendation, news_bias: str, event_risk: str, days_to_earnings: int | None) -> list[dict[str, str]]:
    short_term = next((item for item in setup.horizon_forecasts if item.horizon_days == 1), None)
    medium_term = next((item for item in setup.horizon_forecasts if item.horizon_days == 3), None)
    long_term = next((item for item in setup.horizon_forecasts if item.horizon_days == 5), None)
    volatility_width = abs(setup.expected_move_range[1] - setup.expected_move_range[0]) * 100

    earnings_note = (
        f'Earnings are roughly {days_to_earnings} day(s) out, so event risk stays on the board.'
        if days_to_earnings is not None and days_to_earnings >= 0
        else 'No near earnings event was pulled, so the setup leans more on price structure than scheduled catalysts.'
    )

    return [
        {
            'title': 'Forecast median',
            'body': f"1D projects {short_term.target_close if short_term else setup.target_close:.2f}, 3D points toward {medium_term.target_close if medium_term else setup.target_close:.2f}, and 5D stretches toward {long_term.target_close if long_term else setup.target_close:.2f}.",
            'tone': 'forecast',
        },
        {
            'title': 'Uncertainty width',
            'body': f'The modeled move envelope spans about {volatility_width:.2f}% top to bottom, so this is tradable but not a zero-risk glide path.',
            'tone': 'uncertainty',
        },
        {
            'title': 'News overlay',
            'body': f'Current headline read is {news_bias}. That does not retrain the model, but it does change how much conviction we should give the setup.',
            'tone': 'news',
        },
        {
            'title': 'Event risk',
            'body': f'{earnings_note} Current event-risk state is {event_risk}.',
            'tone': 'event',
        },
    ]


def _timeframe_records(setup: SetupRecommendation) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for horizon in setup.horizon_forecasts:
        records.append(
            {
                'label': f'{horizon.horizon_days}D',
                'horizonDays': horizon.horizon_days,
                'predictedReturn': round(horizon.predicted_return, 6),
                'targetClose': round(horizon.target_close, 2),
                'confidenceBand': horizon.confidence_band,
                'hitRate': round(horizon.measured_hit_rate, 4) if horizon.measured_hit_rate is not None else None,
                'mae': round(horizon.measured_mae, 6) if horizon.measured_mae is not None else None,
            }
        )
    return records


def build_stock_detail_records(artifacts: DashboardArtifacts) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for setup in artifacts.setups:
        ticker_obj = yf.Ticker(setup.ticker)
        fast_info = _safe_fast_info(ticker_obj)
        info = _safe_info(ticker_obj)
        calendar = _safe_calendar(ticker_obj)
        news_items = _fetch_news_items(setup.ticker)

        earnings_date = _earnings_date(calendar)
        days_to_earnings = _days_to_earnings(earnings_date, setup.as_of_date)
        sentiment_score = _sentiment_score(news_items)
        news_bias = _resolve_news_bias(setup.predicted_direction, sentiment_score)
        event_risk = _event_risk(days_to_earnings, news_bias, news_items)
        confidence_adjustment = _confidence_adjustment(sentiment_score, event_risk)
        base_confidence = _confidence_score(setup.confidence_label, setup.conviction_score)
        adjusted_confidence = max(25, min(99, base_confidence + confidence_adjustment))

        entry_price = _entry_price_target(setup)
        stop_price = round(setup.current_close * math.exp(min(setup.expected_move_range[0], -0.008)), 2)
        reward = abs((setup.target_close or setup.current_close) - entry_price)
        risk = abs(entry_price - stop_price)
        risk_reward_ratio = round(reward / max(risk, 0.01), 2)

        rows.append(
            {
                'ticker': setup.ticker,
                'companyName': str(info.get('shortName') or info.get('longName') or setup.ticker),
                'sector': str(info.get('sector') or 'Unknown'),
                'industry': str(info.get('industry') or 'Unknown'),
                'asOfDate': setup.as_of_date.isoformat(),
                'targetDate': setup.target_date.isoformat(),
                'currentPrice': round(setup.current_close, 2),
                'entryPriceTarget': entry_price,
                'stopPrice': stop_price,
                'targetPrice': round((setup.target_close or setup.current_close), 2),
                'bias': setup.predicted_direction,
                'confidenceLabel': setup.confidence_label,
                'confidenceScore': adjusted_confidence,
                'baseConfidenceScore': base_confidence,
                'signalDirection': setup.signal_direction,
                'portfolioAction': setup.portfolio_action,
                'trendBias': setup.trend_bias,
                'modelName': setup.model_name,
                'setupLabel': setup.setup_label,
                'convictionScore': int(setup.conviction_score),
                'adjustedConvictionScore': adjusted_confidence,
                'newsBias': news_bias,
                'newsImpactScore': sentiment_score,
                'confidenceAdjustment': confidence_adjustment,
                'eventRisk': event_risk,
                'riskRewardRatio': risk_reward_ratio,
                'expectedMoveLow': round(setup.expected_move_range[0], 6),
                'expectedMoveHigh': round(setup.expected_move_range[1], 6),
                'marketCap': _format_market_cap(_round(fast_info.get('marketCap'), 2) or _round(info.get('marketCap'), 2)),
                'averageVolume': int(fast_info.get('tenDayAverageVolume') or info.get('averageVolume') or 0) or None,
                'yearHigh': _round(fast_info.get('yearHigh'), 2) or _round(info.get('fiftyTwoWeekHigh'), 2),
                'yearLow': _round(fast_info.get('yearLow'), 2) or _round(info.get('fiftyTwoWeekLow'), 2),
                'analystTarget': _round(info.get('targetMeanPrice'), 2),
                'earningsDate': earnings_date.isoformat() if earnings_date else None,
                'daysToEarnings': days_to_earnings,
                'timeframes': _timeframe_records(setup),
                'scenarios': _build_scenarios(setup, sentiment_score, news_bias),
                'reasons': _build_reasons(setup, news_bias, event_risk, days_to_earnings),
                'newsItems': news_items,
            }
        )

    return rows


def write_stock_detail_artifacts(artifacts: DashboardArtifacts, base_dir: Path) -> Path:
    path = _details_path(base_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = build_stock_detail_records(artifacts)
    path.write_text(json.dumps(rows, indent=2), encoding='utf-8')
    return path
