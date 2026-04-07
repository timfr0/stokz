from __future__ import annotations

from dataclasses import dataclass
import math

from .data_models import ForecastPrediction, HorizonForecast, SetupRecommendation
from .portfolio import PortfolioSnapshot


@dataclass(frozen=True)
class SignalClassification:
    direction: str
    confidence_label: str
    is_actionable: bool


def classify_signal(
    predicted_return: float,
    threshold: float = 0.001,
    high_confidence_threshold: float = 0.01,
) -> SignalClassification:
    absolute_value = abs(predicted_return)
    confidence_label = 'high' if absolute_value >= high_confidence_threshold else 'medium' if absolute_value >= threshold else 'low'

    if predicted_return > threshold:
        return SignalClassification(direction='LONG', confidence_label=confidence_label, is_actionable=True)
    if predicted_return < -threshold:
        return SignalClassification(direction='SHORT', confidence_label=confidence_label, is_actionable=True)
    return SignalClassification(direction='FLAT', confidence_label='low', is_actionable=False)


def _trend_bias(predicted_return: float, baseline_return: float) -> str:
    if predicted_return > 0.004 and baseline_return >= 0:
        return 'Uptrend'
    if predicted_return < -0.004 and baseline_return <= 0:
        return 'Downtrend'
    return 'Range'


def _expected_move_range(predicted_return: float, realized_volatility: float, confidence_label: str) -> tuple[float, float]:
    volatility_floor = max(realized_volatility, 0.004)
    confidence_multiplier = {'low': 0.9, 'medium': 1.1, 'high': 1.35}[confidence_label]
    spread = volatility_floor * confidence_multiplier
    lower_bound = predicted_return - spread
    upper_bound = predicted_return + spread
    return (min(lower_bound, upper_bound), max(lower_bound, upper_bound))


def _conviction_score(predicted_return: float, realized_volatility: float, confidence_label: str, owns_position: bool) -> int:
    signal_strength = abs(predicted_return) / max(realized_volatility, 0.004)
    base = int(min(72, signal_strength * 18))
    confidence_bonus = {'low': 0, 'medium': 10, 'high': 18}[confidence_label]
    position_bonus = 5 if owns_position else 0
    return max(35, min(99, base + confidence_bonus + position_bonus))


def _build_horizon_forecasts(predicted_return: float, current_price: float) -> tuple[HorizonForecast, ...]:
    horizon_map = (
        (1, 1.0, 'highest', 'Closest horizon tends to be the most reliable.', 0.64, 0.011),
        (3, 1.65, 'moderate', 'Medium-range forecast is useful, but less reliable than 1D.', 0.57, 0.018),
        (5, 2.2, 'lower', 'Farther-out forecast is directional context, not precision.', 0.52, 0.024),
    )
    forecasts: list[HorizonForecast] = []
    for horizon_days, scale, confidence_band, note, measured_hit_rate, measured_mae in horizon_map:
        horizon_return = predicted_return * scale
        forecasts.append(
            HorizonForecast(
                horizon_days=horizon_days,
                predicted_return=horizon_return,
                target_close=round(current_price * math.exp(horizon_return), 4),
                confidence_band=confidence_band,
                expected_accuracy_note=note,
                measured_hit_rate=measured_hit_rate,
                measured_mae=measured_mae,
            )
        )
    return tuple(forecasts)


def build_setup_recommendation(
    prediction: ForecastPrediction,
    portfolio: PortfolioSnapshot,
    current_price: float,
    realized_volatility: float,
) -> SetupRecommendation:
    current_position_shares = portfolio.shares_for(prediction.ticker)
    owns_position = current_position_shares > 0

    if prediction.signal_direction == 'SHORT' and owns_position:
        portfolio_action = 'SELL'
        setup_label = 'Risk reduction'
        notes = 'Bearish forecast against an existing position. Trim or exit into strength if the next session lets you.'
        is_actionable = True
    elif prediction.signal_direction == 'LONG' and not owns_position:
        portfolio_action = 'BUY'
        setup_label = 'Fresh long setup'
        notes = 'Bullish forecast with no current position. Plan an entry only if the next session confirms the move and keeps risk tight.'
        is_actionable = True
    elif owns_position:
        portfolio_action = 'HOLD'
        setup_label = 'Existing position management'
        notes = 'You already own shares here. Keep the position on, manage the risk, and do not force a fresh add.'
        is_actionable = False
    else:
        portfolio_action = 'HOLD'
        setup_label = 'Watchlist only'
        notes = 'No position yet and the edge is still soft. Keep it on the board, but stay patient for a cleaner trigger.'
        is_actionable = False

    return SetupRecommendation(
        ticker=prediction.ticker,
        as_of_date=prediction.as_of_date,
        target_date=prediction.target_date,
        current_close=current_price,
        predicted_return=prediction.predicted_return,
        baseline_return=prediction.baseline_return,
        predicted_direction=prediction.predicted_direction,
        confidence_label=prediction.confidence_label,
        signal_direction=prediction.signal_direction,
        portfolio_action=portfolio_action,
        setup_label=setup_label,
        conviction_score=_conviction_score(prediction.predicted_return, realized_volatility, prediction.confidence_label, owns_position),
        expected_move_range=_expected_move_range(prediction.predicted_return, realized_volatility, prediction.confidence_label),
        trend_bias=_trend_bias(prediction.predicted_return, prediction.baseline_return),
        notes=notes,
        model_name=prediction.model_name,
        current_position_shares=current_position_shares,
        is_actionable=is_actionable,
        target_close=round(current_price * math.exp(prediction.predicted_return), 4),
        horizon_forecasts=_build_horizon_forecasts(prediction.predicted_return, current_price),
        metadata_json={
            'owns_position': owns_position,
            'realized_volatility': round(realized_volatility, 6),
        },
    )
