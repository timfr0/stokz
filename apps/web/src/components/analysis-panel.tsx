import {
  formatCurrency,
  formatMae,
  formatPercent,
  getHorizonForecast,
  getTrendState,
} from '@/lib/dashboard-view'
import type { TickerForecast } from '@/lib/types'
import { TickerChart } from '@/components/ticker-chart'

type AnalysisPanelProps = {
  forecasts: TickerForecast[]
  selectedForecast: TickerForecast
  selectedTicker: string | null
  onSelectTicker: (ticker: string) => void
}

const actionTone = {
  BUY: 'bg-[#ffcc00] text-[#1a1a1a]',
  HOLD: 'bg-[#d6e3ff] text-[#1a1a1a]',
  SELL: 'bg-[#e63b2e] text-white',
}

const trendTone = {
  UP: 'bg-[#ffcc00] text-[#1a1a1a]',
  STEADY: 'bg-[#d6e3ff] text-[#1a1a1a]',
  DOWN: 'bg-[#e63b2e] text-white',
}

const confidenceTone = {
  high: 'bg-[#ffcc00] text-[#1a1a1a]',
  medium: 'bg-[#d6e3ff] text-[#1a1a1a]',
  low: 'bg-[#e8e3da] text-[#1a1a1a]',
}

const horizons = [1, 3, 5]

