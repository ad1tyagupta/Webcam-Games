import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameCameraCard } from '../../components/GameCameraCard'
import { GameStageLayout } from '../../components/GameStageLayout'
import { GameUiCursor } from '../../components/GameUiCursor'
import { registerActiveGameRuntime } from '../../runtime/windowBindings'
import { useArcadeSession } from '../../session/ArcadeSession'
import type { DirectionIntent, HandFrame } from '../../types/arcade'
import { createEmptyHandFrame } from '../../tracking/handMath'
import { useGameUiCursor } from '../common/useGameUiCursor'
import { createSnakeEngine, type SnakeState } from './snakeEngine'
import { createSnakeGameInput, createSnakeGestureInterpreter } from './snakeInput'

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 720
const BOARD_MARGIN = 56

function drawRoundedPanel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, 24)
  ctx.fill()
}

function drawTerrariumFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  boardX: number,
  boardY: number,
  boardWidth: number,
  boardHeight: number,
) {
  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  background.addColorStop(0, '#efe8d3')
  background.addColorStop(0.45, '#d7d1b6')
  background.addColorStop(1, '#c7c09b')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
  drawRoundedPanel(ctx, 20, 20, canvas.width - 40, canvas.height - 40)

  const glass = ctx.createLinearGradient(boardX, boardY, boardX + boardWidth, boardY + boardHeight)
  glass.addColorStop(0, 'rgba(255,255,255,0.2)')
  glass.addColorStop(1, 'rgba(226,243,224,0.12)')
  ctx.fillStyle = glass
  drawRoundedPanel(ctx, boardX - 16, boardY - 16, boardWidth + 32, boardHeight + 32)

  ctx.strokeStyle = 'rgba(255,255,255,0.34)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.roundRect(boardX - 16, boardY - 16, boardWidth + 32, boardHeight + 32, 30)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.beginPath()
  ctx.roundRect(boardX - 7, boardY - 7, boardWidth * 0.48, 12, 8)
  ctx.fill()
}

function drawSoilTexture(
  ctx: CanvasRenderingContext2D,
  boardX: number,
  boardY: number,
  boardWidth: number,
  boardHeight: number,
  cellWidth: number,
  cellHeight: number,
) {
  const soil = ctx.createLinearGradient(boardX, boardY, boardX, boardY + boardHeight)
  soil.addColorStop(0, '#6b5a39')
  soil.addColorStop(0.35, '#5f5034')
  soil.addColorStop(1, '#3c3120')
  ctx.fillStyle = soil
  drawRoundedPanel(ctx, boardX, boardY, boardWidth, boardHeight)

  ctx.globalAlpha = 0.2
  for (let row = 0; row < 18; row += 1) {
    const y = boardY + row * cellHeight
    ctx.fillStyle = row % 2 === 0 ? 'rgba(216, 194, 129, 0.16)' : 'rgba(98, 80, 50, 0.12)'
    ctx.fillRect(boardX + 6, y + 4, boardWidth - 12, Math.max(1, cellHeight - 8))
  }
  ctx.globalAlpha = 1

  for (let index = 0; index < 58; index += 1) {
    const x = boardX + ((index * 73) % Math.floor(boardWidth - 24)) + 12
    const y = boardY + ((index * 43) % Math.floor(boardHeight - 24)) + 12
    const radius = 1.4 + ((index * 11) % 8) * 0.18
    ctx.fillStyle = index % 3 === 0 ? 'rgba(255, 224, 166, 0.16)' : 'rgba(34, 25, 14, 0.18)'
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let x = 0; x < 18; x += 1) {
    for (let y = 0; y < 18; y += 1) {
      const cellX = boardX + x * cellWidth
      const cellY = boardY + y * cellHeight
      ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
      ctx.fillRect(cellX + 2, cellY + 2, cellWidth - 4, cellHeight - 4)
      ctx.strokeStyle = 'rgba(255,255,255,0.035)'
      ctx.lineWidth = 1
      ctx.strokeRect(cellX + 2, cellY + 2, cellWidth - 4, cellHeight - 4)
    }
  }
}

