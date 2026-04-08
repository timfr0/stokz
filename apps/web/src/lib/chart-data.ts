import portfolioSetups from '../../../../services/forecast/generated/portfolio-setups.json'
import chartSeriesData from '../../../../services/forecast/generated/chart-series.json'
import reviewIndex from '../../../../services/forecast/generated/reviews/index.json'
import type { DailyReviewSummary, DashboardData, ForecastChartSeries, TickerForecast } from './types'

type RawChartPoint = {
  trade_date: string
  close: number
}

type RawChartSeries = {
  ticker: string
  as_of_date: string
  current_close: number
  predicted_return: number
  predicted_direction: 'bullish' | 'bearish' | 'neutral'
  model_name: string
  history: RawChartPoint[]
  forecast: RawChartPoint[]
}

type RawSetup = {
  ticker: string
  as_of_date: string
  target_date: string
  current_close: number
  target_close: number
  predicted_return: number
  baseline_return: number
  predicted_direction: string
  confidence_label: string
  model_name: string
  signal_direction: string
  portfolio_action: string
  setup_label: string
  conviction_score: number
  expected_move_range: number[]
  trend_bias: string
  notes: string
  current_position_shares: number
  is_actionable: boolean
  horizon_forecasts?: {
    horizon_days: number
    predicted_return: number
    target_close: number
    confidence_band: 'highest' | 'moderate' | 'lower'
    expected_accuracy_note: string
    measured_hit_rate: number | null
    measured_mae: number | null
  }[]
}

type RawReview = {
  review_date: string
  generated_at: string
  spy_regime: string
  spy_move: string
  news_items: string[]
  analyst_decision: {
    decision: string
    confidence: string
    evidence_quality: string
    rationale: string
  }
  risk_assessment: {
    risk_level: string
    trade_posture: string
    flags: string[]
    recommendation: string
  }
  top_hits: {
    ticker: string
    portfolio_action: string
    target_close: number
    predicted_return: number
    setup_label?: string
    notes?: string
  }[]
  top_misses: {
    ticker: string
    portfolio_action: string
    target_close: number
    predicted_return: number
    setup_label?: string
    notes?: string
  }[]
  tomorrow_config: {
    adjustments: {
      parameter: string
      direction: string
      reason: string
    }[]
    notes: string[]
  }
  operator_summary: string
}

const chartMap = new Map<string, ForecastChartSeries>(
  (chartSeriesData as RawChartSeries[]).map((series) => [
    series.ticker,
    {
      ticker: series.ticker,
      asOfDate: series.as_of_date,
      currentClose: series.current_close,
      predictedReturn: series.predicted_return,
      direction: series.predicted_direction,
      modelName: series.model_name,
      historyPoints: series.history.map((point) => ({ tradeDate: point.trade_date, close: point.close })),
      forecastPoints: series.forecast.map((point) => ({ tradeDate: point.trade_date, close: point.close })),
    },
  ]),
)

const forecasts: TickerForecast[] = ((portfolioSetups as unknown) as RawSetup[]).map((row) => ({
  ticker: row.ticker,
  asOfDate: row.as_of_date,
  targetDate: row.target_date,
  predictedReturn: row.predicted_return,
  baselineReturn: row.baseline_return,
  direction: row.predicted_direction as TickerForecast['direction'],
  confidenceLabel: row.confidence_label as TickerForecast['confidenceLabel'],
  modelName: row.model_name,
  signalDirection: row.signal_direction as TickerForecast['signalDirection'],
  portfolioAction: row.portfolio_action as TickerForecast['portfolioAction'],
  setupLabel: row.setup_label,
  convictionScore: row.conviction_score,
  expectedMoveRange: [Number(row.expected_move_range[0] ?? 0), Number(row.expected_move_range[1] ?? 0)] as [number, number],
  trendBias: row.trend_bias as TickerForecast['trendBias'],
  notes: row.notes,
  currentClose: row.current_close,
  targetClose: row.target_close,
  entryPriceTarget: Number((row.current_close * (1 - Math.min(Math.abs(row.predicted_return) * 0.35, 0.03))).toFixed(2)),
  currentPositionShares: row.current_position_shares,
  isActionable: row.is_actionable,
  chartSeries: chartMap.get(row.ticker) ?? null,
  horizonForecasts: (row.horizon_forecasts ?? []).map((forecast) => ({
    horizonDays: forecast.horizon_days,
    predictedReturn: forecast.predicted_return,
    targetClose: forecast.target_close,
    confidenceBand: forecast.confidence_band,
    expectedAccuracyNote: forecast.expected_accuracy_note,
    measuredHitRate: forecast.measured_hit_rate,
    measuredMae: forecast.measured_mae,
  })),
}))

const reviews: DailyReviewSummary[] = (reviewIndex as RawReview[]).map((review) => ({
  reviewDate: review.review_date,
  generatedAt: review.generated_at,
  spyRegime: review.spy_regime,
  spyMove: review.spy_move,
  newsItems: review.news_items,
  analystDecision: {
    decision: review.analyst_decision.decision,
    confidence: review.analyst_decision.confidence,
    evidenceQuality: review.analyst_decision.evidence_quality,
    rationale: review.analyst_decision.rationale,
  },
  riskAssessment: {
    riskLevel: review.risk_assessment.risk_level,
    tradePosture: review.risk_assessment.trade_posture,
    flags: review.risk_assessment.flags,
    recommendation: review.risk_assessment.recommendation,
  },
  topHits: review.top_hits.map((item) => ({
    ticker: item.ticker,
    portfolioAction: item.portfolio_action,
    targetClose: item.target_close,
    predictedReturn: item.predicted_return,
    setupLabel: item.setup_label,
    notes: item.notes,
  })),
  topMisses: review.top_misses.map((item) => ({
    ticker: item.ticker,
    portfolioAction: item.portfolio_action,
    targetClose: item.target_close,
    predictedReturn: item.predicted_return,
    setupLabel: item.setup_label,
    notes: item.notes,
  })),
  tomorrowConfig: review.tomorrow_config,
  operatorSummary: review.operator_summary,
}))

export const dashboardData: DashboardData = {
  forecasts,
  generatedAtLabel: forecasts[0]?.asOfDate ?? 'No data',
  reviews,
}
