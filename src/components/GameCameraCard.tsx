import { useEffect } from 'react'
import { useArcadeSession } from '../session/ArcadeSession'
import { WebcamPreview } from './WebcamPreview'

interface GameCameraCardProps {
  debugButtonId?: string
}

export function GameCameraCard({ debugButtonId }: GameCameraCardProps) {
  const {
    cameraPermission,
    enableDebugTracker,
    mediaStream,
    requestCamera,
    trackerError,
    trackerMode,
  } = useArcadeSession()

  useEffect(() => {
    if (trackerMode === 'debug' || mediaStream || cameraPermission === 'pending' || cameraPermission === 'denied') {
      return
    }

    void requestCamera()
  }, [cameraPermission, mediaStream, requestCamera, trackerMode])

  return (
    <section className="panel game-camera-card">
      <div className="game-camera-card__header">
        <h2>Camera</h2>
        <span className="game-camera-card__hint">Green dot = fingertip</span>
      </div>
      <WebcamPreview compact />
      <div className="game-camera-card__footer">
        {trackerError ? <p>{trackerError}</p> : <p>Move your fingertip. The dot shows the movement input.</p>}
        <div className="button-row">
          {cameraPermission === 'denied' ? (
            <button className="button button--ghost" type="button" onClick={() => void requestCamera()}>
              Retry camera
            </button>
          ) : null}
          {import.meta.env.DEV ? (
            <button
              id={debugButtonId}
              className="button button--ghost"
              type="button"
              onClick={enableDebugTracker}
            >
              Simulate hand
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
