from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from .universe import TICKER_UNIVERSE


DEFAULT_TIMESFM_MODEL_PATH = 'C:/Users/timfr/.openclaw/models/timesfm-2.5'
DEFAULT_TIMESFM_REPO_ID = 'google/timesfm-2.5-200m-pytorch'


def _service_root() -> Path:
    return Path(__file__).resolve().parents[2]


DEFAULT_GENERATED_DIR = _service_root() / 'generated'
DEFAULT_CALIBRATION_MODEL_PATH = DEFAULT_GENERATED_DIR / 'models' / 'calibration-model.json'
DEFAULT_CALIBRATION_HISTORY_PATH = DEFAULT_GENERATED_DIR / 'history' / 'calibration-history.json'


def _parse_universe(raw_value: str | None) -> tuple[str, ...]:
    if not raw_value:
        return tuple(TICKER_UNIVERSE)
    return tuple(symbol.strip().upper() for symbol in raw_value.split(',') if symbol.strip())


def _parse_bool(raw_value: str | None, default: bool) -> bool:
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {'1', 'true', 'yes', 'on'}


def _resolve_service_path(raw_value: str | None, default: Path) -> Path:
    if not raw_value:
        return default
    candidate = Path(raw_value)
    if candidate.is_absolute():
        return candidate
    return _service_root() / candidate


@dataclass(frozen=True)
class Settings:
    data_provider: str = 'yfinance'
    data_lookback_days: int = 180
    data_auto_adjust: bool = True
    timesfm_backend: str = 'placeholder'
    timesfm_model_path: str | None = None
    timesfm_repo_id: str | None = None
    forecast_horizon_days: int = 1
    ticker_universe: tuple[str, ...] = tuple(TICKER_UNIVERSE)
    chart_history_days: int = 30
    portfolio_holdings_raw: str = ''
    portfolio_holdings_file: str = ''
    notification_channel: str = 'discord'
    notification_target: str = 'channel:1490561040486760469'
    calibration_enabled: bool = False
    calibration_model_path: Path = DEFAULT_CALIBRATION_MODEL_PATH
    calibration_history_path: Path = DEFAULT_CALIBRATION_HISTORY_PATH
    calibration_min_training_rows: int = 50

    @property
    def daily_lookback_days(self) -> int:
        return self.data_lookback_days

    @property
    def auto_adjust_prices(self) -> bool:
        return self.data_auto_adjust


def load_settings() -> Settings:
    timesfm_model_path = os.getenv('STOKZ_TIMESFM_MODEL_PATH') or DEFAULT_TIMESFM_MODEL_PATH
    timesfm_repo_id = os.getenv('STOKZ_TIMESFM_REPO_ID') or DEFAULT_TIMESFM_REPO_ID
    return Settings(
        data_provider=os.getenv('STOKZ_DATA_PROVIDER', 'yfinance'),
        data_lookback_days=int(os.getenv('STOKZ_DAILY_LOOKBACK_DAYS', '180')),
        data_auto_adjust=_parse_bool(os.getenv('STOKZ_AUTO_ADJUST_PRICES'), True),
        timesfm_backend=os.getenv('STOKZ_TIMESFM_BACKEND', 'placeholder'),
        timesfm_model_path=timesfm_model_path,
        timesfm_repo_id=timesfm_repo_id,
        forecast_horizon_days=int(os.getenv('STOKZ_FORECAST_HORIZON_DAYS', '1')),
        ticker_universe=_parse_universe(os.getenv('STOKZ_TICKER_UNIVERSE')),
        chart_history_days=int(os.getenv('STOKZ_CHART_HISTORY_DAYS', '30')),
        portfolio_holdings_raw=os.getenv('STOKZ_PORTFOLIO_HOLDINGS', ''),
        portfolio_holdings_file=os.getenv('STOKZ_PORTFOLIO_HOLDINGS_FILE', ''),
        notification_channel=os.getenv('STOKZ_NOTIFICATION_CHANNEL', 'discord'),
        notification_target=os.getenv('STOKZ_NOTIFICATION_TARGET', 'channel:1490561040486760469'),
        calibration_enabled=_parse_bool(os.getenv('STOKZ_CALIBRATION_ENABLED'), False),
        calibration_model_path=_resolve_service_path(
            os.getenv('STOKZ_CALIBRATION_MODEL_PATH'),
            DEFAULT_CALIBRATION_MODEL_PATH,
        ),
        calibration_history_path=_resolve_service_path(
            os.getenv('STOKZ_CALIBRATION_HISTORY_PATH'),
            DEFAULT_CALIBRATION_HISTORY_PATH,
        ),
        calibration_min_training_rows=int(os.getenv('STOKZ_CALIBRATION_MIN_TRAINING_ROWS', '50')),
    )
