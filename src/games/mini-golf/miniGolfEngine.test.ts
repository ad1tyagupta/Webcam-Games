import { describe, expect, it } from 'vitest'
import { createMiniGolfEngine, type MiniGolfInput } from './miniGolfEngine'

function makeInput(overrides: Partial<MiniGolfInput> = {}): MiniGolfInput {
  return {
    directionIntent: 'none',
    pointer: { x: 260, y: 320 },
    swipeSpeed: 0,
    pinchState: 'open',
    trackingStatus: 'ready',
    shotEvent: { type: 'idle', point: null, stablePinchState: 'open', active: false },
    ...overrides,
  }
}

describe('miniGolfEngine', () => {
  it('launches opposite the pull vector on release', () => {
    const engine = createMiniGolfEngine()

    engine.update(
      16,
      makeInput({
        shotEvent: { type: 'started', point: { x: 118, y: 422 }, stablePinchState: 'pinched', active: true },
      }),
    )
    engine.update(
      16,
      makeInput({
        shotEvent: { type: 'dragging', point: { x: 52, y: 438 }, stablePinchState: 'pinched', active: true },
      }),
    )
    engine.update(
      16,
      makeInput({
        shotEvent: { type: 'released', point: { x: 52, y: 438 }, stablePinchState: 'open', active: false },
      }),
    )

    const state = engine.getState()
    expect(state.mode).toBe('rolling')
    expect(state.strokes).toBe(1)
    expect(Math.hypot(state.velocity.x, state.velocity.y)).toBeGreaterThan(100)
    expect(state.velocity.x).toBeGreaterThan(0)
  })

  it('does not count a stroke for a tiny release', () => {
    const engine = createMiniGolfEngine()

    engine.update(
      16,
      makeInput({
        shotEvent: { type: 'started', point: { x: 116, y: 418 }, stablePinchState: 'pinched', active: true },
      }),
    )
    engine.update(
      16,
      makeInput({
        shotEvent: { type: 'released', point: { x: 116, y: 418 }, stablePinchState: 'open', active: false },
      }),
    )

    const state = engine.getState()
    expect(state.mode).toBe('aim')
    expect(state.strokes).toBe(0)
    expect(Math.hypot(state.velocity.x, state.velocity.y)).toBe(0)
  })

  it('cancels an active shot preview without firing on loss', () => {
    const engine = createMiniGolfEngine()

    engine.update(
      16,
      makeInput({
        shotEvent: { type: 'started', point: { x: 118, y: 422 }, stablePinchState: 'pinched', active: true },
      }),
    )
    engine.update(
      16,
      makeInput({
        shotEvent: { type: 'dragging', point: { x: 64, y: 440 }, stablePinchState: 'pinched', active: true },
      }),
    )
    engine.update(
      16,
      makeInput({
        trackingStatus: 'lost',
        shotEvent: { type: 'cancelled', point: null, stablePinchState: 'open', active: false },
      }),
    )

    const state = engine.getState()
    expect(state.mode).toBe('aim')
    expect(state.strokes).toBe(0)
    expect(state.charge).toBe(0)
    expect(Math.hypot(state.velocity.x, state.velocity.y)).toBe(0)
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
