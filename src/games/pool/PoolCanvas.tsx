import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameCameraCard } from '../../components/GameCameraCard'
import { GameStageLayout } from '../../components/GameStageLayout'
import { GameUiCursor } from '../../components/GameUiCursor'
import { registerActiveGameRuntime } from '../../runtime/windowBindings'
import { useArcadeSession } from '../../session/ArcadeSession'
import type { HandFrame, Vector2 } from '../../types/arcade'
import { createEmptyHandFrame, pinchStateFromDistance } from '../../tracking/handMath'
import { amplifyNormalizedPoint, movePointer, pinchStateFromKeyboard, toCanvasPoint } from '../common/input'
import { useGameUiCursor } from '../common/useGameUiCursor'
import { createPoolEngine, type PoolState } from './poolEngine'

const WIDTH = 720
const HEIGHT = 540
const HAND_POINTER_GAIN = { x: 1.82, y: 1.78 }
const POCKETS = [
  { x: 40, y: 40 },
  { x: WIDTH / 2, y: 32 },
  { x: WIDTH - 40, y: 40 },
  { x: 40, y: HEIGHT - 40 },
  { x: WIDTH / 2, y: HEIGHT - 32 },
  { x: WIDTH - 40, y: HEIGHT - 40 },
]

function drawScene(canvas: HTMLCanvasElement, state: PoolState, pointer: Vector2, trackingStatus: HandFrame['status']) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.fillStyle = '#173d40'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = '#8d6038'
  ctx.fillRect(26, 26, WIDTH - 52, HEIGHT - 52)
  ctx.fillStyle = '#0f635c'
  ctx.fillRect(52, 52, WIDTH - 104, HEIGHT - 104)

  ctx.fillStyle = '#0b1f20'
  for (const pocket of POCKETS) {
    ctx.beginPath()
    ctx.arc(pocket.x, pocket.y, 20, 0, Math.PI * 2)
    ctx.fill()
  }

  const cue = state.balls.find((ball) => ball.kind === 'cue' && !ball.pocketed)
  if (cue && state.mode !== 'rolling' && state.mode !== 'win') {
    ctx.strokeStyle = '#f6e5c4'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cue.x, cue.y)
    ctx.lineTo(pointer.x, pointer.y)
    ctx.stroke()
  }

  for (const ball of state.balls) {
    if (ball.pocketed) {
      continue
    }
    ctx.fillStyle = ball.color
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#32e875'
  ctx.beginPath()
  ctx.arc(pointer.x, pointer.y, 9, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(10, 22, 25, 0.78)'
  ctx.beginPath()
  ctx.roundRect(18, 18, 196, 84, 24)
  ctx.fill()
  ctx.fillStyle = '#fff9ee'
  ctx.font = '700 18px "Trebuchet MS", sans-serif'
  ctx.fillText(`Mode ${state.mode}`, 38, 50)
  ctx.fillText(`Power ${Math.round(state.charge * 100)}%`, 38, 80)

  ctx.beginPath()
  ctx.roundRect(WIDTH - 214, 18, 196, 84, 24)
  ctx.fillStyle = 'rgba(10, 22, 25, 0.78)'
  ctx.fill()
  ctx.fillStyle = '#fff9ee'
  const remainingTargets = state.balls.filter((ball) => ball.kind === 'target' && !ball.pocketed).length
  ctx.fillText(`Targets ${remainingTargets}`, WIDTH - 192, 50)
  ctx.fillText(`Tracking ${trackingStatus}`, WIDTH - 192, 80)

  if (state.mode === 'win') {
    ctx.fillStyle = 'rgba(10, 22, 25, 0.58)'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = '#fff9ee'
    ctx.textAlign = 'center'
    ctx.font = '800 44px "Trebuchet MS", sans-serif'
    ctx.fillText('Table cleared', WIDTH / 2, HEIGHT / 2 - 10)
    ctx.font = '600 20px "Trebuchet MS", sans-serif'
    ctx.fillText('Reset to rack the balls again.', WIDTH / 2, HEIGHT / 2 + 28)
    ctx.textAlign = 'start'
  }
}

function sameState(a: PoolState, b: PoolState) {
  return (
    a.mode === b.mode &&
    a.charge === b.charge &&
    a.trackingStatus === b.trackingStatus &&
    a.balls.filter((ball) => !ball.pocketed).length === b.balls.filter((ball) => !ball.pocketed).length
  )
}

function drawStageOverlay(canvas: HTMLCanvasElement, title: string, detail: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.fillStyle = 'rgba(5, 12, 16, 0.56)'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = '#f6efe0'
  ctx.textAlign = 'center'
  ctx.font = '800 42px "Trebuchet MS", sans-serif'
  ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 16)
  ctx.font = '600 18px "Trebuchet MS", sans-serif'
  ctx.fillText(detail, WIDTH / 2, HEIGHT / 2 + 24)
  ctx.textAlign = 'start'
}

