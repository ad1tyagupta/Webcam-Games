import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { installWindowBindings } from './runtime/windowBindings'
import { ArcadeSessionProvider, useArcadeSession } from './session/ArcadeSession'
import { CalibrationPage } from './pages/CalibrationPage'
import { FruitNinjaPage } from './pages/FruitNinjaPage'
import { HubPage } from './pages/HubPage'
import { LandingPage } from './pages/LandingPage'
import { MiniGolfPage } from './pages/MiniGolfPage'
import { PoolPage } from './pages/PoolPage'
import { SnakePage } from './pages/SnakePage'

function AppFrame() {
  const location = useLocation()
  const { calibrationReady, handFrame, trackerMode } = useArcadeSession()

  useEffect(() => {
    installWindowBindings(() =>
      JSON.stringify({
        route: location.pathname,
        calibrationReady,
        trackerMode,
        trackingStatus: handFrame.status,
      }),
    )
  }, [calibrationReady, handFrame.status, location.pathname, trackerMode])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'f' || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (document.fullscreenElement) {
        void document.exitFullscreen()
      } else {
        void document.documentElement.requestFullscreen()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/calibrate" element={<CalibrationPage />} />
        <Route path="/hub" element={<HubPage />} />
        <Route path="/play/snake" element={<SnakePage />} />
        <Route path="/play/fruit-ninja" element={<FruitNinjaPage />} />
        <Route path="/play/pool" element={<PoolPage />} />
        <Route path="/play/mini-golf" element={<MiniGolfPage />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <ArcadeSessionProvider>
      <BrowserRouter>
        <AppFrame />
      </BrowserRouter>
    </ArcadeSessionProvider>
  )
}
