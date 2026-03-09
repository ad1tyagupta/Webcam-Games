import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { TrackerBadge } from './TrackerBadge'

interface AppShellProps {
  children: ReactNode
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }

  await document.documentElement.requestFullscreen()
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const isSelectorRoute = location.pathname === '/' || location.pathname === '/hub'
  const showGameTools = location.pathname.startsWith('/play/')

  return (
    <div className="app-shell">
      <div className="app-shell__backdrop app-shell__backdrop--one" />
      <div className="app-shell__backdrop app-shell__backdrop--two" />
      <header className={`topbar ${isSelectorRoute ? 'topbar--selector' : ''}`}>
        <Link className="brand" to="/">
          <span className="brand__badge">WA</span>
          <span>
            <strong>Webcam Arcade</strong>
          </span>
        </Link>
        {!isSelectorRoute ? (
          <div className="topbar__tools">
            <Link className="icon-button" to="/">
              Back
            </Link>
            {showGameTools ? <TrackerBadge /> : null}
            <button className="icon-button" type="button" onClick={() => void toggleFullscreen()}>
              Fullscreen
            </button>
          </div>
        ) : null}
      </header>
      <main className={`page page--${location.pathname.replaceAll('/', '-').replace(/^-/, '') || 'home'}`}>
        {children}
      </main>
    </div>
  )
}
