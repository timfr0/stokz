import portfolioSetups from '../../../../services/forecast/generated/portfolio-setups.json'
import chartSeries from '../../../../services/forecast/generated/chart-series.json'
import reviewIndex from '../../../../services/forecast/generated/reviews/index.json'
import stockDetails from '../../../../services/forecast/generated/stock-details.json'
import type { DailyReviewSummary, DashboardData, ForecastChartSeries, ReviewSetupItem, StockDetail, TickerForecast } from './types'

type RawSetup = {
  ticker: string
  as_of_date: string
  target_date: string
  current_close: number
  target_close: number
  predicted_return: number
  baseline_return: number
  predicted_direction: 'bullish' | 'bearish' | 'neutral'
  confidence_label: 'low' | 'medium' | 'high'
  model_name: string
  signal_direction: 'LONG' | 'SHORT' | 'FLAT'
  portfolio_action: 'BUY' | 'HOLD' | 'SELL'
  setup_label: string
  conviction_score: number
  expected_move_range: [number, number]
  trend_bias: 'Uptrend' | 'Downtrend' | 'Range'
  notes: string
  current_position_shares: number
  is_actionable: boolean
  horizon_forecasts: {
    horizon_days: number
    predicted_return: number
    target_close: number
    confidence_band: 'highest' | 'moderate' | 'lower'
    expected_accuracy_note: string
    measured_hit_rate: number | null
    measured_mae: number | null
  }[]
}

type RawChartRow = {
  ticker: string
  as_of_date: string
  current_close: number
  predicted_return: number
  predicted_direction: 'bullish' | 'bearish' | 'neutral'
  model_name: string
  history: { trade_date: string; close: number }[]
  forecast: { trade_date: string; close: number }[]
}

type RawReviewSetup = ReviewSetupItem

type RawReviewSummary = DailyReviewSummary & {
  topLongs?: RawReviewSetup[]
  riskReductions?: RawReviewSetup[]
  watchlist?: RawReviewSetup[]
}

type RawStockDetail = Omit<StockDetail, 'chartSeries'>

const chartMap = new Map<string, ForecastChartSeries>(
  (chartSeries as unknown as RawChartRow[]).map((row) => [
    row.ticker.toUpperCase(),
    {
      ticker: row.ticker,
      asOfDate: row.as_of_date,
      currentClose: row.current_close,
      predictedReturn: row.predicted_return,
      direction: row.predicted_direction,
      modelName: row.model_name,
      historyPoints: row.history.map((point) => ({ tradeDate: point.trade_date, close: point.close })),
      forecastPoints: row.forecast.map((point) => ({ tradeDate: point.trade_date, close: point.close })),
    },
  ]),
)

const reviews: DailyReviewSummary[] = (reviewIndex as unknown as RawReviewSummary[]).map((review) => ({
  ...review,
  topLongs: [...(review.topLongs ?? [])],
  riskReductions: [...(review.riskReductions ?? [])],
  watchlist: [...(review.watchlist ?? [])],
  newsItems: [...(review.newsItems ?? [])],
}))

export const allStockDetails: StockDetail[] = (stockDetails as unknown as RawStockDetail[]).map((detail) => ({
  ...detail,
  chartSeries: chartMap.get(detail.ticker.toUpperCase()) ?? null,
}))

const stockDetailMap = new Map<string, StockDetail>(allStockDetails.map((detail) => [detail.ticker.toUpperCase(), detail]))

export function getStockDetail(ticker: string): StockDetail | null {
  return stockDetailMap.get(ticker.toUpperCase()) ?? null
}

export function getStockTickers(): string[] {
  return allStockDetails.map((detail) => detail.ticker)
}

export const dashboardData: DashboardData = {
  forecasts: (portfolioSetups as unknown as RawSetup[]).map(
    (row) =>
      ({
        ticker: row.ticker,
        asOfDate: row.as_of_date,
        targetDate: row.target_date,
        predictedReturn: row.predicted_return,
        baselineReturn: row.baseline_return,
        direction: row.predicted_direction,
        confidenceLabel: row.confidence_label,
        modelName: row.model_name,
        signalDirection: row.signal_direction,
        portfolioAction: row.portfolio_action,
        setupLabel: row.setup_label,
        convictionScore: row.conviction_score,
        expectedMoveRange: row.expected_move_range,
        trendBias: row.trend_bias,
        notes: row.notes,
        currentClose: row.current_close,
        targetClose: row.target_close,
        entryPriceTarget: Number((row.current_close * (1 - Math.min(Math.abs(row.predicted_return) * 0.35, 0.03))).toFixed(2)),
        currentPositionShares: row.current_position_shares,
        isActionable: row.is_actionable,
        chartSeries: chartMap.get(row.ticker.toUpperCase()) ?? null,
        horizonForecasts: (row.horizon_forecasts ?? []).map((forecast) => ({
          horizonDays: forecast.horizon_days,
          predictedReturn: forecast.predicted_return,
          targetClose: forecast.target_close,
          confidenceBand: forecast.confidence_band,
          expectedAccuracyNote: forecast.expected_accuracy_note,
          measuredHitRate: forecast.measured_hit_rate,
          measuredMae: forecast.measured_mae,
        })),
      }) satisfies TickerForecast,
  ),
  generatedAtLabel: (portfolioSetups as unknown as RawSetup[])[0]?.as_of_date ?? new Date().toISOString().slice(0, 10),
  reviews,
  latestReview: reviews[0] ?? null,
}
