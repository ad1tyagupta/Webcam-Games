import type { PinchState, Vector2 } from '../../types/arcade'

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function toCanvasPoint(point: Vector2, width: number, height: number): Vector2 {
  return {
    x: clamp(point.x, 0, 1) * width,
    y: clamp(point.y, 0, 1) * height,
  }
}

export function toNormalizedPoint(point: Vector2, width: number, height: number): Vector2 {
  return {
    x: clamp(point.x / width, 0, 1),
    y: clamp(point.y / height, 0, 1),
  }
}

export function amplifyNormalizedPoint(
  point: Vector2,
  gain: number | Vector2,
  anchor: Vector2 = { x: 0.5, y: 0.5 },
): Vector2 {
  const resolvedGain = typeof gain === 'number' ? { x: gain, y: gain } : gain

  return {
    x: clamp(anchor.x + ((point.x - anchor.x) * resolvedGain.x), 0, 1),
    y: clamp(anchor.y + ((point.y - anchor.y) * resolvedGain.y), 0, 1),
  }
}

export function movePointer(
  point: Vector2,
  pressedKeys: Set<string>,
  dtMs: number,
  width: number,
  height: number,
  speedPxPerSecond = 320,
) {
  const horizontal = (pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD') ? 1 : 0) -
    (pressedKeys.has('ArrowLeft') || pressedKeys.has('KeyA') ? 1 : 0)
  const vertical = (pressedKeys.has('ArrowDown') || pressedKeys.has('KeyS') ? 1 : 0) -
    (pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW') ? 1 : 0)

  return {
    x: clamp(point.x + (horizontal * speedPxPerSecond * dtMs) / 1000, 40, width - 40),
    y: clamp(point.y + (vertical * speedPxPerSecond * dtMs) / 1000, 40, height - 40),
  }
}

export function pinchStateFromKeyboard(pressedKeys: Set<string>): PinchState {
  return pressedKeys.has('Space') ? 'pinched' : 'open'
}
