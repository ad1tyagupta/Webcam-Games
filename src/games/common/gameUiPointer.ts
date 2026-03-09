import type { PinchState, Vector2 } from '../../types/arcade'

export interface GameUiPointerTarget {
  id: string
  x: number
  y: number
  width: number
  height: number
  disabled?: boolean
}

interface GameUiPointerSnapshot {
  pinchState: PinchState
  pointer: Vector2 | null
  targets: GameUiPointerTarget[]
}

interface GameUiPointerResult {
  clickedTargetId: string | null
  hoveredTargetId: string | null
}

function containsPoint(target: GameUiPointerTarget, point: Vector2) {
  return (
    !target.disabled &&
    point.x >= target.x &&
    point.x <= target.x + target.width &&
    point.y >= target.y &&
    point.y <= target.y + target.height
  )
}

export function createGameUiPointerController() {
  let previousPinchState: PinchState = 'open'

  return {
    update({ pinchState, pointer, targets }: GameUiPointerSnapshot): GameUiPointerResult {
      const hoveredTargetId = pointer ? targets.find((target) => containsPoint(target, pointer))?.id ?? null : null
      const clickedTargetId =
        hoveredTargetId && pinchState === 'pinched' && previousPinchState !== 'pinched' ? hoveredTargetId : null

      previousPinchState = pinchState

      return {
        clickedTargetId,
        hoveredTargetId,
      }
    },
    reset() {
      previousPinchState = 'open'
    },
  }
}
