import { describe, expect, it } from 'vitest'
import type { GameInput } from '../../types/arcade'
import { createFruitNinjaEngine } from './fruitNinjaEngine'

function makeInput(overrides: Partial<GameInput> = {}): GameInput {
  return {
    directionIntent: 'none',
    pointer: { x: 360, y: 260 },
    swipeSpeed: 1.2,
    pinchState: 'open',
    trackingStatus: 'ready',
    ...overrides,
  }
}

describe('fruitNinjaEngine', () => {
  it('slices fruit when a fast pointer passes through it', () => {
    const engine = createFruitNinjaEngine()
    engine.start()
    engine.debugAddFruit({
      id: 1,
      kind: 'fruit',
      x: 360,
      y: 260,
      vx: 0,
      vy: 0,
      radius: 28,
      color: '#ff8a4c',
    })

    engine.update(16, makeInput())

    expect(engine.getState().score).toBe(1)
    expect(engine.getState().fruits).toHaveLength(0)
  })

  it('ends the round when a bomb is hit', () => {
    const engine = createFruitNinjaEngine()
    engine.start()
    engine.debugAddFruit({
      id: 2,
      kind: 'bomb',
      x: 360,
      y: 260,
      vx: 0,
      vy: 0,
      radius: 22,
      color: '#1c2238',
    })

    engine.update(16, makeInput())

    expect(engine.getState().mode).toBe('gameover')
  })
})
