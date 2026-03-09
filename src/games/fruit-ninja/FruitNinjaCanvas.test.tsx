import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyHandFrame } from '../../tracking/handMath'
import { FruitNinjaCanvas } from './FruitNinjaCanvas'

const mockUseArcadeSession = vi.fn()

vi.mock('../../session/ArcadeSession', () => ({
  useArcadeSession: () => mockUseArcadeSession(),
}))

function makeSession() {
  return {
    cameraPermission: 'idle',
    enableDebugTracker: vi.fn(),
    mediaStream: null,
    requestCamera: vi.fn().mockResolvedValue(undefined),
    trackerError: null,
    trackerMode: 'idle',
    handFrame: createEmptyHandFrame('idle'),
  }
}

describe('FruitNinjaCanvas', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame
  const originalCancelAnimationFrame = window.cancelAnimationFrame
  const originalGetContext = HTMLCanvasElement.prototype.getContext

  beforeEach(() => {
    mockUseArcadeSession.mockReturnValue(makeSession())
    window.requestAnimationFrame = vi.fn(() => 1)
    window.cancelAnimationFrame = vi.fn()
    const contextStub = {
      clearRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      roundRect: vi.fn(),
      fillText: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      ellipse: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      setLineDash: vi.fn(),
      clip: vi.fn(),
      set fillStyle(_value: string | CanvasGradient) {},
      set strokeStyle(_value: string | CanvasGradient) {},
      set lineWidth(_value: number) {},
      set font(_value: string) {},
      set textAlign(_value: CanvasTextAlign) {},
      set lineCap(_value: CanvasLineCap) {},
      set lineJoin(_value: CanvasLineJoin) {},
      set globalAlpha(_value: number) {},
    }
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => contextStub as unknown as CanvasRenderingContext2D),
    })
  })

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame
    window.cancelAnimationFrame = originalCancelAnimationFrame
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: originalGetContext,
    })
    window.__arcadeActiveGameRuntime = null
  })

  it('renders the fruit ninja shell inside the shared stage with a visible start action', () => {
    render(
      <MemoryRouter>
        <FruitNinjaCanvas />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Fruit Splash' })).toBeInTheDocument()
    expect(screen.getByTestId('game-stage-rail')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument()
    expect(window.__arcadeActiveGameRuntime).toBeTruthy()
  })
})
