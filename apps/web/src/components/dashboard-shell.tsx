'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { DashboardData, DailyReviewSummary, NewsFeedItem, ReviewSetupItem, TickerForecast } from '@/lib/types'

type DashboardShellProps = {
  dashboard: DashboardData
}

type ActiveTab = 'markets' | 'updates'

const primaryNav: { key: ActiveTab; label: string }[] = [
  { key: 'markets', label: 'Markets' },
  { key: 'updates', label: 'Updates' },
]

const passiveNav = ['Strategy', 'Risk', 'Logs']

export function DashboardShell({ dashboard }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('markets')
  const forecasts = dashboard.forecasts
  const latestReview = dashboard.latestReview

  const bullishCount = useMemo(() => forecasts.filter((forecast) => forecast.direction === 'bullish').length, [forecasts])
  const averageOneDayHitRate = useMemo(() => {
    const values = forecasts
      .map((forecast) => forecast.horizonForecasts.find((horizon) => horizon.horizonDays === 1)?.measuredHitRate)
      .filter((value): value is number => value != null)
    if (values.length === 0) return null
    return values.reduce((total, value) => total + value, 0) / values.length
  }, [forecasts])

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b-4 border-[#1a1a1a] bg-[#f5f0e8] px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <h1 className="font-['Space_Grotesk'] text-3xl font-black uppercase italic tracking-tighter">STOKZ DASHBOARD</h1>
            <nav className="hidden items-center gap-3 md:flex">
              {primaryNav.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`border-2 border-[#1a1a1a] px-4 py-2 font-['Space_Grotesk'] text-sm font-black uppercase tracking-tight transition ${
                    activeTab === item.key ? 'bg-[#ffcc00]' : 'bg-white hover:bg-[#fff7cc]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {passiveNav.map((item) => (
                <span key={item} className="px-2 font-['Space_Grotesk'] text-sm font-bold uppercase tracking-tight text-[#4a4a4a]">
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
            {primaryNav.map((item) => (
              <SideNavButton key={item.key} label={item.label} active={activeTab === item.key} onClick={() => setActiveTab(item.key)} />
            ))}
            {passiveNav.map((item) => (
              <SideNavLabel key={item} label={item} />
            ))}
          </nav>
          <div className="mt-auto border-t-2 border-[#1a1a1a] p-4">
            <div className="border-2 border-[#1a1a1a] bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4a4a4a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              Latest refresh: {dashboard.generatedAtLabel}
            </div>
          </div>
        </aside>

        <section className="flex-1 px-6 pb-10 pt-4 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {activeTab === 'markets' ? (
              <MarketsView forecasts={forecasts} bullishCount={bullishCount} averageOneDayHitRate={averageOneDayHitRate} generatedAtLabel={dashboard.generatedAtLabel} latestReview={latestReview} />
            ) : (
              <UpdatesView latestReview={latestReview} archive={dashboard.reviews.slice(1, 8)} />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function MarketsView({
  forecasts,
  bullishCount,
  averageOneDayHitRate,
  generatedAtLabel,
  latestReview,
}: {
  forecasts: TickerForecast[]
  bullishCount: number
  averageOneDayHitRate: number | null
  generatedAtLabel: string
  latestReview: DailyReviewSummary | null
}) {
  return (
    <>
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-['Space_Grotesk'] text-5xl font-black uppercase tracking-tighter sm:text-6xl">MARKET WATCHLIST</h2>
          <p className="mt-3 max-w-2xl text-lg text-[#4a4a4a]">
            Same core white-board layout, now with click-through stock detail pages for deeper analysis without wrecking the main board.
          </p>
        </div>
        <div className="border-4 border-[#1a1a1a] bg-white px-6 py-4 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
          <div className="text-[10px] font-black uppercase tracking-[0.25em]">MODEL NODE</div>
          <div className="mt-2 flex items-center gap-4">
            <span className="font-['Space_Grotesk'] text-3xl font-black">A1</span>
            <span className="text-sm font-semibold text-[#4a4a4a]">{generatedAtLabel}</span>
          </div>
          {latestReview ? <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#4a4a4a]">Latest update: {latestReview.reviewDate}</div> : null}
        </div>
      </div>

      <section className="overflow-hidden border-4 border-[#1a1a1a] bg-white shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
        <div className="flex items-center justify-between bg-[#1a1a1a] px-6 py-4 text-white">
          <h3 className="font-['Space_Grotesk'] text-2xl font-black uppercase">ACTIVE SIGNALS</h3>
          <div className="flex items-center gap-6 text-xs font-black uppercase tracking-[0.25em]">
            <span className="text-white/70">1D hit rate: {formatMetric(averageOneDayHitRate)}</span>
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
                        <Link href={`/stocks/${forecast.ticker.toLowerCase()}`} className="font-['Space_Grotesk'] text-2xl font-black uppercase hover:underline">
                          {forecast.ticker}
                        </Link>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4a4a4a]">
                          <span>{forecast.portfolioAction}</span>
                          <span>•</span>
                          <Link href={`/stocks/${forecast.ticker.toLowerCase()}`} className="hover:text-[#0055ff] hover:underline">
                            View analysis
                          </Link>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <BiasBadge direction={forecast.direction} />
                  </td>
                  <td className="px-6 py-5 font-mono text-xl font-bold">{formatMetric(forecast.horizonForecasts.find((h) => h.horizonDays === 1)?.measuredHitRate ?? null)}</td>
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
                  <Link href={`/stocks/${forecast.ticker.toLowerCase()}`} className="font-['Space_Grotesk'] text-2xl font-black uppercase hover:underline">
                    {forecast.ticker}
                  </Link>
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
                <MetricBox label="1D hit rate" value={formatMetric(forecast.horizonForecasts.find((h) => h.horizonDays === 1)?.measuredHitRate ?? null)} />
                <MetricBox label="1D MAE" value={formatMae(forecast.horizonForecasts.find((h) => h.horizonDays === 1)?.measuredMae ?? null)} />
              </div>
              <Link href={`/stocks/${forecast.ticker.toLowerCase()}`} className="mt-4 inline-flex border-2 border-[#1a1a1a] bg-[#ffcc00] px-4 py-2 font-['Space_Grotesk'] text-sm font-black uppercase hover:bg-[#ffd94d]">
                Open detail page
              </Link>
            </article>
          ))}
        </div>

        <div className="grid gap-6">
          <SummaryCard title="Board quality" value={formatMetric(averageOneDayHitRate)} note="Rolling measured 1D hit rate across the current history ledger." accent="yellow" />
          <SummaryCard title="Tomorrow adds" value={`${forecasts.filter((forecast) => forecast.portfolioAction === 'BUY').length}`} note="Fresh long setups with entry targets worth watching at the next open." accent="blue" />
          <SummaryCard title="Current posture" value={`${bullishCount}/${forecasts.length} bullish`} note="How many names still lean constructive after the latest refresh." accent="dark" />
        </div>
      </section>
    </>
  )
}

function UpdatesView({ latestReview, archive }: { latestReview: DailyReviewSummary | null; archive: DailyReviewSummary[] }) {
  return (
    <>
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-['Space_Grotesk'] text-5xl font-black uppercase tracking-tighter sm:text-6xl">UPDATES & NEWS</h2>
          <p className="mt-3 max-w-2xl text-lg text-[#4a4a4a]">
            This is the backend feed tab. Operator notes stay compact, research headlines live here, and names still click through to full analysis pages.
          </p>
        </div>
        <div className="border-4 border-[#1a1a1a] bg-white px-6 py-4 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
          <div className="text-[10px] font-black uppercase tracking-[0.25em]">Latest publish</div>
          <div className="mt-2 font-['Space_Grotesk'] text-3xl font-black uppercase">{latestReview?.reviewDate ?? 'Pending'}</div>
          <div className="mt-2 text-sm font-semibold text-[#4a4a4a]">{latestReview?.marketRegime ?? 'No review generated yet'}</div>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <article className="border-4 border-[#1a1a1a] bg-white p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#4a4a4a]">Operator update</div>
          <h3 className="mt-3 font-['Space_Grotesk'] text-3xl font-black uppercase">{latestReview?.analystDecision ?? 'No daily update yet'}</h3>
          <p className="mt-4 text-base leading-7 text-[#4a4a4a]">{latestReview?.operatorSummary ?? 'Run the publish flow to generate the first update card.'}</p>
          <div className="mt-6 grid gap-3">
            <FeedStat label="Risk posture" value={latestReview?.riskPosture ?? 'Pending'} />
            <FeedStat label="Next session plan" value={latestReview?.nextSessionPlan ?? 'Pending'} />
            <FeedStat label="Publish status" value={latestReview?.publishSummary ?? 'Pending'} />
          </div>
        </article>

        <article className="border-4 border-[#1a1a1a] bg-white p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
          <div className="flex items-center justify-between gap-4 border-b-2 border-[#1a1a1a] pb-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#4a4a4a]">Research feed</div>
              <h3 className="mt-2 font-['Space_Grotesk'] text-3xl font-black uppercase">News pulled during research</h3>
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#4a4a4a]">backend feed</div>
          </div>

          <div className="mt-5 grid gap-4">
            {(latestReview?.newsItems ?? []).length === 0 ? (
              <div className="border-2 border-dashed border-[#1a1a1a] bg-[#f5f0e8] px-4 py-6 text-sm font-semibold text-[#4a4a4a]">
                No news items were pulled in this run yet.
              </div>
            ) : (
              (latestReview?.newsItems ?? []).map((item) => <NewsCard key={item.id} item={item} />)
            )}
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <article className="border-4 border-[#1a1a1a] bg-white p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#4a4a4a]">Review archive</div>
          <h3 className="mt-2 font-['Space_Grotesk'] text-3xl font-black uppercase">Recent backend updates</h3>
          <div className="mt-5 grid gap-4">
            {[latestReview, ...archive].filter(Boolean).map((review) => (
              <ArchiveCard key={review!.reviewDate} review={review!} />
            ))}
          </div>
        </article>

        <article className="border-4 border-[#1a1a1a] bg-white p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#4a4a4a]">Top update set</div>
          <h3 className="mt-2 font-['Space_Grotesk'] text-3xl font-black uppercase">Names moving the feed</h3>
          <div className="mt-5 grid gap-4">
            {(latestReview?.topLongs ?? []).slice(0, 3).map((item) => (
              <FeedSetupCard key={item.ticker} item={item} />
            ))}
          </div>
        </article>
      </section>
    </>
  )
}

function SideNavButton({ label, active = false, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2 flex w-full items-center gap-3 border-2 border-[#1a1a1a] px-4 py-3 text-left font-['Space_Grotesk'] text-sm font-black uppercase ${
        active ? 'bg-[#ffcc00]' : 'bg-transparent hover:bg-[#fff7cc]'
      }`}
    >
      <span>{label}</span>
    </button>
  )
}

