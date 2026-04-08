export type ForecastDirection = 'bullish' | 'bearish' | 'neutral'
export type ConfidenceLabel = 'low' | 'medium' | 'high'
export type PortfolioAction = 'BUY' | 'HOLD' | 'SELL'
export type HorizonConfidence = 'highest' | 'moderate' | 'lower'
export type TrendState = 'UP' | 'DOWN' | 'STEADY'

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
  trendBias: 'Uptrend' | 'Downtrend' | 'Range'
  notes: string
  currentClose: number
  targetClose: number
  entryPriceTarget: number
  currentPositionShares: number
  isActionable: boolean
  chartSeries: ForecastChartSeries | null
  horizonForecasts: HorizonForecast[]
}

export interface ReviewAdjustment {
  parameter: string
  direction: string
  reason: string
}

export interface DailyReviewSummary {
  reviewDate: string
  generatedAt: string
  spyRegime: string
  spyMove: string
  newsItems: string[]
  analystDecision: {
    decision: string
    confidence: string
    evidenceQuality: string
    rationale: string
  }
  riskAssessment: {
    riskLevel: string
    tradePosture: string
    flags: string[]
    recommendation: string
  }
  topHits: {
    ticker: string
    portfolioAction: string
    targetClose: number
    predictedReturn: number
    setupLabel?: string
    notes?: string
  }[]
  topMisses: {
    ticker: string
    portfolioAction: string
    targetClose: number
    predictedReturn: number
    setupLabel?: string
    notes?: string
  }[]
  tomorrowConfig: {
    adjustments: ReviewAdjustment[]
    notes: string[]
  }
  operatorSummary: string
}

export interface DashboardData {
  forecasts: TickerForecast[]
  generatedAtLabel: string
  reviews: DailyReviewSummary[]
}
