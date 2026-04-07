from datetime import date

from stokz_forecast.data_models import SetupRecommendation
from stokz_forecast.notifications import build_delivery_summary, build_notification_events


def _setup(*, ticker: str, action: str, actionable: bool) -> SetupRecommendation:
    return SetupRecommendation(
        ticker=ticker,
        as_of_date=date(2026, 4, 6),
        target_date=date(2026, 4, 7),
        current_close=120.0,
        predicted_return=0.015 if action == 'BUY' else -0.012,
        baseline_return=0.006,
        predicted_direction='bullish' if action == 'BUY' else 'bearish',
        confidence_label='high',
        signal_direction='LONG' if action == 'BUY' else 'SHORT',
        portfolio_action=action,
        setup_label='Fresh long setup' if action == 'BUY' else 'Risk reduction',
        conviction_score=82,
        expected_move_range=(-0.01, 0.02),
        trend_bias='Uptrend' if action == 'BUY' else 'Downtrend',
        notes='Test note',
        model_name='timesfm-fallback',
        is_actionable=actionable,
        current_position_shares=0,
    )


def test_build_notification_events_only_emits_actionable_buy_sell():
    setups = [
        _setup(ticker='SMCI', action='BUY', actionable=True),
        _setup(ticker='DELL', action='SELL', actionable=True),
        _setup(ticker='ORCL', action='HOLD', actionable=False),
    ]

    events = build_notification_events(setups)

    assert len(events) == 2
    assert {event['portfolio_action'] for event in events} == {'BUY', 'SELL'}


def test_build_delivery_summary_mentions_buy_and_sell_names():
    setups = [
        _setup(ticker='SMCI', action='BUY', actionable=True),
        _setup(ticker='DELL', action='SELL', actionable=True),
    ]

    summary = build_delivery_summary(setups)

    assert 'BUY' in summary
    assert 'SELL' in summary
    assert 'SMCI' in summary
    assert 'DELL' in summary
