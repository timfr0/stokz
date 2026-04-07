# Stokz Watchlist + Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Stokz homepage into a Stitch-aligned watchlist plus detailed analysis surface with chart-first mobile behavior, visible chart scales, shared ticker selection, and test-covered view logic.

**Architecture:** Keep the existing homepage route, but split the implementation into a small set of reusable display and view-model modules. Put derived board logic into testable utilities first, then rebuild the page around shared selected-ticker state and dedicated watchlist/analysis components that consume those utilities.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Vitest for utility-level TDD

---

## File structure

### Existing files to modify
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/package.json`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/app/page.tsx`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/app/globals.css`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/types.ts`

### New files to create
- `C:/Users/timfr/.openclaw/workspace/stokz/DESIGN.md`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/vitest.config.ts`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/dashboard-view.ts`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/chart-math.ts`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/dashboard-view.test.ts`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/chart-math.test.ts`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/dashboard-shell.tsx`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/watchlist-table.tsx`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/watchlist-signal-stack.tsx`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/analysis-panel.tsx`
- `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/ticker-chart.tsx`

### Responsibilities
- `DESIGN.md`: Locks the Stitch-derived design language so implementation stays consistent.
- `dashboard-view.ts`: Pure board-selection and trend/view-model helpers.
- `chart-math.ts`: Pure chart-range, axis-label, and history/forecast plotting helpers.
- `*.test.ts`: Utility-level TDD coverage for selection, trend, stat mapping, and chart labels.
- `ticker-chart.tsx`: Shared chart renderer with y-axis labels and distinct history/forecast treatment.
- `watchlist-table.tsx`: Desktop scan table.
- `watchlist-signal-stack.tsx`: Desktop priority chart stack plus mobile chart-first cards.
- `analysis-panel.tsx`: Selected-ticker detailed model analysis surface.
- `dashboard-shell.tsx`: Shared selected-ticker state, section composition, and responsive orchestration.
- `page.tsx`: Thin route wrapper around the dashboard shell and loaded artifact data.

### Task 1: Add design reference and test harness

**Files:**
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/DESIGN.md`
- Modify: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/package.json`
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/vitest.config.ts`

- [ ] **Step 1: Write the failing test command contract**

```text
Planned test command:
pnpm --filter web test

Expected before implementation:
- package script missing
- vitest not configured
```

- [ ] **Step 2: Run the missing test command to verify it fails**

Run:

```powershell
pnpm --filter web test
```

Expected:

```text
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL or Missing script: test
```

- [ ] **Step 3: Add the minimal test runner setup**

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/vitest.config.ts`

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

`C:/Users/timfr/.openclaw/workspace/stokz/DESIGN.md`

```md
# Stokz Design Reference

Source of truth: Google Stitch project `projects/3150647976352949774`

## Palette
- Background: `#f5f0e8`
- Primary: `#1a1a1a`
- Yellow accent: `#ffcc00`
- Red accent: `#e63b2e`
- Blue accent: `#0055ff`

## Typography
- Headlines/labels: Space Grotesk
- Body: Inter

## Surface rules
- Thick black borders
- Offset block shadows, not soft drop shadows
- Flat fills, minimal radius
- Strong hierarchy and dense content blocks

## Responsive rules
- Desktop: watchlist scan first, analysis second
- Mobile: chart-first cards, four stats always visible, analysis stacked vertically
```

- [ ] **Step 4: Install dependencies and run the empty test runner**

Run:

```powershell
pnpm --filter web add -D vitest
pnpm --filter web test
```

Expected:

```text
No test files found, exiting with code 1
```

- [ ] **Step 5: Commit**

```bash
git add DESIGN.md apps/web/package.json apps/web/vitest.config.ts
git commit -m "chore: add stokz design reference and test harness"
```

### Task 2: Add failing tests for board selection and trend logic

**Files:**
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/dashboard-view.test.ts`
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/dashboard-view.ts`
- Modify: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/types.ts`

