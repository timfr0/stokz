import { buildMobileStats, formatPercent, getTrendState } from '@/lib/dashboard-view'
import type { TickerForecast } from '@/lib/types'
import { TickerChart } from '@/components/ticker-chart'

type WatchlistSignalStackProps = {
  forecasts: TickerForecast[]
  selectedTicker: string | null
  onSelectTicker: (ticker: string, scrollToAnalysis?: boolean) => void
}

const actionTone = {
  BUY: 'bg-[#ffcc00] text-[#1a1a1a]',
  HOLD: 'bg-[#d6e3ff] text-[#1a1a1a]',
  SELL: 'bg-[#e63b2e] text-white',
}

const directionTone = {
  bullish: 'bg-[#ffcc00] text-[#1a1a1a]',
  bearish: 'bg-[#e63b2e] text-white',
  neutral: 'bg-[#d6e3ff] text-[#1a1a1a]',
}

const trendTone = {
  UP: 'bg-[#ffcc00] text-[#1a1a1a]',
  STEADY: 'bg-[#d6e3ff] text-[#1a1a1a]',
  DOWN: 'bg-[#e63b2e] text-white',
}

export function WatchlistSignalStack({ forecasts, selectedTicker, onSelectTicker }: WatchlistSignalStackProps) {
  const desktopForecasts = forecasts.slice(0, 4)

  return (
    <>
      <div className="mt-4 hidden lg:block">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">Priority chart stack</div>
        <div className="grid gap-4">
          {desktopForecasts.map((forecast) => {
            const trend = getTrendState(forecast.predictedReturn)
            const stats = buildMobileStats(forecast)
            const isActive = forecast.ticker === selectedTicker

            return (
              <button
                key={`${forecast.ticker}-desktop-stack`}
                type="button"
                data-testid={`desktop-signal-${forecast.ticker}`}
                onClick={() => onSelectTicker(forecast.ticker)}
                className={`grid gap-5 border-4 border-[#1a1a1a] p-5 text-left shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] transition-transform duration-150 xl:grid-cols-[220px,minmax(0,1fr),260px] ${isActive ? 'bg-[#fff3bf]' : 'bg-white hover:-translate-y-0.5'}`}
              >
                <div>
                  <div className="font-['Space_Grotesk'] text-3xl font-black uppercase">{forecast.ticker}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">{forecast.setupLabel}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${actionTone[forecast.portfolioAction]}`}>
                      {forecast.portfolioAction}
                    </span>
                    <span className={`border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${directionTone[forecast.direction]}`}>
                      {forecast.direction}
                    </span>
                    <span className={`border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${trendTone[trend]}`}>
                      {trend}
                    </span>
                  </div>
                  <div className="mt-5 text-sm font-medium text-[#4a4a4a]">
                    Tomorrow focus from {forecast.asOfDate} into {forecast.targetDate}.
                  </div>
                </div>
                <div className="rounded-none border-2 border-[#1a1a1a] bg-white p-4">
                  <TickerChart series={forecast.chartSeries} chartClassName="min-h-[14rem]" />
                </div>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    {stats.map((stat) => (
                      <div key={`${forecast.ticker}-${stat.label}`} className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a4a4a]">{stat.label}</div>
                        <div className="mt-2 font-['Space_Grotesk'] text-lg font-black uppercase">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border-2 border-[#1a1a1a] bg-[#1a1a1a] p-4 text-white">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">Signal note</div>
                    <div className="mt-3 text-sm leading-6">{forecast.notes}</div>
                    <div className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-white/70">Conviction / move</div>
                    <div className="mt-2 font-['Space_Grotesk'] text-2xl font-black uppercase">
                      {forecast.convictionScore}/100 / {formatPercent(forecast.predictedReturn)}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:hidden">
        {forecasts.map((forecast) => {
          const trend = getTrendState(forecast.predictedReturn)
          const stats = buildMobileStats(forecast)
          const isActive = forecast.ticker === selectedTicker

          return (
            <button
              key={`${forecast.ticker}-mobile-card`}
              type="button"
              data-testid={`mobile-signal-${forecast.ticker}`}
              onClick={() => onSelectTicker(forecast.ticker, true)}
              className={`border-4 border-[#1a1a1a] p-4 text-left shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] ${isActive ? 'bg-[#fff3bf]' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-['Space_Grotesk'] text-3xl font-black uppercase">{forecast.ticker}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#4a4a4a]">{forecast.setupLabel}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className={`border-2 border-[#1a1a1a] px-3 py-1 text-center font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${actionTone[forecast.portfolioAction]}`}>
                    {forecast.portfolioAction}
                  </span>
                  <span className={`border-2 border-[#1a1a1a] px-3 py-1 text-center font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${trendTone[trend]}`}>
                    {trend}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-none border-2 border-[#1a1a1a] bg-white p-3">
                <TickerChart series={forecast.chartSeries} chartClassName="min-h-[12rem]" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {stats.map((stat) => (
                  <div key={`${forecast.ticker}-${stat.label}`} className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a4a4a]">{stat.label}</div>
                    <div className="mt-2 font-['Space_Grotesk'] text-lg font-black uppercase">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t-2 border-[#1a1a1a] pt-3">
                <span className={`border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${directionTone[forecast.direction]}`}>
                  {forecast.direction}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a4a4a]">{forecast.convictionScore}/100 conviction</span>
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}
