import Link from 'next/link'

import type { NewsFeedItem, StockDetail, StockReason, StockScenario, StockTimeframeSnapshot } from '@/lib/types'

export function StockDetailPage({ detail }: { detail: StockDetail }) {
  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b-4 border-[#1a1a1a] bg-[#f5f0e8] px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-['Space_Grotesk'] text-3xl font-black uppercase italic tracking-tighter">
              STOKZ DASHBOARD
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/" className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-tight">
                Portfolio
              </Link>
              <Link href="/" className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-tight">
                Terminal
              </Link>
              <span className="border-b-4 border-[#ffcc00] font-['Space_Grotesk'] text-sm font-bold uppercase tracking-tight text-[#4a4a4a]">Signals</span>
              <Link href="/" className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-tight">
                History
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xl">🔔</span>
            <span className="text-xl">⚙️</span>
            <div className="flex h-10 w-10 items-center justify-center border-2 border-[#1a1a1a] bg-white text-sm font-bold">T</div>
          </div>
        </div>
      </header>

      <div className="flex pt-24">
        <aside className="hidden min-h-[calc(100vh-6rem)] w-64 flex-col border-r-4 border-[#1a1a1a] bg-[#f5f0e8] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] lg:flex">
          <div className="px-6 py-8">
            <p className="font-['Space_Grotesk'] text-xl font-black uppercase">TIMES_FM</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#4a4a4a]">{detail.modelName} / {detail.trendBias}</p>
          </div>
          <nav className="flex-1 px-3">
            <Link href="/" className="mb-2 flex items-center gap-3 border-2 border-[#1a1a1a] px-4 py-3 font-['Space_Grotesk'] text-sm font-black uppercase hover:bg-[#fff7cc]">
              Markets
            </Link>
            <div className="mb-2 flex items-center gap-3 border-2 border-[#1a1a1a] bg-[#ffcc00] px-4 py-3 font-['Space_Grotesk'] text-sm font-black uppercase">Analysis</div>
            <Link href="/" className="mb-2 flex items-center gap-3 border-2 border-[#1a1a1a] px-4 py-3 font-['Space_Grotesk'] text-sm font-black uppercase opacity-70 hover:bg-[#fff7cc]">
              Strategy
            </Link>
            <Link href="/" className="mb-2 flex items-center gap-3 border-2 border-[#1a1a1a] px-4 py-3 font-['Space_Grotesk'] text-sm font-black uppercase opacity-70 hover:bg-[#fff7cc]">
              Risk
            </Link>
            <Link href="/" className="mb-2 flex items-center gap-3 border-2 border-[#1a1a1a] px-4 py-3 font-['Space_Grotesk'] text-sm font-black uppercase opacity-70 hover:bg-[#fff7cc]">
              Logs
            </Link>
          </nav>
          <div className="mt-auto p-4">
            <Link href="/" className="flex w-full items-center justify-center border-2 border-[#1a1a1a] bg-[#e63b2e] py-4 font-['Space_Grotesk'] text-sm font-black uppercase text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              Back to board
            </Link>
          </div>
        </aside>

        <section className="flex-1 px-6 pb-10 pt-4 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">Asset: {detail.companyName} / {detail.ticker} / as of {detail.asOfDate}</div>
              <h1 className="mt-2 font-['Space_Grotesk'] text-6xl font-black uppercase tracking-tighter">Detailed Analysis</h1>
              <p className="mt-3 max-w-4xl text-lg text-[#4a4a4a]">
                Full trade context for {detail.ticker}, including the model path, news overlay, event risk, earnings timing, and short-to-long horizon forecast snapshots.
              </p>
            </div>

            <section className="grid gap-4 xl:grid-cols-6">
              <StatBlock label="Bias" value={detail.bias.toUpperCase()} accent={detail.bias === 'bullish' ? 'yellow' : detail.bias === 'bearish' ? 'red' : 'blue'} />
              <StatBlock label="Confidence" value={`${detail.confidenceScore}%`} accent="white" />
              <StatBlock label="Entry" value={`$${detail.entryPriceTarget.toFixed(2)}`} accent="white" />
              <StatBlock label="Target" value={`$${detail.targetPrice.toFixed(2)}`} accent="blue" />
              <StatBlock label="Stop" value={`$${detail.stopPrice.toFixed(2)}`} accent="red" />
              <StatBlock label="Earnings" value={detail.earningsDate ? formatDate(detail.earningsDate) : 'N/A'} accent="white" />
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
              <article className="border-4 border-[#1a1a1a] bg-white p-5 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="font-['Space_Grotesk'] text-5xl font-black uppercase tracking-tight">Forecast Path: {detail.ticker}.NAS</h2>
                    <p className="mt-2 text-lg text-[#4a4a4a]">
                      {detail.modelName} / {detail.sector} / {detail.industry} / Confidence band powered by current horizon metrics.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {detail.timeframes.map((timeframe) => (
                      <div key={timeframe.label} className={`border-2 border-[#1a1a1a] px-4 py-2 font-['Space_Grotesk'] text-lg font-black uppercase ${timeframe.horizonDays === 3 ? 'bg-[#1a1a1a] text-white' : 'bg-white'}`}>
                        {timeframe.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-2 border-[#1a1a1a] bg-[#f5f0e8] p-4">
                  <div className="mb-4 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.16em]">
                    <LegendSwatch label="Historical" tone="bg-[#1a1a1a]" />
                    <LegendSwatch label="Forecast" tone="bg-[#0055ff]" />
                    <LegendSwatch label="News overlay" tone={detail.newsBias === 'supportive' ? 'bg-[#ffcc00]' : detail.newsBias === 'conflicting' ? 'bg-[#e63b2e]' : 'bg-[#d6e3ff]'} />
                  </div>
                  <ForecastPath detail={detail} />
                </div>
              </article>

              <article className="flex flex-col gap-5">
                <TradeSetupCard detail={detail} />
                <OverlayCard detail={detail} />
              </article>
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1fr,1fr,1fr]">
              {detail.scenarios.map((scenario) => (
                <ScenarioCard key={scenario.id} scenario={scenario} />
              ))}
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <article className="border-4 border-[#1a1a1a] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
                <h2 className="font-['Space_Grotesk'] text-4xl font-black uppercase">Model Health</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <HealthCard label="Rolling MAE" value={formatMae(detail.timeframes[0]?.mae ?? null)} />
                  <HealthCard label="Hit Rate (1D)" value={formatHitRate(detail.timeframes[0]?.hitRate ?? null)} accent="blue" />
                  <HealthCard label="Current Regime" value={detail.trendBias.toUpperCase()} accent="dark" />
                  <HealthCard label="News Bias" value={detail.newsBias.toUpperCase()} accent={detail.newsBias === 'supportive' ? 'yellow' : detail.newsBias === 'conflicting' ? 'red' : 'white'} />
                </div>

                <div className="mt-8 border-4 border-[#1a1a1a] bg-[#f5f0e8]">
                  <div className="border-b-4 border-[#1a1a1a] px-6 py-4">
                    <h3 className="font-['Space_Grotesk'] text-3xl font-black uppercase">Why this trade?</h3>
                  </div>
                  <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr,0.8fr]">
                    <div className="grid gap-6">
                      {detail.reasons.map((reason) => (
                        <ReasonRow key={reason.title} reason={reason} />
                      ))}
                    </div>
                    <div className="border-2 border-[#1a1a1a] bg-white p-6">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">Decision confidence</div>
                      <div className="mt-5 font-['Space_Grotesk'] text-7xl font-black uppercase">{(detail.adjustedConvictionScore / 10).toFixed(1)}</div>
                      <div className="mt-3 font-['Space_Grotesk'] text-2xl font-black uppercase">{detail.portfolioAction} signal</div>
                      <div className="mt-5 border-2 border-[#1a1a1a] bg-[#1a1a1a] px-4 py-4 text-center font-['Space_Grotesk'] text-lg font-black uppercase text-white">
                        Finalize parameters
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article className="grid gap-6">
                <article className="border-4 border-[#1a1a1a] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
                  <h2 className="font-['Space_Grotesk'] text-3xl font-black uppercase">Timeframe predictions</h2>
                  <div className="mt-5 grid gap-4">
                    {detail.timeframes.map((timeframe) => (
                      <TimeframeCard key={timeframe.label} timeframe={timeframe} />
                    ))}
                  </div>
                </article>

                <article className="border-4 border-[#1a1a1a] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
                  <h2 className="font-['Space_Grotesk'] text-3xl font-black uppercase">Company context</h2>
                  <div className="mt-5 grid gap-3">
                    <InfoRow label="Sector" value={detail.sector} />
                    <InfoRow label="Industry" value={detail.industry} />
                    <InfoRow label="Market cap" value={formatMarketCap(detail.marketCap)} />
                    <InfoRow label="Average volume" value={formatNumber(detail.averageVolume)} />
                    <InfoRow label="52W range" value={`${formatCurrency(detail.yearLow)} - ${formatCurrency(detail.yearHigh)}`} />
                    <InfoRow label="Analyst target" value={formatCurrency(detail.analystTarget)} />
                    <InfoRow label="Upcoming earnings" value={detail.earningsDate ? `${formatDate(detail.earningsDate)} (${formatDays(detail.daysToEarnings)})` : 'Not available'} />
                  </div>
                </article>
              </article>
            </section>

            <section className="mt-8 border-4 border-[#1a1a1a] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
              <div className="flex flex-col gap-3 border-b-4 border-[#1a1a1a] pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">Research feed</div>
                  <h2 className="mt-2 font-['Space_Grotesk'] text-4xl font-black uppercase">News, catalysts, and stock context</h2>
                </div>
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#4a4a4a]">Pulled from research overlay</div>
              </div>
              <div className="mt-6 grid gap-4">
                {detail.newsItems.length === 0 ? (
                  <div className="border-2 border-dashed border-[#1a1a1a] bg-[#f5f0e8] px-5 py-6 text-sm font-semibold text-[#4a4a4a]">No fresh linked stories were available for this ticker in the current run.</div>
                ) : (
                  detail.newsItems.map((item) => <NewsCard key={item.id} item={item} />)
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent: 'yellow' | 'red' | 'blue' | 'white' }) {
  const tone = accent === 'yellow' ? 'bg-[#ffcc00]' : accent === 'red' ? 'bg-[#ffe3df] text-[#b12218]' : accent === 'blue' ? 'bg-[#d6e3ff] text-[#0055ff]' : 'bg-white'
  return (
    <div className={`border-4 border-[#1a1a1a] px-5 py-4 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] ${tone}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.22em]">{label}</div>
      <div className="mt-2 font-['Space_Grotesk'] text-4xl font-black uppercase">{value}</div>
    </div>
  )
}

function TradeSetupCard({ detail }: { detail: StockDetail }) {
  return (
    <article className="border-4 border-[#1a1a1a] bg-white p-5 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
      <h3 className="border-b-2 border-[#1a1a1a] pb-3 font-['Space_Grotesk'] text-3xl font-black uppercase">Trade Setup</h3>
      <div className="mt-5 grid gap-5">
        <SetupMetric label="Risk / Reward" value={`${detail.riskRewardRatio.toFixed(2)}x`} />
        <SetupMetric label="Quality score" value={`${detail.adjustedConvictionScore}/100`} />
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a4a4a]">Volatility width</div>
          <div className="mt-2 text-sm font-semibold text-[#1a1a1a]">{((detail.expectedMoveHigh - detail.expectedMoveLow) * 100).toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a4a4a]">Model edge</div>
          <div className="mt-2 text-sm font-semibold text-[#0055ff]">{formatPercent(detail.timeframes[0]?.predictedReturn ?? 0)}</div>
        </div>
        <div className="border-2 border-[#1a1a1a] bg-[#ffcc00] px-4 py-5 text-center font-['Space_Grotesk'] text-2xl font-black uppercase">Review setup</div>
      </div>
    </article>
  )
}

function OverlayCard({ detail }: { detail: StockDetail }) {
  const tone = detail.newsBias === 'supportive' ? 'bg-[#ffcc00]' : detail.newsBias === 'conflicting' ? 'bg-[#ffe3df]' : 'bg-[#d6e3ff]'
  return (
    <article className={`border-4 border-[#1a1a1a] p-5 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] ${tone}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">News overlay</div>
      <div className="mt-3 font-['Space_Grotesk'] text-3xl font-black uppercase">{detail.newsBias}</div>
      <div className="mt-4 grid gap-3">
        <SetupMetric label="News score" value={`${detail.newsImpactScore > 0 ? '+' : ''}${detail.newsImpactScore}`} compact />
        <SetupMetric label="Confidence adj." value={`${detail.confidenceAdjustment > 0 ? '+' : ''}${detail.confidenceAdjustment}`} compact />
        <SetupMetric label="Event risk" value={detail.eventRisk.toUpperCase()} compact />
      </div>
    </article>
  )
}

function ScenarioCard({ scenario }: { scenario: StockScenario }) {
  const tone = scenario.tone === 'base' ? 'bg-[#ffcc00]' : 'bg-white'
  const valueTone = scenario.tone === 'bull' ? 'text-[#0055ff]' : scenario.tone === 'bear' ? 'text-[#b12218]' : 'text-[#1a1a1a]'
  return (
    <article className={`border-4 border-[#1a1a1a] p-5 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`font-['Space_Grotesk'] text-4xl font-black uppercase leading-none ${valueTone}`}>{scenario.label}</div>
        <div className="border-2 border-[#1a1a1a] bg-[#1a1a1a] px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">{scenario.probability}% prob</div>
      </div>
      <div className={`mt-5 font-['Space_Grotesk'] text-6xl font-black uppercase ${valueTone}`}>${scenario.targetPrice.toFixed(2)}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#4a4a4a]">Predicted range anchor</div>
      <p className="mt-5 border-t-2 border-[#1a1a1a] pt-4 text-base italic leading-7 text-[#1a1a1a]">“{scenario.summary}”</p>
    </article>
  )
}

function HealthCard({ label, value, accent = 'white' }: { label: string; value: string; accent?: 'white' | 'blue' | 'dark' | 'yellow' | 'red' }) {
  const tone = accent === 'blue' ? 'text-[#0055ff]' : accent === 'dark' ? 'bg-[#1a1a1a] text-white' : accent === 'yellow' ? 'bg-[#ffcc00]' : accent === 'red' ? 'bg-[#ffe3df] text-[#b12218]' : 'bg-white'
  return (
    <div className={`border-4 border-[#1a1a1a] p-5 text-center ${tone}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">{label}</div>
      <div className="mt-4 font-['Space_Grotesk'] text-4xl font-black uppercase">{value}</div>
    </div>
  )
}

function ReasonRow({ reason }: { reason: StockReason }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 h-10 w-10 border-2 border-[#1a1a1a] bg-[#ffcc00]" />
      <div>
        <div className="font-['Space_Grotesk'] text-2xl font-black uppercase">{reason.title}</div>
        <div className="mt-2 max-w-2xl text-base leading-7 text-[#4a4a4a]">{reason.body}</div>
      </div>
    </div>
  )
}

function TimeframeCard({ timeframe }: { timeframe: StockTimeframeSnapshot }) {
  return (
    <article className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-['Space_Grotesk'] text-2xl font-black uppercase">{timeframe.label}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[#4a4a4a]">{timeframe.confidenceBand} confidence band</div>
        </div>
        <div className="text-right">
          <div className="font-['Space_Grotesk'] text-2xl font-black uppercase text-[#0055ff]">{formatPercent(timeframe.predictedReturn)}</div>
          <div className="text-sm font-semibold text-[#4a4a4a]">target ${timeframe.targetClose.toFixed(2)}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoRow label="Hit rate" value={formatHitRate(timeframe.hitRate)} compact />
        <InfoRow label="Rolling MAE" value={formatMae(timeframe.mae)} compact />
      </div>
    </article>
  )
}

function InfoRow({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`${compact ? 'border-2 border-[#1a1a1a] bg-white px-3 py-3' : 'border-b border-[#1a1a1a] pb-3 last:border-b-0'}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a4a4a]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#1a1a1a]">{value}</div>
    </div>
  )
}

function NewsCard({ item }: { item: NewsFeedItem }) {
  return (
    <article className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-4 transition hover:-translate-y-0.5 hover:bg-[#fff7cc]">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#4a4a4a]">
        <span>{item.ticker}</span>
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
      <p className="mt-3 text-sm leading-7 text-[#4a4a4a]">{item.summary || 'No summary available for this item.'}</p>
    </article>
  )
}

function ForecastPath({ detail }: { detail: StockDetail }) {
  const history = detail.chartSeries?.historyPoints ?? []
  const forecast = detail.chartSeries?.forecastPoints ?? []
  const combined = [...history, ...forecast]

  if (combined.length === 0) {
    return <div className="flex h-[28rem] items-center justify-center text-sm font-semibold uppercase text-[#4a4a4a]">No chart data available</div>
  }

  const values = combined.map((point) => point.close)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  const historyPoints = history
    .map((point, index) => {
      const x = (index / Math.max(combined.length - 1, 1)) * 100
      const y = 100 - ((point.close - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  const forecastPoints = forecast
    .map((point, index) => {
      const x = ((history.length - 1 + index + 1) / Math.max(combined.length - 1, 1)) * 100
      const y = 100 - ((point.close - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  const overlayTop = combined
    .map((point, index) => {
      const x = (index / Math.max(combined.length - 1, 1)) * 100
      const upper = point.close * (1 + Math.max(detail.expectedMoveHigh, 0.01))
      const y = 100 - ((upper - min) / range) * 100
      return `${x},${Math.max(0, Math.min(100, y))}`
    })
    .join(' ')

  const overlayBottom = [...combined]
    .reverse()
    .map((point, reversedIndex) => {
      const actualIndex = combined.length - 1 - reversedIndex
      const x = (actualIndex / Math.max(combined.length - 1, 1)) * 100
      const lower = point.close * (1 + Math.min(detail.expectedMoveLow, -0.005))
      const y = 100 - ((lower - min) / range) * 100
      return `${x},${Math.max(0, Math.min(100, y))}`
    })
    .join(' ')

  const currentForecast = forecast[0] ?? history[history.length - 1]
  const currentX = ((history.length - 1 + (forecast.length > 0 ? 1 : 0)) / Math.max(combined.length - 1, 1)) * 100
  const currentY = 100 - ((currentForecast.close - min) / range) * 100

  return (
    <svg viewBox="0 0 100 100" className="h-[28rem] w-full" fill="none">
      <rect x="0" y="0" width="100" height="100" fill="#f5f0e8" />
      <polygon points={`${overlayTop} ${overlayBottom}`} fill="#ffeb85" opacity="0.8" />
      <polyline points={historyPoints} stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter" />
      <polyline points={forecastPoints} stroke="#0055ff" strokeWidth="1.2" strokeDasharray="2.5 1.8" strokeLinecap="square" strokeLinejoin="miter" />
      <circle cx={currentX} cy={currentY} r="1.7" fill="#e63b2e" stroke="#1a1a1a" strokeWidth="0.5" />
      <text x={Math.min(currentX + 2, 90)} y={Math.max(currentY - 2, 8)} fontSize="3.5" fontWeight="700" fill="#1a1a1a">
        ${detail.entryPriceTarget.toFixed(2)}
      </text>
    </svg>
  )
}

function LegendSwatch({ label, tone }: { label: string; tone: string }) {
  return (
    <div className="flex items-center gap-2 border-2 border-[#1a1a1a] bg-white px-3 py-2">
      <span className={`h-4 w-4 border border-[#1a1a1a] ${tone}`} />
      <span>{label}</span>
    </div>
  )
}

function SetupMetric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a4a4a]">{label}</div>
      <div className={`mt-1 font-['Space_Grotesk'] font-black uppercase ${compact ? 'text-2xl' : 'text-5xl'}`}>{value}</div>
    </div>
  )
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
}

function formatHitRate(value: number | null) {
  if (value == null) return 'N/A'
  return `${(value * 100).toFixed(1)}%`
}

function formatMae(value: number | null) {
  if (value == null) return 'N/A'
  return `${(value * 100).toFixed(2)}%`
}

function formatCurrency(value: number | null) {
  if (value == null || Number.isNaN(value)) return 'N/A'
  return `$${value.toFixed(2)}`
}

function formatMarketCap(value: number | null) {
  if (value == null || Number.isNaN(value)) return 'N/A'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  return `$${value.toFixed(0)}`
}

function formatNumber(value: number | null) {
  if (value == null || Number.isNaN(value)) return 'N/A'
  return Intl.NumberFormat('en-US').format(value)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDays(value: number | null) {
  if (value == null) return 'date unavailable'
  if (value < 0) return `${Math.abs(value)} day(s) ago`
  if (value === 0) return 'today'
  return `in ${value} day(s)`
}
