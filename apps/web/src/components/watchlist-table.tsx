import {
  formatCurrency,
  formatHitRate,
  formatPercent,
  getHorizonForecast,
  getTrendState,
} from '@/lib/dashboard-view'
import type { TickerForecast } from '@/lib/types'

type WatchlistTableProps = {
  forecasts: TickerForecast[]
  selectedTicker: string | null
  onSelectTicker: (ticker: string) => void
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

export function WatchlistTable({ forecasts, selectedTicker, onSelectTicker }: WatchlistTableProps) {
  return (
    <div className="hidden lg:block">
      <div className="overflow-x-auto border-2 border-[#1a1a1a]">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[#e8e3da]">
            <tr>
              {['Ticker', 'Bias', 'Hit Rate', 'Entry', 'Target', 'Exp. Move', 'Trend', 'Score'].map((label) => (
                <th key={label} className="border-b-4 border-[#1a1a1a] px-4 py-4 font-['Space_Grotesk'] text-xs font-black uppercase tracking-[0.16em]">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forecasts.map((forecast) => {
              const trend = getTrendState(forecast.predictedReturn)
              const oneDay = getHorizonForecast(forecast, 1)
              const isActive = forecast.ticker === selectedTicker

              return (
                <tr
                  key={`${forecast.ticker}-${forecast.targetDate}`}
                  data-testid={`watchlist-row-${forecast.ticker}`}
                  className={`${isActive ? 'bg-[#fff3bf]' : 'bg-white hover:bg-[#fff7cc]'} cursor-pointer border-b-2 border-[#1a1a1a] last:border-b-0`}
                  onClick={() => onSelectTicker(forecast.ticker)}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center border-2 border-[#1a1a1a] bg-[#1a1a1a] font-['Space_Grotesk'] text-sm font-black text-white">
                        {forecast.ticker}
                      </div>
                      <div>
                        <div className="font-['Space_Grotesk'] text-lg font-black uppercase">{forecast.setupLabel}</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4a4a4a]">
                          {forecast.portfolioAction} / {forecast.confidenceLabel} confidence
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-block border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${directionTone[forecast.direction]}`}>
                      {forecast.direction}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-lg font-bold">{formatHitRate(oneDay?.measuredHitRate)}</td>
                  <td className="px-4 py-4 font-mono text-lg font-bold">{formatCurrency(forecast.entryPriceTarget)}</td>
                  <td className="px-4 py-4 font-mono text-lg font-bold">{formatCurrency(forecast.targetClose)}</td>
                  <td className={`px-4 py-4 font-['Space_Grotesk'] text-lg font-black ${forecast.predictedReturn >= 0 ? 'text-[#0055ff]' : 'text-[#e63b2e]'}`}>
                    {formatPercent(forecast.predictedReturn)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-block border-2 border-[#1a1a1a] px-3 py-1 font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.16em] ${trendTone[trend]}`}>
                      {trend}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-24 border-2 border-[#1a1a1a] bg-[#f5f0e8]">
                      <div className="h-full border-r-2 border-[#1a1a1a] bg-[#ffcc00]" style={{ width: `${forecast.convictionScore}%` }} />
                    </div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em]">{forecast.convictionScore}/100</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
