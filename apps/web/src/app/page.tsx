import { dashboardData } from '@/lib/chart-data'
import type { DailyReviewSummary, ReviewSetupItem, TickerForecast } from '@/lib/types'
import type { ReactNode } from 'react'

const dashboard = dashboardData
const forecasts = dashboard.forecasts
const latestReview = dashboard.latestReview
const archive = dashboard.reviews.slice(1, 8)

const averageOneDayHitRate = latestReview?.averageOneDayHitRate ?? null
const averagePredictedReturn = latestReview?.averagePredictedReturn ?? averageForecast(forecasts)
const topForecasts = forecasts.slice(0, 8)

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#08111f] text-[#e6edf5]">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Hero review={latestReview} />

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.32em] text-cyan-200/55">After-close brief</div>
                <h2 className="mt-3 font-['Syne'] text-3xl font-semibold text-white sm:text-4xl">Tonight&apos;s call</h2>
              </div>
              <div className="rounded-full border border-cyan-300/15 bg-cyan-300/8 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-200">
                {latestReview?.reviewDate ?? dashboard.generatedAtLabel}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <ActionSection title="Best longs" items={latestReview?.topLongs ?? []} emptyLabel="No clean longs today." />
              <ActionSection title="Risk reductions" items={latestReview?.riskReductions ?? []} emptyLabel="No urgent trims today." />
              <ActionSection title="Watchlist holds" items={latestReview?.watchlist ?? []} emptyLabel="No hold notes yet." />
            </div>
          </Panel>

          <div className="grid gap-6">
            <Panel>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] text-cyan-200/55">Publish path</div>
                  <h2 className="mt-2 font-['Syne'] text-2xl font-semibold text-white">GitHub → Vercel</h2>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-emerald-200">
                  auto-deploy ready
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-slate-300">
                <PipelineRow label="Daily refresh" value="Generate setups, charts, notifications, and review archive" />
                <PipelineRow label="GitHub surface" value="Commit dated JSON + markdown report into generated/reviews" />
                <PipelineRow label="Vercel result" value="New push to main triggers a fresh site build automatically" />
                <PipelineRow label="Model mode" value={latestReview?.modelName ?? 'timesfm-fallback'} />
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-black/20 p-4 text-sm leading-7 text-slate-300">
                {latestReview?.publishSummary ?? 'Waiting for the first review publish run.'}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] text-cyan-200/55">Archive</div>
                  <h2 className="mt-2 font-['Syne'] text-2xl font-semibold text-white">Daily review log</h2>
                </div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Committed with repo data</div>
              </div>

              <div className="mt-5 grid gap-3">
                {[latestReview, ...archive].filter(Boolean).map((review) => (
                  <ArchiveRow key={review!.reviewDate} review={review!} isLatest={review?.reviewDate === latestReview?.reviewDate} />
                ))}
              </div>
            </Panel>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Buy setups" value={String(latestReview?.buyCount ?? countByAction(forecasts, 'BUY'))} note="Fresh adds worth stalking tomorrow" tone="cyan" />
          <StatCard label="Risk trims" value={String(latestReview?.sellCount ?? countByAction(forecasts, 'SELL'))} note="Existing positions with downside pressure" tone="rose" />
          <StatCard label="1D hit rate" value={formatHitRate(averageOneDayHitRate)} note="Rolling accuracy from the history ledger" tone="gold" />
          <StatCard label="Average forecast" value={formatPercent(averagePredictedReturn)} note="Whole-board directional lean for the day" tone="slate" />
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.35)] sm:p-6">
          <div className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] text-cyan-200/55">Live board</div>
              <h2 className="mt-2 font-['Syne'] text-3xl font-semibold text-white">Current model setups</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                This is the actual site payload now. Tomorrow entry, target close, rolling hit-rate context, and the current action label are all coming straight from committed generated artifacts.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-300">
              as of {dashboard.generatedAtLabel}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/8">
            <div className="hidden grid-cols-[1.1fr,0.8fr,0.8fr,0.8fr,0.8fr,0.9fr] gap-4 bg-white/[0.04] px-5 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-400 md:grid">
              <span>Ticker</span>
              <span>Action</span>
              <span>Forecast</span>
              <span>Entry</span>
              <span>Target</span>
              <span>Trend</span>
            </div>
            <div className="divide-y divide-white/8">
              {topForecasts.map((forecast) => (
                <ForecastRow key={`${forecast.ticker}-${forecast.targetDate}`} forecast={forecast} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Hero({ review }: { review: DailyReviewSummary | null }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(4,10,20,0.98),rgba(14,27,49,0.94)_55%,rgba(10,16,30,0.98))] px-5 py-6 shadow-[0_35px_120px_rgba(2,6,23,0.45)] sm:px-7 sm:py-8 xl:px-9 xl:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(244,114,182,0.12),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(250,204,21,0.1),transparent_30%)]" />
      <div className="absolute right-0 top-0 h-60 w-60 translate-x-1/4 -translate-y-1/4 rounded-full border border-white/10 bg-white/[0.04] blur-3xl" />

      <div className="relative grid gap-8 xl:grid-cols-[1.2fr,0.8fr] xl:items-end">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.34em] text-cyan-200">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            Daily site publish flow
          </div>
          <h1 className="mt-5 max-w-5xl font-['Syne'] text-4xl font-semibold leading-none text-white sm:text-5xl xl:text-6xl">
            Stokz now has a proper close-of-day briefing page, not just a pile of raw setup rows.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
            Every daily refresh can now write a dated review summary, commit it to GitHub, and let Vercel rebuild the site from fresh generated artifacts instead of stale hand-waved updates.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-sm">
          <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Latest review</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="font-['Syne'] text-3xl font-semibold text-white">{review?.reviewDate ?? dashboard.generatedAtLabel}</div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-300">
              {review?.marketRegime ?? 'review pending'}
            </div>
          </div>
          <div className="mt-4 text-lg leading-8 text-slate-100">{review?.analystDecision ?? 'Generate the first review to populate this panel.'}</div>
          <div className="mt-4 text-sm leading-7 text-slate-400">{review?.operatorSummary ?? 'Once the review generator runs, this panel becomes the nightly operator brief.'}</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Buy / Sell" value={`${review?.buyCount ?? countByAction(forecasts, 'BUY')} / ${review?.sellCount ?? countByAction(forecasts, 'SELL')}`} />
            <MiniStat label="1D hit rate" value={formatHitRate(review?.averageOneDayHitRate ?? null)} />
          </div>
        </div>
      </div>
    </section>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.35)] sm:p-6">{children}</section>
}

