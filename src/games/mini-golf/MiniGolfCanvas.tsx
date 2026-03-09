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
import { createMiniGolfEngine, type MiniGolfState } from './miniGolfEngine'
import { createMiniGolfGestureController } from './miniGolfGesture'

const WIDTH = 720
const HEIGHT = 540
const START_RADIUS = 88
const HAND_POINTER_GAIN = { x: 1.74, y: 1.74 }

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

function traceCourse(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.moveTo(104, 420)
  ctx.quadraticCurveTo(250, 338, 360, 350)
  ctx.quadraticCurveTo(500, 364, 606, 144)
}

function drawTerrain(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  sky.addColorStop(0, '#bfe6ff')
  sky.addColorStop(0.42, '#dff3ff')
  sky.addColorStop(0.42, '#6aa95e')
  sky.addColorStop(1, '#2f6f34')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const sunGlow = ctx.createRadialGradient(580, 90, 20, 580, 90, 220)
  sunGlow.addColorStop(0, 'rgba(255, 244, 188, 0.95)')
  sunGlow.addColorStop(1, 'rgba(255, 244, 188, 0)')
  ctx.fillStyle = sunGlow
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.beginPath()
  ctx.ellipse(162, 84, 92, 28, -0.08, 0, Math.PI * 2)
  ctx.ellipse(248, 112, 74, 22, 0.05, 0, Math.PI * 2)
  ctx.ellipse(438, 74, 88, 24, 0.02, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(18, 62, 23, 0.22)'
  ctx.beginPath()
  ctx.ellipse(352, 366, 290, 106, -0.18, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(13, 45, 19, 0.32)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 16
  ctx.strokeStyle = '#25572a'
  ctx.lineWidth = 156
  traceCourse(ctx)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#317137'
  ctx.lineWidth = 136
  traceCourse(ctx)
  ctx.stroke()
  ctx.strokeStyle = '#4e8e44'
  ctx.lineWidth = 112
  traceCourse(ctx)
  ctx.stroke()
  ctx.strokeStyle = '#6cab57'
  ctx.lineWidth = 88
  traceCourse(ctx)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(188, 225, 135, 0.72)'
  ctx.lineWidth = 56
  traceCourse(ctx)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.setLineDash([16, 18])
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
  ctx.lineWidth = 72
  traceCourse(ctx)
  ctx.stroke()
  ctx.restore()

  const bunker = ctx.createLinearGradient(0, 300, 0, 380)
  bunker.addColorStop(0, '#f7e8bf')
  bunker.addColorStop(1, '#d7b36f')
  ctx.fillStyle = bunker
  ctx.beginPath()
  ctx.ellipse(470, 312, 88, 42, -0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(248, 218, 58, 26, -0.3, 0, Math.PI * 2)
  ctx.fill()

  const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 180, WIDTH / 2, HEIGHT / 2, 460)
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(5, 14, 8, 0.28)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  drawRoundedRect(ctx, 14, 14, WIDTH - 28, HEIGHT - 28, 32)
  ctx.lineWidth = 12
  ctx.strokeStyle = 'rgba(94, 61, 38, 0.72)'
  ctx.stroke()
  drawRoundedRect(ctx, 22, 22, WIDTH - 44, HEIGHT - 44, 28)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255, 244, 216, 0.32)'
  ctx.stroke()
}

function drawBarrier(
  ctx: CanvasRenderingContext2D,
  wall: { x: number; y: number; width: number; height: number },
) {
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
  ctx.shadowBlur = 14
  ctx.shadowOffsetY = 10
  drawRoundedRect(ctx, wall.x, wall.y + 10, wall.width, wall.height, 12)
  ctx.fillStyle = '#4e3d31'
  ctx.fill()
  ctx.restore()

  drawRoundedRect(ctx, wall.x, wall.y, wall.width, wall.height, 12)
  const face = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.height)
  face.addColorStop(0, '#b49a82')
  face.addColorStop(0.28, '#8b715d')
  face.addColorStop(1, '#584538')
  ctx.fillStyle = face
  ctx.fill()

  drawRoundedRect(ctx, wall.x + 5, wall.y + 4, wall.width - 10, Math.max(8, wall.height * 0.18), 8)
  ctx.fillStyle = 'rgba(255, 244, 228, 0.24)'
  ctx.fill()

  drawRoundedRect(ctx, wall.x + 8, wall.y + wall.height * 0.45, wall.width - 16, wall.height * 0.18, 6)
  ctx.fillStyle = 'rgba(48, 31, 23, 0.18)'
  ctx.fill()
}

