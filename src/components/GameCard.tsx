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
      <div className="game-tile__footer">
        <h2>{game.title}</h2>
        <span className={`game-tile__status game-tile__status--${game.status}`}>
          {game.status === 'playable' ? 'Play now' : 'Coming soon'}
        </span>
      </div>
    </Link>
  )
}