function SideNavLabel({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center gap-3 border-2 border-[#1a1a1a] px-4 py-3 font-['Space_Grotesk'] text-sm font-black uppercase text-[#4a4a4a] opacity-60">
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

function FeedStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a4a4a]">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-6 text-[#1a1a1a]">{value}</div>
    </div>
  )
}

function NewsCard({ item }: { item: NewsFeedItem }) {
  return (
    <article className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-4 transition hover:-translate-y-0.5 hover:bg-[#fff7cc]">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#4a4a4a]">
        <Link href={`/stocks/${item.ticker.toLowerCase()}`} className="hover:text-[#0055ff] hover:underline">
          {item.ticker}
        </Link>
        <span>•</span>
        <span>{item.source}</span>
        {item.publishedAt ? (
          <>
            <span>•</span>
            <span>{formatDate(item.publishedAt)}</span>
          </>
        ) : null}
      </div>
      <a href={item.url} target="_blank" rel="noreferrer" className="mt-3 block font-['Space_Grotesk'] text-2xl font-black uppercase leading-tight hover:underline">
        {item.title}
      </a>
      <p className="mt-3 text-sm leading-7 text-[#4a4a4a]">{item.summary || 'No summary was returned for this article.'}</p>
      <Link href={`/stocks/${item.ticker.toLowerCase()}`} className="mt-4 inline-flex border-2 border-[#1a1a1a] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] hover:bg-[#ffcc00]">
        Open {item.ticker} analysis
      </Link>
    </article>
  )
}

function ArchiveCard({ review }: { review: DailyReviewSummary }) {
  return (
    <article className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="font-['Space_Grotesk'] text-xl font-black uppercase">{review.reviewDate}</div>
        <span className="border-2 border-[#1a1a1a] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">{review.marketRegime}</span>
      </div>
      <div className="mt-3 text-sm font-semibold leading-7 text-[#1a1a1a]">{review.analystDecision}</div>
      <div className="mt-2 text-sm leading-7 text-[#4a4a4a]">{review.operatorSummary}</div>
    </article>
  )
}

function FeedSetupCard({ item }: { item: ReviewSetupItem }) {
  return (
    <article className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/stocks/${item.ticker.toLowerCase()}`} className="font-['Space_Grotesk'] text-2xl font-black uppercase hover:underline">
            {item.ticker}
          </Link>
          <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4a4a4a]">{item.setupLabel}</div>
        </div>
        <span className="border-2 border-[#1a1a1a] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">{item.portfolioAction}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricBox label="Forecast" value={formatPercent(item.predictedReturn)} />
        <MetricBox label="Target close" value={`$${item.targetClose.toFixed(2)}`} />
      </div>
      <Link href={`/stocks/${item.ticker.toLowerCase()}`} className="mt-4 inline-flex border-2 border-[#1a1a1a] bg-[#ffcc00] px-4 py-2 font-['Space_Grotesk'] text-sm font-black uppercase hover:bg-[#ffd94d]">
        View detailed analysis
      </Link>
    </article>
  )
}

function ActionCard({ item }: { item: ReviewSetupItem }) {
  return (
    <article className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/stocks/${item.ticker.toLowerCase()}`} className="font-['Syne'] text-2xl font-semibold text-white hover:underline">
            {item.ticker}
          </Link>
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
      <Link href={`/stocks/${item.ticker.toLowerCase()}`} className="mt-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200 hover:bg-cyan-300/20">
        View analysis
      </Link>
    </article>
  )
}

function MiniTrend({ forecast }: { forecast: TickerForecast }) {
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

function MiniChart({ forecast }: { forecast: TickerForecast }) {
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

function ActionPill({ action }: { action: ReviewSetupItem['portfolioAction'] | TickerForecast['portfolioAction'] }) {
  const tone = action === 'BUY' ? 'border-emerald-300/30 bg-emerald-300/12 text-emerald-200' : action === 'SELL' ? 'border-rose-300/30 bg-rose-300/12 text-rose-200' : 'border-amber-300/30 bg-amber-300/12 text-amber-200'
  return <span className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] ${tone}`}>{action}</span>
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-1 text-base font-medium text-white">{value}</div>
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

function formatMae(value?: number | null) {
  if (value == null) return 'N/A'
  return `${(value * 100).toFixed(2)}%`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
