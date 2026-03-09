import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { GameStageLayout } from './GameStageLayout'

vi.mock('./TrackerBadge', () => ({
  TrackerBadge: () => <div>tracker</div>,
}))

describe('GameStageLayout', () => {
  it('renders the shared sporty-modern game stage regions', () => {
    render(
      <MemoryRouter>
        <GameStageLayout
          accent="#7bd968"
          eyebrow="Snake"
          gameId="snake"
          subtitle="Fast reaction terrarium"
          title="Snake Signal"
          cameraCard={<div>camera rail</div>}
          infoPanel={<div>info rail</div>}
        >
          <canvas aria-label="Snake board" />
        </GameStageLayout>
      </MemoryRouter>,
    )

    expect(screen.getByText('Snake Signal')).toBeInTheDocument()
    expect(screen.getByTestId('game-stage-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('game-stage-rail')).toBeInTheDocument()
  })
})
