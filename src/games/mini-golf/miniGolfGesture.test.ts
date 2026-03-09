import { describe, expect, it } from 'vitest'
import { createMiniGolfGestureController } from './miniGolfGesture'

const ball = { x: 100, y: 100 }

function makeInput(overrides: Partial<Parameters<ReturnType<typeof createMiniGolfGestureController>['update']>[0]> = {}) {
  return {
    dtMs: 20,
    rawPinchState: 'open' as const,
    trackingStatus: 'ready' as const,
    pointer: { x: 100, y: 100 },
    ball,
    enabled: true,
    ...overrides,
  }
}

describe('miniGolfGesture', () => {
  it('starts a shot only after a stable pinch near the ball', () => {
    const controller = createMiniGolfGestureController({ debounceMs: 60, startRadius: 72 })

    expect(controller.update(makeInput({ rawPinchState: 'pinched', pointer: { x: 220, y: 220 } })).type).toBe('idle')
    expect(controller.update(makeInput({ rawPinchState: 'pinched', pointer: { x: 220, y: 220 } })).type).toBe('idle')
    expect(controller.update(makeInput({ rawPinchState: 'pinched', pointer: { x: 118, y: 112 } })).type).toBe('started')
  })

  it('keeps dragging through jitter and releases from the last pinched point', () => {
    const controller = createMiniGolfGestureController({ debounceMs: 40, startRadius: 80 })

    controller.update(makeInput({ dtMs: 20, rawPinchState: 'pinched', pointer: { x: 110, y: 112 } }))
    controller.update(makeInput({ dtMs: 20, rawPinchState: 'pinched', pointer: { x: 110, y: 112 } }))

    expect(controller.update(makeInput({ rawPinchState: 'pinched', pointer: { x: 58, y: 144 } })).type).toBe('dragging')
    expect(controller.update(makeInput({ dtMs: 20, rawPinchState: 'open', pointer: { x: 62, y: 146 } })).type).toBe('dragging')

    const released = controller.update(makeInput({ dtMs: 20, rawPinchState: 'open', pointer: { x: 90, y: 120 } }))
    expect(released.type).toBe('released')
    expect(released.point).toEqual({ x: 58, y: 144 })
  })

  it('cancels the shot if tracking is lost while pinched', () => {
    const controller = createMiniGolfGestureController({ debounceMs: 40, startRadius: 80 })

    controller.update(makeInput({ dtMs: 20, rawPinchState: 'pinched', pointer: { x: 105, y: 108 } }))
    controller.update(makeInput({ dtMs: 20, rawPinchState: 'pinched', pointer: { x: 105, y: 108 } }))

    const cancelled = controller.update(
      makeInput({
        trackingStatus: 'lost',
        rawPinchState: 'unknown',
        pointer: { x: 70, y: 150 },
      }),
    )

    expect(cancelled.type).toBe('cancelled')
  })
})