function drawHole(ctx: CanvasRenderingContext2D, hole: Vector2) {
  ctx.fillStyle = 'rgba(14, 25, 23, 0.42)'
  ctx.beginPath()
  ctx.ellipse(hole.x + 3, hole.y + 10, 36, 14, 0, 0, Math.PI * 2)
  ctx.fill()

  const cup = ctx.createRadialGradient(hole.x, hole.y - 4, 4, hole.x, hole.y, 30)
  cup.addColorStop(0, '#324243')
  cup.addColorStop(0.4, '#0f1519')
  cup.addColorStop(1, '#020406')
  ctx.beginPath()
  ctx.arc(hole.x, hole.y, 24, 0, Math.PI * 2)
  ctx.fillStyle = cup
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(255, 248, 228, 0.36)'
  ctx.stroke()

  const pole = ctx.createLinearGradient(hole.x, hole.y - 84, hole.x, hole.y - 18)
  pole.addColorStop(0, '#f6f2de')
  pole.addColorStop(1, '#b8af88')
  ctx.fillStyle = pole
  ctx.fillRect(hole.x - 2, hole.y - 82, 4, 66)

  ctx.beginPath()
  ctx.moveTo(hole.x + 2, hole.y - 80)
  ctx.lineTo(hole.x + 48, hole.y - 66)
  ctx.lineTo(hole.x + 6, hole.y - 48)
  ctx.lineTo(hole.x + 18, hole.y - 64)
  ctx.closePath()
  const flag = ctx.createLinearGradient(hole.x, hole.y - 76, hole.x + 44, hole.y - 56)
  flag.addColorStop(0, '#ff8e74')
  flag.addColorStop(1, '#d7423d')
  ctx.fillStyle = flag
  ctx.fill()
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Vector2) {
  ctx.fillStyle = 'rgba(20, 28, 21, 0.34)'
  ctx.beginPath()
  ctx.ellipse(ball.x + 5, ball.y + 14, 22, 9, -0.12, 0, Math.PI * 2)
  ctx.fill()

  const sphere = ctx.createRadialGradient(ball.x - 7, ball.y - 9, 2, ball.x, ball.y, 24)
  sphere.addColorStop(0, '#ffffff')
  sphere.addColorStop(0.46, '#f7f7f3')
  sphere.addColorStop(0.8, '#d7dbdc')
  sphere.addColorStop(1, '#b3bbbe')
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, 16, 0, Math.PI * 2)
  ctx.fillStyle = sphere
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(137, 148, 150, 0.65)'
  ctx.stroke()

  ctx.fillStyle = 'rgba(175, 182, 185, 0.26)'
  for (const [dx, dy] of [
    [-5, -2],
    [2, -5],
    [6, 1],
    [-2, 6],
    [4, 7],
  ]) {
    ctx.beginPath()
    ctx.arc(ball.x + dx, ball.y + dy, 1.3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawAimPreview(ctx: CanvasRenderingContext2D, state: MiniGolfState, pointer: Vector2) {
  const pointerDistance = Math.hypot(pointer.x - state.ball.x, pointer.y - state.ball.y)
  const canStart = pointerDistance <= START_RADIUS

  if (state.mode === 'aim') {
    ctx.save()
    ctx.setLineDash([8, 10])
    ctx.lineWidth = 3
    ctx.strokeStyle = canStart ? 'rgba(255, 241, 184, 0.9)' : 'rgba(255, 255, 255, 0.32)'
    ctx.beginPath()
    ctx.arc(state.ball.x, state.ball.y, START_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    const tether = ctx.createLinearGradient(state.ball.x, state.ball.y, pointer.x, pointer.y)
    tether.addColorStop(0, 'rgba(255, 241, 184, 0.16)')
    tether.addColorStop(1, 'rgba(255, 241, 184, 0.7)')
    ctx.strokeStyle = tether
    ctx.lineWidth = canStart ? 4 : 2
    ctx.beginPath()
    ctx.moveTo(state.ball.x, state.ball.y)
    ctx.lineTo(pointer.x, pointer.y)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(250, 206, 92, 0.92)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(pointer.x, pointer.y, 18, 0, Math.PI * 2)
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255, 245, 216, 0.48)'
    ctx.stroke()
    return
  }

  const dragPoint = state.dragPoint ?? pointer
  const dx = dragPoint.x - state.ball.x
  const dy = dragPoint.y - state.ball.y
  const distance = Math.max(1, Math.hypot(dx, dy))
  const direction = { x: -dx / distance, y: -dy / distance }

  const tether = ctx.createLinearGradient(state.ball.x, state.ball.y, dragPoint.x, dragPoint.y)
  tether.addColorStop(0, 'rgba(248, 215, 160, 0.25)')
  tether.addColorStop(1, 'rgba(170, 121, 65, 0.95)')
  ctx.strokeStyle = tether
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(state.ball.x, state.ball.y)
  ctx.lineTo(dragPoint.x, dragPoint.y)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(dragPoint.x, dragPoint.y, 11, 0, Math.PI * 2)
  ctx.fillStyle = '#8f5f37'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(dragPoint.x, dragPoint.y, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#d8d8d8'
  ctx.fill()

  for (let step = 1; step <= 5; step += 1) {
    const progress = step / 5
    const guideX = state.ball.x + direction.x * (40 + progress * 145)
    const guideY = state.ball.y + direction.y * (40 + progress * 145)
    ctx.beginPath()
    ctx.arc(guideX, guideY, 8 - step, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 247, 214, ${0.48 - progress * 0.18})`
    ctx.fill()
  }
}

function drawHud(ctx: CanvasRenderingContext2D, state: MiniGolfState, trackingStatus: HandFrame['status']) {
  const leftPanel = ctx.createLinearGradient(24, 18, 24, 112)
  leftPanel.addColorStop(0, 'rgba(22, 30, 34, 0.9)')
  leftPanel.addColorStop(1, 'rgba(12, 18, 20, 0.78)')
  ctx.fillStyle = leftPanel
  drawRoundedRect(ctx, 22, 18, 222, 94, 24)
  ctx.fill()

  ctx.fillStyle = '#f6f0dd'
  ctx.font = '700 18px "Trebuchet MS", sans-serif'
  ctx.fillText(`Strokes ${state.strokes}`, 42, 50)
  ctx.fillText(`Putt power ${Math.round(state.charge * 100)}%`, 42, 79)
  ctx.fillStyle = 'rgba(246, 240, 221, 0.72)'
  ctx.font = '600 14px "Trebuchet MS", sans-serif'
  ctx.fillText(state.mode === 'aim' ? 'Pinch near the ball to start a putt.' : 'Pull back while pinched, then release.', 42, 102)

  const rightPanel = ctx.createLinearGradient(WIDTH - 226, 18, WIDTH - 226, 112)
  rightPanel.addColorStop(0, 'rgba(22, 30, 34, 0.88)')
  rightPanel.addColorStop(1, 'rgba(12, 18, 20, 0.76)')
  ctx.fillStyle = rightPanel
  drawRoundedRect(ctx, WIDTH - 224, 18, 202, 94, 24)
  ctx.fill()

  ctx.fillStyle = '#f6f0dd'
  ctx.font = '700 18px "Trebuchet MS", sans-serif'
  ctx.fillText(`State ${state.mode}`, WIDTH - 200, 50)
  ctx.fillText(`Tracking ${trackingStatus}`, WIDTH - 200, 79)
}

function drawScene(
  canvas: HTMLCanvasElement,
  state: MiniGolfState,
  pointer: Vector2,
  trackingStatus: HandFrame['status'],
  walls: ReturnType<ReturnType<typeof createMiniGolfEngine>['getWalls']>,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  drawTerrain(ctx)
  walls.forEach((wall) => drawBarrier(ctx, wall))
  drawHole(ctx, state.hole)
  drawAimPreview(ctx, state, pointer)
  drawBall(ctx, state.ball)
  drawHud(ctx, state, trackingStatus)

  if (state.mode === 'win') {
    ctx.fillStyle = 'rgba(8, 12, 10, 0.46)'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    drawRoundedRect(ctx, WIDTH / 2 - 170, HEIGHT / 2 - 70, 340, 136, 30)
    ctx.fillStyle = 'rgba(20, 26, 24, 0.88)'
    ctx.fill()
    ctx.fillStyle = '#fff7df'
    ctx.textAlign = 'center'
    ctx.font = '800 42px "Trebuchet MS", sans-serif'
    ctx.fillText('Putt sunk', WIDTH / 2, HEIGHT / 2 - 8)
    ctx.font = '600 20px "Trebuchet MS", sans-serif'
    ctx.fillText(`Finished in ${state.strokes} stroke${state.strokes === 1 ? '' : 's'}.`, WIDTH / 2, HEIGHT / 2 + 28)
    ctx.textAlign = 'start'
  }
}

function drawStageOverlay(canvas: HTMLCanvasElement, title: string, detail: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.fillStyle = 'rgba(5, 18, 10, 0.48)'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = '#f7f2de'
  ctx.textAlign = 'center'
  ctx.font = '800 42px "Trebuchet MS", sans-serif'
  ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 14)
  ctx.font = '600 18px "Trebuchet MS", sans-serif'
  ctx.fillText(detail, WIDTH / 2, HEIGHT / 2 + 24)
  ctx.textAlign = 'start'
}

function sameState(a: MiniGolfState, b: MiniGolfState) {
  return (
    a.mode === b.mode &&
    a.strokes === b.strokes &&
    a.charge === b.charge &&
    a.trackingStatus === b.trackingStatus &&
    Math.round(a.ball.x) === Math.round(b.ball.x) &&
    Math.round(a.ball.y) === Math.round(b.ball.y) &&
    Math.round((a.dragPoint?.x ?? -1) * 10) === Math.round((b.dragPoint?.x ?? -1) * 10) &&
    Math.round((a.dragPoint?.y ?? -1) * 10) === Math.round((b.dragPoint?.y ?? -1) * 10)
  )
}

export function MiniGolfCanvas() {
  const { handFrame } = useArcadeSession()
  const stageRef = useRef<HTMLElement | null>(null)
  const handFrameRef = useRef<HandFrame>(createEmptyHandFrame('idle'))
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerRef = useRef<Vector2>({ x: 220, y: 360 })
  const virtualPointerRef = useRef<Vector2>({ x: 220, y: 360 })
  const animationFrameRef = useRef(0)
  const lastTimestampRef = useRef(0)
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const stageModeRef = useRef<'title' | 'playing' | 'paused'>('title')
  const engine = useMemo(() => createMiniGolfEngine(), [])
  const gestureController = useMemo(() => createMiniGolfGestureController({ startRadius: START_RADIUS }), [])
  const walls = useMemo(() => engine.getWalls(), [engine])
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
    setState((current) =>
      sameState(current, nextState)
        ? current
        : {
            ...nextState,
            ball: { ...nextState.ball },
            velocity: { ...nextState.velocity },
            dragPoint: nextState.dragPoint ? { ...nextState.dragPoint } : null,
          },
    )
  }, [engine])

  const resetGame = useCallback(() => {
    engine.reset()
    gestureController.reset()
    setStageMode('title')
    pointerRef.current = { x: 220, y: 360 }
    virtualPointerRef.current = { x: 220, y: 360 }
    syncState()
  }, [engine, gestureController, syncState])

  const stepSimulation = useCallback((dtMs: number) => {
    const activeFrame = handFrameRef.current
    const usingTrackedHand = activeFrame.status === 'ready'
    const rawPinchState = usingTrackedHand
      ? pinchStateFromDistance(activeFrame.derived.pinchDistance)
      : pinchStateFromKeyboard(pressedKeysRef.current)
    const pointer = usingTrackedHand
      ? toCanvasPoint(
          amplifyNormalizedPoint(
            rawPinchState === 'pinched' ? activeFrame.derived.pinchCenter : activeFrame.derived.indexTip,
            HAND_POINTER_GAIN,
          ),
          WIDTH,
          HEIGHT,
        )
      : (virtualPointerRef.current = movePointer(
          virtualPointerRef.current,
          pressedKeysRef.current,
          dtMs,
          WIDTH,
          HEIGHT,
        ))

    pointerRef.current = pointer

    if (stageModeRef.current === 'playing') {
      const currentState = engine.getState()
      const shotEvent = gestureController.update({
        dtMs,
        rawPinchState,
        trackingStatus: usingTrackedHand ? activeFrame.status : 'ready',
        pointer,
        ball: currentState.ball,
        enabled: currentState.mode !== 'rolling' && currentState.mode !== 'win',
      })

      engine.update(dtMs, {
        directionIntent: 'none',
        pointer,
        swipeSpeed: 0,
        pinchState: rawPinchState,
        trackingStatus: activeFrame.status,
        shotEvent,
      })
      syncState()
    } else {
      gestureController.reset()
    }

    const canvas = canvasRef.current
    if (canvas) {
      drawScene(canvas, engine.getState(), pointerRef.current, activeFrame.status, walls)
      if (stageModeRef.current === 'title') {
        drawStageOverlay(canvas, 'Course ready', 'Pinch the start button to step onto the first hole.')
      } else if (stageModeRef.current === 'paused') {
        drawStageOverlay(canvas, 'Paused round', 'Resume when your next putt line feels right.')
      }
    }
  }, [engine, gestureController, syncState, walls])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      pressedKeysRef.current.add(event.code)
      if (event.code === 'KeyR') {
        resetGame()
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
  }, [resetGame])

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
          hole: {
            x: currentState.hole.x,
            y: currentState.hole.y,
          },
          dragPoint: currentState.dragPoint
            ? {
                x: Math.round(currentState.dragPoint.x),
                y: Math.round(currentState.dragPoint.y),
              }
            : null,
          pointer: {
            x: Math.round(pointerRef.current.x),
            y: Math.round(pointerRef.current.y),
          },
          shotPreviewActive: currentState.mode === 'pinched' || currentState.mode === 'dragging',
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
      gestureController.reset()
      syncState()
      setStageMode('playing')
      return
    }

    setStageMode((current) => (current === 'playing' ? 'paused' : 'playing'))
  }

  const infoPanel = (
    <section className="panel game-info-card">
      <div className="game-info-card__intro">
        <p className="game-info-card__label">Putt controls</p>
        <p>Amplified finger travel lets tiny corrections shift the putter line much more aggressively.</p>
      </div>
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
          <span>{displayState}</span>
        </div>
      </div>
      <div className="button-row">
        <button
          id="start-golf-btn"
          className="button"
          data-game-ui-id="golf-primary"
          data-game-ui-target="true"
          type="button"
          onClick={performPrimaryAction}
        >
          {primaryLabel}
        </button>
        <button
          id="reset-golf-btn"
          className="button button--ghost"
          data-game-ui-id="golf-reset"
          data-game-ui-target="true"
          type="button"
          onClick={resetGame}
        >
          Reset hole
        </button>
      </div>
      <ul className="control-list">
        <li>Pinch close to the ball to grab the putt after the round has started.</li>
        <li>While pinched, drag backward to set direction and power with amplified pointer response.</li>
        <li>Pinch on the visible buttons to start, pause, resume, or reset the hole.</li>
      </ul>
    </section>
  )

  return (
    <GameStageLayout
      accent="#7bd968"
      cameraCard={<GameCameraCard debugButtonId="debug-golf-btn" />}
      eyebrow="Mini Golf"
      gameId="mini-golf"
      infoPanel={infoPanel}
      overlay={<GameUiCursor cursor={cursor} />}
      stageRef={stageRef}
      subtitle="Precision putting with finger-first controls and a stronger response curve."
      title="Putt Parade"
    >
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="game-canvas"
        aria-label="Mini golf course"
      />
    </GameStageLayout>
  )
}
