import { describe, expect, it } from 'vitest'
import type { GameInput } from '../../types/arcade'
import { createMiniGolfEngine } from './miniGolfEngine'

function makeInput(overrides: Partial<GameInput> = {}): GameInput {
  return {
    directionIntent: 'none',
    pointer: { x: 260, y: 320 },
    swipeSpeed: 0,
    pinchState: 'open',
    trackingStatus: 'ready',
    ...overrides,
  }
}

describe('miniGolfEngine', () => {
  it('charges and launches the ball on release', () => {
    const engine = createMiniGolfEngine()

    engine.update(700, makeInput({ pinchState: 'pinched' }))
    engine.update(16, makeInput({ pinchState: 'open' }))

    const state = engine.getState()
    expect(state.mode).toBe('rolling')
    expect(state.strokes).toBe(1)
    expect(Math.hypot(state.velocity.x, state.velocity.y)).toBeGreaterThan(100)
  })

  it('wins when the ball reaches the hole', () => {
    const engine = createMiniGolfEngine()
    const state = engine.getState()
    state.mode = 'rolling'
    state.ball = { x: state.hole.x, y: state.hole.y }
    state.velocity = { x: 10, y: 0 }

    engine.update(16, makeInput())

    expect(engine.getState().mode).toBe('win')
  })
})