- [ ] **Step 1: Write the failing tests**

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/dashboard-view.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type { TickerForecast } from '@/lib/types'
import {
  buildMobileStats,
  getDefaultSelectedTicker,
  getTrendState,
  getWatchlistPriorityForecasts,
} from '@/lib/dashboard-view'

function makeForecast(overrides: Partial<TickerForecast>): TickerForecast {
  return {
    ticker: 'AMD',
    asOfDate: '2026-04-07',
    targetDate: '2026-04-08',
    predictedReturn: 0.01,
    baselineReturn: 0.002,
    direction: 'bullish',
    confidenceLabel: 'high',
    modelName: 'timesfm',
    signalDirection: 'LONG',
    portfolioAction: 'BUY',
    setupLabel: 'Momentum continuation',
    convictionScore: 80,
    expectedMoveRange: [0.005, 0.018],
    trendBias: 'Uptrend',
    notes: 'Test note',
    currentClose: 100,
    targetClose: 102,
    entryPriceTarget: 99.4,
    currentPositionShares: 0,
    isActionable: true,
    chartSeries: null,
    horizonForecasts: [],
    ...overrides,
  }
}

describe('getDefaultSelectedTicker', () => {
  it('prefers the highest-conviction BUY', () => {
    const result = getDefaultSelectedTicker([
      makeForecast({ ticker: 'ANET', portfolioAction: 'HOLD', convictionScore: 92 }),
      makeForecast({ ticker: 'AMD', portfolioAction: 'BUY', convictionScore: 81 }),
      makeForecast({ ticker: 'AVGO', portfolioAction: 'BUY', convictionScore: 88 }),
    ])

    expect(result).toBe('AVGO')
  })

  it('falls back to the highest-conviction forecast when no BUY exists', () => {
    const result = getDefaultSelectedTicker([
      makeForecast({ ticker: 'ANET', portfolioAction: 'HOLD', convictionScore: 72 }),
      makeForecast({ ticker: 'AVGO', portfolioAction: 'SELL', convictionScore: 91 }),
    ])

    expect(result).toBe('AVGO')
  })
})

describe('getTrendState', () => {
  it('returns UP for meaningful positive forecasts', () => {
    expect(getTrendState(0.01)).toBe('UP')
  })

  it('returns DOWN for meaningful negative forecasts', () => {
    expect(getTrendState(-0.01)).toBe('DOWN')
  })

  it('returns STEADY for near-flat forecasts', () => {
    expect(getTrendState(0.003)).toBe('STEADY')
    expect(getTrendState(-0.003)).toBe('STEADY')
  })
})

describe('buildMobileStats', () => {
  it('always maps entry, target, hit rate, and expected move in that order', () => {
    const result = buildMobileStats(
      makeForecast({
        entryPriceTarget: 98.25,
        targetClose: 103.4,
        horizonForecasts: [
          {
            horizonDays: 1,
            predictedReturn: 0.012,
            targetClose: 103.4,
            confidenceBand: 'highest',
            expectedAccuracyNote: 'Strong',
            measuredHitRate: 0.86,
            measuredMae: 0.01,
          },
        ],
      }),
    )

    expect(result.map((item) => item.label)).toEqual(['Entry', 'Target', 'Hit Rate', 'Expected Move'])
    expect(result[0]?.value).toBe('$98.25')
    expect(result[1]?.value).toBe('$103.40')
    expect(result[2]?.value).toBe('86.0%')
    expect(result[3]?.value).toBe('+1.00%')
  })
})

describe('getWatchlistPriorityForecasts', () => {
  it('orders actionable higher-conviction names first', () => {
    const result = getWatchlistPriorityForecasts([
      makeForecast({ ticker: 'ANET', portfolioAction: 'HOLD', convictionScore: 92 }),
      makeForecast({ ticker: 'AMD', portfolioAction: 'BUY', convictionScore: 77 }),
      makeForecast({ ticker: 'AVGO', portfolioAction: 'BUY', convictionScore: 89 }),
    ])

    expect(result.map((item) => item.ticker)).toEqual(['AVGO', 'AMD', 'ANET'])
  })
})
```

- [ ] **Step 2: Run the test file to verify it fails**

Run:

```powershell
pnpm --filter web exec vitest run src/lib/dashboard-view.test.ts
```

Expected:

```text
FAIL
Cannot find module '@/lib/dashboard-view'
```

- [ ] **Step 3: Write the minimal implementation**

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/types.ts`

