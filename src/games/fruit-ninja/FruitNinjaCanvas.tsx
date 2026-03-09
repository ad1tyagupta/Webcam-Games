import { useEffect, useMemo, useRef, useState } from 'react'
import { GameCameraCard } from '../../components/GameCameraCard'
import { GameStageLayout } from '../../components/GameStageLayout'
import { GameUiCursor } from '../../components/GameUiCursor'
import { registerActiveGameRuntime } from '../../runtime/windowBindings'
import { useArcadeSession } from '../../session/ArcadeSession'
import type { HandFrame, PinchState, Vector2 } from '../../types/arcade'
import { createEmptyHandFrame, pinchStateFromDistance } from '../../tracking/handMath'
import { amplifyNormalizedPoint, clamp, movePointer, pinchStateFromKeyboard, toCanvasPoint } from '../common/input'
import { useGameUiCursor } from '../common/useGameUiCursor'
import { createFruitNinjaEngine, type FruitEntity, type FruitNinjaState, type FruitType } from './fruitNinjaEngine'

const WIDTH = 720
const HEIGHT = 540
const TRAIL_WINDOW_MS = 160
const EFFECT_DURATION_MS = 420
const POINTER_SAMPLE_DISTANCE = 8
const POINTER_SAMPLE_INTERVAL_MS = 28
const HAND_POINTER_GAIN = { x: 1.76, y: 1.84 }

type ButtonAction = 'pause' | 'restart' | 'resume' | 'start'
type PointerSource = 'hand' | 'keyboard' | 'mouse'

interface CanvasButton {
  action: ButtonAction
  height: number
  id: string
  label: string
  variant: 'ghost' | 'primary'
  width: number
  x: number
  y: number
}

interface BurstEffect {
  ageMs: number
  color: string
  fruitType: FruitType
  id: number
  x: number
  y: number
}

interface PointerSample {
  point: Vector2
  timestampMs: number
}

interface MouseState {
  active: boolean
  down: boolean
  lastMoveMs: number
  pointer: Vector2
}

interface InputSnapshot {
  pinchState: PinchState
  pointer: Vector2
  slashActive: boolean
  slashPath: Vector2[]
  source: PointerSource
  swipeSpeed: number
  trackingStatus: HandFrame['status']
}

function distance(a: Vector2, b: Vector2) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function getCanvasButtons(state: FruitNinjaState): CanvasButton[] {
  if (state.mode === 'title') {
    return [
      {
        id: 'start',
        label: 'Start Game',
        action: 'start',
        variant: 'primary',
        x: WIDTH / 2 - 118,
        y: HEIGHT / 2 + 52,
        width: 236,
        height: 64,
      },
    ]
  }

  if (state.mode === 'paused') {
    return [
      {
        id: 'resume',
        label: 'Resume',
        action: 'resume',
        variant: 'primary',
        x: WIDTH / 2 - 112,
        y: HEIGHT / 2 + 34,
        width: 224,
        height: 60,
      },
      {
        id: 'restart',
        label: 'Restart',
        action: 'restart',
        variant: 'ghost',
        x: WIDTH / 2 - 96,
        y: HEIGHT / 2 + 108,
        width: 192,
        height: 52,
      },
    ]
  }

  if (state.mode === 'gameover') {
    return [
      {
        id: 'restart',
        label: 'Play Again',
        action: 'restart',
        variant: 'primary',
        x: WIDTH / 2 - 116,
        y: HEIGHT / 2 + 70,
        width: 232,
        height: 62,
      },
    ]
  }

  return [
    {
      id: 'pause',
      label: 'Pause',
      action: 'pause',
      variant: 'ghost',
      x: WIDTH - 166,
      y: 24,
      width: 142,
      height: 48,
    },
  ]
}

function isPointInButton(point: Vector2, button: CanvasButton) {
  return (
    point.x >= button.x &&
    point.x <= button.x + button.width &&
    point.y >= button.y &&
    point.y <= button.y + button.height
  )
}

function findHoveredButton(point: Vector2, buttons: CanvasButton[]) {
  return buttons.find((button) => isPointInButton(point, button)) ?? null
}

