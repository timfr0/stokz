from __future__ import annotations

import html
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import UTC, date, datetime
from typing import Any, Callable

import yfinance as yf

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
    'bullish',
    'squeeze',
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
    'bearish',
)


def strip_html(value: str | None) -> str:
    if not value:
        return ''
    cleaned = _TAG_RE.sub(' ', value)
    cleaned = html.unescape(cleaned)
    return ' '.join(cleaned.split())


def safe_calendar(ticker_obj: Any) -> dict[str, Any]:
    try:
        payload = ticker_obj.calendar or {}
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def normalize_published_at(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if hasattr(value, 'isoformat'):
        try:
            return value.isoformat()
        except Exception:
            return None
    return None


def fetch_news_items(ticker: str, limit: int = 4) -> list[dict[str, Any]]:
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

        published_at = normalize_published_at(content.get('pubDate'))
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
                'summary': strip_html(str(content.get('summary') or content.get('description') or ''))[:320],
                'source': str((content.get('provider') or {}).get('displayName') or 'Yahoo Finance').strip(),
                'publishedAt': published_at,
                'url': url,
            }
        )
        if len(items) >= limit:
            break

    return items


def google_news_social_search(query: str, max_items: int = 4) -> list[dict[str, Any]]:
    url = (
        'https://news.google.com/rss/search?q='
        + urllib.parse.quote(query)
        + '&hl=en-US&gl=US&ceid=US:en'
    )

    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        payload = urllib.request.urlopen(request, timeout=20).read()
        root = ET.fromstring(payload)
    except Exception:
        return []

    channel = root.find('channel')
    if channel is None:
        return []

    items: list[dict[str, Any]] = []
    seen_links: set[str] = set()

    for index, item in enumerate(channel.findall('item')):
        title = (item.findtext('title') or '').strip()
        link = (item.findtext('link') or '').strip()
        description = strip_html(item.findtext('description') or '')
        published_at = item.findtext('pubDate')
        if not title or not link or link in seen_links:
            continue

        clean_title = title
        source = 'Google News'
        if ' - ' in title:
            clean_title, source = title.rsplit(' - ', 1)
        source_lower = source.lower()
        source_type = 'reddit' if 'reddit' in source_lower else 'twitter' if source_lower in {'x', 'twitter'} or 'x.com' in description.lower() else 'web'

        seen_links.add(link)
        items.append(
            {
                'id': f'community:{index}:{source_type}',
                'ticker': '',
                'title': clean_title.strip(),
                'summary': description[:320],
                'source': source,
                'sourceType': source_type,
                'publishedAt': published_at,
                'url': link,
                'query': query,
            }
        )
        if len(items) >= max_items:
            break

    return items


def fetch_community_items(ticker: str, company_name: str, limit: int = 4) -> list[dict[str, Any]]:
    company_stub = ' '.join(company_name.split()[:3]).strip()
    queries = [
        f'{ticker} stock site:reddit.com OR site:x.com OR site:twitter.com',
        f'"{company_stub}" stock site:reddit.com OR site:x.com OR site:twitter.com' if company_stub else '',
    ]

    items: list[dict[str, Any]] = []
    seen_titles: set[str] = set()
    relevance_tokens = {ticker.lower(), company_stub.lower()}
    investor_tokens = {
        'stock',
        'stocks',
        'share',
        'shares',
        'buy',
        'sell',
        'bull',
        'bear',
        'bullish',
        'bearish',
        'earnings',
        'forecast',
        'outlook',
        'price',
        'analyst',
        'market',
        'revenue',
        'valuation',
        'guidance',
    }

    for query in queries:
        if not query:
            continue
        for item in google_news_social_search(query, max_items=limit):
            haystack = f"{item.get('title', '')} {item.get('summary', '')}".lower()
            if not any(token and token in haystack for token in relevance_tokens):
                continue
            if not any(token in haystack for token in investor_tokens):
                continue
            if item['title'] in seen_titles:
                continue
            seen_titles.add(item['title'])
            item['ticker'] = ticker
            items.append(item)
            if len(items) >= limit:
                return items

    return items


