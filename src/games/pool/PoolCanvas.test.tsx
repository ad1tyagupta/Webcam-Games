import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyHandFrame } from '../../tracking/handMath'
import { PoolCanvas } from './PoolCanvas'

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

describe('PoolCanvas', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame
  const originalCancelAnimationFrame = window.cancelAnimationFrame
  const originalGetContext = HTMLCanvasElement.prototype.getContext

  beforeEach(() => {
    mockUseArcadeSession.mockReturnValue(makeSession())
    window.requestAnimationFrame = vi.fn(() => 1)
    window.cancelAnimationFrame = vi.fn()
    const contextStub = {
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      roundRect: vi.fn(),
      fillText: vi.fn(),
      clearRect: vi.fn(),
      set fillStyle(_value: string) {},
      set strokeStyle(_value: string) {},
      set lineWidth(_value: number) {},
      set lineCap(_value: CanvasLineCap) {},
      set font(_value: string) {},
      set textAlign(_value: CanvasTextAlign) {},
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

  it('renders a visible start action inside the shared pool stage', () => {
    render(
      <MemoryRouter>
        <PoolCanvas />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Pocket Pulse' })).toBeInTheDocument()
    expect(screen.getByTestId('game-stage-rail')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument()
    expect(window.__arcadeActiveGameRuntime).toBeTruthy()
  })
})