function drawTerrariumDecor(
  ctx: CanvasRenderingContext2D,
  boardX: number,
  boardY: number,
  boardWidth: number,
  boardHeight: number,
) {
  const plants = [
    { x: boardX + 34, y: boardY + 48, scale: 1.1, hue: '#5ea968' },
    { x: boardX + boardWidth - 34, y: boardY + 56, scale: 0.95, hue: '#4e8d58' },
    { x: boardX + 42, y: boardY + boardHeight - 40, scale: 1.2, hue: '#699f56' },
    { x: boardX + boardWidth - 50, y: boardY + boardHeight - 28, scale: 1.05, hue: '#6ea84b' },
  ]

  plants.forEach((plant) => {
    for (let index = 0; index < 5; index += 1) {
      const offset = (index - 2) * 10 * plant.scale
      ctx.fillStyle = plant.hue
      ctx.beginPath()
      ctx.ellipse(
        plant.x + offset,
        plant.y - Math.abs(offset) * 0.18,
        8 * plant.scale,
        20 * plant.scale,
        offset * 0.04,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  })

  ctx.fillStyle = 'rgba(28, 20, 15, 0.35)'
  ctx.beginPath()
  ctx.ellipse(boardX + boardWidth - 74, boardY + boardHeight - 58, 26, 14, 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#998b73'
  ctx.beginPath()
  ctx.ellipse(boardX + boardWidth - 74, boardY + boardHeight - 62, 24, 12, 0.1, 0, Math.PI * 2)
  ctx.fill()
}

function drawFood(
  ctx: CanvasRenderingContext2D,
  foodX: number,
  foodY: number,
  cellWidth: number,
  cellHeight: number,
) {
  const cx = foodX + cellWidth / 2
  const cy = foodY + cellHeight / 2 + 1
  ctx.fillStyle = 'rgba(22, 15, 9, 0.24)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 12, cellWidth * 0.26, cellHeight * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()

  const shell = ctx.createLinearGradient(cx - 14, cy - 10, cx + 14, cy + 10)
  shell.addColorStop(0, '#ffb250')
  shell.addColorStop(0.5, '#f56a37')
  shell.addColorStop(1, '#8a2818')
  ctx.fillStyle = shell
  ctx.beginPath()
  ctx.ellipse(cx, cy, cellWidth * 0.28, cellHeight * 0.21, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(57, 14, 8, 0.8)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, cy - cellHeight * 0.18)
  ctx.lineTo(cx, cy + cellHeight * 0.18)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.44)'
  ctx.beginPath()
  ctx.ellipse(cx - 5, cy - 4, 5, 3, -0.4, 0, Math.PI * 2)
  ctx.fill()
}

function segmentGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  head: boolean,
) {
  const gradient = ctx.createLinearGradient(x, y, x, y + height)
  if (head) {
    gradient.addColorStop(0, '#8dd884')
    gradient.addColorStop(0.55, '#4f9854')
    gradient.addColorStop(1, '#2f562f')
  } else {
    gradient.addColorStop(0, '#7bc572')
    gradient.addColorStop(0.55, '#4d9150')
    gradient.addColorStop(1, '#2c542d')
  }
  return gradient
}

function drawSnakeSegment(
  ctx: CanvasRenderingContext2D,
  segmentX: number,
  segmentY: number,
  cellWidth: number,
  cellHeight: number,
  direction: SnakeState['direction'],
  head: boolean,
) {
  const x = segmentX + 5
  const y = segmentY + 7
  const width = cellWidth - 10
  const height = cellHeight - 12
  const shadowScale = head ? 0.34 : 0.3

  ctx.fillStyle = 'rgba(20, 18, 12, 0.24)'
  ctx.beginPath()
  ctx.ellipse(
    segmentX + cellWidth / 2,
    segmentY + cellHeight - 6,
    cellWidth * shadowScale,
    cellHeight * 0.16,
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()

  ctx.fillStyle = segmentGradient(ctx, x, y, height, head)
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, head ? 18 : 15)
  ctx.fill()

  ctx.fillStyle = head ? 'rgba(23, 54, 23, 0.82)' : 'rgba(18, 40, 18, 0.72)'
  ctx.beginPath()
  ctx.roundRect(x + 3, y + height * 0.56, width - 6, height * 0.28, 12)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.beginPath()
  ctx.roundRect(x + 5, y + 4, width - 10, height * 0.26, 10)
  ctx.fill()

  if (!head) {
    return
  }

  let eyeOffsetX = 0
  let eyeOffsetY = 0
  if (direction === 'right') {
    eyeOffsetX = 4
  } else if (direction === 'left') {
    eyeOffsetX = -4
  } else if (direction === 'up') {
    eyeOffsetY = -3
  } else {
    eyeOffsetY = 3
  }

  const centerX = segmentX + cellWidth / 2
  const centerY = segmentY + cellHeight / 2
  ctx.fillStyle = '#142114'
  ctx.beginPath()
  ctx.arc(centerX - 7 + eyeOffsetX, centerY - 5 + eyeOffsetY, 2.5, 0, Math.PI * 2)
  ctx.arc(centerX + 7 + eyeOffsetX, centerY - 5 + eyeOffsetY, 2.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#eef8cf'
  ctx.beginPath()
  ctx.arc(centerX - 8 + eyeOffsetX, centerY - 6 + eyeOffsetY, 1.1, 0, Math.PI * 2)
  ctx.arc(centerX + 6 + eyeOffsetX, centerY - 6 + eyeOffsetY, 1.1, 0, Math.PI * 2)
  ctx.fill()
}

function drawSnakeScene(
  canvas: HTMLCanvasElement,
  state: SnakeState,
  handFrame: HandFrame,
  directionIntent: DirectionIntent,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const boardX = BOARD_MARGIN
  const boardY = BOARD_MARGIN
  const boardWidth = canvas.width - BOARD_MARGIN * 2
  const boardHeight = canvas.height - BOARD_MARGIN * 2
  const cellWidth = boardWidth / state.boardCols
  const cellHeight = boardHeight / state.boardRows

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  drawTerrariumFrame(ctx, canvas, boardX, boardY, boardWidth, boardHeight)
  drawSoilTexture(ctx, boardX, boardY, boardWidth, boardHeight, cellWidth, cellHeight)
  drawTerrariumDecor(ctx, boardX, boardY, boardWidth, boardHeight)

  drawFood(ctx, boardX + state.food.x * cellWidth, boardY + state.food.y * cellHeight, cellWidth, cellHeight)

  ;[...state.snake].reverse().forEach((segment, reverseIndex) => {
    const index = state.snake.length - 1 - reverseIndex
    drawSnakeSegment(
      ctx,
      boardX + segment.x * cellWidth,
      boardY + segment.y * cellHeight,
      cellWidth,
      cellHeight,
      state.direction,
      index === 0,
    )
  })

  ctx.fillStyle = 'rgba(20, 36, 20, 0.76)'
  drawRoundedPanel(ctx, 18, 18, 206, 94)
  ctx.fillStyle = '#f8f6ec'
  ctx.font = '700 18px "Trebuchet MS", sans-serif'
  ctx.fillText(`Score ${state.score}`, 36, 50)
  ctx.font = '500 15px "Trebuchet MS", sans-serif'
  ctx.fillText(`State ${state.mode}`, 36, 76)
  ctx.fillText(`Steer ${directionIntent}`, 36, 98)

  ctx.fillStyle = 'rgba(24, 34, 20, 0.76)'
  drawRoundedPanel(ctx, canvas.width - 238, 18, 220, 108)
  ctx.fillStyle = '#f7f5e7'
  ctx.font = '600 16px "Trebuchet MS", sans-serif'
  ctx.fillText(`Tracking ${handFrame.status}`, canvas.width - 218, 50)
  ctx.fillText(`Confidence ${Math.round(handFrame.confidence * 100)}%`, canvas.width - 218, 76)
  ctx.fillText(`Feed ${handFrame.source}`, canvas.width - 218, 102)

  if (state.mode !== 'playing') {
    ctx.fillStyle = 'rgba(22, 20, 14, 0.54)'
    ctx.fillRect(boardX, boardY, boardWidth, boardHeight)
    ctx.fillStyle = '#fff8ef'
    ctx.textAlign = 'center'
    ctx.font = '800 52px "Trebuchet MS", sans-serif'
    ctx.fillText('Snake Signal', canvas.width / 2, canvas.height / 2 - 42)
    ctx.font = '500 22px "Trebuchet MS", sans-serif'
    const subtitle =
      state.mode === 'gameover'
        ? 'You hit the glass. Restart or press Enter to slither again.'
        : state.mode === 'paused'
          ? 'Paused inside the terrarium. Press Space to move again.'
          : 'Point your fingers to steer. Arrow keys still work as backup.'
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 8)
    ctx.font = '500 18px "Trebuchet MS", sans-serif'
    ctx.fillText('Natural terrain, direct finger steering, mirrored webcam input.', canvas.width / 2, canvas.height / 2 + 42)
    ctx.textAlign = 'start'
  }

  if (handFrame.status === 'lost' || handFrame.status === 'error') {
    ctx.fillStyle = 'rgba(255,255,255,0.94)'
    ctx.beginPath()
    ctx.roundRect(canvas.width / 2 - 190, canvas.height - 126, 380, 76, 26)
    ctx.fill()
    ctx.fillStyle = '#26301e'
    ctx.font = '600 18px "Trebuchet MS", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Tracking lost. Bring your hand back into frame or use arrow keys.', canvas.width / 2, canvas.height - 78)
    ctx.textAlign = 'start'
  }
}

