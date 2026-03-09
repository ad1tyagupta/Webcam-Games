import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GameCameraCard } from './GameCameraCard'

const mockUseArcadeSession = vi.fn()

vi.mock('../session/ArcadeSession', () => ({
  useArcadeSession: () => mockUseArcadeSession(),
}))

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    cameraPermission: 'idle',
    enableDebugTracker: vi.fn(),
    mediaStream: null,
    requestCamera: vi.fn().mockResolvedValue(undefined),
    trackerError: null,
    trackerMode: 'idle',
    handFrame: {
      status: 'idle',
      derived: {
        indexTip: { x: 0.5, y: 0.5 },
      },
    },
    ...overrides,
  }
}

describe('GameCameraCard', () => {
  it('renders stable preview, copy, and action regions in the default state', () => {
    mockUseArcadeSession.mockReturnValue(makeSession())

    render(<GameCameraCard debugButtonId="debug-snake-btn" />)

    expect(screen.getByTestId('camera-preview-region')).toBeInTheDocument()
    expect(screen.getByTestId('camera-copy-region')).toBeInTheDocument()
    expect(screen.getByTestId('camera-actions')).toBeInTheDocument()
    expect(screen.getByText(/pinch to click/i)).toBeInTheDocument()
  })

  it('keeps the same regions available when tracker errors are shown', () => {
    mockUseArcadeSession.mockReturnValue(
      makeSession({
        cameraPermission: 'denied',
        trackerError: 'Camera unavailable.',
      }),
    )

    render(<GameCameraCard debugButtonId="debug-snake-btn" />)

    expect(screen.getByTestId('camera-preview-region')).toBeInTheDocument()
    expect(screen.getByTestId('camera-copy-region')).toBeInTheDocument()
    expect(screen.getByTestId('camera-actions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry camera' })).toBeInTheDocument()
  })
})