```ts
export type TrendState = 'UP' | 'STEADY' | 'DOWN'
```

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/dashboard-view.ts`

```ts
import type { TickerForecast, TrendState } from '@/lib/types'

const STEADY_THRESHOLD = 0.0035

export function getTrendState(predictedReturn: number): TrendState {
  if (predictedReturn > STEADY_THRESHOLD) return 'UP'
  if (predictedReturn < -STEADY_THRESHOLD) return 'DOWN'
  return 'STEADY'
}

export function getDefaultSelectedTicker(forecasts: TickerForecast[]) {
  const ranked = [...forecasts].sort((left, right) => {
    const leftActionable = left.portfolioAction === 'BUY' ? 1 : 0
    const rightActionable = right.portfolioAction === 'BUY' ? 1 : 0
    return rightActionable - leftActionable || right.convictionScore - left.convictionScore
  })

  return ranked[0]?.ticker ?? null
}

export function getWatchlistPriorityForecasts(forecasts: TickerForecast[]) {
  return [...forecasts].sort((left, right) => {
    const leftActionable = left.portfolioAction === 'BUY' ? 1 : 0
    const rightActionable = right.portfolioAction === 'BUY' ? 1 : 0
    return rightActionable - leftActionable || right.convictionScore - left.convictionScore
  })
}