function statesEqual(a: SnakeState, b: SnakeState) {
  return (
    a.mode === b.mode &&
    a.score === b.score &&
    a.moveCount === b.moveCount &&
    a.trackingStatus === b.trackingStatus
  )
}

export function SnakeCanvas() {
  const { enableDebugTracker, handFrame, trackerMode } = useArcadeSession()
  const stageRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handFrameRef = useRef<HandFrame>(createEmptyHandFrame('idle'))
  const keyboardDirectionRef = useRef<DirectionIntent>('none')
  const directionIntentRef = useRef<DirectionIntent>('none')
  const animationFrameRef = useRef(0)
  const lastTimestampRef = useRef(0)
  const engine = useMemo(() => createSnakeEngine(), [])
  const gestureInterpreter = useMemo(
    () => createSnakeGestureInterpreter({ confirmationFrames: 1, cooldownMs: 95, deadZone: 0.11 }),
    [],
  )
  const shouldSimulateHand = useMemo(() => {
    if (!import.meta.env.DEV) {
      return false
    }
    return new URLSearchParams(window.location.search).get('simulateHand') === '1'
  }, [])
  const [state, setState] = useState(() => engine.getState())
  const cursor = useGameUiCursor(stageRef, handFrame)

  useEffect(() => {
    handFrameRef.current = handFrame
  }, [handFrame])

  useEffect(() => {
    if (!shouldSimulateHand || trackerMode === 'debug') {
      return
    }

    enableDebugTracker()
  }, [enableDebugTracker, shouldSimulateHand, trackerMode])

  const syncState = useCallback(() => {
    const nextState = engine.getState()
    setState((current) => (statesEqual(current, nextState) ? current : { ...nextState }))
  }, [engine])

  const stepSimulation = useCallback((ms: number) => {
    const activeFrame = handFrameRef.current ?? createEmptyHandFrame('idle')
    const directionIntent = gestureInterpreter.next(activeFrame, keyboardDirectionRef.current)
    directionIntentRef.current = directionIntent
    const input = createSnakeGameInput(activeFrame, directionIntent)
    engine.update(ms, input)
    syncState()
    const canvas = canvasRef.current
    if (canvas) {
      drawSnakeScene(canvas, engine.getState(), activeFrame, directionIntent)
    }
  }, [engine, gestureInterpreter, syncState])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        keyboardDirectionRef.current = 'up'
      } else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        keyboardDirectionRef.current = 'down'
      } else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        keyboardDirectionRef.current = 'left'
      } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        keyboardDirectionRef.current = 'right'
      } else if (event.code === 'Enter') {
        engine.start()
        syncState()
      } else if (event.code === 'Space') {
        const currentState = engine.getState()
        if (currentState.mode === 'title' || currentState.mode === 'gameover') {
          engine.start()
        } else {
          engine.pauseToggle()
        }
        syncState()
      } else if (event.key.toLowerCase() === 'r') {
        engine.reset()
        gestureInterpreter.reset()
        syncState()
      } else {
        return
      }

      event.preventDefault()
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (getDirectionFromKey(event.key) !== 'none') {
        keyboardDirectionRef.current = 'none'
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [engine, gestureInterpreter, syncState])

  useEffect(() => {
    const runtime = {
      advanceTime: (ms: number) => {
        stepSimulation(ms)
      },
      getTextState: () => {
        const currentState = engine.getState()
        return JSON.stringify({
          route: '/play/snake',
          mode: currentState.mode,
          coordinateSystem: 'grid origin at top-left, x increases right, y increases down',
          board: { cols: currentState.boardCols, rows: currentState.boardRows },
          snake: currentState.snake,
          food: currentState.food,
          direction: currentState.direction,
          score: currentState.score,
          moveCount: currentState.moveCount,
          directionIntent: directionIntentRef.current,
          tracking: {
            status: handFrameRef.current.status,
            source: handFrameRef.current.source,
            confidence: handFrameRef.current.confidence,
          },
        })
      },
    }
    registerActiveGameRuntime(runtime)
    return () => {
      registerActiveGameRuntime(null)
    }
  }, [engine, stepSimulation])

  useEffect(() => {
    const frame = (timestamp: number) => {
      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp
      }
      const dt = timestamp - lastTimestampRef.current
      lastTimestampRef.current = timestamp
      stepSimulation(Math.min(dt, 48))
      animationFrameRef.current = window.requestAnimationFrame(frame)
    }

    animationFrameRef.current = window.requestAnimationFrame(frame)
    return () => {
      window.cancelAnimationFrame(animationFrameRef.current)
    }
  }, [stepSimulation])

  const startGame = () => {
    engine.start()
    syncState()
  }

  const togglePause = () => {
    const currentState = engine.getState()
    if (currentState.mode === 'title') {
      engine.start()
    } else {
      engine.pauseToggle()
    }
    syncState()
  }

  const resetGame = () => {
    engine.reset()
    gestureInterpreter.reset()
    syncState()
  }

  const infoPanel = (
    <section className="panel game-info-card">
      <div className="game-info-card__intro">
        <p className="game-info-card__label">Terrarium controls</p>
        <p>Faster gesture pickup keeps the snake responsive even when your fingers only move a little.</p>
      </div>
      <div className="status-grid">
        <div className="status-card">
          <strong>Score</strong>
          <span>{state.score}</span>
        </div>
        <div className="status-card">
          <strong>State</strong>
          <span>{state.mode}</span>
        </div>
        <div className="status-card">
          <strong>Tracking</strong>
          <span>{handFrame.status}</span>
        </div>
      </div>
      <div className="button-row">
        <button
          id="start-snake-btn"
          className="button"
          data-game-ui-id="snake-start"
          data-game-ui-target="true"
          type="button"
          onClick={startGame}
        >
          {state.mode === 'playing' ? 'Playing' : state.mode === 'gameover' ? 'Play again' : 'Start game'}
        </button>
        <button
          id="pause-snake-btn"
          className="button button--ghost"
          data-game-ui-id="snake-pause"
          data-game-ui-target="true"
          type="button"
          onClick={togglePause}
        >
          {state.mode === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button
          id="reset-snake-btn"
          className="button button--ghost"
          data-game-ui-id="snake-reset"
          data-game-ui-target="true"
          type="button"
          onClick={resetGame}
        >
          Reset
        </button>
      </div>
      <ul className="control-list">
        <li>Tip the fingers into the next direction. Small turns now snap the steering faster.</li>
        <li>Pinch on the visible buttons to start, pause, or reset without leaving the game screen.</li>
        <li>Keyboard fallback: arrows or WASD, Enter to start, R to reset.</li>
      </ul>
    </section>
  )

  return (
    <GameStageLayout
      accent="#c6ff5d"
      cameraCard={<GameCameraCard debugButtonId="debug-snake-btn" />}
      eyebrow="Snake"
      gameId="snake"
      infoPanel={infoPanel}
      overlay={<GameUiCursor cursor={cursor} />}
      stageRef={stageRef}
      subtitle="Sporty-modern terrarium steering with amplified gesture response."
      title="Snake Signal"
    >
      <canvas
        ref={canvasRef}
        id="snake-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        aria-label="Snake terrarium scene"
        className="game-canvas game-canvas--square"
      />
    </GameStageLayout>
  )
}

function getDirectionFromKey(key: string): DirectionIntent {
  if (key === 'ArrowUp' || key.toLowerCase() === 'w') {
    return 'up'
  }
  if (key === 'ArrowDown' || key.toLowerCase() === 's') {
    return 'down'
  }
  if (key === 'ArrowLeft' || key.toLowerCase() === 'a') {
    return 'left'
  }
  if (key === 'ArrowRight' || key.toLowerCase() === 'd') {
    return 'right'
  }
  return 'none'
}
