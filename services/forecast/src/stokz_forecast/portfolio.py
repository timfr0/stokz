from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path

from .config import Settings


@dataclass(frozen=True)
class Holding:
    ticker: str
    shares: float
    average_cost: float | None = None


PortfolioPosition = Holding


@dataclass(frozen=True)
class PortfolioSnapshot:
    as_of_date: date
    holdings: list[Holding]
    watchlist: tuple[str, ...]

    @property
    def positions(self) -> tuple[Holding, ...]:
        return tuple(self.holdings)

    def position_for(self, ticker: str) -> Holding | None:
        ticker_key = ticker.upper()
        for holding in self.holdings:
            if holding.ticker.upper() == ticker_key:
                return holding
        return None

    def shares_for(self, ticker: str) -> float:
        holding = self.position_for(ticker)
        return holding.shares if holding is not None else 0.0

    def owns(self, ticker: str) -> bool:
        return self.shares_for(ticker) > 0


DEFAULT_HOLDINGS: tuple[Holding, ...] = (
    Holding(ticker='DELL', shares=18),
    Holding(ticker='ORCL', shares=22),
    Holding(ticker='AVGO', shares=12),
    Holding(ticker='SYM', shares=15),
)


def _parse_holding(token: str) -> Holding:
    parts = [part.strip() for part in token.split(':')]
    if len(parts) < 2:
        raise ValueError(f'Invalid portfolio token: {token}')
    ticker = parts[0].upper()
    shares = float(parts[1])
    average_cost = float(parts[2]) if len(parts) > 2 and parts[2] else None
    return Holding(ticker=ticker, shares=shares, average_cost=average_cost)


def parse_portfolio_positions(raw_value: str | None) -> tuple[Holding, ...]:
    if not raw_value:
        return ()
    return tuple(_parse_holding(token) for token in raw_value.split(',') if token.strip())


def load_portfolio_positions_from_file(path: str | None) -> tuple[Holding, ...]:
    if not path:
        return ()
    file_path = Path(path)
    if not file_path.exists():
        return ()
    raw_value = file_path.read_text(encoding='utf-8').strip()
    return parse_portfolio_positions(raw_value)


def _default_holdings(watchlist: tuple[str, ...]) -> tuple[Holding, ...]:
    allowed = {ticker.upper() for ticker in watchlist}
    return tuple(holding for holding in DEFAULT_HOLDINGS if holding.ticker in allowed)


def load_portfolio_snapshot(settings: Settings, as_of_date: date | None = None) -> PortfolioSnapshot:
    holdings = parse_portfolio_positions(settings.portfolio_holdings_raw)
    if not holdings:
        holdings = load_portfolio_positions_from_file(settings.portfolio_holdings_file)
    if not holdings:
        holdings = _default_holdings(settings.ticker_universe)
    return PortfolioSnapshot(
        as_of_date=as_of_date or date.today(),
        holdings=list(holdings),
        watchlist=settings.ticker_universe,
    )
