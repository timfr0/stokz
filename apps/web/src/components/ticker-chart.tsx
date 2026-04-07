import { buildChartFrame } from '@/lib/chart-math'
import { formatCurrency, formatPercent } from '@/lib/dashboard-view'
import type { ForecastChartSeries } from '@/lib/types'

type TickerChartProps = {
  series: ForecastChartSeries | null
  chartClassName?: string
}

export function TickerChart({ series, chartClassName = '' }: TickerChartProps) {
  if (!series) {
    return <div className="stokz-empty-chart">Chart artifact not available yet.</div>
  }

  const history = series.historyPoints.map((point) => point.close)
  const forecast = series.forecastPoints.map((point) => point.close)
  const frame = buildChartFrame(history, forecast)
  const historyPoints = frame.points
    .slice(0, history.length)
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
  const forecastPoints = frame.points
    .slice(Math.max(history.length - 1, 0))
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
  const forecastStroke = series.predictedReturn >= 0 ? '#0055ff' : '#e63b2e'

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#4a4a4a]">
        <span>Price + forecast</span>
        <span>
          {series.historyPoints.length} bars / {series.forecastPoints.length} steps
        </span>
      </div>
      <div className="stokz-chart-shell">
        <div className="stokz-chart-axis">
          {frame.labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <svg viewBox="0 0 100 100" className={`stokz-chart-svg ${chartClassName}`.trim()} fill="none" preserveAspectRatio="none">
          <polyline points={historyPoints} stroke="#1a1a1a" strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" />
          <polyline
            points={forecastPoints}
            stroke={forecastStroke}
            strokeDasharray="6 4"
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeWidth="3"
          />
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.16em]">
        <span className="text-[#4a4a4a]">{formatCurrency(series.currentClose)} now</span>
        <span className={series.predictedReturn >= 0 ? 'text-[#0055ff]' : 'text-[#e63b2e]'}>{formatPercent(series.predictedReturn)}</span>
      </div>
    </div>
  )
}
