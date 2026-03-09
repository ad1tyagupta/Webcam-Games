import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GameCameraCard } from '../../components/GameCameraCard'
import { registerActiveGameRuntime } from '../../runtime/windowBindings'
import { useArcadeSession } from '../../session/ArcadeSession'
import type { DirectionIntent, HandFrame, PinchState, Vector2 } from '../../types/arcade'
import { createEmptyHandFrame, pinchStateFromDistance } from '../../tracking/handMath'
import { movePointer, pinchStateFromKeyboard, toCanvasPoint } from '../common/input'
import { createFruitNinjaEngine, type FruitNinjaState } from './fruitNinjaEngine'

const WIDTH = 720
const HEIGHT = 540

function drawScene(
  canvas: HTMLCanvasElement,
  state: FruitNinjaState,
  trail: Vector2[],
  pointer: Vector2,
  trackingStatus: HandFrame['status'],
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  bg.addColorStop(0, '#281a3a')
  bg.addColorStop(1, '#142844')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath()
    ctx.arc(90 + i * 92, 110 + (i % 2) * 60, 54, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let index = 1; index < trail.length; index += 1) {
    const prev = trail[index - 1]
    const current = trail[index]
    ctx.strokeStyle = `rgba(255, 244, 218, ${0.2 + (index / trail.length) * 0.65})`
    ctx.lineWidth = 10 - (trail.length - index) * 0.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(current.x, current.y)
    ctx.stroke()
  }

  for (const fruit of state.fruits) {
    ctx.fillStyle = fruit.color
    ctx.beginPath()
    ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2)
    ctx.fill()
    if (fruit.kind === 'bomb') {
      ctx.fillStyle = '#f5c34d'
      ctx.beginPath()
      ctx.arc(fruit.x, fruit.y, 8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.fillStyle = '#32e875'
  ctx.beginPath()
  ctx.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(17, 24, 49, 0.86)'
  ctx.beginPath()
  ctx.roundRect(18, 18, 214, 86, 26)
  ctx.fill()
  ctx.fillStyle = '#fff9ee'
  ctx.font = '700 18px "Trebuchet MS", sans-serif'
  ctx.fillText(`Score ${state.score}`, 40, 52)
  ctx.fillText(`Misses ${state.misses}/3`, 40, 80)

  ctx.beginPath()
  ctx.roundRect(WIDTH - 216, 18, 198, 86, 26)
  ctx.fillStyle = 'rgba(17, 24, 49, 0.86)'
  ctx.fill()
  ctx.fillStyle = '#fff9ee'
  ctx.fillText(`Mode ${state.mode}`, WIDTH - 192, 52)
  ctx.fillText(`Tracking ${trackingStatus}`, WIDTH - 192, 80)

  if (state.mode !== 'playing') {
    ctx.fillStyle = 'rgba(17, 24, 49, 0.62)'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = '#fff9ee'
    ctx.textAlign = 'center'
    ctx.font = '800 44px "Trebuchet MS", sans-serif'
    ctx.fillText('Fruit Flash', WIDTH / 2, HEIGHT / 2 - 28)
    ctx.font = '600 20px "Trebuchet MS", sans-serif'
    ctx.fillText(
      state.mode === 'gameover' ? 'Bomb or three misses. Restart to try again.' : 'Swipe through fruit with your fingertip.',
      WIDTH / 2,
      HEIGHT / 2 + 18,
    )
    ctx.textAlign = 'start'
  }
}

function sameState(a: FruitNinjaState, b: FruitNinjaState) {
  return (
    a.mode === b.mode &&
    a.score === b.score &&
    a.misses === b.misses &&
    a.trackingStatus === b.trackingStatus &&
    a.fruits.length === b.fruits.length
  )
}

export function FruitNinjaCanvas() {
  const { handFrame } = useArcadeSession()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handFrameRef = useRef<HandFrame>(createEmptyHandFrame('idle'))
  const engine = useMemo(() => createFruitNinjaEngine(), [])
  const [state, setState] = useState(() => engine.getState())
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const animationFrameRef = useRef(0)
  const lastTimestampRef = useRef(0)
  const virtualPointerRef = useRef<Vector2>({ x: WIDTH / 2, y: HEIGHT - 90 })
  const trailRef = useRef<Vector2[]>([])
  const pointerRef = useRef<Vector2>({ x: WIDTH / 2, y: HEIGHT - 90 })

  useEffect(() => {
    handFrameRef.current = handFrame
  }, [handFrame])

  const syncState = useCallback(() => {
    const nextState = engine.getState()
    setState((current) => (sameState(current, nextState) ? current : { ...nextState, fruits: [...nextState.fruits] }))
  }, [engine])

  const getPointerAndPinch = useCallback((dtMs: number) => {
    const activeFrame = handFrameRef.current
    if (activeFrame.status === 'ready') {
      return {
        pointer: toCanvasPoint(activeFrame.derived.indexTip, WIDTH, HEIGHT),
        pinchState: pinchStateFromDistance(activeFrame.derived.pinchDistance),
        swipeSpeed: Math.hypot(activeFrame.derived.swipeVelocity.x, activeFrame.derived.swipeVelocity.y),
        trackingStatus: activeFrame.status,
      }
    }

    virtualPointerRef.current = movePointer(
      virtualPointerRef.current,
      pressedKeysRef.current,
      dtMs,
      WIDTH,
      HEIGHT,
    )

    return {
      pointer: virtualPointerRef.current,
      pinchState: pinchStateFromKeyboard(pressedKeysRef.current),
      swipeSpeed: pressedKeysRef.current.has('Space') ? 1.4 : 0,
      trackingStatus: activeFrame.status,
    }
  }, [])

  const stepSimulation = useCallback((dtMs: number) => {
    const { pinchState, pointer, swipeSpeed, trackingStatus } = getPointerAndPinch(dtMs)
    pointerRef.current = pointer
    trailRef.current = [...trailRef.current.slice(-8), pointer]
    engine.update(dtMs, {
      directionIntent: 'none' as DirectionIntent,
      pointer,
      swipeSpeed,
      pinchState: pinchState as PinchState,
      trackingStatus,
    })
    syncState()
    const canvas = canvasRef.current
    if (canvas) {
      drawScene(canvas, engine.getState(), trailRef.current, pointerRef.current, trackingStatus)
    }
  }, [engine, getPointerAndPinch, syncState])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      pressedKeysRef.current.add(event.code)
      if (event.code === 'Enter') {
        engine.start()
        syncState()
      } else if (event.code === 'KeyR') {
        engine.reset()
        trailRef.current = []
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
          route: '/play/fruit-ninja',
          mode: currentState.mode,
          coordinateSystem: 'canvas origin at top-left, x increases right, y increases down',
          score: currentState.score,
          misses: currentState.misses,
          fruits: currentState.fruits.map((fruit) => ({
            id: fruit.id,
            kind: fruit.kind,
            x: Math.round(fruit.x),
            y: Math.round(fruit.y),
            radius: fruit.radius,
          })),
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
    return () => window.cancelAnimationFrame(animationFrameRef.current)
  }, [stepSimulation])

  const startGame = () => {
    engine.start()
    syncState()
  }

  const resetGame = () => {
    engine.reset()
    trailRef.current = []
    syncState()
  }

  return (
    <section className="game-layout">
      <div className="panel panel--canvas">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="game-canvas" />
      </div>
      <GameCameraCard debugButtonId="debug-fruit-btn" />
      <section className="panel game-info-card">
        <span className="eyebrow">Fruit Ninja</span>
        <h1>Fruit Flash</h1>
        <div className="status-grid">
          <div className="status-card">
            <strong>Score</strong>
            <span>{state.score}</span>
          </div>
          <div className="status-card">
            <strong>Misses</strong>
            <span>{state.misses}/3</span>
          </div>
          <div className="status-card">
            <strong>State</strong>
            <span>{state.mode}</span>
          </div>
        </div>
        <div className="button-row">
          <button id="start-fruit-btn" className="button" type="button" onClick={startGame}>
            {state.mode === 'playing' ? 'Playing' : 'Start game'}
          </button>
          <button className="button button--ghost" type="button" onClick={resetGame}>
            Reset
          </button>
        </div>
        <ul className="control-list">
          <li>Swipe your fingertip through fruit to slice it.</li>
          <li>Avoid bombs and do not miss three fruits.</li>
          <li>Keyboard fallback: move with arrows or WASD, hold Space to slice.</li>
        </ul>
        <Link className="button button--ghost" to="/">
          Back to games
        </Link>
      </section>
    </section>
  )
}
