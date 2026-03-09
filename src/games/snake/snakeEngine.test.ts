import { describe, expect, it } from 'vitest'
import type { GameInput } from '../../types/arcade'
import { createSnakeEngine, createFood, isOppositeDirection } from './snakeEngine'

function makeInput(directionIntent: GameInput['directionIntent']): GameInput {
  return {
    directionIntent,
    pointer: null,
    swipeSpeed: 0,
    pinchState: 'open',
    trackingStatus: 'ready',
  }
}

describe('snakeEngine', () => {
  it('moves the snake forward on each tick', () => {
    const engine = createSnakeEngine({ rng: () => 0.2 })
    engine.start()
    engine.update(150, makeInput('none'))

    const state = engine.getState()
    expect(state.snake[0]).toEqual({ x: 10, y: 9 })
    expect(state.moveCount).toBe(1)
  })

  it('rejects direct reverse turns', () => {
    const engine = createSnakeEngine({ rng: () => 0.2 })
    engine.start()
    engine.update(150, makeInput('left'))

    const state = engine.getState()
    expect(state.direction).toBe('right')
  })

  it('ends the game when the snake hits the wall', () => {
    const engine = createSnakeEngine({ boardCols: 4, boardRows: 4, rng: () => 0.2 })
    engine.start()
    engine.update(150, makeInput('none'))
    engine.update(150, makeInput('none'))

    expect(engine.getState().mode).toBe('gameover')
  })

  it('spawns food outside the snake body', () => {
    const food = createFood(
      3,
      3,
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
      ],
      () => 0,
    )

    expect(food).toEqual({ x: 1, y: 1 })
  })

  it('correctly identifies opposite directions', () => {
    expect(isOppositeDirection('up', 'down')).toBe(true)
    expect(isOppositeDirection('left', 'right')).toBe(true)
    expect(isOppositeDirection('left', 'up')).toBe(false)
  })
})
