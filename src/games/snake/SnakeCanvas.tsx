import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GameCameraCard } from '../../components/GameCameraCard'
import { registerActiveGameRuntime } from '../../runtime/windowBindings'
import { useArcadeSession } from '../../session/ArcadeSession'
import type { DirectionIntent, HandFrame } from '../../types/arcade'
import { createEmptyHandFrame } from '../../tracking/handMath'
import { createSnakeEngine, type SnakeState } from './snakeEngine'
import { createSnakeGameInput, createSnakeGestureInterpreter } from './snakeInput'

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 720

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

  const cellWidth = canvas.width / state.boardCols
  const cellHeight = canvas.height / state.boardRows

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  background.addColorStop(0, '#fff7d4')
  background.addColorStop(1, '#ffd4f5')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(255,255,255,0.32)'
  for (let x = 0; x < state.boardCols; x += 1) {
    for (let y = 0; y < state.boardRows; y += 1) {
      ctx.fillRect(x * cellWidth + 1.5, y * cellHeight + 1.5, cellWidth - 3, cellHeight - 3)
    }
  }

  ctx.fillStyle = '#ff6b5a'
  ctx.beginPath()
  ctx.arc(
    state.food.x * cellWidth + cellWidth / 2,
    state.food.y * cellHeight + cellHeight / 2,
    Math.min(cellWidth, cellHeight) * 0.34,
    0,
    Math.PI * 2,
  )
  ctx.fill()

  state.snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? '#1f7aff' : '#14396f'
    const radius = index === 0 ? 14 : 11
    ctx.beginPath()
    ctx.roundRect(
      segment.x * cellWidth + 4,
      segment.y * cellHeight + 4,
      cellWidth - 8,
      cellHeight - 8,
      radius,
    )
    ctx.fill()
  })

  ctx.fillStyle = 'rgba(16, 28, 62, 0.88)'
  ctx.beginPath()
  ctx.roundRect(16, 16, 190, 86, 24)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 18px "Trebuchet MS", sans-serif'
  ctx.fillText(`Score ${state.score}`, 34, 52)
  ctx.font = '500 15px "Trebuchet MS", sans-serif'
  ctx.fillText(`Mode ${state.mode}`, 34, 76)
  ctx.fillText(`Intent ${directionIntent}`, 34, 98)

  ctx.fillStyle = 'rgba(16, 28, 62, 0.92)'
  ctx.beginPath()
  ctx.roundRect(canvas.width - 220, 16, 204, 100, 24)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`Tracking ${handFrame.status}`, canvas.width - 200, 52)
  ctx.fillText(`Confidence ${Math.round(handFrame.confidence * 100)}%`, canvas.width - 200, 76)
  ctx.fillText(`Feed ${handFrame.source}`, canvas.width - 200, 100)

  if (state.mode !== 'playing') {
    ctx.fillStyle = 'rgba(16, 28, 62, 0.72)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fff8ef'
    ctx.textAlign = 'center'
    ctx.font = '800 52px "Trebuchet MS", sans-serif'
    ctx.fillText('Snake Signal', canvas.width / 2, canvas.height / 2 - 34)
    ctx.font = '500 22px "Trebuchet MS", sans-serif'
    const subtitle =
      state.mode === 'gameover'
        ? 'Crash detected. Restart or press Enter to go again.'
        : state.mode === 'paused'
          ? 'Paused. Press Space or the pause button to resume.'
          : 'Use your fingers or arrow keys to start steering.'
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 16)
    ctx.textAlign = 'start'
  }

  if (handFrame.status === 'lost' || handFrame.status === 'error') {
    ctx.fillStyle = 'rgba(255,255,255,0.94)'
    ctx.beginPath()
    ctx.roundRect(canvas.width / 2 - 170, canvas.height - 120, 340, 72, 26)
    ctx.fill()
    ctx.fillStyle = '#1d1d35'
    ctx.font = '600 18px "Trebuchet MS", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Tracking lost. Hold your hand in frame or use arrow keys.', canvas.width / 2, canvas.height - 75)
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
  const { handFrame } = useArcadeSession()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handFrameRef = useRef<HandFrame>(createEmptyHandFrame('idle'))
  const keyboardDirectionRef = useRef<DirectionIntent>('none')
  const directionIntentRef = useRef<DirectionIntent>('none')
  const animationFrameRef = useRef(0)
  const lastTimestampRef = useRef(0)
  const engine = useMemo(() => createSnakeEngine(), [])
  const gestureInterpreter = useMemo(() => createSnakeGestureInterpreter(), [])
  const [state, setState] = useState(() => engine.getState())

  useEffect(() => {
    handFrameRef.current = handFrame
  }, [handFrame])

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

  return (
    <section className="game-layout">
      <div className="panel panel--canvas">
        <canvas
          ref={canvasRef}
          id="snake-canvas"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="game-canvas game-canvas--square"
        />
      </div>
      <GameCameraCard debugButtonId="debug-snake-btn" />
      <section className="panel game-info-card">
        <span className="eyebrow">Snake</span>
        <h1>Snake Signal</h1>
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
          <button id="start-snake-btn" className="button" type="button" onClick={startGame}>
            {state.mode === 'playing' ? 'Playing' : state.mode === 'gameover' ? 'Play again' : 'Start game'}
          </button>
          <button className="button button--ghost" type="button" onClick={togglePause}>
            {state.mode === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button className="button button--ghost" type="button" onClick={resetGame}>
            Reset
          </button>
        </div>
        <ul className="control-list">
          <li>Turn your fingers up, down, left, or right to steer.</li>
          <li>Movement is mirrored to match what you see in the camera feed.</li>
          <li>Keyboard fallback: arrows or WASD, Enter to start, R to reset.</li>
        </ul>
        <Link className="button button--ghost" to="/">
          Back to games
        </Link>
      </section>
    </section>
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