def sentiment_score(items: list[dict[str, Any]]) -> int:
    score = 0
    for item in items:
        text = f"{item.get('title', '')} {item.get('summary', '')}".lower()
        score += sum(1 for keyword in _POSITIVE_KEYWORDS if keyword in text)
        score -= sum(1 for keyword in _NEGATIVE_KEYWORDS if keyword in text)
    return max(-8, min(8, score))


def sentiment_label(score: int) -> str:
    if score >= 2:
        return 'positive'
    if score <= -2:
        return 'negative'
    return 'mixed'


def resolve_news_bias(direction: str, score: int) -> str:
    if abs(score) <= 1:
        return 'mixed'
    if direction == 'bullish':
        return 'supportive' if score > 0 else 'conflicting'
    if direction == 'bearish':
        return 'supportive' if score < 0 else 'conflicting'
    return 'mixed'


def parse_earnings_date(calendar: dict[str, Any]) -> str | None:
    candidate = calendar.get('Earnings Date')
    if isinstance(candidate, list) and candidate:
        first = candidate[0]
        if isinstance(first, datetime):
            return first.date().isoformat()
        if isinstance(first, date):
            return first.isoformat()
        return None
    if isinstance(candidate, datetime):
        return candidate.date().isoformat()
    if isinstance(candidate, date):
        return candidate.isoformat()
    return None


def days_to_earnings(earnings_date: str | None, as_of_date: date) -> int | None:
    if not earnings_date:
        return None
    return (date.fromisoformat(earnings_date) - as_of_date).days


def event_risk_label(days_to_earnings: int | None, news_bias: str, news_items: list[dict[str, Any]], community_items: list[dict[str, Any]]) -> str:
    if days_to_earnings is not None and days_to_earnings <= 7:
        return 'high'
    if news_bias == 'conflicting':
        return 'high'
    if days_to_earnings is not None and days_to_earnings <= 21:
        return 'moderate'
    if len(news_items) + len(community_items) >= 5:
        return 'moderate'
    return 'low'


def build_research_context(
    ticker: str,
    company_name: str,
    as_of_date: date,
    predicted_direction: str,
    *,
    ticker_obj: Any | None = None,
    calendar: dict[str, Any] | None = None,
    news_items: list[dict[str, Any]] | None = None,
    community_items: list[dict[str, Any]] | None = None,
    news_fetcher: Callable[[str, int], list[dict[str, Any]]] | None = None,
    community_fetcher: Callable[[str, str, int], list[dict[str, Any]]] | None = None,
    news_limit: int = 4,
    community_limit: int = 4,
) -> dict[str, Any]:
    resolved_news_items = news_items if news_items is not None else (news_fetcher or fetch_news_items)(ticker, news_limit)
    resolved_community_items = (
        community_items
        if community_items is not None
        else (community_fetcher or fetch_community_items)(ticker, company_name or ticker, community_limit)
    )

    resolved_calendar = calendar
    if resolved_calendar is None:
        resolved_calendar = safe_calendar(ticker_obj or yf.Ticker(ticker))

    earnings_date = parse_earnings_date(resolved_calendar)
    earnings_days = days_to_earnings(earnings_date, as_of_date)
    news_score = sentiment_score(resolved_news_items)
    community_score = sentiment_score(resolved_community_items)
    news_bias = resolve_news_bias(predicted_direction, news_score)
    community_label = sentiment_label(community_score)

    return {
        'news_items': resolved_news_items,
        'community_items': resolved_community_items,
        'news_score': news_score,
        'community_score': community_score,
        'news_bias': news_bias,
        'community_label': community_label,
        'earnings_date': earnings_date,
        'days_to_earnings': earnings_days,
        'event_risk': event_risk_label(earnings_days, news_bias, resolved_news_items, resolved_community_items),
    }
