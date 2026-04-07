import type { ForecastChartSeries } from '@/lib/types'

function buildPoints(values: number[]) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')
}

export function ForecastChart({ series }: { series: ForecastChartSeries | null }) {
  if (!series) {
    return <div className="rounded-[1.5rem] border border-white/5 bg-slate-950/60 p-4 text-sm text-slate-400">Chart artifact not available yet.</div>
  }

  const history = series.historyPoints.map((point) => point.close)
  const forecast = series.forecastPoints.map((point) => point.close)
  const combined = [...history, ...forecast]
  const historyPolyline = buildPoints(combined.slice(0, history.length))
  const forecastPolyline = buildPoints(combined)
    .split(' ')
    .slice(Math.max(history.length - 1, 0))
    .join(' ')
  const stroke = series.direction === 'bullish' ? '#34d399' : series.direction === 'bearish' ? '#fb923c' : '#a78bfa'

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/5 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
        <span>Price + forecast</span>
        <span>
          {series.historyPoints.length} bars · {series.forecastPoints.length} steps
        </span>
      </div>
      <svg viewBox="0 0 100 100" className="h-28 w-full">
        <defs>
          <linearGradient id={`chart-${series.ticker}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={buildPoints(combined)} opacity="0.35" />
        <polyline fill="none" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={historyPolyline} />
        <polyline fill="none" stroke={`url(#chart-${series.ticker})`} strokeDasharray="6 4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={forecastPolyline} />
      </svg>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
        <span>${series.currentClose.toFixed(2)} now</span>
        <span className={series.predictedReturn >= 0 ? 'text-emerald-300' : 'text-orange-300'}>
          {series.predictedReturn >= 0 ? '+' : ''}
          {(series.predictedReturn * 100).toFixed(2)}%
        </span>
      </div>
    </div>
  )
}