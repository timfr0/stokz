import type { ReactNode } from 'react'

import { dashboardData } from '@/lib/chart-data'

const forecasts = dashboardData.forecasts
const reviews = dashboardData.reviews

export default function HomePage() {
  const bullishCount = forecasts.filter((forecast) => forecast.direction === 'bullish').length
  const averageOneDayHitRate = Math.round(
    (forecasts
      .map((forecast) => forecast.horizonForecasts.find((horizon) => horizon.horizonDays === 1)?.measuredHitRate)
      .filter((value): value is number => value != null)
      .reduce((total, value, _index, all) => total + value / all.length, 0) || 0) * 100,
  )

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b-4 border-[#1a1a1a] bg-[#f5f0e8] px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <h1 className="font-['Space_Grotesk'] text-3xl font-black uppercase italic tracking-tighter">STOKZ DASHBOARD</h1>
            <nav className="hidden items-center gap-6 md:flex">
              {['Portfolio', 'Signals', 'Review Archive', 'History'].map((item) => (
                <span key={item} className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-tight">
                  {item}
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm font-bold uppercase">
            <span>{dashboardData.generatedAtLabel}</span>
          </div>
        </div>
      </header>

      <div className="flex pt-24">
        <aside className="hidden min-h-[calc(100vh-6rem)] w-64 flex-col border-r-4 border-[#1a1a1a] bg-[#f5f0e8] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] lg:flex">
          <div className="px-6 py-8">
            <p className="font-['Space_Grotesk'] text-xl font-black uppercase">STOKZ_FM</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#4a4a4a]">RESEARCH + MODEL DESK</p>
          </div>
          <nav className="flex-1 px-3">
            {['Markets', 'Analysis', 'Research', 'Risk', 'Logs'].map((label, index) => (
              <div key={label} className={`mb-2 flex items-center gap-3 border-2 border-[#1a1a1a] px-4 py-3 font-['Space_Grotesk'] text-sm font-black uppercase ${index === 0 ? 'bg-[#ffcc00]' : 'bg-transparent'}`}>
                <span>{label}</span>
              </div>
            ))}
          </nav>
        </aside>

        <section className="flex-1 px-6 pb-12 pt-4 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-['Space_Grotesk'] text-5xl font-black uppercase tracking-tighter sm:text-6xl">MARKET WATCHLIST</h2>
                <p className="mt-3 max-w-3xl text-lg text-[#4a4a4a]">
                  Daily signals, tomorrow entry targets, and a click-through review archive that shows how the model changed, what news mattered, and what we expect next.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryBox label="Bullish board" value={`${bullishCount}/${forecasts.length}`} />
                <SummaryBox label="1D hit rate" value={`${averageOneDayHitRate}%`} />
                <SummaryBox label="Review days" value={`${reviews.length}`} />
              </div>
            </div>

            <section className="overflow-hidden border-4 border-[#1a1a1a] bg-white shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
              <div className="flex items-center justify-between bg-[#1a1a1a] px-6 py-4 text-white">
                <h3 className="font-['Space_Grotesk'] text-2xl font-black uppercase">ACTIVE SIGNALS</h3>
                <div className="text-xs font-black uppercase tracking-[0.25em] text-[#ffcc00]">LIVE BOARD</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-[#e8e3da]">
                    <tr>
                      {['Ticker', 'Bias', 'Entry Tomorrow', 'Target Close', 'Exp. Move', '1D Hit Rate', 'Setup Score'].map((label) => (
                        <th key={label} className="border-b-4 border-[#1a1a1a] px-6 py-4 font-['Space_Grotesk'] text-sm font-black uppercase tracking-tight">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {forecasts.map((forecast) => (
                      <tr key={`${forecast.ticker}-${forecast.targetDate}`} className="border-b-2 border-[#1a1a1a] last:border-b-0 hover:bg-[#fff7cc]">
                        <td className="px-6 py-5 font-['Space_Grotesk'] text-2xl font-black uppercase">{forecast.ticker}</td>
                        <td className="px-6 py-5"><BiasBadge direction={forecast.direction} /></td>
                        <td className="px-6 py-5 font-mono text-xl font-bold">${forecast.entryPriceTarget.toFixed(2)}</td>
                        <td className="px-6 py-5 font-mono text-xl font-bold">${forecast.targetClose.toFixed(2)}</td>
                        <td className={`px-6 py-5 font-['Space_Grotesk'] text-xl font-black ${forecast.predictedReturn >= 0 ? 'text-[#0055ff]' : 'text-[#e63b2e]'}`}>{formatPercent(forecast.predictedReturn)}</td>
                        <td className="px-6 py-5 font-mono text-xl font-bold">{formatMetric(forecast.horizonForecasts.find((h) => h.horizonDays === 1)?.measuredHitRate)}</td>
                        <td className="px-6 py-5">
                          <div className="h-4 w-full min-w-[84px] border-2 border-[#1a1a1a] bg-[#f5f0e8]">
                            <div className="h-full border-r-2 border-[#1a1a1a] bg-[#ffcc00]" style={{ width: `${forecast.convictionScore}%` }} />
                          </div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em]">{forecast.convictionScore}/100</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-10 border-4 border-[#1a1a1a] bg-white shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
              <div className="border-b-4 border-[#1a1a1a] bg-[#ffcc00] px-6 py-4">
                <h3 className="font-['Space_Grotesk'] text-2xl font-black uppercase">DAILY REVIEW ARCHIVE</h3>
                <p className="mt-2 max-w-3xl text-sm font-semibold text-[#1a1a1a]">
                  Click through each day to see what the model changed, what news/context mattered, what the analyst allowed, and what we expect tomorrow.
                </p>
              </div>
              <div className="grid gap-4 p-6">
                {reviews.map((review) => (
                  <details key={review.reviewDate} className="border-2 border-[#1a1a1a] bg-[#f5f0e8] open:bg-white">
                    <summary className="cursor-pointer list-none px-5 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="font-['Space_Grotesk'] text-2xl font-black uppercase">{review.reviewDate}</div>
                          <div className="mt-1 text-sm font-semibold text-[#4a4a4a]">SPY {review.spyRegime} ({review.spyMove})</div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Tag tone="blue">Analyst: {review.analystDecision.decision}</Tag>
                          <Tag tone="yellow">Risk: {review.riskAssessment.tradePosture}</Tag>
                          <Tag tone="dark">News items: {review.newsItems.length}</Tag>
                        </div>
                      </div>
                    </summary>

                    <div className="grid gap-6 border-t-2 border-[#1a1a1a] bg-white p-5 xl:grid-cols-[1fr,1fr]">
                      <section className="grid gap-4">
                        <Panel title="What we changed or held" items={review.tomorrowConfig.adjustments.map((item) => `${item.parameter}: ${item.direction} — ${item.reason}`)} />
                        <Panel title="What news / context we found" items={review.newsItems} />
                        <Panel title="Expected outcome" items={review.tomorrowConfig.notes} />
                      </section>

                      <section className="grid gap-4">
                        <Panel title="Best stock highlights" items={review.topHits.map((item) => `${item.ticker}: ${item.portfolioAction}, target ${item.targetClose.toFixed(2)}, forecast ${formatPercent(item.predictedReturn)}`)} />
                        <Panel title="Misses / why we stayed cautious" items={review.topMisses.map((item) => `${item.ticker}: ${item.notes ?? 'Needs event/risk review before trusting the move.'}`)} />
                        <div className="border-2 border-[#1a1a1a] bg-[#1a1a1a] p-4 text-white">
                          <div className="font-['Space_Grotesk'] text-lg font-black uppercase">Operator summary</div>
                          <pre className="mt-3 whitespace-pre-wrap font-['Inter'] text-sm leading-6">{review.operatorSummary}</pre>
                        </div>
                      </section>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-4 border-[#1a1a1a] bg-white px-5 py-4 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#4a4a4a]">{label}</div>
      <div className="mt-2 font-['Space_Grotesk'] text-3xl font-black uppercase">{value}</div>
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

function Tag({ children, tone }: { children: ReactNode; tone: 'blue' | 'yellow' | 'dark' }) {
  const className = tone === 'blue' ? 'bg-[#d6e3ff] text-[#1a1a1a]' : tone === 'yellow' ? 'bg-[#ffcc00] text-[#1a1a1a]' : 'bg-[#1a1a1a] text-white'
  return <span className={`border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-xs font-black uppercase ${className}`}>{children}</span>
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-4">
      <div className="font-['Space_Grotesk'] text-lg font-black uppercase">{title}</div>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {items.length > 0 ? items.map((item) => <li key={item}>- {item}</li>) : <li>- Nothing notable recorded yet.</li>}
      </ul>
    </div>
  )
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
}

function formatMetric(value?: number | null) {
  if (value == null) return 'N/A'
  return `${(value * 100).toFixed(1)}%`
}
