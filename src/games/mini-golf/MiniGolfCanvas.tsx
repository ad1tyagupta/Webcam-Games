import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GameCameraCard } from '../../components/GameCameraCard'
import { registerActiveGameRuntime } from '../../runtime/windowBindings'
import { useArcadeSession } from '../../session/ArcadeSession'
import type { HandFrame, Vector2 } from '../../types/arcade'
import { createEmptyHandFrame, pinchStateFromDistance } from '../../tracking/handMath'
import { movePointer, pinchStateFromKeyboard, toCanvasPoint } from '../common/input'
import { createMiniGolfEngine, type MiniGolfState } from './miniGolfEngine'

const WIDTH = 720
const HEIGHT = 540

function drawScene(
  canvas: HTMLCanvasElement,
  state: MiniGolfState,
  walls: Array<{ x: number; y: number; width: number; height: number }>,
  pointer: Vector2,
  trackingStatus: HandFrame['status'],
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  bg.addColorStop(0, '#bff09d')
  bg.addColorStop(1, '#54bee7')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.strokeStyle = '#fff4dc'
  ctx.lineWidth = 26
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(92, 420)
  ctx.quadraticCurveTo(250, 332, 360, 350)
  ctx.quadraticCurveTo(500, 370, 600, 140)
  ctx.stroke()

  ctx.strokeStyle = '#68d76d'
  ctx.lineWidth = 18
  ctx.beginPath()
  ctx.moveTo(92, 420)
  ctx.quadraticCurveTo(250, 332, 360, 350)
  ctx.quadraticCurveTo(500, 370, 600, 140)
  ctx.stroke()

  for (const wall of walls) {
    ctx.fillStyle = '#184550'
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height)
  }

  ctx.fillStyle = '#143850'
  ctx.beginPath()
  ctx.arc(state.hole.x, state.hole.y, 24, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ff697b'
  ctx.fillRect(state.hole.x - 2, state.hole.y - 64, 5, 64)
  ctx.beginPath()
  ctx.moveTo(state.hole.x + 3, state.hole.y - 64)
  ctx.lineTo(state.hole.x + 42, state.hole.y - 50)
  ctx.lineTo(state.hole.x + 3, state.hole.y - 34)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#fff9ee'
  ctx.beginPath()
  ctx.arc(state.ball.x, state.ball.y, 16, 0, Math.PI * 2)
  ctx.fill()

  if (state.mode !== 'rolling' && state.mode !== 'win') {
    ctx.strokeStyle = '#f1d2ad'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(state.ball.x, state.ball.y)
    ctx.lineTo(pointer.x, pointer.y)
    ctx.stroke()
  }

  ctx.fillStyle = '#32e875'
  ctx.beginPath()
  ctx.arc(pointer.x, pointer.y, 9, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(16, 29, 55, 0.82)'
  ctx.beginPath()
  ctx.roundRect(18, 18, 206, 84, 24)
  ctx.fill()
  ctx.fillStyle = '#fff9ee'
  ctx.font = '700 18px "Trebuchet MS", sans-serif'
  ctx.fillText(`Strokes ${state.strokes}`, 40, 50)
  ctx.fillText(`Power ${Math.round(state.charge * 100)}%`, 40, 80)

  ctx.beginPath()
  ctx.roundRect(WIDTH - 214, 18, 196, 84, 24)
  ctx.fillStyle = 'rgba(16, 29, 55, 0.82)'
  ctx.fill()
  ctx.fillStyle = '#fff9ee'
  ctx.fillText(`Mode ${state.mode}`, WIDTH - 192, 50)
  ctx.fillText(`Tracking ${trackingStatus}`, WIDTH - 192, 80)

  if (state.mode === 'win') {
    ctx.fillStyle = 'rgba(16, 29, 55, 0.58)'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = '#fff9ee'
    ctx.textAlign = 'center'
    ctx.font = '800 44px "Trebuchet MS", sans-serif'
    ctx.fillText('Putt made', WIDTH / 2, HEIGHT / 2 - 10)
    ctx.font = '600 20px "Trebuchet MS", sans-serif'
    ctx.fillText(`Finished in ${state.strokes} stroke${state.strokes === 1 ? '' : 's'}.`, WIDTH / 2, HEIGHT / 2 + 26)
    ctx.textAlign = 'start'
  }
}

function sameState(a: MiniGolfState, b: MiniGolfState) {
  return (
    a.mode === b.mode &&
    a.strokes === b.strokes &&
    a.charge === b.charge &&
    a.trackingStatus === b.trackingStatus &&
    Math.round(a.ball.x) === Math.round(b.ball.x) &&
    Math.round(a.ball.y) === Math.round(b.ball.y)
  )
}

export function MiniGolfCanvas() {
  const { handFrame } = useArcadeSession()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handFrameRef = useRef<HandFrame>(createEmptyHandFrame('idle'))
  const pointerRef = useRef<Vector2>({ x: 220, y: 360 })
  const virtualPointerRef = useRef<Vector2>({ x: 220, y: 360 })
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const animationFrameRef = useRef(0)
  const lastTimestampRef = useRef(0)
  const engine = useMemo(() => createMiniGolfEngine(), [])
  const [state, setState] = useState(() => engine.getState())
  const walls = engine.getWalls()

  useEffect(() => {
    handFrameRef.current = handFrame
  }, [handFrame])

  const syncState = useCallback(() => {
    const nextState = engine.getState()
    setState((current) => (sameState(current, nextState) ? current : { ...nextState, ball: { ...nextState.ball }, velocity: { ...nextState.velocity } }))
  }, [engine])

  const stepSimulation = useCallback((dtMs: number) => {
    const activeFrame = handFrameRef.current
    const pointer =
      activeFrame.status === 'ready'
        ? toCanvasPoint(activeFrame.derived.indexTip, WIDTH, HEIGHT)
        : (virtualPointerRef.current = movePointer(
            virtualPointerRef.current,
            pressedKeysRef.current,
            dtMs,
            WIDTH,
            HEIGHT,
          ))
    pointerRef.current = pointer
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
    const canvas = canvasRef.current
    if (canvas) {
      drawScene(canvas, engine.getState(), walls, pointerRef.current, activeFrame.status)
    }
  }, [engine, syncState, walls])

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
          route: '/play/mini-golf',
          mode: currentState.mode,
          coordinateSystem: 'canvas origin at top-left, x increases right, y increases down',
          strokes: currentState.strokes,
          charge: Number(currentState.charge.toFixed(2)),
          ball: {
            x: Math.round(currentState.ball.x),
            y: Math.round(currentState.ball.y),
          },
          hole: currentState.hole,
          pointer: {
            x: Math.round(pointerRef.current.x),
            y: Math.round(pointerRef.current.y),
          },
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
    syncState()
  }

  return (
    <section className="game-layout">
      <div className="panel panel--canvas">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="game-canvas" />
      </div>
      <GameCameraCard debugButtonId="debug-golf-btn" />
      <section className="panel game-info-card">
        <span className="eyebrow">Mini Golf</span>
        <h1>Putt Parade</h1>
        <div className="status-grid">
          <div className="status-card">
            <strong>Strokes</strong>
            <span>{state.strokes}</span>
          </div>
          <div className="status-card">
            <strong>Power</strong>
            <span>{Math.round(state.charge * 100)}%</span>
          </div>
          <div className="status-card">
            <strong>State</strong>
            <span>{state.mode}</span>
          </div>
        </div>
        <div className="button-row">
          <button className="button button--ghost" type="button" onClick={resetGame}>
            Reset hole
          </button>
        </div>
        <ul className="control-list">
          <li>Point your fingertip where you want the putt to go.</li>
          <li>Pinch and hold for power, then release to strike the ball.</li>
          <li>Keyboard fallback: move aim with arrows or WASD, hold Space to charge.</li>
        </ul>
        <Link className="button button--ghost" to="/">
          Back to games
        </Link>
      </section>
    </section>
  )
}
