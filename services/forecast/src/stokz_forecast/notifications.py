from __future__ import annotations

from .data_models import SetupRecommendation


def build_dedupe_key(ticker: str, target_date: str, portfolio_action: str) -> str:
    return f'{ticker}:{target_date}:{portfolio_action}'


def build_notification_event(setup: SetupRecommendation) -> dict[str, object]:
    dedupe_key = build_dedupe_key(
        ticker=setup.ticker,
        target_date=setup.target_date.isoformat(),
        portfolio_action=setup.portfolio_action,
    )
    return {
        'ticker': setup.ticker,
        'as_of_date': setup.as_of_date.isoformat(),
        'target_date': setup.target_date.isoformat(),
        'portfolio_action': setup.portfolio_action,
        'setup_label': setup.setup_label,
        'predicted_return': setup.predicted_return,
        'confidence_label': setup.confidence_label,
        'trend_bias': setup.trend_bias,
        'notes': setup.notes,
        'dedupe_key': dedupe_key,
        'event_type': 'daily_setup',
        'channel': 'dashboard',
        'delivery_channel': 'discord',
        'is_actionable': setup.is_actionable,
        'summary': f"{setup.portfolio_action} {setup.ticker} · {setup.setup_label} · {setup.predicted_return:+.2%} · {setup.confidence_label} confidence",
    }


def build_notification_events(setups: list[SetupRecommendation]) -> list[dict[str, object]]:
    return [build_notification_event(setup) for setup in setups if setup.is_actionable and setup.portfolio_action in {'BUY', 'SELL'}]


def build_delivery_summary(setups: list[SetupRecommendation]) -> str:
    actionable = [setup for setup in setups if setup.is_actionable and setup.portfolio_action in {'BUY', 'SELL'}]
    if not actionable:
        return 'Stokz daily refresh: no actionable BUY or SELL setups today.'

    lines = ['Stokz daily refresh']
    for setup in actionable[:5]:
        lines.append(
            f"- {setup.portfolio_action} {setup.ticker}: {setup.setup_label}, forecast {setup.predicted_return:+.2%}, {setup.confidence_label} confidence"
        )
    return '\n'.join(lines)
