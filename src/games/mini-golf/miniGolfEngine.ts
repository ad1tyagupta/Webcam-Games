import type { GameInput, TrackingStatus, Vector2 } from '../../types/arcade'
import type { MiniGolfGestureEvent } from './miniGolfGesture'

export type MiniGolfMode = 'aim' | 'pinched' | 'dragging' | 'rolling' | 'win'

export interface MiniGolfInput extends GameInput {
  shotEvent?: MiniGolfGestureEvent
}

export interface MiniGolfState {
  mode: MiniGolfMode
  ball: Vector2
  velocity: Vector2
  hole: Vector2
  charge: number
  strokes: number
  trackingStatus: TrackingStatus
  aimPoint: Vector2
  dragPoint: Vector2 | null
}

const WIDTH = 720
const HEIGHT = 540
const BALL_RADIUS = 16
const HOLE_RADIUS = 24
const MIN_PULL_DISTANCE = 28
const MAX_PULL_DISTANCE = 176
const MIN_SHOT_SPEED = 180
const MAX_SHOT_SPEED = 920
const WALLS = [
  { x: 210, y: 250, width: 170, height: 24 },
  { x: 430, y: 160, width: 24, height: 160 },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function createInitialState(): MiniGolfState {
  return {
    mode: 'aim',
    ball: { x: 110, y: 420 },
    velocity: { x: 0, y: 0 },
    hole: { x: 600, y: 140 },
    charge: 0,
    strokes: 0,
    trackingStatus: 'idle',
    aimPoint: { x: 220, y: 360 },
    dragPoint: null,
  }
}

export function createMiniGolfEngine() {
  let state: MiniGolfState = createInitialState()

  const reset = () => {
    state = createInitialState()
  }

  const applyShotPreview = (point: Vector2 | null) => {
    state.dragPoint = point ? { ...point } : null
    if (point) {
      state.aimPoint = { ...point }
    }

    if (!point) {
      state.charge = 0
      return { dx: 0, dy: 0, distance: 0 }
    }

    const dx = point.x - state.ball.x
    const dy = point.y - state.ball.y
    const distance = Math.hypot(dx, dy)
    state.charge = clamp((distance - MIN_PULL_DISTANCE) / (MAX_PULL_DISTANCE - MIN_PULL_DISTANCE), 0, 1)
    return { dx, dy, distance }
  }

  const handleShotEvent = (shotEvent: MiniGolfGestureEvent) => {
    if (shotEvent.type === 'idle') {
      return
    }

    if (shotEvent.type === 'cancelled') {
      state.mode = 'aim'
      state.charge = 0
      state.dragPoint = null
      return
    }

    if (shotEvent.type === 'started' || shotEvent.type === 'dragging') {
      const preview = applyShotPreview(shotEvent.point)
      state.mode = preview.distance >= MIN_PULL_DISTANCE ? 'dragging' : 'pinched'
      return
    }

    const preview = applyShotPreview(shotEvent.point)
    if (preview.distance < MIN_PULL_DISTANCE) {
      state.mode = 'aim'
      state.charge = 0
      state.dragPoint = null
      return
    }

    const speed = MIN_SHOT_SPEED + state.charge * (MAX_SHOT_SPEED - MIN_SHOT_SPEED)
    state.velocity = {
      x: (-preview.dx / preview.distance) * speed,
      y: (-preview.dy / preview.distance) * speed,
    }
    state.charge = 0
    state.dragPoint = null
    state.mode = 'rolling'
    state.strokes += 1
  }

  const update = (dtMs: number, input: MiniGolfInput) => {
    const dt = dtMs / 1000
    state.trackingStatus = input.trackingStatus
    if (input.pointer) {
      state.aimPoint = input.pointer
    }

    if (state.mode === 'aim' || state.mode === 'pinched' || state.mode === 'dragging') {
      if (input.shotEvent) {
        handleShotEvent(input.shotEvent)
      }
      return
    }

    state.ball.x += state.velocity.x * dt
    state.ball.y += state.velocity.y * dt
    state.velocity.x *= 0.986
    state.velocity.y *= 0.986

    if (state.ball.x - BALL_RADIUS <= 30 || state.ball.x + BALL_RADIUS >= WIDTH - 30) {
      state.velocity.x *= -1
      state.ball.x = Math.min(Math.max(state.ball.x, 30 + BALL_RADIUS), WIDTH - 30 - BALL_RADIUS)
    }
    if (state.ball.y - BALL_RADIUS <= 30 || state.ball.y + BALL_RADIUS >= HEIGHT - 30) {
      state.velocity.y *= -1
      state.ball.y = Math.min(Math.max(state.ball.y, 30 + BALL_RADIUS), HEIGHT - 30 - BALL_RADIUS)
    }

    for (const wall of WALLS) {
      const closestX = Math.max(wall.x, Math.min(state.ball.x, wall.x + wall.width))
      const closestY = Math.max(wall.y, Math.min(state.ball.y, wall.y + wall.height))
      const dx = state.ball.x - closestX
      const dy = state.ball.y - closestY
      if (dx * dx + dy * dy < BALL_RADIUS * BALL_RADIUS) {
        if (Math.abs(dx) > Math.abs(dy)) {
          state.velocity.x *= -1
          state.ball.x = dx > 0 ? wall.x + wall.width + BALL_RADIUS : wall.x - BALL_RADIUS
        } else {
          state.velocity.y *= -1
          state.ball.y = dy > 0 ? wall.y + wall.height + BALL_RADIUS : wall.y - BALL_RADIUS
        }
      }
    }

    const holeDx = state.ball.x - state.hole.x
    const holeDy = state.ball.y - state.hole.y
    if (Math.hypot(holeDx, holeDy) < HOLE_RADIUS) {
      state.mode = 'win'
      state.velocity = { x: 0, y: 0 }
      state.dragPoint = null
      return
    }

    if (Math.hypot(state.velocity.x, state.velocity.y) < 18) {
      state.velocity = { x: 0, y: 0 }
      state.mode = 'aim'
      state.dragPoint = null
    }
  }

  return {
    reset,
    update,
    getState: () => state,
    getWalls: () => WALLS,
  }
}
