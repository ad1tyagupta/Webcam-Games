import type { DirectionIntent, HandDerivedData, HandFrame, LandmarkPoint, Vector2 } from '../types/arcade'

const EMPTY_VECTOR: Vector2 = { x: 0, y: 0 }

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function lerp(from: number, to: number, alpha: number) {
  return from + ((to - from) * alpha)
}

function lerpPoint(from: LandmarkPoint, to: LandmarkPoint, alpha: number): LandmarkPoint {
  return {
    x: lerp(from.x, to.x, alpha),
    y: lerp(from.y, to.y, alpha),
    z: lerp(from.z, to.z, alpha),
  }
}

function mirrorX(point: Vector2): Vector2 {
  return {
    x: 1 - point.x,
    y: point.y,
  }
}

function averagePoints(points: LandmarkPoint[]): Vector2 {
  if (!points.length) {
    return { ...EMPTY_VECTOR }
  }

  const total = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  )

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  }
}

export function distance(a: Vector2, b: Vector2) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function normalize(vector: Vector2): Vector2 {
  const magnitude = Math.hypot(vector.x, vector.y)
  if (magnitude < 0.0001) {
    return { ...EMPTY_VECTOR }
  }

  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  }
}

export function computeHandDerivedData(
  landmarks: LandmarkPoint[],
  timestampMs: number,
  previousFrame?: HandFrame,
): HandDerivedData {
  if (landmarks.length < 13) {
    return {
      handCenter: { ...EMPTY_VECTOR },
      handSize: 0,
      thumbTip: { x: 0, y: 0, z: 0 },
      indexTip: { x: 0, y: 0, z: 0 },
      pinchCenter: { ...EMPTY_VECTOR },
      pointerVector: { ...EMPTY_VECTOR },
      pinchDistance: 0,
      swipeVelocity: { ...EMPTY_VECTOR },
    }
  }

  const wrist = landmarks[0]
  const rawThumbTip = landmarks[4]
  const rawIndexTip = landmarks[8]
  const rawMiddleTip = landmarks[12]
  const palmPoints = [wrist, landmarks[5], landmarks[9], landmarks[13], landmarks[17]].filter(Boolean)
  const handCenter = mirrorX(averagePoints(palmPoints))
  const handSize = Math.max(
    distance(wrist, rawMiddleTip),
    distance(landmarks[5], landmarks[17]),
    0.001,
  )
  const rawPointerVector = normalize({
    x: ((rawIndexTip.x + rawMiddleTip.x) / 2) - wrist.x,
    y: ((rawIndexTip.y + rawMiddleTip.y) / 2) - wrist.y,
  })
  const thumbTip = {
    ...rawThumbTip,
    x: 1 - rawThumbTip.x,
  }
  const pointerVector = {
    x: -rawPointerVector.x,
    y: rawPointerVector.y,
  }
  const indexTip = {
    ...rawIndexTip,
    x: 1 - rawIndexTip.x,
  }
  const smoothingAlpha = previousFrame
    ? 0.22 + (clamp01(distance(indexTip, previousFrame.derived.indexTip) / 0.12) * 0.56)
    : 1
  const smoothedThumbTip = previousFrame
    ? lerpPoint(previousFrame.derived.thumbTip, thumbTip, smoothingAlpha)
    : thumbTip
  const smoothedIndexTip = previousFrame
    ? lerpPoint(previousFrame.derived.indexTip, indexTip, smoothingAlpha)
    : indexTip
  const pinchCenter = {
    x: (smoothedThumbTip.x + smoothedIndexTip.x) / 2,
    y: (smoothedThumbTip.y + smoothedIndexTip.y) / 2,
  }
  const pinchDistance = clamp01(distance(rawThumbTip, rawIndexTip) / handSize)

  let swipeVelocity = { ...EMPTY_VECTOR }
  if (previousFrame && timestampMs > previousFrame.timestampMs) {
    const dt = (timestampMs - previousFrame.timestampMs) / 1000
    swipeVelocity = {
      x: (smoothedIndexTip.x - previousFrame.derived.indexTip.x) / dt,
      y: (smoothedIndexTip.y - previousFrame.derived.indexTip.y) / dt,
    }
  }

  return {
    handCenter,
    handSize,
    thumbTip: smoothedThumbTip,
    indexTip: smoothedIndexTip,
    pinchCenter,
    pointerVector,
    pinchDistance,
    swipeVelocity,
  }
}

export function directionFromVector(vector: Vector2, deadZone = 0.18): DirectionIntent {
  if (Math.abs(vector.x) < deadZone && Math.abs(vector.y) < deadZone) {
    return 'none'
  }

  if (Math.abs(vector.x) >= Math.abs(vector.y)) {
    return vector.x >= 0 ? 'right' : 'left'
  }

  return vector.y >= 0 ? 'down' : 'up'
}

export function isHandCentered(
  handFrame: HandFrame,
  bounds = { minX: 0.3, maxX: 0.7, minY: 0.22, maxY: 0.78 },
) {
  const { x, y } = handFrame.derived.handCenter
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY
}

export function pinchStateFromDistance(distanceValue: number) {
  if (!Number.isFinite(distanceValue) || distanceValue === 0) {
    return 'unknown' as const
  }

  return distanceValue < 0.34 ? 'pinched' : 'open'
}

export function coerceLandmarks(points: ArrayLike<{ x: number; y: number; z?: number }>) {
  return Array.from(points).map<LandmarkPoint>((point) => ({
    x: point.x,
    y: point.y,
    z: point.z ?? 0,
  }))
}

export function createEmptyHandFrame(status: HandFrame['status'], timestampMs = performance.now()): HandFrame {
  return {
    status,
    source: 'none',
    timestampMs,
    handedness: 'Unknown',
    confidence: 0,
    landmarks: [],
    derived: {
      handCenter: { ...EMPTY_VECTOR },
      handSize: 0,
      thumbTip: { x: 0, y: 0, z: 0 },
      indexTip: { x: 0, y: 0, z: 0 },
      pinchCenter: { ...EMPTY_VECTOR },
      pointerVector: { ...EMPTY_VECTOR },
      pinchDistance: 0,
      swipeVelocity: { ...EMPTY_VECTOR },
    },
  }
}
