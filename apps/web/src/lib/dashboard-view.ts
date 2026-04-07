import type { HorizonForecast, TickerForecast, TrendState } from '@/lib/types'

const STEADY_THRESHOLD = 0.0035

export function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
}

export function formatHitRate(value?: number | null) {
  if (value == null) return 'Waiting for history'
  return `${(value * 100).toFixed(1)}%`
}

export function getTrendState(predictedReturn: number): TrendState {
  if (predictedReturn > STEADY_THRESHOLD) return 'UP'
  if (predictedReturn < -STEADY_THRESHOLD) return 'DOWN'
  return 'STEADY'
}

export function getDefaultSelectedTicker(forecasts: TickerForecast[]) {
  return getWatchlistPriorityForecasts(forecasts)[0]?.ticker ?? null
}

export function getWatchlistPriorityForecasts(forecasts: TickerForecast[]) {
  return [...forecasts].sort((left, right) => {
    const leftActionable = left.portfolioAction === 'BUY' ? 1 : 0
    const rightActionable = right.portfolioAction === 'BUY' ? 1 : 0

    return rightActionable - leftActionable || right.convictionScore - left.convictionScore
  })
}

export function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

export function buildMobileStats(forecast: TickerForecast) {
  const oneDayHitRate = getHorizonForecast(forecast, 1)?.measuredHitRate

  return [
    { label: 'Entry', value: formatCurrency(forecast.entryPriceTarget) },
    { label: 'Target', value: formatCurrency(forecast.targetClose) },
    { label: 'Hit Rate', value: formatHitRate(oneDayHitRate) },
    { label: 'Expected Move', value: formatPercent(forecast.predictedReturn) },
  ]
}

export function formatMae(value?: number | null) {
  if (value == null) return 'Waiting for history'
  return `${(value * 100).toFixed(2)}%`
}

export function getHorizonForecast(forecast: TickerForecast, horizonDays: number): HorizonForecast | null {
  return forecast.horizonForecasts.find((item) => item.horizonDays === horizonDays) ?? null
}

export function getAverageOneDayHitRate(forecasts: TickerForecast[]) {
  const hitRates = forecasts
    .map((forecast) => getHorizonForecast(forecast, 1)?.measuredHitRate)
    .filter((value): value is number => value != null)

  if (hitRates.length === 0) return 0

  return Math.round((hitRates.reduce((total, value) => total + value, 0) / hitRates.length) * 100)
}

export function getBullishCount(forecasts: TickerForecast[]) {
  return forecasts.filter((forecast) => forecast.direction === 'bullish').length
}
