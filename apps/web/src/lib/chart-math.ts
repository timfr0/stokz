export function buildChartFrame(history: number[], forecast: number[]) {
  const values = [...history, ...forecast]
  if (values.length === 0) {
    return {
      max: 0,
      min: 0,
      range: 1,
      points: [] as { x: number; y: number; value: number }[],
      labels: ['0.00', '0.00', '0.00'],
    }
  }

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
