import { describe, expect, it } from 'vitest'
import type { HandFrame } from '../types/arcade'
import { computeHandDerivedData, directionFromVector, pinchStateFromDistance } from './handMath'

const landmarks = [
  { x: 0.5, y: 0.75, z: 0 },
  { x: 0.45, y: 0.7, z: 0 },
  { x: 0.42, y: 0.62, z: 0 },
  { x: 0.4, y: 0.54, z: 0 },
  { x: 0.4, y: 0.45, z: 0 },
  { x: 0.48, y: 0.58, z: 0 },
  { x: 0.47, y: 0.48, z: 0 },
  { x: 0.46, y: 0.38, z: 0 },
  { x: 0.45, y: 0.28, z: 0 },
  { x: 0.54, y: 0.58, z: 0 },
  { x: 0.54, y: 0.46, z: 0 },
  { x: 0.54, y: 0.34, z: 0 },
  { x: 0.54, y: 0.22, z: 0 },
  { x: 0.6, y: 0.6, z: 0 },
  { x: 0.61, y: 0.5, z: 0 },
  { x: 0.62, y: 0.42, z: 0 },
  { x: 0.63, y: 0.34, z: 0 },
  { x: 0.66, y: 0.65, z: 0 },
  { x: 0.69, y: 0.58, z: 0 },
  { x: 0.72, y: 0.52, z: 0 },
  { x: 0.74, y: 0.46, z: 0 },
]

describe('handMath', () => {
  it('computes derived pointer and pinch data from landmarks', () => {
    const derived = computeHandDerivedData(landmarks, 100)

    expect(derived.handCenter.x).toBeLessThan(0.5)
    expect(derived.handSize).toBeGreaterThan(0.2)
    expect(derived.pointerVector.y).toBeLessThan(-0.7)
    expect(derived.indexTip).toEqual({ x: 0.55, y: 0.28, z: 0 })
    expect(derived.thumbTip).toEqual({ x: 0.6, y: 0.45, z: 0 })
    expect(derived.pinchCenter).toEqual({ x: 0.575, y: 0.365 })
  })

  it('smooths small fingertip jitter across frames', () => {
    const firstDerived = computeHandDerivedData(landmarks, 100)
    const nextLandmarks = landmarks.map((point) => ({ ...point }))
    nextLandmarks[8].x = 0.47

    const previousFrame: HandFrame = {
      status: 'ready',
      source: 'debug',
      timestampMs: 100,
      handedness: 'Right',
      confidence: 0.99,
      landmarks,
      derived: firstDerived,
    }

    const derived = computeHandDerivedData(nextLandmarks, 116, previousFrame)

    expect(derived.indexTip.x).toBeGreaterThan(0.53)
    expect(derived.indexTip.x).toBeLessThan(0.55)
    expect(Math.abs(derived.swipeVelocity.x)).toBeLessThan(0.9)
  })

  it('maps vectors to the dominant axis direction', () => {
    expect(directionFromVector({ x: 0.7, y: 0.1 })).toBe('right')
    expect(directionFromVector({ x: -0.2, y: -0.8 })).toBe('up')
    expect(directionFromVector({ x: 0.03, y: 0.04 })).toBe('none')
  })

  it('derives pinch state from normalized pinch distance', () => {
    expect(pinchStateFromDistance(0.2)).toBe('pinched')
    expect(pinchStateFromDistance(0.5)).toBe('open')
    expect(pinchStateFromDistance(0)).toBe('unknown')
  })
})
