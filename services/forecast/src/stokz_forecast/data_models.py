from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from typing import Any, Literal

PredictedDirection = Literal['bullish', 'bearish', 'neutral']
ConfidenceLabel = Literal['low', 'medium', 'high']
SignalDirection = Literal['LONG', 'SHORT', 'FLAT']
PortfolioAction = Literal['BUY', 'HOLD', 'SELL']
TrendBias = Literal['Uptrend', 'Downtrend', 'Range']
HorizonConfidence = Literal['highest', 'moderate', 'lower']


@dataclass(frozen=True)
class DailyBar:
    ticker: str
    trade_date: date
    close: float
    open: float | None = None
    high: float | None = None
    low: float | None = None
    volume: int | None = None


@dataclass(frozen=True)
class ReturnObservation:
    ticker: str
    trade_date: date
    log_return: float


@dataclass(frozen=True)
class HorizonForecast:
    horizon_days: int
    predicted_return: float
    target_close: float
    confidence_band: HorizonConfidence
    expected_accuracy_note: str
    measured_hit_rate: float | None = None
    measured_mae: float | None = None

    def to_record(self) -> dict[str, Any]:
        return {
            'horizon_days': self.horizon_days,
            'predicted_return': round(self.predicted_return, 6),
            'target_close': round(self.target_close, 4),
            'confidence_band': self.confidence_band,
            'expected_accuracy_note': self.expected_accuracy_note,
            'measured_hit_rate': round(self.measured_hit_rate, 4) if self.measured_hit_rate is not None else None,
            'measured_mae': round(self.measured_mae, 6) if self.measured_mae is not None else None,
        }


@dataclass(frozen=True)
class ForecastPrediction:
    ticker: str
    as_of_date: date
    target_date: date
    predicted_return: float
    predicted_direction: PredictedDirection
    baseline_return: float
    model_name: str
    confidence_label: ConfidenceLabel
    signal_direction: SignalDirection = 'FLAT'
    metadata_json: dict[str, Any] = field(default_factory=dict)

    def to_record(self) -> dict[str, Any]:
        payload = asdict(self)
        payload['as_of_date'] = self.as_of_date.isoformat()
        payload['target_date'] = self.target_date.isoformat()
        return payload


@dataclass(frozen=True)
class ForecastBatch:
    generated_at: datetime
    model_name: str
    predictions: list[ForecastPrediction]

    def to_records(self) -> list[dict[str, Any]]:
        return [prediction.to_record() for prediction in self.predictions]


@dataclass(frozen=True)
class ChartPoint:
    trade_date: date
    close: float

    def to_record(self) -> dict[str, Any]:
        return {'trade_date': self.trade_date.isoformat(), 'close': round(self.close, 4)}


@dataclass(frozen=True)
class ChartSeries:
    ticker: str
    as_of_date: date
    current_close: float
    predicted_return: float
    predicted_direction: PredictedDirection
    model_name: str
    history_points: list[ChartPoint]
    forecast_points: list[ChartPoint]

    def to_record(self) -> dict[str, Any]:
        return {
            'ticker': self.ticker,
            'as_of_date': self.as_of_date.isoformat(),
            'current_close': round(self.current_close, 4),
            'predicted_return': round(self.predicted_return, 6),
            'predicted_direction': self.predicted_direction,
            'model_name': self.model_name,
            'history': [point.to_record() for point in self.history_points],
            'forecast': [point.to_record() for point in self.forecast_points],
        }


@dataclass(frozen=True)
class SetupRecommendation:
    ticker: str
    as_of_date: date
    target_date: date
    current_close: float
    predicted_return: float
    baseline_return: float
    predicted_direction: PredictedDirection
    confidence_label: ConfidenceLabel
    signal_direction: SignalDirection
    portfolio_action: PortfolioAction
    setup_label: str
    conviction_score: int
    expected_move_range: tuple[float, float]
    trend_bias: TrendBias
    notes: str
    model_name: str
    current_position_shares: float = 0.0
    is_actionable: bool = False
    target_close: float | None = None
    horizon_forecasts: tuple[HorizonForecast, ...] = ()
    metadata_json: dict[str, Any] = field(default_factory=dict)

    def to_record(self) -> dict[str, Any]:
        target_close = self.target_close if self.target_close is not None else round(self.current_close * (1 + self.predicted_return), 4)
        return {
            'ticker': self.ticker,
            'as_of_date': self.as_of_date.isoformat(),
            'target_date': self.target_date.isoformat(),
            'current_close': round(self.current_close, 4),
            'current_price': round(self.current_close, 4),
            'target_close': round(target_close, 4),
            'predicted_return': round(self.predicted_return, 6),
            'baseline_return': round(self.baseline_return, 6),
            'predicted_direction': self.predicted_direction,
            'confidence_label': self.confidence_label,
            'signal_direction': self.signal_direction,
            'portfolio_action': self.portfolio_action,
            'setup_label': self.setup_label,
            'conviction_score': self.conviction_score,
            'expected_move_range': [round(self.expected_move_range[0], 6), round(self.expected_move_range[1], 6)],
            'trend_bias': self.trend_bias,
            'notes': self.notes,
            'model_name': self.model_name,
            'current_position_shares': self.current_position_shares,
            'is_actionable': self.is_actionable,
            'horizon_forecasts': [forecast.to_record() for forecast in self.horizon_forecasts],
            'metadata_json': self.metadata_json,
        }


@dataclass(frozen=True)
class DashboardArtifacts:
    batch: ForecastBatch
    setups: list[SetupRecommendation]
    chart_series: list[ChartSeries]
    notification_events: list[dict[str, Any]]

    @property
    def predictions(self) -> list[ForecastPrediction]:
        return self.batch.predictions
