import { ForecastChart } from '@/components/forecast-chart'
import type { TickerForecast } from '@/lib/types'

const directionTone = {
  bullish: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  bearish: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  neutral: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
}

const actionTone = {
  BUY: 'bg-emerald-400 text-emerald-950',
  HOLD: 'bg-amber-300 text-amber-950',
  SELL: 'bg-orange-400 text-orange-950',
}

const confidenceTone = {
  low: 'text-slate-300',
  medium: 'text-amber-300',
  high: 'text-emerald-300',
}

const horizonTone = {
  highest: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200',
  moderate: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
  lower: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
}

export function ForecastCard({ forecast }: { forecast: TickerForecast }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-[0_28px_80px_rgba(2,6,23,0.55)] transition-transform duration-300 hover:-translate-y-1">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-slate-500">{forecast.setupLabel}</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="text-3xl font-semibold tracking-tight text-white">{forecast.ticker}</div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-[0.2em] ${actionTone[forecast.portfolioAction]}`}>
              {forecast.portfolioAction}
            </span>
          </div>
          <div className="mt-2 text-sm text-slate-400">
            {forecast.asOfDate} → {forecast.targetDate}
          </div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${directionTone[forecast.direction]}`}>
          {forecast.direction}
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/5 bg-white/[0.04] p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Forecast</div>
            <div className="mt-2 text-3xl font-semibold text-white">{formatPercent(forecast.predictedReturn)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Expected move</div>
            <div className="mt-2 text-sm font-medium text-slate-200">
              {formatPercent(forecast.expectedMoveRange[0])} to {formatPercent(forecast.expectedMoveRange[1])}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <ForecastChart series={forecast.chartSeries} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric label="Baseline" value={formatPercent(forecast.baselineReturn)} />
        <Metric label="Signal" value={forecast.signalDirection} />
        <Metric label="Trend bias" value={forecast.trendBias} />
        <Metric label="Conviction" value={`${forecast.convictionScore}/100`} emphasis />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/5 bg-black/20 p-4 text-sm text-slate-300">
        <div className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-500">Trade note</div>
        {forecast.notes}
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/5 bg-white/[0.03] p-4">
        <div className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-500">Multi-horizon view</div>
        <div className="grid gap-3">
          {forecast.horizonForecasts.map((horizon) => (
            <div key={`${forecast.ticker}-${horizon.horizonDays}`} className="rounded-2xl border border-white/5 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">{horizon.horizonDays}D forecast</div>
                <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${horizonTone[horizon.confidenceBand]}`}>
                  {horizon.confidenceBand}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Expected return</div>
                  <div className="mt-2 text-lg font-semibold text-white">{formatPercent(horizon.predictedReturn)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Projected close</div>
                  <div className="mt-2 text-lg font-semibold text-white">${horizon.targetClose.toFixed(2)}</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-400">{horizon.expectedAccuracyNote}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Rolling hit rate</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {horizon.measuredHitRate != null ? `${(horizon.measuredHitRate * 100).toFixed(1)}%` : 'Waiting for history'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Rolling MAE</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {horizon.measuredMae != null ? `${(horizon.measuredMae * 100).toFixed(2)}%` : 'Waiting for history'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4 text-sm">
        <span className="text-slate-500">Model: {forecast.modelName}</span>
        <span className={`font-medium uppercase tracking-[0.2em] ${confidenceTone[forecast.confidenceLabel]}`}>
          {forecast.confidenceLabel} confidence
        </span>
      </div>
    </article>
  )
}

function Metric({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className={`mt-2 text-lg ${emphasis ? 'font-semibold text-white' : 'text-slate-200'}`}>{value}</div>
    </div>
  )
}
