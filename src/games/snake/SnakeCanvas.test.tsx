import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyHandFrame } from '../../tracking/handMath'
import { SnakeCanvas } from './SnakeCanvas'

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

describe('SnakeCanvas', () => {
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
      scale: vi.fn(),
      ellipse: vi.fn(),
      set fillStyle(_value: string) {},
      set strokeStyle(_value: string) {},
      set lineWidth(_value: number) {},
      set font(_value: string) {},
      set textAlign(_value: CanvasTextAlign) {},
      set shadowBlur(_value: number) {},
      set shadowColor(_value: string) {},
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

  it('renders the Snake scene shell and registers the active runtime', () => {
    render(
      <MemoryRouter>
        <SnakeCanvas />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Snake Signal' })).toBeInTheDocument()
    expect(screen.getByLabelText('Snake terrarium scene')).toBeInTheDocument()
    expect(window.__arcadeActiveGameRuntime).toBeTruthy()
  })
})
