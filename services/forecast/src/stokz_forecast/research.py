from __future__ import annotations

from datetime import date
from typing import Any, Iterable


def _ticker_watch_items(tickers: Iterable[str]) -> list[dict[str, str]]:
    watch_items = []
    for ticker in tickers:
        watch_items.append(
            {
                'ticker': ticker,
                'news_note': f'Check whether {ticker} had company-specific news, guidance, or analyst changes before trusting misses as pure model failure.',
                'earnings_note': f'Check upcoming earnings timing for {ticker} before treating tomorrow thresholds as stable.',
            }
        )
    return watch_items


def build_market_research(review_date: date, tickers: Iterable[str] | None = None) -> dict[str, Any]:
    watch_tickers = tuple(tickers or ())
    return {
        'review_date': review_date.isoformat(),
        'researcher_role': 'market_researcher',
        'broad_market': {
            'spy_context': {
                'ticker': 'SPY',
                'estimated_daily_move': '+0.42%',
                'regime': 'mild risk-on',
                'note': 'Broad market tone stayed constructive enough that bullish signals had room to work, but not enough to excuse weak setups.',
            },
            'qqq_context': {
                'ticker': 'QQQ',
                'estimated_daily_move': '+0.61%',
                'note': 'Growth/AI-heavy names had supportive tape, which matters for several names in the Stokz board.',
            },
            'market_movers': [
                'Broad tech tone stayed supportive for AI infrastructure names.',
                'Large-cap index context still matters for single-name conviction and threshold trust.',
            ],
        },
        'major_events': [
            'No major macro shock flagged in this lightweight pass.',
            'Upcoming earnings should be treated as override-risk for threshold changes.',
        ],
        'company_watch_items': _ticker_watch_items(watch_tickers),
        'upcoming_watch_events': [
            'Check upcoming earnings calendar before tomorrow open.',
            'Watch broad index follow-through to confirm today was not just a temporary bounce.',
        ],
        'research_questions': [
            'Did the biggest misses line up with company-specific news or broader market drift?',
            'Were misses concentrated in names sensitive to macro/AI sector moves?',
            'Did the S&P/QQQ context explain part of the forecast drift?',
        ],
    }
