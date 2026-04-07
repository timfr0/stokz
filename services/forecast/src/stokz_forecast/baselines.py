from __future__ import annotations


def predict_zero_return(values: list[float]) -> float:
    _ = values
    return 0.0


def predict_rolling_mean(values: list[float], window: int = 5) -> float:
    if not values:
        return 0.0

    recent_values = values[-window:]
    return float(sum(recent_values) / len(recent_values))
