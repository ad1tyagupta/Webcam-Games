import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { GameDefinition } from '../types/arcade'

interface GameCardProps {
  game: GameDefinition
}

export function GameCard({ game }: GameCardProps) {
  return (
    <Link
      id={game.id === 'snake' ? 'start-btn' : undefined}
      className="game-tile"
      style={{ '--accent': game.accent } as CSSProperties}
      to={game.route}
    >
      <div className="game-tile__image-wrap">
        <img className="game-tile__image" src={game.imagePath} alt={`${game.title} preview`} />
      </div>
      <div className="game-tile__meta">
        <span className="pill">{game.difficulty}</span>
        <span className="game-tile__status game-tile__status--playable">Playable</span>
      </div>
      <div className="game-tile__footer">
        <div className="game-tile__copy">
          <h2>{game.title}</h2>
          <p>{game.description}</p>
          <span className="game-tile__summary">{game.controlSummary}</span>
        </div>
        <span className={`game-tile__cta game-tile__cta--${game.status}`}>
          {game.status === 'playable' ? 'Enter arena' : 'Coming soon'}
        </span>
      </div>
    </Link>
  )
}
