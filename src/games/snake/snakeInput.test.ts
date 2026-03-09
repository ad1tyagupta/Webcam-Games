import { describe, expect, it } from 'vitest'
import type { HandFrame } from '../../types/arcade'
import { createEmptyHandFrame } from '../../tracking/handMath'
import { createSnakeGestureInterpreter } from './snakeInput'

function makeHandFrame(
  vector: { x: number; y: number },
  timestampMs: number,
  status: HandFrame['status'] = 'ready',
): HandFrame {
  const frame = createEmptyHandFrame(status, timestampMs)
  frame.source = 'debug'
  frame.confidence = 1
  frame.derived.pointerVector = vector
  return frame
}

describe('snakeInput', () => {
  it('requires two consecutive matching frames before emitting a direction', () => {
    const interpreter = createSnakeGestureInterpreter()

    expect(interpreter.next(makeHandFrame({ x: 1, y: 0 }, 0), 'none')).toBe('none')
    expect(interpreter.next(makeHandFrame({ x: 1, y: 0 }, 20), 'none')).toBe('right')
  })

  it('respects the gesture cooldown', () => {
    const interpreter = createSnakeGestureInterpreter()
    interpreter.next(makeHandFrame({ x: 1, y: 0 }, 0), 'none')
    interpreter.next(makeHandFrame({ x: 1, y: 0 }, 20), 'none')
    expect(interpreter.next(makeHandFrame({ x: 1, y: 0 }, 80), 'none')).toBe('none')
    expect(interpreter.next(makeHandFrame({ x: 1, y: 0 }, 220), 'none')).toBe('right')
  })

  it('lets keyboard input win immediately', () => {
    const interpreter = createSnakeGestureInterpreter()
    expect(interpreter.next(makeHandFrame({ x: 0, y: -1 }, 0), 'left')).toBe('left')
  })

  it('supports a more sensitive dead zone when configured', () => {
    const interpreter = createSnakeGestureInterpreter({
      confirmationFrames: 1,
      cooldownMs: 0,
      deadZone: 0.08,
    })

    expect(interpreter.next(makeHandFrame({ x: 0.1, y: 0.02 }, 0), 'none')).toBe('right')
  })
})
