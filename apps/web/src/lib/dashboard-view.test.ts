import { describe, expect, it } from 'vitest'
import type { TickerForecast } from '@/lib/types'
import {
  buildMobileStats,
  getDefaultSelectedTicker,
  getTrendState,
  getWatchlistPriorityForecasts,
} from '@/lib/dashboard-view'

function makeForecast(overrides: Partial<TickerForecast>): TickerForecast {
  return {
    ticker: 'AMD',
    asOfDate: '2026-04-07',
    targetDate: '2026-04-08',
    predictedReturn: 0.01,
    baselineReturn: 0.002,
    direction: 'bullish',
    confidenceLabel: 'high',
    modelName: 'timesfm',
    signalDirection: 'LONG',
    portfolioAction: 'BUY',
    setupLabel: 'Momentum continuation',
    convictionScore: 80,
    expectedMoveRange: [0.005, 0.018],
    trendBias: 'Uptrend',
    notes: 'Test note',
    currentClose: 100,
    targetClose: 102,
    entryPriceTarget: 99.4,
    currentPositionShares: 0,
    isActionable: true,
    chartSeries: null,
    horizonForecasts: [],
    ...overrides,
  }
}

describe('getDefaultSelectedTicker', () => {
  it('prefers the highest-conviction BUY', () => {
    const result = getDefaultSelectedTicker([
      makeForecast({ ticker: 'ANET', portfolioAction: 'HOLD', convictionScore: 92 }),
      makeForecast({ ticker: 'AMD', portfolioAction: 'BUY', convictionScore: 81 }),
      makeForecast({ ticker: 'AVGO', portfolioAction: 'BUY', convictionScore: 88 }),
    ])

    expect(result).toBe('AVGO')
  })

  it('falls back to the highest-conviction forecast when no BUY exists', () => {
    const result = getDefaultSelectedTicker([
      makeForecast({ ticker: 'ANET', portfolioAction: 'HOLD', convictionScore: 72 }),
      makeForecast({ ticker: 'AVGO', portfolioAction: 'SELL', convictionScore: 91 }),
    ])

    expect(result).toBe('AVGO')
  })
})

describe('getTrendState', () => {
  it('returns UP for meaningful positive forecasts', () => {
    expect(getTrendState(0.01)).toBe('UP')
  })

  it('returns DOWN for meaningful negative forecasts', () => {
    expect(getTrendState(-0.01)).toBe('DOWN')
  })

  it('returns STEADY for near-flat forecasts', () => {
    expect(getTrendState(0.003)).toBe('STEADY')
    expect(getTrendState(-0.003)).toBe('STEADY')
  })
})

describe('buildMobileStats', () => {
  it('always maps entry, target, hit rate, and expected move in that order', () => {
    const result = buildMobileStats(
      makeForecast({
        entryPriceTarget: 98.25,
        targetClose: 103.4,
        horizonForecasts: [
          {
            horizonDays: 1,
            predictedReturn: 0.012,
            targetClose: 103.4,
            confidenceBand: 'highest',
            expectedAccuracyNote: 'Strong',
            measuredHitRate: 0.86,
            measuredMae: 0.01,
          },
        ],
      }),
    )

    expect(result.map((item) => item.label)).toEqual(['Entry', 'Target', 'Hit Rate', 'Expected Move'])
    expect(result[0]?.value).toBe('$98.25')
    expect(result[1]?.value).toBe('$103.40')
    expect(result[2]?.value).toBe('86.0%')
    expect(result[3]?.value).toBe('+1.00%')
  })
})

describe('getWatchlistPriorityForecasts', () => {
  it('orders actionable higher-conviction names first', () => {
    const result = getWatchlistPriorityForecasts([
      makeForecast({ ticker: 'ANET', portfolioAction: 'HOLD', convictionScore: 92 }),
      makeForecast({ ticker: 'AMD', portfolioAction: 'BUY', convictionScore: 77 }),
      makeForecast({ ticker: 'AVGO', portfolioAction: 'BUY', convictionScore: 89 }),
    ])

    expect(result.map((item) => item.ticker)).toEqual(['AVGO', 'AMD', 'ANET'])
  })
})
