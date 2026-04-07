import type { TickerForecast } from '@/lib/types'

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
}

const actionTone = {
  BUY: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  HOLD: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  SELL: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
}

export function SetupStrip({ forecasts }: { forecasts: TickerForecast[] }) {
  const topForecasts = forecasts.slice(0, 4)

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Daily action sheet</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Top portfolio moves</h2>
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
          Next session
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-4">
        {topForecasts.map((forecast, index) => (
          <article key={forecast.ticker} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">0{index + 1}</div>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.2em] ${actionTone[forecast.portfolioAction]}`}>
                {forecast.portfolioAction}
              </span>
            </div>
            <div className="mt-4 text-xl font-semibold text-white">{forecast.ticker}</div>
            <div className="mt-1 text-sm text-slate-400">{forecast.setupLabel}</div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Forecast</div>
                <div className="mt-2 text-lg font-semibold text-white">{formatPercent(forecast.predictedReturn)}</div>
              </div>
              <div className="text-right text-sm text-slate-300">Conviction {forecast.convictionScore}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
