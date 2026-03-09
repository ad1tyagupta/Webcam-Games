import type { DirectionIntent, HandFrame, LandmarkPoint } from '../types/arcade'
import { computeHandDerivedData, createEmptyHandFrame } from './handMath'

interface SyntheticOptions {
  direction: DirectionIntent
  pinched: boolean
  timestampMs?: number
}

function point(x: number, y: number): LandmarkPoint {
  return { x, y, z: 0 }
}

function buildNeutralHand() {
  return [
    point(0.5, 0.72),
    point(0.44, 0.67),
    point(0.4, 0.59),
    point(0.39, 0.51),
    point(0.41, 0.45),
    point(0.48, 0.58),
    point(0.47, 0.47),
    point(0.46, 0.37),
    point(0.45, 0.28),
    point(0.54, 0.58),
    point(0.54, 0.44),
    point(0.54, 0.33),
    point(0.54, 0.22),
    point(0.6, 0.61),
    point(0.61, 0.5),
    point(0.62, 0.41),
    point(0.63, 0.33),
    point(0.66, 0.65),
    point(0.69, 0.57),
    point(0.72, 0.5),
    point(0.74, 0.45),
  ]
}

export function createSyntheticHandFrame(
  options: SyntheticOptions,
  previousFrame?: HandFrame,
): HandFrame {
  const timestampMs = options.timestampMs ?? performance.now()
  const landmarks = buildNeutralHand()
  const indexTip = landmarks[8]
  const middleTip = landmarks[12]
  const thumbTip = landmarks[4]

  if (options.direction === 'up') {
    indexTip.y = 0.16
    middleTip.y = 0.16
  } else if (options.direction === 'down') {
    indexTip.y = 0.46
    middleTip.y = 0.46
  } else if (options.direction === 'left') {
    indexTip.x = 0.32
    middleTip.x = 0.38
  } else if (options.direction === 'right') {
    indexTip.x = 0.68
    middleTip.x = 0.62
  }

  if (options.pinched) {
    thumbTip.x = indexTip.x - 0.025
    thumbTip.y = indexTip.y + 0.02
  }

  const handFrame: HandFrame = {
    status: 'ready',
    source: 'debug',
    timestampMs,
    handedness: 'Right',
    confidence: 0.99,
    landmarks,
    derived: computeHandDerivedData(landmarks, timestampMs, previousFrame),
  }

  return handFrame
}

export function createDebugIdleFrame(timestampMs = performance.now()) {
  const handFrame = createSyntheticHandFrame(
    {
      direction: 'up',
      pinched: false,
      timestampMs,
    },
  )
  handFrame.derived.pointerVector = { x: 0, y: -1 }
  handFrame.derived.swipeVelocity = { x: 0, y: 0 }
  return handFrame
}

export function createLostDebugFrame(timestampMs = performance.now()) {
  const empty = createEmptyHandFrame('lost', timestampMs)
  empty.source = 'debug'
  return empty
}
