import type { DirectionIntent, GameInput, HandFrame, PinchState } from '../../types/arcade'
import { directionFromVector, pinchStateFromDistance } from '../../tracking/handMath'

interface SnakeGestureInterpreterOptions {
  confirmationFrames?: number
  cooldownMs?: number
  deadZone?: number
}

export function createSnakeGestureInterpreter(options: SnakeGestureInterpreterOptions = {}) {
  const confirmationFrames = options.confirmationFrames ?? 2
  const cooldownMs = options.cooldownMs ?? 150
  const deadZone = options.deadZone ?? 0.18
  let candidate: DirectionIntent = 'none'
  let streak = 0
  let lastCommitTimestamp = -Infinity

  return {
    next(handFrame: HandFrame, keyboardDirection: DirectionIntent): DirectionIntent {
      if (keyboardDirection !== 'none') {
        lastCommitTimestamp = handFrame.timestampMs
        candidate = keyboardDirection
        streak = confirmationFrames
        return keyboardDirection
      }

      if (handFrame.status !== 'ready') {
        candidate = 'none'
        streak = 0
        return 'none'
      }

      const bucket = directionFromVector(handFrame.derived.pointerVector, deadZone)
      if (bucket === 'none') {
        candidate = 'none'
        streak = 0
        return 'none'
      }

      if (candidate === bucket) {
        streak += 1
      } else {
        candidate = bucket
        streak = 1
      }

      if (streak >= confirmationFrames && handFrame.timestampMs - lastCommitTimestamp >= cooldownMs) {
        lastCommitTimestamp = handFrame.timestampMs
        return bucket
      }

      return 'none'
    },
    reset() {
      candidate = 'none'
      streak = 0
      lastCommitTimestamp = -Infinity
    },
  }
}

export function createSnakeGameInput(handFrame: HandFrame, directionIntent: DirectionIntent): GameInput {
  const pinchState: PinchState = pinchStateFromDistance(handFrame.derived.pinchDistance)
  return {
    directionIntent,
    pointer: handFrame.status === 'ready' ? handFrame.derived.indexTip : null,
    swipeSpeed: Math.hypot(handFrame.derived.swipeVelocity.x, handFrame.derived.swipeVelocity.y),
    pinchState,
    trackingStatus: handFrame.status,
  }
}
