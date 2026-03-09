import { describe, expect, it } from 'vitest'
import { amplifyNormalizedPoint } from './input'

describe('amplifyNormalizedPoint', () => {
  it('amplifies small fingertip movement while preserving bounds', () => {
    const amplified = amplifyNormalizedPoint(
      { x: 0.54, y: 0.46 },
      { x: 1.8, y: 1.8 },
      { x: 0.5, y: 0.5 },
    )

    expect(amplified.x).toBeGreaterThan(0.54)
    expect(amplified.y).toBeLessThan(0.46)
    expect(amplified.x).toBeLessThanOrEqual(1)
    expect(amplified.y).toBeGreaterThanOrEqual(0)
  })
})
