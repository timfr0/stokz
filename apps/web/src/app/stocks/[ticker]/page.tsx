import { notFound } from 'next/navigation'

import { StockDetailPage } from '@/components/stock-detail-page'
import { getStockDetail, getStockTickers } from '@/lib/chart-data'

type StockDetailRouteProps = {
  params: {
    ticker: string
  }
}

export function generateStaticParams() {
  return getStockTickers().map((ticker) => ({ ticker: ticker.toLowerCase() }))
}

export default function StockDetailRoute({ params }: StockDetailRouteProps) {
  const detail = getStockDetail(params.ticker)

  if (!detail) {
    notFound()
  }

  return <StockDetailPage detail={detail} />
}
