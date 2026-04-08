import { DashboardShell } from '@/components/dashboard-shell'
import { dashboardData } from '@/lib/chart-data'

export default function HomePage() {
  return <DashboardShell dashboard={dashboardData} />
}
