import type { GameInput, TrackingStatus, Vector2 } from '../../types/arcade'

export type MiniGolfMode = 'aim' | 'charging' | 'rolling' | 'win'

export interface MiniGolfState {
  mode: MiniGolfMode
  ball: Vector2
  velocity: Vector2
  hole: Vector2
  charge: number
  strokes: number
  trackingStatus: TrackingStatus
  aimPoint: Vector2
}

const WIDTH = 720
const HEIGHT = 540
const BALL_RADIUS = 16
const HOLE_RADIUS = 24
const WALLS = [
  { x: 210, y: 250, width: 170, height: 24 },
  { x: 430, y: 160, width: 24, height: 160 },
]

export function createMiniGolfEngine() {
  let state: MiniGolfState = {
    mode: 'aim',
    ball: { x: 110, y: 420 },
    velocity: { x: 0, y: 0 },
    hole: { x: 600, y: 140 },
    charge: 0,
    strokes: 0,
    trackingStatus: 'idle',
    aimPoint: { x: 220, y: 360 },
  }

  const reset = () => {
    state = {
      ...state,
      mode: 'aim',
      ball: { x: 110, y: 420 },
      velocity: { x: 0, y: 0 },
      charge: 0,
      strokes: 0,
      trackingStatus: 'idle',
      aimPoint: { x: 220, y: 360 },
    }
  }

  const update = (dtMs: number, input: GameInput) => {
    const dt = dtMs / 1000
    state.trackingStatus = input.trackingStatus
    if (input.pointer) {
      state.aimPoint = input.pointer
    }

    if (state.mode === 'aim' || state.mode === 'charging') {
      if (input.pinchState === 'pinched') {
        state.mode = 'charging'
        state.charge = Math.min(1, state.charge + dt / 1)
      } else if (state.mode === 'charging') {
        const dx = state.aimPoint.x - state.ball.x
        const dy = state.aimPoint.y - state.ball.y
        const magnitude = Math.max(1, Math.hypot(dx, dy))
        state.velocity = {
          x: (dx / magnitude) * (180 + state.charge * 680),
          y: (dy / magnitude) * (180 + state.charge * 680),
        }
        state.charge = 0
        state.mode = 'rolling'
        state.strokes += 1
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
      return
    }

    if (Math.hypot(state.velocity.x, state.velocity.y) < 18) {
      state.velocity = { x: 0, y: 0 }
      state.mode = 'aim'
    }
  }

  return {
    reset,
    update,
    getState: () => state,
    getWalls: () => WALLS,
  }
}
