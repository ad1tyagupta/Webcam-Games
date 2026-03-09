import type { GameInput, TrackingStatus, Vector2 } from '../../types/arcade'

export type FruitNinjaMode = 'title' | 'playing' | 'paused' | 'gameover'

export type FruitType = 'apple' | 'banana' | 'kiwi' | 'lemon' | 'orange' | 'strawberry' | 'watermelon' | 'bomb'

export interface FruitEntity {
  id: number
  kind: 'fruit' | 'bomb'
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  fruitType: FruitType
}

export interface FruitNinjaState {
  mode: FruitNinjaMode
  score: number
  misses: number
  livesRemaining: number
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
const GRAVITY = 720
const MAX_MISSES = 7
const FRUIT_TYPES: Exclude<FruitType, 'bomb'>[] = ['apple', 'banana', 'kiwi', 'lemon', 'orange', 'strawberry', 'watermelon']

function distanceToSegment(point: Vector2, start: Vector2, end: Vector2) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const projection = (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / ((dx * dx) + (dy * dy))
  const t = Math.max(0, Math.min(1, projection))
  const closestX = start.x + (dx * t)
  const closestY = start.y + (dy * t)
  return Math.hypot(point.x - closestX, point.y - closestY)
}

function pathHitsFruit(path: Vector2[], fruit: FruitEntity) {
  for (let index = 1; index < path.length; index += 1) {
    if (distanceToSegment(fruit, path[index - 1], path[index]) <= fruit.radius + 16) {
      return true
    }
  }

  return false
}

function pointerHitsFruit(pointer: Vector2, fruit: FruitEntity) {
  return Math.hypot(pointer.x - fruit.x, pointer.y - fruit.y) <= fruit.radius + 16
}

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
    livesRemaining: MAX_MISSES,
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
      livesRemaining: MAX_MISSES,
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

  const pauseToggle = () => {
    if (state.mode === 'playing') {
      state.mode = 'paused'
    } else if (state.mode === 'paused') {
      state.mode = 'playing'
    }
  }

  const spawnFruit = () => {
    const isBomb = nextId % 6 === 0
    const fruitType = isBomb ? 'bomb' : FRUIT_TYPES[Math.floor(rng() * FRUIT_TYPES.length)]
    state.fruits.push({
      id: nextId,
      kind: isBomb ? 'bomb' : 'fruit',
      x: 90 + rng() * (width - 180),
      y: height + 48,
      vx: -120 + rng() * 240,
      vy: -(860 + rng() * 140),
      radius: isBomb ? 22 : 28 + rng() * 10,
      color: isBomb
        ? '#1c2238'
        : ['#ff8a4c', '#ff5f7a', '#5cd5ab', '#f0c64f'][Math.floor(rng() * 4)],
      fruitType,
    })
    nextId += 1
  }

  const update = (dtMs: number, input: GameInput) => {
    state.trackingStatus = input.trackingStatus
    const previousPointer = state.lastPointer
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
    const slashPath = input.slashPath ?? (input.pointer && previousPointer ? [previousPointer, input.pointer] : [])
    const swipeActive = Boolean(input.slashActive ?? (input.pointer !== null && input.swipeSpeed > 0.8))
    let misses = 0

    state.fruits = state.fruits.filter((fruit) => {
      fruit.vy += GRAVITY * dt
      fruit.x += fruit.vx * dt
      fruit.y += fruit.vy * dt

      const fruitWasHit = swipeActive && (
        (slashPath.length >= 2 && pathHitsFruit(slashPath, fruit)) ||
        (input.pointer !== null && pointerHitsFruit(input.pointer, fruit))
      )

      if (fruitWasHit) {
        if (fruit.kind === 'bomb') {
          state.mode = 'gameover'
        } else {
          state.score += 1
        }
        return false
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
      state.livesRemaining = Math.max(0, MAX_MISSES - state.misses)
      if (state.misses >= MAX_MISSES) {
        state.mode = 'gameover'
      }
    }
  }

  return {
    start,
    pauseToggle,
    reset,
    update,
    getState: () => state,
    debugAddFruit: (fruit: FruitEntity) => {
      state.fruits.push(fruit)
    },
  }
}
