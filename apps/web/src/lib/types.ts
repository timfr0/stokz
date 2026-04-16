export type ForecastDirection = 'bullish' | 'bearish' | 'neutral'
export type ConfidenceLabel = 'low' | 'medium' | 'high'
export type PortfolioAction = 'BUY' | 'HOLD' | 'SELL'
export type HorizonConfidence = 'highest' | 'moderate' | 'lower'
export type TrendBias = 'Uptrend' | 'Downtrend' | 'Range'
export type NewsBias = 'supportive' | 'mixed' | 'conflicting'
export type EventRisk = 'low' | 'moderate' | 'high'
export type Tone = 'bear' | 'base' | 'bull'
export type SocialSourceType = 'reddit' | 'twitter' | 'web'
export type CommunitySentimentLabel = 'positive' | 'mixed' | 'negative'
export type OverallSentimentLabel = 'bullish' | 'mixed' | 'bearish'

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
  basePredictedReturn: number
  adjustedPredictedReturn: number
  calibrationEnabled: boolean
  calibrationModelVersion: number | null
  calibrationStatus: string
  calibrationReasons: string[]
  eventRisk: EventRisk
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

export interface CommunityFeedItem extends NewsFeedItem {
  sourceType: SocialSourceType
  query: string
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

export interface StockTimeframeSnapshot {
  label: string
  horizonDays: number
  predictedReturn: number
  targetClose: number
  confidenceBand: HorizonConfidence
  hitRate: number | null
  mae: number | null
}

export interface StockScenario {
  id: 'bear' | 'base' | 'bull'
  label: string
  probability: number
  targetPrice: number
  summary: string
  tone: Tone
}

export interface StockReason {
  title: string
  body: string
  tone: 'forecast' | 'trend' | 'news' | 'event'
}

export interface StockAiSummary {
  headline: string
  predictedMove: string
  actionSummary: string
  whyToday: string[]
}

export interface StockDetail {
  ticker: string
  companyName: string
  sector: string
  industry: string
  asOfDate: string
  targetDate: string
  currentPrice: number
  entryPriceTarget: number
  stopPrice: number
  targetPrice: number
  bias: ForecastDirection
  basePredictedReturn: number
  adjustedPredictedReturn: number
  calibrationEnabled: boolean
  calibrationModelVersion: number | null
  calibrationStatus: string
  calibrationReasons: string[]
  confidenceLabel: ConfidenceLabel
  confidenceScore: number
  baseConfidenceScore: number
  signalDirection: 'LONG' | 'SHORT' | 'FLAT'
  portfolioAction: PortfolioAction
  trendBias: TrendBias
  trendSummary: string
  shortTermTrend: number | null
  mediumTermTrend: number | null
  modelName: string
  setupLabel: string
  convictionScore: number
  adjustedConvictionScore: number
  newsBias: NewsBias
  newsImpactScore: number
  communitySentimentScore: number
  communitySentimentLabel: CommunitySentimentLabel
  overallSentimentScore: number
  overallSentimentLabel: OverallSentimentLabel
  confidenceAdjustment: number
  eventRisk: EventRisk
  riskRewardRatio: number
  expectedMoveLow: number
  expectedMoveHigh: number
  marketCap: number | null
  averageVolume: number | null
  yearHigh: number | null
  yearLow: number | null
  analystTarget: number | null
  earningsDate: string | null
  daysToEarnings: number | null
  timeframes: StockTimeframeSnapshot[]
  scenarios: StockScenario[]
  reasons: StockReason[]
  newsItems: NewsFeedItem[]
  communityItems: CommunityFeedItem[]
  aiSummary: StockAiSummary
  chartSeries: ForecastChartSeries | null
}

export interface DashboardData {
  forecasts: TickerForecast[]
  generatedAtLabel: string
  reviews: DailyReviewSummary[]
  latestReview: DailyReviewSummary | null
}