export function AnalysisPanel({ forecasts, selectedForecast, selectedTicker, onSelectTicker }: AnalysisPanelProps) {
  const trend = getTrendState(selectedForecast.predictedReturn) as keyof typeof trendTone

  return (
    <section data-testid="analysis-panel" className="mt-10 overflow-hidden border-4 border-[#1a1a1a] bg-white shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
      <div className="flex flex-col gap-3 bg-[#1a1a1a] px-4 py-4 text-white md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">Research surface</div>
          <h3 className="mt-2 font-['Space_Grotesk'] text-3xl font-black uppercase tracking-tight sm:text-4xl">Detailed Model Analysis</h3>
        </div>
        <div className="text-sm font-medium text-white/75">Select a ticker from the board to inspect the full model context.</div>
      </div>

      <div className="border-b-2 border-[#1a1a1a] p-4 xl:hidden">
        <div className="flex gap-3 overflow-x-auto">
          {forecasts.map((forecast) => (
            <button
              key={`${forecast.ticker}-mobile-analysis-chip`}
              type="button"
              data-testid={`analysis-chip-${forecast.ticker}`}
              onClick={() => onSelectTicker(forecast.ticker)}
              className={`shrink-0 border-2 border-[#1a1a1a] px-4 py-2 font-['Space_Grotesk'] text-sm font-black uppercase ${forecast.ticker === selectedTicker ? 'bg-[#ffcc00]' : 'bg-white'}`}
            >
              {forecast.ticker}
            </button>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-[220px,minmax(0,1fr)]">
        <aside className="hidden border-r-4 border-[#1a1a1a] bg-[#f5f0e8] xl:block">
          <div className="sticky top-24 p-4">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">Ticker selector</div>
            <div className="grid gap-3">
              {forecasts.map((forecast) => (
                <button
                  key={`${forecast.ticker}-analysis-chip`}
                  type="button"
                  data-testid={`analysis-chip-${forecast.ticker}`}
                  onClick={() => onSelectTicker(forecast.ticker)}
                  className={`border-2 border-[#1a1a1a] px-4 py-3 text-left font-['Space_Grotesk'] text-lg font-black uppercase ${forecast.ticker === selectedTicker ? 'bg-[#ffcc00]' : 'bg-white'}`}
                >
                  {forecast.ticker}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b-2 border-[#1a1a1a] pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">{selectedForecast.setupLabel}</div>
              <div data-testid="analysis-selected-ticker" className="mt-2 font-['Space_Grotesk'] text-4xl font-black uppercase sm:text-5xl">
                {selectedForecast.ticker}
              </div>
              <div className="mt-2 text-sm font-medium text-[#4a4a4a]">
                {selectedForecast.asOfDate} to {selectedForecast.targetDate}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${actionTone[selectedForecast.portfolioAction]}`}>
                {selectedForecast.portfolioAction}
              </span>
              <span className={`border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${trendTone[trend]}`}>
                {trend}
              </span>
              <span className={`border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${confidenceTone[selectedForecast.confidenceLabel]}`}>
                {selectedForecast.confidenceLabel} confidence
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr),minmax(0,0.65fr)]">
            <div className="border-4 border-[#1a1a1a] bg-[#f5f0e8] p-4 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
              <TickerChart series={selectedForecast.chartSeries} chartClassName="min-h-[18rem]" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <MetricBox label="Current close" value={formatCurrency(selectedForecast.currentClose)} />
              <MetricBox label="Tomorrow entry" value={formatCurrency(selectedForecast.entryPriceTarget)} />
              <MetricBox label="Target close" value={formatCurrency(selectedForecast.targetClose)} />
              <MetricBox label="Predicted return" value={formatPercent(selectedForecast.predictedReturn)} accent={selectedForecast.predictedReturn >= 0 ? 'blue' : 'red'} />
              <MetricBox label="Trend bias" value={selectedForecast.trendBias} />
              <MetricBox label="Signal direction" value={selectedForecast.signalDirection} />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">Multi-horizon view</div>
            <div className="grid gap-4 md:grid-cols-3">
              {horizons.map((days) => {
                const horizon = getHorizonForecast(selectedForecast, days)

                return (
                  <div key={`${selectedForecast.ticker}-${days}d`} className="border-4 border-[#1a1a1a] bg-white p-4 shadow-[5px_5px_0px_0px_rgba(26,26,26,1)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-['Space_Grotesk'] text-xl font-black uppercase">{days}D forecast</div>
                      <span className="border-2 border-[#1a1a1a] bg-[#f5f0e8] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
                        {horizon?.confidenceBand ?? 'pending'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                      <MetricRow label="Expected return" value={horizon ? formatPercent(horizon.predictedReturn) : 'Waiting for history'} />
                      <MetricRow label="Projected close" value={horizon ? formatCurrency(horizon.targetClose) : 'Waiting for history'} />
                      <MetricRow
                        label="Rolling hit rate"
                        value={horizon ? (horizon.measuredHitRate == null ? 'Waiting for history' : `${(horizon.measuredHitRate * 100).toFixed(1)}%`) : 'Waiting for history'}
                      />
                      <MetricRow label="Rolling MAE" value={horizon ? formatMae(horizon.measuredMae) : 'Waiting for history'} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
            <div className="border-4 border-[#1a1a1a] bg-[#1a1a1a] p-5 text-white shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">Signal note</div>
              <div className="mt-3 text-base leading-7">{selectedForecast.notes}</div>
            </div>

            <div className="grid gap-3">
              <MetricBox label="Model" value={selectedForecast.modelName} />
              <MetricBox label="Conviction" value={`${selectedForecast.convictionScore}/100`} />
              <MetricBox label="Position shares" value={`${selectedForecast.currentPositionShares}`} />
              <MetricBox
                label="Expected range"
                value={`${formatPercent(selectedForecast.expectedMoveRange[0])} to ${formatPercent(selectedForecast.expectedMoveRange[1])}`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MetricBox({ label, value, accent = 'paper' }: { label: string; value: string; accent?: 'paper' | 'blue' | 'red' }) {
  const background = accent === 'blue' ? 'bg-[#d6e3ff]' : accent === 'red' ? 'bg-[#ffe0db]' : 'bg-[#f5f0e8]'

  return (
    <div className={`border-2 border-[#1a1a1a] p-4 ${background}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a4a4a]">{label}</div>
      <div className="mt-2 font-['Space_Grotesk'] text-2xl font-black uppercase">{value}</div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a4a4a]">{label}</div>
      <div className="mt-2 font-['Space_Grotesk'] text-lg font-black uppercase">{value}</div>
    </div>
  )
}
