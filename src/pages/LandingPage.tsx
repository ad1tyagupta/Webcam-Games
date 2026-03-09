import { GameCard } from '../components/GameCard'
import { gameDefinitions } from '../data/games'

export function LandingPage() {
  return (
    <section className="selector-page">
      <h1 className="selector-page__title">Webcam Arcade</h1>
      <div className="selector-grid">
        {gameDefinitions.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  )
}