function getPointerFromEvent(canvas: HTMLCanvasElement, event: PointerEvent | React.PointerEvent<HTMLCanvasElement>) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * WIDTH, 24, WIDTH - 24),
    y: clamp(((event.clientY - rect.top) / rect.height) * HEIGHT, 24, HEIGHT - 24),
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.beginPath()
  ctx.arc(-20, 10, 24, 0, Math.PI * 2)
  ctx.arc(12, -2, 30, 0, Math.PI * 2)
  ctx.arc(44, 12, 22, 0, Math.PI * 2)
  ctx.arc(8, 18, 32, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  sky.addColorStop(0, '#fff5bd')
  sky.addColorStop(0.38, '#ffb76e')
  sky.addColorStop(1, '#ff6f5e')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const glow = ctx.createRadialGradient(WIDTH - 90, 70, 8, WIDTH - 90, 70, 180)
  glow.addColorStop(0, 'rgba(255, 255, 244, 0.95)')
  glow.addColorStop(0.45, 'rgba(255, 243, 192, 0.35)')
  glow.addColorStop(1, 'rgba(255, 243, 192, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(WIDTH - 320, -70, 360, 320)

  drawCloud(ctx, 118, 80, 1.2)
  drawCloud(ctx, 480, 112, 0.95)
  drawCloud(ctx, 612, 76, 0.7)

  ctx.save()
  ctx.globalAlpha = 0.16
  for (let index = 0; index < 9; index += 1) {
    ctx.fillStyle = '#fff7d8'
    ctx.beginPath()
    ctx.moveTo(48 + index * 76, 164)
    ctx.lineTo(76 + index * 76, 214)
    ctx.lineTo(20 + index * 76, 214)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  const counter = ctx.createLinearGradient(0, HEIGHT - 120, 0, HEIGHT)
  counter.addColorStop(0, '#8c4b2d')
  counter.addColorStop(1, '#612a17')
  ctx.fillStyle = counter
  ctx.fillRect(0, HEIGHT - 118, WIDTH, 118)

  ctx.strokeStyle = 'rgba(255, 236, 210, 0.18)'
  ctx.lineWidth = 2
  for (let index = 0; index < 7; index += 1) {
    const x = 52 + index * 98
    ctx.beginPath()
    ctx.moveTo(x, HEIGHT - 118)
    ctx.lineTo(x - 24, HEIGHT)
    ctx.stroke()
  }
}

function drawBurstEffect(ctx: CanvasRenderingContext2D, effect: BurstEffect) {
  const progress = clamp(effect.ageMs / EFFECT_DURATION_MS, 0, 1)
  const alpha = 1 - progress
  const radius = 18 + progress * 54
  ctx.save()
  ctx.translate(effect.x, effect.y)
  ctx.globalAlpha = alpha * 0.9

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const x = Math.cos(angle) * radius * 0.55
    const y = Math.sin(angle) * radius * 0.55
    ctx.fillStyle = effect.color
    ctx.beginPath()
    ctx.arc(x, y, 6 + (1 - progress) * 5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.75})`
  ctx.lineWidth = 4 + (1 - progress) * 6
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.55, 0.1, Math.PI * 1.7)
  ctx.stroke()

  if (effect.fruitType === 'watermelon' || effect.fruitType === 'kiwi') {
    ctx.fillStyle = `rgba(44, 64, 30, ${alpha * 0.75})`
    for (let index = 0; index < 5; index += 1) {
      ctx.beginPath()
      ctx.ellipse(-18 + index * 9, -4 + (index % 2) * 7, 2.2, 3.8, 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

function drawFruitBody(ctx: CanvasRenderingContext2D, fruit: FruitEntity) {
  const gradient = ctx.createLinearGradient(-fruit.radius, -fruit.radius, fruit.radius, fruit.radius)

  if (fruit.fruitType === 'apple' || fruit.fruitType === 'strawberry') {
    gradient.addColorStop(0, '#ffd67d')
    gradient.addColorStop(0.25, '#ff7172')
    gradient.addColorStop(1, '#d62849')
  } else if (fruit.fruitType === 'orange') {
    gradient.addColorStop(0, '#ffe29b')
    gradient.addColorStop(0.35, '#ffb34d')
    gradient.addColorStop(1, '#f36b2d')
  } else if (fruit.fruitType === 'lemon') {
    gradient.addColorStop(0, '#fff6aa')
    gradient.addColorStop(1, '#f1ce49')
  } else if (fruit.fruitType === 'kiwi') {
    gradient.addColorStop(0, '#c4f98a')
    gradient.addColorStop(1, '#4ca243')
  } else if (fruit.fruitType === 'watermelon') {
    gradient.addColorStop(0, '#ff8f88')
    gradient.addColorStop(1, '#ef425c')
  } else {
    gradient.addColorStop(0, '#ffe28d')
    gradient.addColorStop(1, '#f7c94a')
  }

  ctx.fillStyle = gradient

  if (fruit.fruitType === 'banana') {
    ctx.beginPath()
    ctx.moveTo(-fruit.radius * 0.75, -fruit.radius * 0.35)
    ctx.quadraticCurveTo(fruit.radius * 0.05, -fruit.radius * 1.2, fruit.radius * 0.82, -fruit.radius * 0.24)
    ctx.quadraticCurveTo(fruit.radius * 0.18, fruit.radius * 0.9, -fruit.radius * 0.86, fruit.radius * 0.18)
    ctx.quadraticCurveTo(-fruit.radius * 0.25, fruit.radius * 0.24, fruit.radius * 0.46, -fruit.radius * 0.16)
    ctx.quadraticCurveTo(fruit.radius * 0.1, -fruit.radius * 0.45, -fruit.radius * 0.75, -fruit.radius * 0.35)
    ctx.fill()
    return
  }

  if (fruit.fruitType === 'strawberry') {
    ctx.beginPath()
    ctx.moveTo(0, -fruit.radius * 0.92)
    ctx.bezierCurveTo(fruit.radius * 0.78, -fruit.radius * 0.66, fruit.radius * 0.9, 0, 0, fruit.radius)
    ctx.bezierCurveTo(-fruit.radius * 0.9, 0, -fruit.radius * 0.78, -fruit.radius * 0.66, 0, -fruit.radius * 0.92)
    ctx.fill()
    return
  }

  ctx.beginPath()
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawFruitDetails(ctx: CanvasRenderingContext2D, fruit: FruitEntity) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.beginPath()
  ctx.ellipse(-fruit.radius * 0.22, -fruit.radius * 0.32, fruit.radius * 0.34, fruit.radius * 0.2, -0.8, 0, Math.PI * 2)
  ctx.fill()

  if (fruit.fruitType === 'watermelon') {
    ctx.lineWidth = 10
    ctx.strokeStyle = '#2b8c44'
    ctx.beginPath()
    ctx.arc(0, 0, fruit.radius - 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#2d3425'
    for (let index = 0; index < 6; index += 1) {
      ctx.beginPath()
      ctx.ellipse(-14 + index * 5, -5 + (index % 2) * 10, 2, 4, 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (fruit.fruitType === 'kiwi') {
    ctx.fillStyle = '#f7fbdd'
    ctx.beginPath()
    ctx.arc(0, 0, fruit.radius * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2a3d1a'
    for (let index = 0; index < 9; index += 1) {
      const angle = (Math.PI * 2 * index) / 9
      ctx.beginPath()
      ctx.ellipse(Math.cos(angle) * fruit.radius * 0.54, Math.sin(angle) * fruit.radius * 0.54, 1.8, 3.4, angle, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (fruit.fruitType === 'orange') {
    ctx.strokeStyle = 'rgba(255, 234, 188, 0.65)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, fruit.radius * 0.82, 0, Math.PI * 2)
    ctx.stroke()
  } else if (fruit.fruitType === 'lemon') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.ellipse(0, 0, fruit.radius * 0.76, fruit.radius * 0.52, 0.25, 0, Math.PI * 2)
    ctx.stroke()
  } else if (fruit.fruitType === 'strawberry') {
    ctx.fillStyle = 'rgba(255, 241, 183, 0.9)'
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 3 + (row % 2); column += 1) {
        ctx.beginPath()
        ctx.ellipse(-14 + column * 10 + (row % 2) * 4, -10 + row * 9, 1.8, 3, 0.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  if (fruit.fruitType !== 'banana') {
    ctx.strokeStyle = '#6f3f25'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, -fruit.radius + 4)
    ctx.lineTo(0, -fruit.radius - 10)
    ctx.stroke()
  }

  ctx.fillStyle = '#52b957'
  ctx.beginPath()
  ctx.ellipse(fruit.radius * 0.18, -fruit.radius - 8, 10, 6, -0.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawBomb(ctx: CanvasRenderingContext2D, fruit: FruitEntity) {
  const shell = ctx.createRadialGradient(-8, -12, 6, 0, 0, fruit.radius + 12)
  shell.addColorStop(0, '#4e5869')
  shell.addColorStop(1, '#171f2d')
  ctx.fillStyle = shell
  ctx.beginPath()
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#ffe59e'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(4, -fruit.radius + 2)
  ctx.quadraticCurveTo(16, -fruit.radius - 18, 4, -fruit.radius - 24)
  ctx.stroke()

  ctx.fillStyle = '#fff8d6'
  ctx.beginPath()
  ctx.arc(-6, -5, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ffb648'
  for (let index = 0; index < 4; index += 1) {
    const angle = (Math.PI * 2 * index) / 4
    ctx.beginPath()
    ctx.ellipse(8 + Math.cos(angle) * 7, -fruit.radius - 24 + Math.sin(angle) * 7, 2, 6, angle, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawFruit(ctx: CanvasRenderingContext2D, fruit: FruitEntity) {
  ctx.save()
  ctx.translate(fruit.x, fruit.y)
  ctx.rotate((fruit.id * 0.37) + ((fruit.x + fruit.y) * 0.003))

  if (fruit.kind === 'bomb') {
    drawBomb(ctx, fruit)
    ctx.restore()
    return
  }

  drawFruitBody(ctx, fruit)
  drawFruitDetails(ctx, fruit)
  ctx.restore()
}

function drawSlashTrail(ctx: CanvasRenderingContext2D, trail: PointerSample[]) {
  if (trail.length < 2) {
    return
  }

  ctx.save()
  ctx.lineCap = 'round'
  for (let index = 1; index < trail.length; index += 1) {
    const previous = trail[index - 1]
    const current = trail[index]
    const alpha = index / trail.length
    ctx.strokeStyle = `rgba(255, 252, 235, ${0.24 + alpha * 0.62})`
    ctx.lineWidth = 3 + alpha * 12
    ctx.beginPath()
    ctx.moveTo(previous.point.x, previous.point.y)
    ctx.lineTo(current.point.x, current.point.y)
    ctx.stroke()

    ctx.strokeStyle = `rgba(66, 242, 255, ${0.08 + alpha * 0.24})`
    ctx.lineWidth = 10 + alpha * 16
    ctx.beginPath()
    ctx.moveTo(previous.point.x, previous.point.y)
    ctx.lineTo(current.point.x, current.point.y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawPointer(ctx: CanvasRenderingContext2D, pointer: Vector2) {
  ctx.save()
  const glow = ctx.createRadialGradient(pointer.x, pointer.y, 2, pointer.x, pointer.y, 34)
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  glow.addColorStop(0.35, 'rgba(78, 246, 255, 0.68)')
  glow.addColorStop(1, 'rgba(78, 246, 255, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(pointer.x, pointer.y, 34, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = '#48efff'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(pointer.x - 20, pointer.y + 20)
  ctx.lineTo(pointer.x + 22, pointer.y - 22)
  ctx.stroke()
  ctx.restore()
}

function drawGlassCard(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(28, 34, 53, 0.3)'
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, 24)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

function drawLivesMeter(ctx: CanvasRenderingContext2D, livesRemaining: number) {
  ctx.save()
  ctx.font = '700 18px "Avenir Next", "Trebuchet MS", sans-serif'
  ctx.fillStyle = '#fff8ea'
  ctx.fillText('Lives', 136, 52)

  for (let index = 0; index < 7; index += 1) {
    const active = index < livesRemaining
    ctx.fillStyle = active ? '#ffcb4c' : 'rgba(255, 248, 234, 0.22)'
    ctx.beginPath()
    ctx.arc(164 + index * 18, 82, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = active ? '#52b957' : 'rgba(255, 248, 234, 0.12)'
    ctx.beginPath()
    ctx.ellipse(167 + index * 18, 74, 4.2, 2.4, -0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawCanvasButton(
  ctx: CanvasRenderingContext2D,
  button: CanvasButton,
  hovered: boolean,
) {
  const gradient = ctx.createLinearGradient(button.x, button.y, button.x + button.width, button.y + button.height)
  if (button.variant === 'primary') {
    gradient.addColorStop(0, hovered ? '#ffe56f' : '#ffd556')
    gradient.addColorStop(1, hovered ? '#ff9654' : '#ff8843')
  } else {
    gradient.addColorStop(0, hovered ? 'rgba(255, 247, 214, 0.88)' : 'rgba(27, 36, 55, 0.7)')
    gradient.addColorStop(1, hovered ? 'rgba(255, 214, 128, 0.86)' : 'rgba(27, 36, 55, 0.7)')
  }

  ctx.save()
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(button.x, button.y, button.width, button.height, 22)
  ctx.fill()
  ctx.strokeStyle = hovered ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.32)'
  ctx.lineWidth = hovered ? 3 : 1.5
  ctx.stroke()

  ctx.fillStyle = button.variant === 'primary' ? '#5b260f' : '#fff8ea'
  ctx.font = '800 20px "Avenir Next", "Trebuchet MS", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(button.label, button.x + (button.width / 2), button.y + (button.height / 2))
  ctx.restore()
}

function drawOverlayCard(
  ctx: CanvasRenderingContext2D,
  title: string,
  body: string,
  buttons: CanvasButton[],
  hoveredButtonId: string | null,
) {
  ctx.save()
  ctx.fillStyle = 'rgba(12, 18, 30, 0.28)'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = 'rgba(28, 34, 53, 0.58)'
  ctx.beginPath()
  ctx.roundRect(WIDTH / 2 - 170, HEIGHT / 2 - 110, 340, 232, 34)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#fff8ea'
  ctx.textAlign = 'center'
  ctx.font = '800 44px "Avenir Next", "Trebuchet MS", sans-serif'
  ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 30)
  ctx.font = '600 19px "Avenir Next", "Trebuchet MS", sans-serif'
  ctx.fillText(body, WIDTH / 2, HEIGHT / 2 + 6)

  buttons.forEach((button) => {
    drawCanvasButton(ctx, button, hoveredButtonId === button.id)
  })

  ctx.restore()
}

function drawScene(
  canvas: HTMLCanvasElement,
  state: FruitNinjaState,
  trail: PointerSample[],
  pointer: Vector2,
  hoveredButtonId: string | null,
  burstEffects: BurstEffect[],
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  drawBackground(ctx)

  burstEffects.forEach((effect) => {
    drawBurstEffect(ctx, effect)
  })

  state.fruits.forEach((fruit) => {
    drawFruit(ctx, fruit)
  })

  drawSlashTrail(ctx, trail)
  drawPointer(ctx, pointer)

  drawGlassCard(ctx, 24, 24, 286, 92)
  ctx.fillStyle = '#fff8ea'
  ctx.font = '700 18px "Avenir Next", "Trebuchet MS", sans-serif'
  ctx.fillText('Score', 42, 52)
  ctx.font = '800 32px "Avenir Next", "Trebuchet MS", sans-serif'
  ctx.fillText(String(state.score), 42, 88)
  drawLivesMeter(ctx, state.livesRemaining)

  drawGlassCard(ctx, 326, 24, 180, 92)
  ctx.fillStyle = '#fff8ea'
  ctx.font = '700 18px "Avenir Next", "Trebuchet MS", sans-serif'
  ctx.fillText('Tracking', 344, 52)
  ctx.font = '800 22px "Avenir Next", "Trebuchet MS", sans-serif'
  ctx.fillText(state.trackingStatus, 344, 84)

  const playingButtons = state.mode === 'playing' ? getCanvasButtons(state) : []
  playingButtons.forEach((button) => {
    drawCanvasButton(ctx, button, hoveredButtonId === button.id)
  })

  if (state.trackingStatus !== 'ready' && state.mode === 'playing') {
    ctx.fillStyle = 'rgba(255, 248, 234, 0.85)'
    ctx.font = '600 18px "Avenir Next", "Trebuchet MS", sans-serif'
    ctx.fillText('Tracking unavailable. Use mouse or arrow keys + space.', 24, HEIGHT - 134)
  }

  if (state.mode === 'title') {
    drawOverlayCard(
      ctx,
      'Fruit Splash',
      'Swipe fast to slice fruit. Pinch or click the button to begin.',
      getCanvasButtons(state),
      hoveredButtonId,
    )
  } else if (state.mode === 'paused') {
    drawOverlayCard(
      ctx,
      'Paused',
      'Hold steady, then resume when you are ready.',
      getCanvasButtons(state),
      hoveredButtonId,
    )
  } else if (state.mode === 'gameover') {
    drawOverlayCard(
      ctx,
      'Round Over',
      `Score ${state.score} | Misses ${state.misses}/7`,
      getCanvasButtons(state),
      hoveredButtonId,
    )
  }
}

function sameState(a: FruitNinjaState, b: FruitNinjaState) {
  return (
    a.mode === b.mode &&
    a.score === b.score &&
    a.misses === b.misses &&
    a.livesRemaining === b.livesRemaining &&
    a.trackingStatus === b.trackingStatus &&
    a.fruits.length === b.fruits.length
  )
}

export function FruitNinjaCanvas() {
  const { handFrame } = useArcadeSession()
  const stageRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handFrameRef = useRef<HandFrame>(createEmptyHandFrame('idle'))
  const engine = useMemo(() => createFruitNinjaEngine(), [])
  const [state, setState] = useState(() => engine.getState())
  const cursor = useGameUiCursor(stageRef, handFrame)
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const animationFrameRef = useRef(0)
  const lastTimestampRef = useRef(0)
  const pointerRef = useRef<Vector2>({ x: WIDTH / 2, y: HEIGHT - 150 })
  const virtualPointerRef = useRef<Vector2>({ x: WIDTH / 2, y: HEIGHT - 150 })
  const pointerTrailRef = useRef<PointerSample[]>([])
  const pointerSourceRef = useRef<PointerSource>('keyboard')
  const hoveredButtonIdRef = useRef<string | null>(null)
  const buttonLockRef = useRef(false)
  const burstEffectsRef = useRef<BurstEffect[]>([])
  const nextEffectIdRef = useRef(1)
  const lastSlashActiveRef = useRef(false)
  const performActionRef = useRef<(action: ButtonAction) => void>(() => {})
  const stepSimulationRef = useRef<(dtMs: number, timestampMs?: number) => void>(() => {})
  const mouseStateRef = useRef<MouseState>({
    active: false,
    down: false,
    lastMoveMs: 0,
    pointer: { x: WIDTH / 2, y: HEIGHT - 150 },
  })

  useEffect(() => {
    handFrameRef.current = handFrame
  }, [handFrame])

  const syncState = () => {
    const nextState = engine.getState()
    setState((current) => (sameState(current, nextState) ? current : { ...nextState, fruits: [...nextState.fruits] }))
  }

  const pushPointerSample = (source: PointerSource, point: Vector2, timestampMs: number) => {
    if (pointerSourceRef.current !== source) {
      pointerTrailRef.current = []
      pointerSourceRef.current = source
    }

    const trail = pointerTrailRef.current
    const lastSample = trail[trail.length - 1]
    if (
      !lastSample ||
      distance(lastSample.point, point) >= POINTER_SAMPLE_DISTANCE ||
      timestampMs - lastSample.timestampMs >= POINTER_SAMPLE_INTERVAL_MS
    ) {
      trail.push({
        point: { ...point },
        timestampMs,
      })
    } else if (lastSample) {
      lastSample.point = { ...point }
      lastSample.timestampMs = timestampMs
    }

    pointerTrailRef.current = trail.filter((sample) => timestampMs - sample.timestampMs <= TRAIL_WINDOW_MS)
    return pointerTrailRef.current
  }

  const buildInputSnapshot = (dtMs: number, timestampMs: number): InputSnapshot => {
    const activeFrame = handFrameRef.current
    const mouseState = mouseStateRef.current
    const mouseIsFresh = mouseState.active && (mouseState.down || timestampMs - mouseState.lastMoveMs <= 200)

    if (mouseIsFresh) {
      virtualPointerRef.current = mouseState.pointer
      const trail = pushPointerSample('mouse', mouseState.pointer, timestampMs)
      return {
        pointer: mouseState.pointer,
        pinchState: mouseState.down ? 'pinched' : 'open',
        slashActive: mouseState.down,
        slashPath: trail.map((sample) => sample.point),
        source: 'mouse',
        swipeSpeed: mouseState.down ? 1.4 : 0,
        trackingStatus: activeFrame.status,
      }
    }

    if (activeFrame.status === 'ready') {
      const pointer = toCanvasPoint(amplifyNormalizedPoint(activeFrame.derived.indexTip, HAND_POINTER_GAIN), WIDTH, HEIGHT)
      virtualPointerRef.current = pointer
      const trail = pushPointerSample('hand', pointer, timestampMs)
      const swipeSpeed = Math.hypot(activeFrame.derived.swipeVelocity.x, activeFrame.derived.swipeVelocity.y) * 1.25
      return {
        pointer,
        pinchState: pinchStateFromDistance(activeFrame.derived.pinchDistance),
        slashActive: swipeSpeed > 0.34,
        slashPath: trail.map((sample) => sample.point),
        source: 'hand',
        swipeSpeed,
        trackingStatus: activeFrame.status,
      }
    }

    virtualPointerRef.current = movePointer(
      virtualPointerRef.current,
      pressedKeysRef.current,
      dtMs,
      WIDTH,
      HEIGHT,
      420,
    )
    const trail = pushPointerSample('keyboard', virtualPointerRef.current, timestampMs)
    return {
      pointer: virtualPointerRef.current,
      pinchState: pinchStateFromKeyboard(pressedKeysRef.current),
      slashActive: pressedKeysRef.current.has('Space'),
      slashPath: trail.map((sample) => sample.point),
      source: 'keyboard',
      swipeSpeed: pressedKeysRef.current.has('Space') ? 1.15 : 0,
      trackingStatus: activeFrame.status,
    }
  }

  const performAction = (action: ButtonAction) => {
    if (action === 'start') {
      engine.start()
      pointerTrailRef.current = []
      burstEffectsRef.current = []
    } else if (action === 'pause' || action === 'resume') {
      ;(engine as typeof engine & { pauseToggle: () => void }).pauseToggle()
    } else if (action === 'restart') {
      engine.reset()
      engine.start()
      pointerTrailRef.current = []
      burstEffectsRef.current = []
    }
    syncState()
  }

  const maybeActivateButton = (input: InputSnapshot, buttons: CanvasButton[]) => {
    const hoveredButton = findHoveredButton(input.pointer, buttons)
    hoveredButtonIdRef.current = hoveredButton?.id ?? null

    if (input.pinchState !== 'pinched') {
      buttonLockRef.current = false
      return false
    }

    if (!hoveredButton || buttonLockRef.current) {
      return false
    }

    buttonLockRef.current = true
    performAction(hoveredButton.action)
    return true
  }

  const updateBurstEffects = (dtMs: number, previousState: FruitNinjaState, nextState: FruitNinjaState) => {
    burstEffectsRef.current = burstEffectsRef.current
      .map((effect) => ({ ...effect, ageMs: effect.ageMs + dtMs }))
      .filter((effect) => effect.ageMs <= EFFECT_DURATION_MS)

    const nextIds = new Set(nextState.fruits.map((fruit) => fruit.id))
    previousState.fruits.forEach((fruit) => {
      if (nextIds.has(fruit.id)) {
        return
      }

      burstEffectsRef.current.push({
        ageMs: 0,
        color: fruit.kind === 'bomb' ? '#28324f' : fruit.color,
        fruitType: fruit.fruitType,
        id: nextEffectIdRef.current,
        x: fruit.x,
        y: fruit.y,
      })
      nextEffectIdRef.current += 1
    })
  }

  const drawCurrentScene = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    drawScene(
      canvas,
      engine.getState(),
      pointerTrailRef.current,
      pointerRef.current,
      hoveredButtonIdRef.current,
      burstEffectsRef.current,
    )
  }

  const stepSimulation = (dtMs: number, timestampMs = performance.now()) => {
    const input = buildInputSnapshot(dtMs, timestampMs)
    pointerRef.current = input.pointer

    const buttons = getCanvasButtons(engine.getState())
    const buttonActivated = maybeActivateButton(input, buttons)
    if (!buttonActivated) {
      hoveredButtonIdRef.current = findHoveredButton(input.pointer, buttons)?.id ?? null
      const currentState = engine.getState()
      const previousState: FruitNinjaState = {
        ...currentState,
        fruits: currentState.fruits.map((fruit) => ({ ...fruit })),
      }
      engine.update(dtMs, {
        directionIntent: 'none',
        pinchState: input.pinchState,
        pointer: input.pointer,
        slashActive: input.slashActive,
        slashPath: input.slashPath,
        swipeSpeed: input.swipeSpeed,
        trackingStatus: input.trackingStatus,
      })
      const nextState = engine.getState()
      updateBurstEffects(dtMs, previousState, nextState)
    }

    if (!input.slashActive && lastSlashActiveRef.current) {
      pointerTrailRef.current = pointerTrailRef.current.slice(-3)
    }
    lastSlashActiveRef.current = input.slashActive

    syncState()
    drawCurrentScene()
  }

  useEffect(() => {
    performActionRef.current = performAction
    stepSimulationRef.current = stepSimulation
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      pressedKeysRef.current.add(event.code)
      if (event.code === 'Enter') {
        performActionRef.current(state.mode === 'paused' ? 'resume' : state.mode === 'playing' ? 'pause' : 'start')
      }
      if (event.code === 'KeyR') {
        performActionRef.current('restart')
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
  }, [state.mode])

  useEffect(() => {
    registerActiveGameRuntime({
      advanceTime: (ms: number) => {
        const timestampMs = lastTimestampRef.current === 0 ? performance.now() : lastTimestampRef.current + ms
        lastTimestampRef.current = timestampMs
        stepSimulationRef.current(ms, timestampMs)
      },
      getTextState: () => {
        const currentState = engine.getState()
        return JSON.stringify({
          route: '/play/fruit-ninja',
          mode: currentState.mode,
          coordinateSystem: 'canvas origin at top-left, x increases right, y increases down',
          score: currentState.score,
          misses: currentState.misses,
          livesRemaining: currentState.livesRemaining,
          fruits: currentState.fruits.map((fruit) => ({
            id: fruit.id,
            kind: fruit.kind,
            fruitType: fruit.fruitType,
            x: Math.round(fruit.x),
            y: Math.round(fruit.y),
            radius: fruit.radius,
          })),
          pointer: {
            x: Math.round(pointerRef.current.x),
            y: Math.round(pointerRef.current.y),
          },
          slashActive: lastSlashActiveRef.current,
          visibleControls: getCanvasButtons(currentState).map((button) => ({
            id: button.id,
            label: button.label,
            x: Math.round(button.x),
            y: Math.round(button.y),
            width: button.width,
            height: button.height,
          })),
          hoveredControl: hoveredButtonIdRef.current,
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
  }, [engine])

  useEffect(() => {
    const frame = (timestamp: number) => {
      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp
      }
      const dt = timestamp - lastTimestampRef.current
      lastTimestampRef.current = timestamp
      stepSimulationRef.current(Math.min(dt, 48), timestamp)
      animationFrameRef.current = window.requestAnimationFrame(frame)
    }

    animationFrameRef.current = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(animationFrameRef.current)
  }, [])

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    mouseStateRef.current = {
      ...mouseStateRef.current,
      active: true,
      lastMoveMs: performance.now(),
      pointer: getPointerFromEvent(canvas, event),
    }
  }

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const point = getPointerFromEvent(canvas, event)
    mouseStateRef.current = {
      active: true,
      down: true,
      lastMoveMs: performance.now(),
      pointer: point,
    }

    const hoveredButton = findHoveredButton(point, getCanvasButtons(engine.getState()))
    if (hoveredButton) {
      mouseStateRef.current.down = false
      performAction(hoveredButton.action)
      drawCurrentScene()
    }
  }

  const handleCanvasPointerUp = () => {
    mouseStateRef.current = {
      ...mouseStateRef.current,
      down: false,
    }
  }

  const handleCanvasPointerLeave = () => {
    mouseStateRef.current = {
      ...mouseStateRef.current,
      active: mouseStateRef.current.down,
    }
  }

  const primaryAction =
    state.mode === 'playing' ? 'pause' : state.mode === 'paused' ? 'resume' : 'start'

  const infoPanel = (
    <section className="panel game-info-card">
      <div className="game-info-card__intro">
        <p className="game-info-card__label">Slash controls</p>
        <p>Amplified fingertip travel makes short swipes feel dramatic while the blade still stays stable.</p>
      </div>
      <div className="status-grid">
        <div className="status-card">
          <strong>Score</strong>
          <span>{state.score}</span>
        </div>
        <div className="status-card">
          <strong>Lives</strong>
          <span>{state.livesRemaining}/7</span>
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
          id="start-fruit-btn"
          className="button"
          data-game-ui-id="fruit-primary"
          data-game-ui-target="true"
          type="button"
          onClick={() => performAction(primaryAction)}
        >
          {primaryAction === 'pause' ? 'Pause game' : primaryAction === 'resume' ? 'Resume game' : 'Start game'}
        </button>
        <button
          id="pause-fruit-btn"
          className="button button--ghost"
          data-game-ui-id="fruit-restart"
          data-game-ui-target="true"
          type="button"
          onClick={() => performAction('restart')}
        >
          Restart
        </button>
      </div>
      <ul className="control-list">
        <li>Fast fingertip swipes cut fruit. Small movements now cover more of the market stage.</li>
        <li>Pinch on the visible buttons to start, pause, resume, or restart from the game screen.</li>
        <li>Keyboard fallback still works if you want a manual smoke test.</li>
      </ul>
    </section>
  )

  return (
    <GameStageLayout
      accent="#ff7a59"
      cameraCard={<GameCameraCard debugButtonId="debug-fruit-btn" />}
      eyebrow="Fruit Ninja"
      gameId="fruit-ninja"
      infoPanel={infoPanel}
      overlay={<GameUiCursor cursor={cursor} />}
      stageRef={stageRef}
      subtitle="Explosive slash play with a faster, bigger fingertip blade."
      title="Fruit Splash"
    >
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="game-canvas game-canvas--interactive"
        onPointerDown={handleCanvasPointerDown}
        onPointerLeave={handleCanvasPointerLeave}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
      />
    </GameStageLayout>
  )
}
