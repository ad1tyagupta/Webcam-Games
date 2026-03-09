import { Link, Navigate, useParams } from 'react-router-dom'
import { MotionDemo } from '../components/MotionDemo'
import { gameDefinitionMap } from '../data/games'

const MOTION_COPY = {
  'fruit-ninja': {
    title: 'Fast swipe detection',
    caption: 'Only confident, high-speed fingertip arcs should cut fruit. Slow hovering should do nothing.',
  },
  pool: {
    title: 'Aim then charge',
    caption: 'Hand angle aims the cue. Pinch and pull backward loads shot power before release.',
  },
  'mini-golf': {
    title: 'Toy-box putting rhythm',
    caption: 'Aiming stays forgiving, while pull-back strength decides how far the ball rolls.',
  },
} as const

export function ComingSoonPage() {
  const { gameId } = useParams<{ gameId: 'fruit-ninja' | 'pool' | 'mini-golf' }>()

  if (!gameId || !MOTION_COPY[gameId]) {
    return <Navigate to="/hub" replace />
  }

  const game = gameDefinitionMap[gameId]
  const motion = MOTION_COPY[gameId]

  return (
    <section className="concept-layout">
      <div className="panel">
        <span className="eyebrow">Coming next</span>
        <h1>{game.title}</h1>
        <p>{game.description}</p>
        <div className="status-grid">
          <div className="status-card">
            <strong>Difficulty</strong>
            <span>{game.difficulty}</span>
          </div>
          <div className="status-card">
            <strong>Control model</strong>
            <span>{game.controlSummary}</span>
          </div>
          <div className="status-card">
            <strong>Status</strong>
            <span>Gameplay prototype planned after Snake</span>
          </div>
        </div>
        <div className="button-row">
          <Link className="button" to="/hub">
            Return to hub
          </Link>
          <Link className="button button--ghost" to="/play/snake">
            Play Snake now
          </Link>
        </div>
      </div>
      <MotionDemo accent={game.accent} title={motion.title} caption={motion.caption} />
    </section>
  )
}
