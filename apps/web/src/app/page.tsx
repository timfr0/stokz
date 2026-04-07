import { dashboardData } from '@/lib/chart-data'

const dashboard = dashboardData
const forecasts = dashboard.forecasts
const bullishCount = forecasts.filter((forecast) => forecast.direction === 'bullish').length
const averageOneDayHitRate = Math.round(
  (forecasts
    .map((forecast) => forecast.horizonForecasts.find((horizon) => horizon.horizonDays === 1)?.measuredHitRate)
    .filter((value): value is number => value != null)
    .reduce((total, value, _index, all) => total + value / all.length, 0) || 0) * 100,
)

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b-4 border-[#1a1a1a] bg-[#f5f0e8] px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <h1 className="font-['Space_Grotesk'] text-3xl font-black uppercase italic tracking-tighter">STOKZ DASHBOARD</h1>
            <nav className="hidden items-center gap-6 md:flex">
              {['Portfolio', 'Terminal', 'Signals', 'History'].map((item) => (
                <span key={item} className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-tight">
                  {item}
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xl">🔔</span>
            <span className="text-xl">⚙️</span>
            <div className="flex h-10 w-10 items-center justify-center border-2 border-[#1a1a1a] bg-[#1a1a1a] text-sm font-bold text-white">T</div>
          </div>
        </div>
      </header>

      <div className="flex pt-24">
        <aside className="hidden min-h-[calc(100vh-6rem)] w-64 flex-col border-r-4 border-[#1a1a1a] bg-[#f5f0e8] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] lg:flex">
          <div className="px-6 py-8">
            <p className="font-['Space_Grotesk'] text-xl font-black uppercase">STOKZ_FM</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#4a4a4a]">V1.0 LIVE MODEL</p>
          </div>
          <nav className="flex-1 px-3">
            <SideNavItem active label="Markets" />
            <SideNavItem label="Analysis" />
            <SideNavItem label="Strategy" />
            <SideNavItem label="Risk" />
            <SideNavItem label="Logs" />
          </nav>
          <div className="mt-auto border-t-2 border-[#1a1a1a] p-4">
            <button className="w-full border-2 border-[#1a1a1a] bg-[#e63b2e] py-4 font-['Space_Grotesk'] text-sm font-black uppercase text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              REFRESH BOARD
            </button>
          </div>
        </aside>

        <main className="flex-1 px-6 pb-10 pt-4 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-['Space_Grotesk'] text-5xl font-black uppercase tracking-tighter sm:text-6xl">MARKET WATCHLIST</h2>
                <p className="mt-3 max-w-2xl text-lg text-[#4a4a4a]">
                  Real model-driven swing setups with tomorrow entry targets, rolling horizon accuracy, and prediction charts pulled from our current data.
                </p>
              </div>
              <div className="border-4 border-[#1a1a1a] bg-white px-6 py-4 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
                <div className="text-[10px] font-black uppercase tracking-[0.25em]">MODEL NODE</div>
                <div className="mt-2 flex items-center gap-4">
                  <span className="font-['Space_Grotesk'] text-3xl font-black">A1</span>
                  <span className="text-sm font-semibold text-[#4a4a4a]">{dashboard.generatedAtLabel}</span>
                </div>
              </div>
            </div>

            <section className="overflow-hidden border-4 border-[#1a1a1a] bg-white shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
              <div className="flex items-center justify-between bg-[#1a1a1a] px-6 py-4 text-white">
                <h3 className="font-['Space_Grotesk'] text-2xl font-black uppercase">ACTIVE SIGNALS</h3>
                <div className="flex items-center gap-6 text-xs font-black uppercase tracking-[0.25em]">
                  <span className="text-white/70">1D hit rate: {averageOneDayHitRate}%</span>
                  <span className="text-[#ffcc00]">{bullishCount}/{forecasts.length} bullish</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-[#e8e3da]">
                    <tr>
                      {['Ticker', 'Bias', 'Confidence', 'Entry Tomorrow', 'Target Close', 'Exp. Move', 'Setup Score', 'Trend'].map((label) => (
                        <th key={label} className="border-b-4 border-[#1a1a1a] px-6 py-4 font-['Space_Grotesk'] text-sm font-black uppercase tracking-tight">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {forecasts.map((forecast) => (
                      <tr key={`${forecast.ticker}-${forecast.targetDate}`} className="border-b-2 border-[#1a1a1a] last:border-b-0 hover:bg-[#fff7cc]">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center bg-[#1a1a1a] font-black text-white">{forecast.ticker[0]}</div>
                            <div>
                              <div className="font-['Space_Grotesk'] text-2xl font-black uppercase">{forecast.ticker}</div>
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4a4a4a]">{forecast.portfolioAction}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <BiasBadge direction={forecast.direction} />
                        </td>
                        <td className="px-6 py-5 font-mono text-xl font-bold">{formatMetric(forecast.horizonForecasts.find((h) => h.horizonDays === 1)?.measuredHitRate)}</td>
                        <td className="px-6 py-5 font-mono text-xl font-bold">${forecast.entryPriceTarget.toFixed(2)}</td>
                        <td className="px-6 py-5 font-mono text-xl font-bold">${forecast.targetClose.toFixed(2)}</td>
                        <td className={`px-6 py-5 font-['Space_Grotesk'] text-xl font-black ${forecast.predictedReturn >= 0 ? 'text-[#0055ff]' : 'text-[#e63b2e]'}`}>
                          {formatPercent(forecast.predictedReturn)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="h-4 w-full min-w-[84px] border-2 border-[#1a1a1a] bg-[#f5f0e8]">
                            <div className="h-full border-r-2 border-[#1a1a1a] bg-[#ffcc00]" style={{ width: `${forecast.convictionScore}%` }} />
                          </div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em]">{forecast.convictionScore}/100</div>
                        </td>
                        <td className="px-6 py-5">
                          <MiniTrend forecast={forecast} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
              <div className="grid gap-6 lg:grid-cols-2">
                {forecasts.slice(0, 4).map((forecast) => (
                  <article key={`${forecast.ticker}-detail`} className="border-4 border-[#1a1a1a] bg-white p-5 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-['Space_Grotesk'] text-2xl font-black uppercase">{forecast.ticker}</div>
                        <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4a4a4a]">{forecast.setupLabel}</div>
                      </div>
                      <BiasBadge direction={forecast.direction} />
                    </div>
                    <div className="mt-4 rounded-xl border-2 border-[#1a1a1a] bg-[#f5f0e8] p-3">
                      <MiniChart forecast={forecast} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricBox label="Tomorrow entry" value={`$${forecast.entryPriceTarget.toFixed(2)}`} />
                      <MetricBox label="Target close" value={`$${forecast.targetClose.toFixed(2)}`} />
                      <MetricBox label="1D hit rate" value={formatMetric(forecast.horizonForecasts.find((h) => h.horizonDays === 1)?.measuredHitRate)} />
                      <MetricBox label="1D MAE" value={formatMae(forecast.horizonForecasts.find((h) => h.horizonDays === 1)?.measuredMae)} />
                    </div>
                  </article>
                ))}
              </div>

              <div className="grid gap-6">
                <SummaryCard title="Board quality" value={`${averageOneDayHitRate}%`} note="Rolling measured 1D hit rate across the current history ledger." accent="yellow" />
                <SummaryCard title="Tomorrow adds" value={`${forecasts.filter((forecast) => forecast.portfolioAction === 'BUY').length}`} note="Fresh long setups with entry targets worth watching at the next open." accent="blue" />
                <SummaryCard title="Current posture" value={`${bullishCount}/${forecasts.length} bullish`} note="How many names still lean constructive after the latest refresh." accent="dark" />
              </div>
            </section>
          </div>
        </main>
      </div>
    </main>
  )
}

function SideNavItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div className={`mb-2 flex items-center gap-3 border-2 border-[#1a1a1a] px-4 py-3 font-['Space_Grotesk'] text-sm font-black uppercase ${active ? 'bg-[#ffcc00]' : 'bg-transparent'}`}>
      <span>{label}</span>
    </div>
  )
}

function BiasBadge({ direction }: { direction: 'bullish' | 'bearish' | 'neutral' }) {
  const styles = {
    bullish: 'bg-[#ffcc00] text-[#1a1a1a]',
    bearish: 'bg-[#e63b2e] text-white',
    neutral: 'bg-[#d6e3ff] text-[#1a1a1a]',
  }

  return <span className={`inline-block border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-xs font-black uppercase ${styles[direction]}`}>{direction}</span>
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a4a4a]">{label}</div>
      <div className="mt-2 font-['Space_Grotesk'] text-xl font-black uppercase">{value}</div>
    </div>
  )
}

function SummaryCard({ title, value, note, accent }: { title: string; value: string; note: string; accent: 'yellow' | 'blue' | 'dark' }) {
  const bg = accent === 'yellow' ? 'bg-[#ffcc00]' : accent === 'blue' ? 'bg-[#d6e3ff]' : 'bg-[#1a1a1a] text-white'
  return (
    <div className={`border-4 border-[#1a1a1a] p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] ${bg}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.25em]">{title}</div>
      <div className="mt-4 font-['Space_Grotesk'] text-5xl font-black uppercase">{value}</div>
      <div className="mt-3 text-sm leading-6 opacity-80">{note}</div>
    </div>
  )
}

function MiniTrend({ forecast }: { forecast: (typeof forecasts)[number] }) {
  const points = forecast.chartSeries?.forecastPoints ?? []
  if (points.length === 0) return <div className="text-xs font-bold uppercase text-[#4a4a4a]">No chart</div>
  const values = points.map((point) => point.close)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const polyline = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')
  const stroke = forecast.predictedReturn >= 0 ? '#1a1a1a' : '#e63b2e'
  return (
    <svg viewBox="0 0 100 40" className="h-10 w-24" fill="none">
      <polyline points={polyline} stroke={stroke} strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  )
}

function MiniChart({ forecast }: { forecast: (typeof forecasts)[number] }) {
  const history = forecast.chartSeries?.historyPoints ?? []
  const projected = forecast.chartSeries?.forecastPoints ?? []
  const all = [...history, ...projected]
  if (all.length === 0) return <div className="text-sm font-semibold">No chart data</div>
  const values = all.map((point) => point.close)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = all
    .map((point, index) => {
      const x = (index / Math.max(all.length - 1, 1)) * 100
      const y = 100 - ((point.close - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-full" fill="none">
      <polyline points={points} stroke="#1a1a1a" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  )
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
}

function formatMetric(value?: number | null) {
  if (value == null) return 'N/A'
  return `${(value * 100).toFixed(1)}%`
}

function formatMae(value?: number | null) {
  if (value == null) return 'N/A'
  return `${(value * 100).toFixed(2)}%`
}
