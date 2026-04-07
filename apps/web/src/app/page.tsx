import { DashboardHeader } from '@/components/dashboard-header'
import { ForecastCard } from '@/components/forecast-card'
import { SetupStrip } from '@/components/setup-strip'
import { dashboardData } from '@/lib/chart-data'

const dashboard = dashboardData
const forecasts = dashboard.forecasts
const buyCount = forecasts.filter((forecast) => forecast.portfolioAction === 'BUY').length
const sellCount = forecasts.filter((forecast) => forecast.portfolioAction === 'SELL').length
const holdCount = forecasts.filter((forecast) => forecast.portfolioAction === 'HOLD').length
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
    <main className="mx-auto flex min-h-screen w-full max-w-[1520px] flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10 xl:px-12">
      <DashboardHeader />

      <section className="grid gap-4 xl:grid-cols-[1.35fr,0.95fr]">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard label="Buy setups" value={`${buyCount}`} detail="Highest-conviction fresh longs worth planning for the next session." tone="bull" />
          <SummaryCard label="Hold core" value={`${holdCount}`} detail="Existing positions with enough structure to stay on, but not force adds." tone="neutral" />
          <SummaryCard label="Trim / sell" value={`${sellCount}`} detail="Positions showing relative weakness or downside forecast pressure." tone="bear" />
          <SummaryCard label="1D hit rate" value={`${averageOneDayHitRate}%`} detail="Rolling measured hit rate for the nearest horizon, across the current history ledger." tone="accent" />
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Daily board</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Operator snapshot</h2>
            </div>
            <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
              {dashboard.generatedAtLabel}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SnapshotCard label="Average conviction" value={`${averageConviction}/100`} note="Cross-board strength and quality score." />
            <SnapshotCard label="Live runtime" value="TimesFM active" note="Native Windows runtime is now online." />
            <SnapshotCard label="Decision surface" value="Buy · Hold · Sell" note="Portfolio-aware actions, not generic sentiment." />
            <SnapshotCard label="Update loop" value="Daily refresh" note="Artifacts, history, and alerts refresh on schedule." />
          </div>
        </section>
      </section>

      <SetupStrip forecasts={forecasts} />

      <section className="grid gap-4 xl:grid-cols-[1fr,1fr,1fr]">
        <InsightPanel
          eyebrow="Design goal"
          title="A homepage that feels like a premium control room, not a spreadsheet with trauma."
          body="The homepage should lead with decisions and market posture first, then let the user drop into ticker-level detail. Strong hierarchy, fewer throwaway boxes, more visual calm."
        />
        <InsightPanel
          eyebrow="Signal quality"
          title="Closer horizons earn more trust, farther ones stay contextual."
          body="The system now shows measured rolling hit rate and MAE by horizon so the UI stops pretending every forecast length deserves equal confidence."
        />
        <InsightPanel
          eyebrow="Workflow"
          title="Open, scan, decide, move on."
          body="This surface should help you know what to add, what to hold, and what to cut in a minute or two, without drowning you in decorative noise."
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
    <div className={`rounded-[1.85rem] border border-white/10 bg-gradient-to-br ${toneMap[tone]} p-5 shadow-[0_20px_60px_rgba(2,6,23,0.3)]`}>
      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{detail}</div>
    </div>
  )
}

function SnapshotCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{note}</div>
    </div>
  )
}

function InsightPanel({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <section className="rounded-[1.85rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
      <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
    </section>
  )
}
