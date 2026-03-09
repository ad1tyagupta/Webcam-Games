import type { PinchState, TrackingStatus, Vector2 } from '../../types/arcade'

type ShotEventType = 'idle' | 'started' | 'dragging' | 'released' | 'cancelled'

export interface MiniGolfGestureInput {
  dtMs: number
  rawPinchState: PinchState
  trackingStatus: TrackingStatus
  pointer: Vector2
  ball: Vector2
  enabled: boolean
}

export interface MiniGolfGestureEvent {
  type: ShotEventType
  point: Vector2 | null
  stablePinchState: PinchState
  active: boolean
}

interface MiniGolfGestureOptions {
  debounceMs?: number
  startRadius?: number
}

function distance(a: Vector2, b: Vector2) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function createMiniGolfGestureController(options: MiniGolfGestureOptions = {}) {
  const debounceMs = options.debounceMs ?? 70
  const startRadius = options.startRadius ?? 88
  let stablePinchState: PinchState = 'open'
  let candidatePinchState: PinchState = 'open'
  let candidateDurationMs = 0
  let active = false
  let lastActivePoint: Vector2 | null = null

  const reset = () => {
    stablePinchState = 'open'
    candidatePinchState = 'open'
    candidateDurationMs = 0
    active = false
    lastActivePoint = null
  }

  const update = (input: MiniGolfGestureInput): MiniGolfGestureEvent => {
    if (!input.enabled) {
      reset()
      return { type: 'idle', point: null, stablePinchState, active }
    }

    if (input.trackingStatus !== 'ready') {
      const shouldCancel = active
      reset()
      return {
        type: shouldCancel ? 'cancelled' : 'idle',
        point: shouldCancel ? lastActivePoint : null,
        stablePinchState,
        active,
      }
    }

    if (input.rawPinchState !== stablePinchState) {
      if (candidatePinchState !== input.rawPinchState) {
        candidatePinchState = input.rawPinchState
        candidateDurationMs = input.dtMs
      } else {
        candidateDurationMs += input.dtMs
      }

      if (candidateDurationMs >= debounceMs) {
        stablePinchState = input.rawPinchState
        candidateDurationMs = 0
      }
    } else {
      candidatePinchState = input.rawPinchState
      candidateDurationMs = 0
    }

    if (!active && stablePinchState === 'pinched' && distance(input.pointer, input.ball) <= startRadius) {
      active = true
      lastActivePoint = { ...input.pointer }
      return { type: 'started', point: lastActivePoint, stablePinchState, active }
    }

    if (active && stablePinchState === 'pinched') {
      if (input.rawPinchState === 'pinched') {
        lastActivePoint = { ...input.pointer }
      }
      return { type: 'dragging', point: lastActivePoint, stablePinchState, active }
    }

    if (active && stablePinchState === 'open') {
      const releasedPoint = lastActivePoint ? { ...lastActivePoint } : null
      active = false
      lastActivePoint = null
      return { type: 'released', point: releasedPoint, stablePinchState, active }
    }

    return { type: 'idle', point: null, stablePinchState, active }
  }

  return {
    reset,
    update,
  }
}
