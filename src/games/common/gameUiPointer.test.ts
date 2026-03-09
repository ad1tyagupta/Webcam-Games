import { describe, expect, it } from 'vitest'
import { createGameUiPointerController } from './gameUiPointer'

describe('createGameUiPointerController', () => {
  it('fires one click when pinch closes over a hovered target', () => {
    const controller = createGameUiPointerController()

    const first = controller.update({
      pinchState: 'open',
      pointer: { x: 100, y: 80 },
      targets: [{ id: 'start', x: 60, y: 50, width: 120, height: 48 }],
    })
    const second = controller.update({
      pinchState: 'pinched',
      pointer: { x: 100, y: 80 },
      targets: [{ id: 'start', x: 60, y: 50, width: 120, height: 48 }],
    })
    const third = controller.update({
      pinchState: 'pinched',
      pointer: { x: 100, y: 80 },
      targets: [{ id: 'start', x: 60, y: 50, width: 120, height: 48 }],
    })

    expect(first.clickedTargetId).toBeNull()
    expect(second.clickedTargetId).toBe('start')
    expect(third.clickedTargetId).toBeNull()
    expect(second.hoveredTargetId).toBe('start')
  })
})
