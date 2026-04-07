export function DashboardHeader() {
  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-8 shadow-[0_30px_100px_rgba(8,15,38,0.45)] backdrop-blur xl:p-10">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-violet-400/10 blur-3xl" />

      <div className="relative space-y-6">
        <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
          Daily swing operator
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.4fr,0.9fr] xl:items-end">
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl xl:text-6xl">
              Portfolio setups, forecast views, and daily trade options in one board.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Stokz turns the watchlist into an operator dashboard, surfacing buy, hold, and sell actions with forecast context,
              trend visuals, and clean trade notes you can scan fast every day.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Operator framing</div>
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <StatChip label="Mode" value="Research + alerts" />
              <StatChip label="Cadence" value="Daily close" />
              <StatChip label="Model role" value="Signal component" />
            </div>
          </div>
        </div>

        <p className="max-w-3xl text-sm text-slate-400">
          Honest framing: this is a forecast-assisted decision dashboard, not an autonomous trading bot. Forecasts still need thresholds,
          baselines, and risk discipline before they deserve capital.
        </p>
      </div>
    </header>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">{label}</div>
      <div className="mt-2 font-medium text-white">{value}</div>
    </div>
  )
}
