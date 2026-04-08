export type ForecastDirection = 'bullish' | 'bearish' | 'neutral'
export type ConfidenceLabel = 'low' | 'medium' | 'high'
export type PortfolioAction = 'BUY' | 'HOLD' | 'SELL'
export type HorizonConfidence = 'highest' | 'moderate' | 'lower'
export type TrendBias = 'Uptrend' | 'Downtrend' | 'Range'

export interface ChartPoint {
  tradeDate: string
  close: number
}

export interface HorizonForecast {
  horizonDays: number
  predictedReturn: number
  targetClose: number
  confidenceBand: HorizonConfidence
  expectedAccuracyNote: string
  measuredHitRate: number | null
  measuredMae: number | null
}

export interface ForecastChartSeries {
  ticker: string
  asOfDate: string
  currentClose: number
  predictedReturn: number
  direction: ForecastDirection
  modelName: string
  historyPoints: ChartPoint[]
  forecastPoints: ChartPoint[]
}

export interface TickerForecast {
  ticker: string
  asOfDate: string
  targetDate: string
  predictedReturn: number
  baselineReturn: number
  direction: ForecastDirection
  confidenceLabel: ConfidenceLabel
  modelName: string
  signalDirection: 'LONG' | 'SHORT' | 'FLAT'
  portfolioAction: PortfolioAction
  setupLabel: string
  convictionScore: number
  expectedMoveRange: [number, number]
  trendBias: TrendBias
  notes: string
  currentClose: number
  targetClose: number
  entryPriceTarget: number
  currentPositionShares: number
  isActionable: boolean
  chartSeries: ForecastChartSeries | null
  horizonForecasts: HorizonForecast[]
}

export interface ReviewSetupItem {
  ticker: string
  portfolioAction: PortfolioAction
  setupLabel: string
  predictedReturn: number
  confidenceLabel: ConfidenceLabel
  trendBias: TrendBias
  convictionScore: number
  currentClose: number
  entryPriceTarget: number
  targetClose: number
  oneDayHitRate: number | null
  oneDayMae: number | null
  notes: string
}

export interface NewsFeedItem {
  id: string
  ticker: string
  title: string
  summary: string
  source: string
  publishedAt: string | null
  url: string
}

export interface DailyReviewSummary {
  reviewDate: string
  generatedAt: string
  modelName: string
  marketRegime: string
  analystDecision: string
  riskPosture: string
  operatorSummary: string
  nextSessionPlan: string
  publishSummary: string
  forecastCount: number
  buyCount: number
  sellCount: number
  holdCount: number
  bullishCount: number
  bearishCount: number
  averagePredictedReturn: number
  averageOneDayHitRate: number | null
  topLongs: ReviewSetupItem[]
  riskReductions: ReviewSetupItem[]
  watchlist: ReviewSetupItem[]
  newsItems: NewsFeedItem[]
}

export interface DashboardData {
  forecasts: TickerForecast[]
  generatedAtLabel: string
  reviews: DailyReviewSummary[]
  latestReview: DailyReviewSummary | null
}
