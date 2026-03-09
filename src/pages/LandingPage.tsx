import { GameCard } from '../components/GameCard'
import { gameDefinitions } from '../data/games'

export function LandingPage() {
  return (
    <section className="selector-page">
      <section className="panel selector-hero">
        <div className="selector-hero__copy">
          <span className="eyebrow">Sporty modern webcam play</span>
          <h1 className="selector-page__title">Move fast. Play with your hands.</h1>
          <p className="selector-page__lead">
            Four camera-controlled games, amplified finger response, and in-game pinch controls that keep every match on screen.
          </p>
        </div>
        <div className="selector-hero__stats">
          <div className="selector-hero__stat">
            <strong>4</strong>
            <span>Live games</span>
          </div>
          <div className="selector-hero__stat">
            <strong>Finger</strong>
            <span>Start + pause controls</span>
          </div>
          <div className="selector-hero__stat">
            <strong>Pinch</strong>
            <span>Click inside every game</span>
          </div>
        </div>
      </section>
      <div className="selector-grid">
        {gameDefinitions.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  )
}
