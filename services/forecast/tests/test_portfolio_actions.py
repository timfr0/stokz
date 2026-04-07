from datetime import date

from stokz_forecast.config import Settings
from stokz_forecast.data_models import ForecastPrediction
from stokz_forecast.portfolio import Holding, PortfolioSnapshot, load_portfolio_snapshot
from stokz_forecast.signals import build_setup_recommendation


def _prediction(*, ticker: str, predicted_return: float, signal_direction: str) -> ForecastPrediction:
    return ForecastPrediction(
        ticker=ticker,
        as_of_date=date(2026, 4, 4),
        target_date=date(2026, 4, 7),
        predicted_return=predicted_return,
        predicted_direction='bullish' if predicted_return > 0 else 'bearish' if predicted_return < 0 else 'neutral',
        baseline_return=predicted_return / 2,
        model_name='timesfm-fallback',
        confidence_label='high',
        signal_direction=signal_direction,
        metadata_json={'backend': 'placeholder'},
    )


def test_long_signal_on_watchlist_name_becomes_buy_setup():
    portfolio = PortfolioSnapshot(
        as_of_date=date(2026, 4, 4),
        holdings=[],
        watchlist=('SMCI',),
    )

    setup = build_setup_recommendation(
        prediction=_prediction(ticker='SMCI', predicted_return=0.021, signal_direction='LONG'),
        portfolio=portfolio,
        current_price=120.0,
        realized_volatility=0.012,
    )

    assert setup.portfolio_action == 'BUY'
    assert setup.is_actionable is True
    assert 'entry' in setup.notes.lower()


def test_short_signal_on_held_name_becomes_sell_setup():
    portfolio = PortfolioSnapshot(
        as_of_date=date(2026, 4, 4),
        holdings=[Holding(ticker='DELL', shares=24)],
        watchlist=('DELL',),
    )

    setup = build_setup_recommendation(
        prediction=_prediction(ticker='DELL', predicted_return=-0.018, signal_direction='SHORT'),
        portfolio=portfolio,
        current_price=98.0,
        realized_volatility=0.011,
    )

    assert setup.portfolio_action == 'SELL'
    assert setup.is_actionable is True
    assert 'trim' in setup.notes.lower() or 'exit' in setup.notes.lower()


def test_load_portfolio_snapshot_prefers_explicit_holdings_from_settings():
    settings = Settings(
        ticker_universe=('SMCI', 'DELL'),
        portfolio_holdings_raw='SMCI:12:101.5,DELL:6',
    )

    snapshot = load_portfolio_snapshot(settings, as_of_date=date(2026, 4, 6))

    assert snapshot.shares_for('SMCI') == 12
    assert snapshot.shares_for('DELL') == 6
