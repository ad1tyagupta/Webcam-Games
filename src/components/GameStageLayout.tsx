import type { CSSProperties, ReactNode, Ref } from 'react'
import { Link } from 'react-router-dom'
import { TrackerBadge } from './TrackerBadge'

interface GameStageLayoutProps {
  accent: string
  eyebrow: string
  gameId: string
  subtitle: string
  title: string
  cameraCard: ReactNode
  infoPanel: ReactNode
  children: ReactNode
  overlay?: ReactNode
  stageRef?: Ref<HTMLElement>
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }

  await document.documentElement.requestFullscreen()
}

export function GameStageLayout({
  accent,
  eyebrow,
  gameId,
  subtitle,
  title,
  cameraCard,
  infoPanel,
  children,
  overlay,
  stageRef,
}: GameStageLayoutProps) {
  return (
    <section
      ref={stageRef}
      className="game-stage"
      data-game-id={gameId}
      style={{ '--game-accent': accent } as CSSProperties}
    >
      <header className="panel game-stage__hero">
        <div className="game-stage__heading">
          <span className="eyebrow">{eyebrow}</span>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="game-stage__hero-tools">
          <TrackerBadge />
          <button className="button button--ghost" type="button" onClick={() => void toggleFullscreen()}>
            Fullscreen
          </button>
          <Link className="button button--ghost" to="/">
            Back to games
          </Link>
        </div>
      </header>
      <div className="game-stage__body">
        <div className="panel panel--canvas game-stage__canvas" data-testid="game-stage-canvas">
          {children}
        </div>
        <aside className="game-stage__rail" data-testid="game-stage-rail">
          {cameraCard}
          {infoPanel}
        </aside>
      </div>
      {overlay ? <div className="game-stage__overlay">{overlay}</div> : null}
    </section>
  )
}
