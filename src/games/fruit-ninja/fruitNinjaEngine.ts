import type { GameInput, TrackingStatus, Vector2 } from '../../types/arcade'

export type FruitNinjaMode = 'title' | 'playing' | 'gameover'

export interface FruitEntity {
  id: number
  kind: 'fruit' | 'bomb'
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
}

export interface FruitNinjaState {
  mode: FruitNinjaMode
  score: number
  misses: number
  fruits: FruitEntity[]
  trackingStatus: TrackingStatus
  lastPointer: Vector2 | null
}

interface FruitNinjaEngineOptions {
  rng?: () => number
  width?: number
  height?: number
}

const DEFAULT_WIDTH = 720
const DEFAULT_HEIGHT = 540
const GRAVITY = 980

export function createFruitNinjaEngine(options: FruitNinjaEngineOptions = {}) {
  const rng = options.rng ?? Math.random
  const width = options.width ?? DEFAULT_WIDTH
  const height = options.height ?? DEFAULT_HEIGHT

  let nextId = 1
  let spawnTimerMs = 0
  let state: FruitNinjaState = {
    mode: 'title',
    score: 0,
    misses: 0,
    fruits: [],
    trackingStatus: 'idle',
    lastPointer: null,
  }

  const reset = () => {
    nextId = 1
    spawnTimerMs = 0
    state = {
      ...state,
      mode: 'title',
      score: 0,
      misses: 0,
      fruits: [],
      trackingStatus: 'idle',
      lastPointer: null,
    }
  }

  const start = () => {
    if (state.mode === 'gameover') {
      reset()
    }
    state.mode = 'playing'
  }

  const spawnFruit = () => {
    const isBomb = nextId % 6 === 0
    state.fruits.push({
      id: nextId,
      kind: isBomb ? 'bomb' : 'fruit',
      x: 90 + rng() * (width - 180),
      y: height + 48,
      vx: -120 + rng() * 240,
      vy: -(620 + rng() * 180),
      radius: isBomb ? 22 : 28 + rng() * 10,
      color: isBomb
        ? '#1c2238'
        : ['#ff8a4c', '#ff5f7a', '#5cd5ab', '#f0c64f'][Math.floor(rng() * 4)],
    })
    nextId += 1
  }

  const update = (dtMs: number, input: GameInput) => {
    state.trackingStatus = input.trackingStatus
    state.lastPointer = input.pointer

    if (state.mode !== 'playing') {
      return
    }

    spawnTimerMs += dtMs
    while (spawnTimerMs >= 650) {
      spawnTimerMs -= 650
      spawnFruit()
    }

    const dt = dtMs / 1000
    const swipeActive = input.pointer !== null && input.swipeSpeed > 0.8
    let misses = 0

    state.fruits = state.fruits.filter((fruit) => {
      fruit.vy += GRAVITY * dt
      fruit.x += fruit.vx * dt
      fruit.y += fruit.vy * dt

      if (swipeActive && input.pointer) {
        const dx = input.pointer.x - fruit.x
        const dy = input.pointer.y - fruit.y
        if (Math.hypot(dx, dy) <= fruit.radius + 34) {
          if (fruit.kind === 'bomb') {
            state.mode = 'gameover'
          } else {
            state.score += 1
          }
          return false
        }
      }

      if (fruit.y - fruit.radius > height + 10) {
        if (fruit.kind === 'fruit') {
          misses += 1
        }
        return false
      }

      return true
    })

    if (misses > 0) {
      state.misses += misses
      if (state.misses >= 3) {
        state.mode = 'gameover'
      }
    }
  }

  return {
    start,
    reset,
    update,
    getState: () => state,
    debugAddFruit: (fruit: FruitEntity) => {
      state.fruits.push(fruit)
    },
  }
}