export function buildMobileStats(forecast: TickerForecast) {
  const oneDayHitRate = forecast.horizonForecasts.find((item) => item.horizonDays === 1)?.measuredHitRate

  return [
    { label: 'Entry', value: `$${forecast.entryPriceTarget.toFixed(2)}` },
    { label: 'Target', value: `$${forecast.targetClose.toFixed(2)}` },
    { label: 'Hit Rate', value: oneDayHitRate == null ? 'Waiting for history' : `${(oneDayHitRate * 100).toFixed(1)}%` },
    { label: 'Expected Move', value: `${forecast.predictedReturn >= 0 ? '+' : ''}${(forecast.predictedReturn * 100).toFixed(2)}%` },
  ]
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```powershell
pnpm --filter web exec vitest run src/lib/dashboard-view.test.ts
```

Expected:

```text
PASS
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/types.ts apps/web/src/lib/dashboard-view.ts apps/web/src/lib/dashboard-view.test.ts
git commit -m "test: add dashboard view logic coverage"
```

### Task 3: Add failing tests for chart range and axis labels

**Files:**
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/chart-math.test.ts`
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/chart-math.ts`

- [ ] **Step 1: Write the failing tests**

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/chart-math.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { buildChartFrame } from '@/lib/chart-math'

describe('buildChartFrame', () => {
  it('builds max, mid, and min labels from combined history and forecast values', () => {
    const result = buildChartFrame([100, 102, 101], [103, 105])

    expect(result.labels).toEqual(['105.00', '102.50', '100.00'])
  })

  it('keeps a non-zero plotting range for flat series', () => {
    const result = buildChartFrame([100, 100], [100])

    expect(result.range).toBeGreaterThan(0)
    expect(result.points.length).toBe(3)
  })
})
```

- [ ] **Step 2: Run the test file to verify it fails**

Run:

```powershell
pnpm --filter web exec vitest run src/lib/chart-math.test.ts
```

Expected:

```text
FAIL
Cannot find module '@/lib/chart-math'
```

- [ ] **Step 3: Write the minimal implementation**

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/lib/chart-math.ts`

```ts
export function buildChartFrame(history: number[], forecast: number[]) {
  const values = [...history, ...forecast]
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return { x, y, value }
  })

  return {
    max,
    min,
    range,
    points,
    labels: [max.toFixed(2), ((max + min) / 2).toFixed(2), min.toFixed(2)],
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```powershell
pnpm --filter web exec vitest run src/lib/chart-math.test.ts
```

Expected:

```text
PASS
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/chart-math.ts apps/web/src/lib/chart-math.test.ts
git commit -m "test: add chart math coverage"
```

### Task 4: Build the shared chart and watchlist surfaces

**Files:**
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/ticker-chart.tsx`
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/watchlist-table.tsx`
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/watchlist-signal-stack.tsx`
- Modify: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/app/globals.css`

- [ ] **Step 1: Write the expected rendering contract in the plan**

```text
Required UI outcomes:
- desktop table shows Trend text instead of sparkline
- chart rows are full-width for priority names
- mobile signal cards show Entry, Target, Hit Rate, Expected Move
- charts show y-axis labels and distinct history/forecast segments
```

- [ ] **Step 2: Implement the minimal shared chart**

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/ticker-chart.tsx`

```tsx
import { buildChartFrame } from '@/lib/chart-math'
import type { ForecastChartSeries } from '@/lib/types'

export function TickerChart({ series }: { series: ForecastChartSeries | null }) {
  if (!series) {
    return <div className="stokz-empty-chart">Chart artifact not available yet.</div>
  }

  const history = series.historyPoints.map((point) => point.close)
  const forecast = series.forecastPoints.map((point) => point.close)
  const frame = buildChartFrame(history, forecast)
  const historyCount = history.length
  const historyPath = frame.points
    .slice(0, historyCount)
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
  const forecastPath = frame.points
    .slice(Math.max(historyCount - 1, 0))
    .map((point) => `${point.x},${point.y}`)
    .join(' ')

  return (
    <div className="stokz-chart-shell">
      <div className="stokz-chart-axis">
        {frame.labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <svg viewBox="0 0 100 100" className="stokz-chart-svg" fill="none" preserveAspectRatio="none">
        <polyline points={historyPath} stroke="#1a1a1a" strokeWidth="3" />
        <polyline points={forecastPath} stroke="#0055ff" strokeWidth="3" strokeDasharray="5 4" />
      </svg>
    </div>
  )
}
```

- [ ] **Step 3: Implement the desktop table and mobile/desktop signal stack**

Code should:
- consume `buildMobileStats`, `getTrendState`, and `getWatchlistPriorityForecasts`
- accept `selectedTicker` and `onSelectTicker`
- expose active-row styling and explicit trend chips

- [ ] **Step 4: Add the necessary global utility classes**

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/app/globals.css`

```css
.stokz-chart-shell { display:grid; grid-template-columns:42px minmax(0,1fr); gap:0.75rem; align-items:stretch; }
.stokz-chart-axis { display:flex; flex-direction:column; justify-content:space-between; font:700 0.625rem/1 'Space Grotesk', sans-serif; color:#4a4a4a; text-transform:uppercase; }
.stokz-chart-svg { width:100%; min-height:11rem; border:2px solid #1a1a1a; background:
  linear-gradient(to top, transparent 24%, rgba(26,26,26,0.12) 25%, transparent 26%, transparent 49%, rgba(26,26,26,0.12) 50%, transparent 51%, transparent 74%, rgba(26,26,26,0.12) 75%, transparent 76%),
  #f5f0e8; }
.stokz-empty-chart { border:2px solid #1a1a1a; background:#f5f0e8; padding:1rem; font-weight:600; }
```

- [ ] **Step 5: Run lint to catch component/type issues**

Run:

```powershell
pnpm --filter web lint
```

Expected:

```text
No ESLint errors
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ticker-chart.tsx apps/web/src/components/watchlist-table.tsx apps/web/src/components/watchlist-signal-stack.tsx apps/web/src/app/globals.css
git commit -m "feat: rebuild watchlist surfaces"
```

### Task 5: Build shared page state and detailed analysis panel

**Files:**
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/analysis-panel.tsx`
- Create: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/dashboard-shell.tsx`
- Modify: `C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/app/page.tsx`

- [ ] **Step 1: Implement the analysis panel contract**

Required contents:
- ticker selector rail or mobile chip row
- largest chart on the page
- key metric strip
- `1D`, `3D`, `5D` horizon blocks
- note, conviction, trend bias, and signal direction

- [ ] **Step 2: Implement shared selected-ticker state**

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/components/dashboard-shell.tsx`

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { getDefaultSelectedTicker } from '@/lib/dashboard-view'
import type { DashboardData } from '@/lib/types'

export function DashboardShell({ dashboard }: { dashboard: DashboardData }) {
  const forecasts = dashboard.forecasts
  const defaultTicker = useMemo(() => getDefaultSelectedTicker(forecasts), [forecasts])
  const [selectedTicker, setSelectedTicker] = useState(defaultTicker)

  useEffect(() => {
    if (!selectedTicker || !forecasts.some((item) => item.ticker === selectedTicker)) {
      setSelectedTicker(defaultTicker)
    }
  }, [defaultTicker, forecasts, selectedTicker])

  const selectedForecast = forecasts.find((item) => item.ticker === selectedTicker) ?? forecasts[0] ?? null

  if (!selectedForecast) return null

  return (
    <>
      {/* watchlist shell */}
      {/* analysis shell */}
    </>
  )
}
```

- [ ] **Step 3: Replace the route body with the shared shell**

`C:/Users/timfr/.openclaw/workspace/stokz/apps/web/src/app/page.tsx`

```tsx
import { DashboardShell } from '@/components/dashboard-shell'
import { dashboardData } from '@/lib/chart-data'

export default function HomePage() {
  return <DashboardShell dashboard={dashboardData} />
}
```

- [ ] **Step 4: Run lint and build**

Run:

```powershell
pnpm --filter web lint
pnpm --filter web build
```

Expected:

```text
Lint passes
Next.js production build passes
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/analysis-panel.tsx apps/web/src/components/dashboard-shell.tsx apps/web/src/app/page.tsx
git commit -m "feat: add stokz analysis surface"
```

### Task 6: Verify responsive behavior against the approved design

**Files:**
- Modify: none if verification passes

- [ ] **Step 1: Start the app locally**

Run:

```powershell
pnpm --filter web dev
```

Expected:

```text
Local server starts on a Next.js dev port
```

- [ ] **Step 2: Check desktop watchlist against Stitch**

Manual checks:
- section order matches approved design
- giant title/header rhythm feels Stitch-aligned
- desktop table scans quickly
- priority chart rows are full-width

- [ ] **Step 3: Check mobile watchlist**

Manual checks at `390px`:
- chart-first cards are the main pattern
- y-axis numbers are readable
- each card shows Entry, Target, Hit Rate, Expected Move
- trend labels show `UP`, `STEADY`, or `DOWN`

- [ ] **Step 4: Check detailed analysis section**

Manual checks:
- tapping or clicking a ticker updates the analysis panel
- analysis chart is the largest chart on the page
- `1D`, `3D`, and `5D` blocks render cleanly
- the section feels distinct from the watchlist, not duplicated

- [ ] **Step 5: Final verification**

Run:

```powershell
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web build
```

Expected:

```text
All tests pass
Lint passes
Build passes
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: implement stitch-aligned stokz dashboard"
```

## Self-review

### Spec coverage
- Mobile friendliness: covered by chart-first signal cards, mobile stat mapping, and analysis stacking.
- Full-width charts with scale numbers: covered by `ticker-chart.tsx` and `chart-math.ts`.
- Table/more trend data: covered by desktop table rewrite and mobile signal stack.
- Stitch fidelity: covered by `DESIGN.md`, watchlist rebuild, and analysis panel.
- Detailed analysis surface: covered by Task 5.
- Testing: covered by Tasks 1, 2, 3, and Task 6 verification.

### Placeholder scan
- No `TBD`, `TODO`, or deferred “write tests later” steps remain.

### Type consistency
- Shared derived logic lives in `dashboard-view.ts`.
- Shared chart logic lives in `chart-math.ts`.
- `TrendState` is introduced once in `types.ts` and used consistently in view logic and UI.
