import { DashboardHeader } from '@/components/dashboard-header'
import { ForecastCard } from '@/components/forecast-card'
import { ForecastChart } from '@/components/forecast-chart'
import { SetupStrip } from '@/components/setup-strip'
import { dashboardData } from '@/lib/chart-data'

const dashboard = dashboardData
const forecasts = dashboard.forecasts
const heroForecast = forecasts[0]
const featuredCharts = forecasts.slice(0, 3)
const buyCount = forecasts.filter((forecast) => forecast.portfolioAction === 'BUY').length
const sellCount = forecasts.filter((forecast) => forecast.portfolioAction === 'SELL').length
const averageConviction = Math.round(
  forecasts.reduce((total, forecast) => total + forecast.convictionScore, 0) / Math.max(forecasts.length, 1),
)
const averageOneDayHitRate = Math.round(
  (forecasts
    .map((forecast) => forecast.horizonForecasts.find((horizon) => horizon.horizonDays === 1)?.measuredHitRate)
    .filter((value): value is number => value != null)
    .reduce((total, value, _index, all) => total + value / all.length, 0) || 0) * 100,
)

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1560px] flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10 xl:px-12">
      <DashboardHeader />

      {heroForecast ? (
        <section className="grid gap-4 xl:grid-cols-[1.25fr,0.95fr]">
          <div className="rounded-[2.25rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Featured setup</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  {heroForecast.ticker} is the lead signal on the board.
                </h2>
              </div>
              <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
                {heroForecast.portfolioAction}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
                <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Prediction chart</div>
                <div className="mt-4">
                  <ForecastChart series={heroForecast.chartSeries} />
                </div>
              </div>
              <div className="grid gap-3">
                <MetricPanel label="Predicted return" value={formatPercent(heroForecast.predictedReturn)} note={heroForecast.setupLabel} />
                <MetricPanel label="1D rolling hit rate" value={formatMetric(heroForecast.horizonForecasts.find((h) => h.horizonDays === 1)?.measuredHitRate)} note="Measured from rolling evaluation history." />
                <MetricPanel label="Expected move range" value={`${formatPercent(heroForecast.expectedMoveRange[0])} to ${formatPercent(heroForecast.expectedMoveRange[1])}`} note={heroForecast.notes} />
              </div>
            </div>
          </div>

          <section className="grid gap-4 rounded-[2.25rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.4)]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Board summary</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">What changed today</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SnapshotCard label="Buy setups" value={`${buyCount}`} note="Names leaning constructive enough to deserve fresh attention." />
              <SnapshotCard label="Trim signals" value={`${sellCount}`} note="Names showing enough weakness to justify reduction or exit." />
              <SnapshotCard label="Average conviction" value={`${averageConviction}/100`} note="Cross-board quality and setup strength score." />
              <SnapshotCard label="1D hit rate" value={`${averageOneDayHitRate}%`} note="Rolling measured hit rate for the nearest horizon." />
            </div>

            <p className="text-sm leading-7 text-slate-400">
              This homepage is tuned to feel more like a premium Stitch-style product surface, but it still respects the actual job:
              help you understand what changed, what matters, and what to do next.
            </p>
          </section>
        </section>
      ) : null}

      <SetupStrip forecasts={forecasts} />

      <section className="grid gap-4 xl:grid-cols-3">
        {featuredCharts.map((forecast) => (
          <article key={`${forecast.ticker}-featured`} className="rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-5 shadow-[0_18px_60px_rgba(2,6,23,0.28)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Prediction lane</div>
                <h3 className="mt-2 text-2xl font-semibold text-white">{forecast.ticker}</h3>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                {forecast.portfolioAction}
              </div>
            </div>
            <div className="mt-4 rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-4">
              <ForecastChart series={forecast.chartSeries} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-300">
              <span>{forecast.setupLabel}</span>
              <span className="font-semibold text-white">{formatPercent(forecast.predictedReturn)}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr,1fr,1fr]">
        <InsightPanel
          eyebrow="Design direction"
          title="Softer surfaces, stronger hierarchy, more visual breathing room."
          body="The homepage now leans more into a Stitch-style product feel, with more premium section framing and chart-led story blocks instead of dumping the user into a giant wall of widgets."
        />
        <InsightPanel
          eyebrow="Prediction emphasis"
          title="More charts, less guessing."
          body="The board pushes actual prediction visuals higher, so the eye lands on movement, ranges, and horizon context before the ticker-level detail cards take over."
        />
        <InsightPanel
          eyebrow="Operator job"
          title="Know what changed without reading a novel."
          body="This page should let you scan the board, inspect the lead setups, and figure out what to buy, hold, or trim in a couple minutes without fighting the UI."
        />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {forecasts.map((forecast) => (
          <ForecastCard key={`${forecast.ticker}-${forecast.targetDate}`} forecast={forecast} />
        ))}
      </section>
    </main>
  )
}

function MetricPanel({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{note}</div>
    </div>
  )
}

function SnapshotCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{note}</div>
    </div>
  )
}

function InsightPanel({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/72 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
      <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
    </section>
  )
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
}

function formatMetric(value?: number | null) {
  if (value == null) return 'Waiting for history'
  return `${(value * 100).toFixed(1)}%`
}
