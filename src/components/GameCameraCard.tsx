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

  const showRetry = cameraPermission === 'denied'
  const helperCopy = trackerError
    ? trackerError
    : 'Move your fingertip. The dot shows the movement input.'

  return (
    <section className="panel game-camera-card">
      <div className="game-camera-card__header">
        <h2>Camera</h2>
        <span className="game-camera-card__hint">Green dot = fingertip</span>
      </div>
      <div data-testid="camera-preview-region">
        <WebcamPreview compact />
      </div>
      <div className="game-camera-card__footer">
        <p data-testid="camera-copy-region" className="game-camera-card__copy">
          {helperCopy}
        </p>
        <div data-testid="camera-actions" className="game-camera-card__actions">
          {showRetry ? (
            <button className="button button--ghost" type="button" onClick={() => void requestCamera()}>
              Retry camera
            </button>
          ) : (
            <span className="game-camera-card__action-slot" aria-hidden="true" />
          )}
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
