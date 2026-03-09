import type { GameInput, TrackingStatus, Vector2 } from '../../types/arcade'

export type PoolMode = 'aim' | 'charging' | 'rolling' | 'win'

export interface PoolBall {
  id: number
  kind: 'cue' | 'target'
  color: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pocketed: boolean
}

export interface PoolState {
  mode: PoolMode
  balls: PoolBall[]
  charge: number
  trackingStatus: TrackingStatus
  aimPoint: Vector2
}

const WIDTH = 720
const HEIGHT = 540
const POCKETS = [
  { x: 40, y: 40 },
  { x: WIDTH / 2, y: 32 },
  { x: WIDTH - 40, y: 40 },
  { x: 40, y: HEIGHT - 40 },
  { x: WIDTH / 2, y: HEIGHT - 32 },
  { x: WIDTH - 40, y: HEIGHT - 40 },
]

function distance(a: Vector2, b: Vector2) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function createInitialBalls() {
  return [
    { id: 1, kind: 'cue', color: '#f8f8f2', x: 160, y: 270, vx: 0, vy: 0, radius: 16, pocketed: false },
    { id: 2, kind: 'target', color: '#f0c64f', x: 500, y: 240, vx: 0, vy: 0, radius: 16, pocketed: false },
    { id: 3, kind: 'target', color: '#ff6d5c', x: 532, y: 270, vx: 0, vy: 0, radius: 16, pocketed: false },
    { id: 4, kind: 'target', color: '#5ab8ff', x: 500, y: 300, vx: 0, vy: 0, radius: 16, pocketed: false },
  ] as PoolBall[]
}

export function createPoolEngine() {
  let state: PoolState = {
    mode: 'aim',
    balls: createInitialBalls(),
    charge: 0,
    trackingStatus: 'idle',
    aimPoint: { x: 500, y: 270 },
  }

  const reset = () => {
    state = {
      ...state,
      mode: 'aim',
      balls: createInitialBalls(),
      charge: 0,
      trackingStatus: 'idle',
      aimPoint: { x: 500, y: 270 },
    }
  }

  const cueBall = () => state.balls.find((ball) => ball.kind === 'cue' && !ball.pocketed) ?? state.balls[0]

  const anyMoving = () => state.balls.some((ball) => Math.hypot(ball.vx, ball.vy) > 6)

  const resolveCollisions = () => {
    for (let i = 0; i < state.balls.length; i += 1) {
      for (let j = i + 1; j < state.balls.length; j += 1) {
        const a = state.balls[i]
        const b = state.balls[j]
        if (a.pocketed || b.pocketed) {
          continue
        }
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy)
        const minDist = a.radius + b.radius
        if (dist === 0 || dist >= minDist) {
          continue
        }
        const nx = dx / dist
        const ny = dy / dist
        const overlap = (minDist - dist) / 2
        a.x -= nx * overlap
        a.y -= ny * overlap
        b.x += nx * overlap
        b.y += ny * overlap

        const aSpeed = a.vx * nx + a.vy * ny
        const bSpeed = b.vx * nx + b.vy * ny
        const impulse = bSpeed - aSpeed
        a.vx += impulse * nx
        a.vy += impulse * ny
        b.vx -= impulse * nx
        b.vy -= impulse * ny
      }
    }
  }

  const update = (dtMs: number, input: GameInput) => {
    const dt = dtMs / 1000
    state.trackingStatus = input.trackingStatus
    if (input.pointer) {
      state.aimPoint = input.pointer
    }

    const cue = cueBall()

    if (state.mode === 'aim' || state.mode === 'charging') {
      if (input.pinchState === 'pinched') {
        state.mode = 'charging'
        state.charge = Math.min(1, state.charge + dt / 0.9)
      } else if (state.mode === 'charging') {
        const dx = state.aimPoint.x - cue.x
        const dy = state.aimPoint.y - cue.y
        const magnitude = Math.max(1, Math.hypot(dx, dy))
        cue.vx = (dx / magnitude) * (260 + state.charge * 760)
        cue.vy = (dy / magnitude) * (260 + state.charge * 760)
        state.charge = 0
        state.mode = 'rolling'
      }
      return
    }

    for (const ball of state.balls) {
      if (ball.pocketed) {
        continue
      }

      ball.x += ball.vx * dt
      ball.y += ball.vy * dt
      ball.vx *= 0.988
      ball.vy *= 0.988

      if (ball.x - ball.radius <= 56 || ball.x + ball.radius >= WIDTH - 56) {
        ball.vx *= -1
        ball.x = Math.min(Math.max(ball.x, 56 + ball.radius), WIDTH - 56 - ball.radius)
      }
      if (ball.y - ball.radius <= 56 || ball.y + ball.radius >= HEIGHT - 56) {
        ball.vy *= -1
        ball.y = Math.min(Math.max(ball.y, 56 + ball.radius), HEIGHT - 56 - ball.radius)
      }

      for (const pocket of POCKETS) {
        if (distance(ball, pocket) < 24) {
          ball.pocketed = true
          ball.vx = 0
          ball.vy = 0
        }
      }
    }

    resolveCollisions()

    if (cue.pocketed) {
      cue.pocketed = false
      cue.x = 160
      cue.y = 270
      cue.vx = 0
      cue.vy = 0
    }

    if (!anyMoving()) {
      state.mode = state.balls.every((ball) => ball.kind === 'cue' || ball.pocketed) ? 'win' : 'aim'
    }
  }

  return {
    reset,
    update,
    getState: () => state,
  }
}
