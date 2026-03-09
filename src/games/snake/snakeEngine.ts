import type { DirectionIntent, GameInput, TrackingStatus } from '../../types/arcade'

export type SnakeDirection = Exclude<DirectionIntent, 'none'>
export type SnakeMode = 'title' | 'playing' | 'paused' | 'gameover'

export interface GridPoint {
  x: number
  y: number
}

export interface SnakeState {
  mode: SnakeMode
  boardCols: number
  boardRows: number
  snake: GridPoint[]
  food: GridPoint
  direction: SnakeDirection
  pendingDirection: SnakeDirection
  score: number
  trackingStatus: TrackingStatus
  moveCount: number
}

interface SnakeEngineOptions {
  rng?: () => number
  tickMs?: number
  boardCols?: number
  boardRows?: number
}

function createInitialSnake(boardCols: number, boardRows: number) {
  const centerX = Math.floor(boardCols / 2)
  const centerY = Math.floor(boardRows / 2)
  return [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ]
}

function isSamePoint(a: GridPoint, b: GridPoint) {
  return a.x === b.x && a.y === b.y
}

export function isOppositeDirection(a: SnakeDirection, b: SnakeDirection) {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  )
}

export function createFood(boardCols: number, boardRows: number, snake: GridPoint[], rng: () => number) {
  const occupied = new Set(snake.map((segment) => `${segment.x}:${segment.y}`))
  const openCells: GridPoint[] = []
  for (let y = 0; y < boardRows; y += 1) {
    for (let x = 0; x < boardCols; x += 1) {
      const key = `${x}:${y}`
      if (!occupied.has(key)) {
        openCells.push({ x, y })
      }
    }
  }

  if (!openCells.length) {
    return { x: 0, y: 0 }
  }

  return openCells[Math.floor(rng() * openCells.length) % openCells.length]
}

function nextHead(head: GridPoint, direction: SnakeDirection) {
  if (direction === 'up') {
    return { x: head.x, y: head.y - 1 }
  }
  if (direction === 'down') {
    return { x: head.x, y: head.y + 1 }
  }
  if (direction === 'left') {
    return { x: head.x - 1, y: head.y }
  }
  return { x: head.x + 1, y: head.y }
}

export function createSnakeEngine(options: SnakeEngineOptions = {}) {
  const boardCols = options.boardCols ?? 18
  const boardRows = options.boardRows ?? 18
  const rng = options.rng ?? Math.random
  const tickMs = options.tickMs ?? 150

  let accumulatorMs = 0
  let state: SnakeState = {
    mode: 'title',
    boardCols,
    boardRows,
    snake: createInitialSnake(boardCols, boardRows),
    food: { x: 2, y: 2 },
    direction: 'right',
    pendingDirection: 'right',
    score: 0,
    trackingStatus: 'idle',
    moveCount: 0,
  }
  state.food = createFood(boardCols, boardRows, state.snake, rng)

  const reset = () => {
    accumulatorMs = 0
    state = {
      ...state,
      mode: 'title',
      snake: createInitialSnake(boardCols, boardRows),
      direction: 'right',
      pendingDirection: 'right',
      score: 0,
      trackingStatus: 'idle',
      moveCount: 0,
      food: { x: 0, y: 0 },
    }
    state.food = createFood(boardCols, boardRows, state.snake, rng)
  }

  const start = () => {
    if (state.mode === 'gameover') {
      reset()
    }
    state.mode = 'playing'
  }

  const pauseToggle = () => {
    state.mode = state.mode === 'paused' ? 'playing' : 'paused'
  }

  const queueDirection = (direction: DirectionIntent) => {
    if (direction === 'none') {
      return
    }
    if (!isOppositeDirection(state.direction, direction)) {
      state.pendingDirection = direction
    }
  }

  const step = () => {
    state.direction = state.pendingDirection
    const head = nextHead(state.snake[0], state.direction)
    const collidedWithWall =
      head.x < 0 || head.y < 0 || head.x >= state.boardCols || head.y >= state.boardRows
    const collidedWithSnake = state.snake.some((segment) => isSamePoint(segment, head))

    if (collidedWithWall || collidedWithSnake) {
      state.mode = 'gameover'
      return
    }

    const nextSnake = [head, ...state.snake]
    const ateFood = isSamePoint(head, state.food)
    if (!ateFood) {
      nextSnake.pop()
    } else {
      state.score += 1
    }

    state.snake = nextSnake
    state.moveCount += 1

    if (ateFood) {
      state.food = createFood(state.boardCols, state.boardRows, state.snake, rng)
    }
  }

  const update = (dtMs: number, input: GameInput) => {
    state.trackingStatus = input.trackingStatus
    queueDirection(input.directionIntent)

    if (state.mode !== 'playing') {
      return
    }

    accumulatorMs += dtMs
    while (accumulatorMs >= tickMs) {
      accumulatorMs -= tickMs
      step()
      if (state.mode !== 'playing') {
        break
      }
    }
  }

  return {
    start,
    reset,
    pauseToggle,
    update,
    getState: () => state,
    getTickMs: () => tickMs,
  }
}
