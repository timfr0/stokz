'use client'

import { useEffect, useRef, useState } from 'react'
import { AnalysisPanel } from '@/components/analysis-panel'
import { WatchlistSignalStack } from '@/components/watchlist-signal-stack'
import { WatchlistTable } from '@/components/watchlist-table'
import {
  getAverageOneDayHitRate,
  getBullishCount,
  getDefaultSelectedTicker,
  getWatchlistPriorityForecasts,
} from '@/lib/dashboard-view'
import type { DashboardData } from '@/lib/types'

export function DashboardShell({ dashboard }: { dashboard: DashboardData }) {
  const forecasts = dashboard.forecasts
  const defaultTicker = getDefaultSelectedTicker(forecasts)
  const [selectedTicker, setSelectedTicker] = useState(defaultTicker)
  const analysisRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!selectedTicker || !forecasts.some((forecast) => forecast.ticker === selectedTicker)) {
      setSelectedTicker(defaultTicker)
    }
  }, [defaultTicker, forecasts, selectedTicker])

  const selectedForecast = forecasts.find((forecast) => forecast.ticker === selectedTicker) ?? forecasts[0] ?? null

  if (!selectedForecast) {
    return (
      <main className="min-h-screen bg-[#f5f0e8] px-4 py-10 text-[#1a1a1a]">
        <div className="mx-auto max-w-4xl border-4 border-[#1a1a1a] bg-white p-8 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
          <h1 className="font-['Space_Grotesk'] text-4xl font-black uppercase">Stokz Dashboard</h1>
          <p className="mt-4 text-lg">No forecast data is available yet.</p>
        </div>
      </main>
    )
  }

  const bullishCount = getBullishCount(forecasts)
  const averageOneDayHitRate = getAverageOneDayHitRate(forecasts)
  const prioritizedForecasts = getWatchlistPriorityForecasts(forecasts)
  const buyCount = forecasts.filter((forecast) => forecast.portfolioAction === 'BUY').length

  function handleSelectTicker(ticker: string, scrollToAnalysis = false) {
    setSelectedTicker(ticker)

    if (!scrollToAnalysis || typeof window === 'undefined' || window.innerWidth >= 1024) {
      return
    }

    window.requestAnimationFrame(() => {
      const analysisSection = analysisRef.current

      if (!analysisSection) return

      const { top, bottom } = analysisSection.getBoundingClientRect()
      const isVisible = top < window.innerHeight && bottom > 0

      if (!isVisible) {
        analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a]">
      <header className="sticky top-0 z-40 border-b-4 border-[#1a1a1a] bg-[#f5f0e8]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#4a4a4a]">Forecast lab</div>
            <div className="font-['Space_Grotesk'] text-2xl font-black uppercase italic tracking-tight sm:text-3xl">STOKZ DASHBOARD</div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <StatusChip label="Model node" value="A1" tone="paper" />
            <StatusChip label="Last refresh" value={dashboard.generatedAtLabel} tone="yellow" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr),320px]">
          <div className="border-4 border-[#1a1a1a] bg-white p-5 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] sm:p-6">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#4a4a4a]">Operator surface</div>
            <h1 className="mt-3 font-['Space_Grotesk'] text-5xl font-black uppercase tracking-tighter sm:text-6xl lg:text-7xl">Market Watchlist</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#4a4a4a] sm:text-lg">
              Real model-driven swing setups with tomorrow entry targets, rolling horizon accuracy, chart-first mobile cards, and a deeper analysis surface for the selected ticker.
            </p>
          </div>

          <div className="grid gap-4">
            <StatusCard
              label="Board hit rate"
              value={`${averageOneDayHitRate}%`}
              note="Rolling 1D hit rate across the current evaluation ledger."
              tone="yellow"
            />
            <StatusCard
              label="Bullish count"
              value={`${bullishCount}/${forecasts.length}`}
              note="How many names still lean constructive after the latest refresh."
              tone="dark"
            />
          </div>
        </section>

        <section className="mt-8 overflow-hidden border-4 border-[#1a1a1a] bg-white shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
          <div className="flex flex-col gap-3 bg-[#1a1a1a] px-4 py-4 text-white md:flex-row md:items-end md:justify-between md:px-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">Fast scan</div>
              <h2 className="mt-2 font-['Space_Grotesk'] text-3xl font-black uppercase tracking-tight sm:text-4xl">Active Signals</h2>
            </div>
            <div className="grid gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/75 sm:grid-cols-3 sm:gap-4 sm:text-right">
              <span>1D hit rate: {averageOneDayHitRate}%</span>
              <span>{bullishCount}/{forecasts.length} bullish</span>
              <span>{buyCount} fresh buys</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 lg:p-6">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">Tap or click a ticker to sync the analysis surface below.</div>
            <div className="mt-4">
              <WatchlistTable forecasts={prioritizedForecasts} selectedTicker={selectedTicker} onSelectTicker={handleSelectTicker} />
            </div>
            <WatchlistSignalStack forecasts={prioritizedForecasts} selectedTicker={selectedTicker} onSelectTicker={handleSelectTicker} />
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <StatusCard
            label="Tomorrow adds"
            value={`${buyCount}`}
            note="Actionable long setups with the best shot at becoming tomorrow's focus names."
            tone="yellow"
          />
          <StatusCard
            label="Selected ticker"
            value={selectedForecast.ticker}
            note="The watchlist and analysis surfaces stay in sync around the same active name."
            tone="blue"
          />
          <StatusCard
            label="Current posture"
            value={`${selectedForecast.portfolioAction} / ${selectedForecast.confidenceLabel}`}
            note="High-signal shortcut for the current board favorite before you dive into the deeper model pane."
            tone="paper"
          />
        </section>

        <div ref={analysisRef}>
          <AnalysisPanel
            forecasts={prioritizedForecasts}
            selectedForecast={selectedForecast}
            selectedTicker={selectedTicker}
            onSelectTicker={(ticker) => handleSelectTicker(ticker)}
          />
        </div>
      </div>
    </main>
  )
}

function StatusChip({ label, value, tone }: { label: string; value: string; tone: 'paper' | 'yellow' }) {
  const background = tone === 'yellow' ? 'bg-[#ffcc00]' : 'bg-white'

  return (
    <div className={`border-2 border-[#1a1a1a] px-3 py-2 ${background}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4a4a4a]">{label}</div>
      <div className="mt-1 font-['Space_Grotesk'] text-lg font-black uppercase">{value}</div>
    </div>
  )
}

function StatusCard({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note: string
  tone: 'yellow' | 'blue' | 'dark' | 'paper'
}) {
  const background =
    tone === 'yellow'
      ? 'bg-[#ffcc00]'
      : tone === 'blue'
        ? 'bg-[#d6e3ff]'
        : tone === 'dark'
          ? 'bg-[#1a1a1a] text-white'
          : 'bg-white'

  const muted = tone === 'dark' ? 'text-white/70' : 'text-[#4a4a4a]'

  return (
    <div className={`border-4 border-[#1a1a1a] p-5 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] ${background}`}>
      <div className={`text-[10px] font-black uppercase tracking-[0.24em] ${muted}`}>{label}</div>
      <div className="mt-3 font-['Space_Grotesk'] text-3xl font-black uppercase leading-none">{value}</div>
      <div className={`mt-3 text-sm leading-6 ${muted}`}>{note}</div>
    </div>
  )
}
