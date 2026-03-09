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
  it('slices fruit when a fast slash path crosses it', () => {
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
      fruitType: 'apple',
    })

    engine.update(
      16,
      {
        ...makeInput({
          pointer: { x: 440, y: 260 },
          swipeSpeed: 1.6,
        }),
        slashActive: true,
        slashPath: [
          { x: 300, y: 260 },
          { x: 360, y: 260 },
          { x: 440, y: 260 },
        ],
      } as GameInput,
    )

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
      fruitType: 'bomb',
    })

    engine.update(16, makeInput())

    expect(engine.getState().mode).toBe('gameover')
  })

  it('pauses the round and freezes fruit motion', () => {
    const engine = createFruitNinjaEngine()
    engine.start()
    engine.debugAddFruit({
      id: 3,
      kind: 'fruit',
      x: 300,
      y: 320,
      vx: 40,
      vy: -240,
      radius: 26,
      color: '#f0c64f',
      fruitType: 'lemon',
    })

    ;(engine as typeof engine & { pauseToggle?: () => void }).pauseToggle?.()
    engine.update(200, makeInput({ pointer: null, swipeSpeed: 0 }))

    const [fruit] = engine.getState().fruits
    expect(engine.getState().mode).toBe('paused')
    expect(fruit.x).toBe(300)
    expect(fruit.y).toBe(320)
  })

  it('allows six missed fruit and ends on the seventh miss', () => {
    const engine = createFruitNinjaEngine()
    engine.start()

    for (let miss = 0; miss < 6; miss += 1) {
      engine.debugAddFruit({
        id: 10 + miss,
        kind: 'fruit',
        x: 140 + miss * 20,
        y: 600,
        vx: 0,
        vy: 80,
        radius: 24,
        color: '#5cd5ab',
        fruitType: 'kiwi',
      })
      engine.update(16, makeInput({ pointer: null, swipeSpeed: 0 }))
    }

    expect(engine.getState().misses).toBe(6)
    expect(engine.getState().mode).toBe('playing')

    engine.debugAddFruit({
      id: 99,
      kind: 'fruit',
      x: 320,
      y: 610,
      vx: 0,
      vy: 80,
      radius: 24,
      color: '#ff5f7a',
      fruitType: 'strawberry',
    })
    engine.update(16, makeInput({ pointer: null, swipeSpeed: 0 }))

    expect(engine.getState().misses).toBe(7)
    expect(engine.getState().mode).toBe('gameover')
  })
})
