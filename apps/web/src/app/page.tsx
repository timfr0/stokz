import { DashboardHeader } from '@/components/dashboard-header'
import { ForecastCard } from '@/components/forecast-card'
import { SetupStrip } from '@/components/setup-strip'
import { dashboardData } from '@/lib/chart-data'

const dashboardForecasts = dashboardData.forecasts
const actionableForecasts = dashboardForecasts.filter((forecast) => forecast.isActionable)
const topSetups = [...dashboardForecasts].sort((a, b) => b.convictionScore - a.convictionScore).slice(0, 5)
const runtimeMode = dashboardForecasts[0]?.modelName ?? 'timesfm-fallback'
const bullishCount = dashboardForecasts.filter((forecast) => forecast.direction === 'bullish').length
const buyCount = dashboardForecasts.filter((forecast) => forecast.portfolioAction === 'BUY').length
const sellCount = dashboardForecasts.filter((forecast) => forecast.portfolioAction === 'SELL').length
const averageConviction = Math.round(
  dashboardForecasts.reduce((total, forecast) => total + forecast.convictionScore, 0) / Math.max(dashboardForecasts.length, 1),
)
const runtimeLabel = runtimeMode === 'timesfm' ? 'TimesFM live' : 'TimesFM fallback'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10 xl:px-12">
      <DashboardHeader />

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        <SummaryCard label="Buy setups" value={`${buyCount}`} detail="Highest-conviction upside candidates for the next session." tone="bull" />
        <SummaryCard label="Sell / trim" value={`${sellCount}`} detail="Held names showing relative weakness or downside risk." tone="bear" />
        <SummaryCard label="Bullish bias" value={`${bullishCount}/${dashboardForecasts.length}`} detail="Forecasts leaning positive across the board." tone="neutral" />
        <SummaryCard label="Actionable" value={`${actionableForecasts.length}`} detail="Setups worth a real look instead of hand-wavy watchlist filler." tone="accent" />
        <SummaryCard label="Average conviction" value={`${averageConviction}`} detail={`${runtimeLabel} • as of ${dashboardData.generatedAtLabel}`} tone="accent" />
      </section>

      <SetupStrip forecasts={topSetups} />

      <section className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr,0.9fr]">
        <InsightPanel
          title="Forecast framing"
          eyebrow="Trading view"
          body="The board is reading generated artifacts from the forecast service, not hand-written demo fluff. It answers the real question: what looks actionable, what is noise, and what should happen in the portfolio next?"
          bullets={[
            'Daily close based swing setups',
            'Portfolio-aware buy, hold, and sell actions',
            'Chart overlays grounded in generated forecast artifacts',
          ]}
        />
        <InsightPanel
          title="Runtime truth"
          eyebrow="Model status"
          body={runtimeMode === 'timesfm' ? 'TimesFM runtime is active, so the adapter is using the real model path.' : 'TimesFM is not active on this machine right now, so the adapter is falling back safely while still exporting honest dashboard artifacts.'}
          bullets={['yfinance daily bars', 'Forecast adapter with fallback path', 'Notification payloads only for actionable setups']}
        />
        <InsightPanel
          title="Operator flow"
          eyebrow="What to scan first"
          body="Check the setup strip, review the chart overlay on the names that matter, then read the trade note before doing anything dumb. The card should feel like prep, not theater."
          bullets={['Top setups first', 'Current vs target close in one glance', 'Holdings context on every card']}
        />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {dashboardForecasts.map((forecast) => (
          <ForecastCard key={`${forecast.ticker}-${forecast.targetDate}`} forecast={forecast} />
        ))}
      </section>
    </main>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone: 'bull' | 'bear' | 'neutral' | 'accent'
}) {
  const toneMap = {
    bull: 'from-emerald-400/20 to-transparent',
    bear: 'from-orange-400/20 to-transparent',
    neutral: 'from-violet-400/20 to-transparent',
    accent: 'from-cyan-400/20 to-transparent',
  }

  return (
    <div className={`rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${toneMap[tone]} p-5 shadow-[0_20px_60px_rgba(2,6,23,0.3)]`}>
      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{detail}</div>
    </div>
  )
}

function InsightPanel({
  eyebrow,
  title,
  body,
  bullets,
}: {
  eyebrow: string
  title: string
  body: string
  bullets: string[]
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.4)]">
      <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-200">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