function ActionSection({ title, items, emptyLabel }: { title: string; items: ReviewSetupItem[]; emptyLabel: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{title}</div>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">{emptyLabel}</div>
        ) : (
          items.map((item) => <ActionCard key={`${title}-${item.ticker}`} item={item} />)
        )}
      </div>
    </div>
  )
}

function ActionCard({ item }: { item: ReviewSetupItem }) {
  return (
    <article className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-['Syne'] text-2xl font-semibold text-white">{item.ticker}</div>
          <div className="mt-1 text-sm text-slate-400">{item.setupLabel}</div>
        </div>
        <ActionPill action={item.portfolioAction} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Forecast" value={formatPercent(item.predictedReturn)} />
        <Metric label="Target" value={`$${item.targetClose.toFixed(2)}`} />
        <Metric label="Entry" value={`$${item.entryPriceTarget.toFixed(2)}`} />
        <Metric label="Conviction" value={`${item.convictionScore}`} />
      </div>
      <div className="mt-4 text-sm leading-7 text-slate-400">{item.notes}</div>
    </article>
  )
}

function ArchiveRow({ review, isLatest }: { review: DailyReviewSummary; isLatest: boolean }) {
  return (
    <article className="rounded-[1.25rem] border border-white/8 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-['Syne'] text-xl font-semibold text-white">{review.reviewDate}</div>
          <div className="mt-1 text-sm text-slate-400">{review.analystDecision}</div>
        </div>
        <div className="flex items-center gap-2">
          {isLatest ? <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">latest</span> : null}
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">{review.marketRegime}</span>
        </div>
      </div>
      <div className="mt-3 text-sm leading-7 text-slate-400">{review.operatorSummary}</div>
    </article>
  )
}

function ForecastRow({ forecast }: { forecast: TickerForecast }) {
  return (
    <article className="grid gap-4 px-4 py-4 md:grid-cols-[1.1fr,0.8fr,0.8fr,0.8fr,0.8fr,0.9fr] md:px-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-['Syne'] text-xl font-semibold text-white">
          {forecast.ticker.slice(0, 1)}
        </div>
        <div>
          <div className="font-['Syne'] text-2xl font-semibold text-white">{forecast.ticker}</div>
          <div className="text-sm text-slate-400">{forecast.setupLabel}</div>
        </div>
      </div>

      <div className="flex items-center md:justify-start">
        <ActionPill action={forecast.portfolioAction} />
      </div>

      <div className="flex items-center text-base font-medium text-white">{formatPercent(forecast.predictedReturn)}</div>
      <div className="flex items-center text-base font-medium text-white">${forecast.entryPriceTarget.toFixed(2)}</div>
      <div className="flex items-center text-base font-medium text-white">${forecast.targetClose.toFixed(2)}</div>
      <div className="flex items-center justify-between gap-4 md:justify-end">
        <div className="text-right text-sm text-slate-400">
          <div>{forecast.trendBias}</div>
          <div>{formatHitRate(forecast.horizonForecasts.find((item) => item.horizonDays === 1)?.measuredHitRate ?? null)}</div>
        </div>
        <Sparkline forecast={forecast} />
      </div>
    </article>
  )
}

function ActionPill({ action }: { action: ReviewSetupItem['portfolioAction'] | TickerForecast['portfolioAction'] }) {
  const tone = action === 'BUY' ? 'border-emerald-300/30 bg-emerald-300/12 text-emerald-200' : action === 'SELL' ? 'border-rose-300/30 bg-rose-300/12 text-rose-200' : 'border-amber-300/30 bg-amber-300/12 text-amber-200'
  return <span className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] ${tone}`}>{action}</span>
}

function StatCard({ label, value, note, tone }: { label: string; value: string; note: string; tone: 'cyan' | 'rose' | 'gold' | 'slate' }) {
  const toneClass =
    tone === 'cyan'
      ? 'from-cyan-300/18 to-cyan-300/3'
      : tone === 'rose'
        ? 'from-rose-300/18 to-rose-300/3'
        : tone === 'gold'
          ? 'from-amber-300/18 to-amber-300/3'
          : 'from-slate-300/12 to-slate-300/3'

  return (
    <article className={`rounded-[1.6rem] border border-white/10 bg-gradient-to-br ${toneClass} p-5 shadow-[0_24px_80px_rgba(2,6,23,0.25)]`}>
      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</div>
      <div className="mt-4 font-['Syne'] text-4xl font-semibold text-white">{value}</div>
      <div className="mt-3 text-sm leading-7 text-slate-400">{note}</div>
    </article>
  )
}

function PipelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="text-sm text-slate-200 sm:text-right">{value}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-medium text-white">{value}</div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-1 text-base font-medium text-white">{value}</div>
    </div>
  )
}

function Sparkline({ forecast }: { forecast: TickerForecast }) {
  const values = [...(forecast.chartSeries?.historyPoints ?? []), ...(forecast.chartSeries?.forecastPoints ?? [])].map((item) => item.close)
  if (values.length === 0) {
    return <div className="h-10 w-24 rounded-xl border border-white/8 bg-white/[0.03]" />
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')
  const stroke = forecast.predictedReturn >= 0 ? '#67e8f9' : '#fda4af'

  return (
    <svg viewBox="0 0 100 100" className="h-10 w-24" fill="none">
      <polyline points={points} stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function countByAction(rows: TickerForecast[], action: TickerForecast['portfolioAction']) {
  return rows.filter((row) => row.portfolioAction === action).length
}

function averageForecast(rows: TickerForecast[]) {
  if (rows.length === 0) return 0
  return rows.reduce((sum, row) => sum + row.predictedReturn, 0) / rows.length
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
}

function formatHitRate(value: number | null) {
  if (value == null) return 'n/a'
  return `${(value * 100).toFixed(1)}%`
}
