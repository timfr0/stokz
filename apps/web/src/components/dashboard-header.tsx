export function DashboardHeader() {
  return (
    <header className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(5,8,22,0.96),rgba(10,22,49,0.92)_45%,rgba(17,24,39,0.96))] px-6 py-8 shadow-[0_35px_120px_rgba(2,6,23,0.45)] sm:px-8 sm:py-10 xl:px-10 xl:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(196,181,253,0.12),transparent_26%)]" />
      <div className="absolute -right-16 top-10 h-48 w-48 rounded-full border border-white/10 bg-white/[0.03] blur-3xl" />

      <div className="relative grid gap-8 xl:grid-cols-[1.35fr,0.95fr] xl:items-end">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            Stokz operator board
          </div>

          <div className="space-y-4">
            <h1 className="max-w-5xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl xl:text-6xl">
              Daily trade options, horizon forecasts, and portfolio actions in one high-signal view.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Stokz turns model output into something actually useful, surfacing the best buy, hold, and sell setups with
              chart context, rolling accuracy, and portfolio-aware trade notes instead of generic AI sludge.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatPill label="Forecast engine" value="TimesFM + eval history" />
            <StatPill label="Operator focus" value="Swing setups" />
            <StatPill label="Cadence" value="Daily refresh" />
          </div>
        </div>

        <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500">What this page should answer</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">What do I do with the portfolio tomorrow?</h2>
          </div>

          <div className="grid gap-3">
            <InsightCard title="Add" body="Fresh long setups with enough edge to deserve attention." />
            <InsightCard title="Hold" body="Existing names that still make sense, but do not need heroics." />
            <InsightCard title="Trim" body="Positions showing weakening structure or downside forecast pressure." />
          </div>

          <p className="text-sm leading-7 text-slate-400">
            Honest framing: this is a decision-support surface. It helps you rank setups, inspect risk, and act with more
            context. It is not an auto-trading fantasy box.
          </p>
        </div>
      </div>
    </header>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  )
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{body}</div>
    </div>
  )
}