export function PoolCanvas() {
  const { handFrame } = useArcadeSession()
  const stageRef = useRef<HTMLElement | null>(null)
  const handFrameRef = useRef<HandFrame>(createEmptyHandFrame('idle'))
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerRef = useRef<Vector2>({ x: WIDTH * 0.7, y: HEIGHT * 0.45 })
  const virtualPointerRef = useRef<Vector2>({ x: WIDTH * 0.7, y: HEIGHT * 0.45 })
  const animationFrameRef = useRef(0)
  const lastTimestampRef = useRef(0)
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const stageModeRef = useRef<'title' | 'playing' | 'paused'>('title')
  const engine = useMemo(() => createPoolEngine(), [])
  const [state, setState] = useState(() => engine.getState())
  const [stageMode, setStageMode] = useState<'title' | 'playing' | 'paused'>('title')
  const cursor = useGameUiCursor(stageRef, handFrame)

  useEffect(() => {
    handFrameRef.current = handFrame
  }, [handFrame])

  useEffect(() => {
    stageModeRef.current = stageMode
  }, [stageMode])

  const syncState = useCallback(() => {
    const nextState = engine.getState()
    setState((current) => (sameState(current, nextState) ? current : { ...nextState, balls: nextState.balls.map((ball) => ({ ...ball })) }))
  }, [engine])

  const stepSimulation = useCallback((dtMs: number) => {
    const activeFrame = handFrameRef.current
    const pointer =
      activeFrame.status === 'ready'
        ? toCanvasPoint(amplifyNormalizedPoint(activeFrame.derived.indexTip, HAND_POINTER_GAIN), WIDTH, HEIGHT)
        : (virtualPointerRef.current = movePointer(
            virtualPointerRef.current,
            pressedKeysRef.current,
            dtMs,
            WIDTH,
            HEIGHT,
          ))
    pointerRef.current = pointer
    if (stageModeRef.current === 'playing') {
      engine.update(dtMs, {
        directionIntent: 'none',
        pointer,
        swipeSpeed: 0,
        pinchState:
          activeFrame.status === 'ready'
            ? pinchStateFromDistance(activeFrame.derived.pinchDistance)
            : pinchStateFromKeyboard(pressedKeysRef.current),
        trackingStatus: activeFrame.status,
      })
      syncState()
    }
    const canvas = canvasRef.current
    if (canvas) {
      drawScene(canvas, engine.getState(), pointerRef.current, activeFrame.status)
      if (stageModeRef.current === 'title') {
        drawStageOverlay(canvas, 'Ready to break', 'Pinch the start button to open the match.')
      } else if (stageModeRef.current === 'paused') {
        drawStageOverlay(canvas, 'Paused table', 'Resume when your next shot is lined up.')
      }
    }
  }, [engine, syncState])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      pressedKeysRef.current.add(event.code)
      if (event.code === 'KeyR') {
        engine.reset()
        syncState()
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.code)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [engine, syncState])

  useEffect(() => {
    registerActiveGameRuntime({
      advanceTime: (ms: number) => stepSimulation(ms),
      getTextState: () => {
        const currentState = engine.getState()
        return JSON.stringify({
          route: '/play/pool',
          mode: currentState.mode,
          coordinateSystem: 'canvas origin at top-left, x increases right, y increases down',
          charge: Number(currentState.charge.toFixed(2)),
          balls: currentState.balls.map((ball) => ({
            id: ball.id,
            kind: ball.kind,
            x: Math.round(ball.x),
            y: Math.round(ball.y),
            pocketed: ball.pocketed,
          })),
          pointer: {
            x: Math.round(pointerRef.current.x),
            y: Math.round(pointerRef.current.y),
          },
          sessionMode: stageModeRef.current,
          tracking: {
            status: handFrameRef.current.status,
            source: handFrameRef.current.source,
          },
        })
      },
    })
    return () => registerActiveGameRuntime(null)
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
    return () => window.cancelAnimationFrame(animationFrameRef.current)
  }, [stepSimulation])

  const resetGame = () => {
    engine.reset()
    setStageMode('title')
    syncState()
  }

  const targetCount = state.balls.filter((ball) => ball.kind === 'target' && !ball.pocketed).length
  const displayState = state.mode === 'win' && stageMode === 'playing' ? 'win' : stageMode
  const primaryLabel =
    state.mode === 'win'
      ? 'Play again'
      : stageMode === 'playing'
        ? 'Pause game'
        : stageMode === 'paused'
          ? 'Resume game'
          : 'Start game'

  const performPrimaryAction = () => {
    if (state.mode === 'win') {
      engine.reset()
      syncState()
      setStageMode('playing')
      return
    }

    setStageMode((current) => (current === 'playing' ? 'paused' : 'playing'))
  }

  const infoPanel = (
    <section className="panel game-info-card">
      <div className="game-info-card__intro">
        <p className="game-info-card__label">Cue controls</p>
        <p>Amplified aiming makes tiny finger shifts swing the cue much farther across the felt.</p>
      </div>
      <div className="status-grid">
        <div className="status-card">
          <strong>Targets</strong>
          <span>{targetCount}</span>
        </div>
        <div className="status-card">
          <strong>Power</strong>
          <span>{Math.round(state.charge * 100)}%</span>
        </div>
        <div className="status-card">
          <strong>State</strong>
          <span>{displayState}</span>
        </div>
      </div>
      <div className="button-row">
        <button
          id="start-pool-btn"
          className="button"
          data-game-ui-id="pool-primary"
          data-game-ui-target="true"
          type="button"
          onClick={performPrimaryAction}
        >
          {primaryLabel}
        </button>
        <button
          id="reset-pool-btn"
          className="button button--ghost"
          data-game-ui-id="pool-reset"
          data-game-ui-target="true"
          type="button"
          onClick={resetGame}
        >
          Reset rack
        </button>
      </div>
      <ul className="control-list">
        <li>Point your fingertip to aim the cue. Short hand motions now cover more of the table.</li>
        <li>Pinch and hold to build power, then release to shoot once the match has started.</li>
        <li>Pinch on the visible buttons to start, pause, resume, or rerack.</li>
      </ul>
    </section>
  )

  return (
    <GameStageLayout
      accent="#3dd6c6"
      cameraCard={<GameCameraCard debugButtonId="debug-pool-btn" />}
      eyebrow="Pool"
      gameId="pool"
      infoPanel={infoPanel}
      overlay={<GameUiCursor cursor={cursor} />}
      stageRef={stageRef}
      subtitle="Sharper cue alignment and finger-first match controls."
      title="Pocket Pulse"
    >
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="game-canvas" aria-label="Pool table" />
    </GameStageLayout>
  )
}
