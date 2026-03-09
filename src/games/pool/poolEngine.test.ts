import { describe, expect, it } from 'vitest'
import type { GameInput } from '../../types/arcade'
import { createPoolEngine } from './poolEngine'

function makeInput(overrides: Partial<GameInput> = {}): GameInput {
  return {
    directionIntent: 'none',
    pointer: { x: 520, y: 270 },
    swipeSpeed: 0,
    pinchState: 'open',
    trackingStatus: 'ready',
    ...overrides,
  }
}

describe('poolEngine', () => {
  it('fires the cue ball when the charge is released', () => {
    const engine = createPoolEngine()

    engine.update(500, makeInput({ pinchState: 'pinched' }))
    engine.update(16, makeInput({ pinchState: 'open' }))

    const cueBall = engine.getState().balls.find((ball) => ball.kind === 'cue')
    expect(engine.getState().mode).toBe('rolling')
    expect(Math.hypot(cueBall?.vx ?? 0, cueBall?.vy ?? 0)).toBeGreaterThan(100)
  })

  it('wins when all target balls are already pocketed', () => {
    const engine = createPoolEngine()
    const state = engine.getState()
    state.balls.forEach((ball) => {
      if (ball.kind === 'target') {
        ball.pocketed = true
      }
    })
    state.mode = 'rolling'

    engine.update(16, makeInput())

    expect(engine.getState().mode).toBe('win')
  })
})
