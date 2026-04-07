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
