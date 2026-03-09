import { Link } from 'react-router-dom'
import { WebcamPreview } from '../components/WebcamPreview'
import { useArcadeSession } from '../session/ArcadeSession'

export function CalibrationPage() {
  const {
    calibrationProgressMs,
    calibrationReady,
    cameraPermission,
    enableDebugTracker,
    handFrame,
    requestCamera,
    trackerError,
    trackerMode,
  } = useArcadeSession()

  const progress = Math.min(100, Math.round((calibrationProgressMs / 1000) * 100))

  return (
    <section className="calibration-layout">
      <div className="panel">
        <span className="eyebrow">Calibration</span>
        <h1>Show one hand inside the guide box.</h1>
        <p>
          Hold your hand steady for one second. We only keep a session-sized baseline hand size and your
          dominant hand.
        </p>
        <div className="button-row">
          <button className="button" type="button" onClick={() => void requestCamera()}>
            {cameraPermission === 'granted' ? 'Camera ready' : 'Allow camera'}
          </button>
          {import.meta.env.DEV ? (
            <button id="debug-calibration-btn" className="button button--ghost" type="button" onClick={enableDebugTracker}>
              Use simulated hand
            </button>
          ) : null}
        </div>
        <div className="status-grid">
          <div className="status-card">
            <strong>Tracker source</strong>
            <span>{trackerMode === 'debug' ? 'Simulated hand feed' : 'Live webcam'}</span>
          </div>
          <div className="status-card">
            <strong>Detection</strong>
            <span>{handFrame.status === 'ready' ? 'Locked on' : 'Searching for hand'}</span>
          </div>
          <div className="status-card">
            <strong>Confidence</strong>
            <span>{Math.round(handFrame.confidence * 100)}%</span>
          </div>
        </div>
        <div className="progress-block" aria-label="Calibration progress">
          <div className="progress-block__bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="status-line">
          {calibrationReady
            ? 'Calibration complete. You can enter the arcade.'
            : 'Keep your hand centered until the progress bar fills.'}
        </p>
        {trackerError ? <p className="error-line">{trackerError}</p> : null}
        <div className="button-row">
          {calibrationReady ? (
            <Link id="enter-arcade-btn" className="button" to="/hub">
              Enter arcade
            </Link>
          ) : (
            <span id="enter-arcade-btn" className="button button--disabled" aria-disabled="true">
              Enter arcade
            </span>
          )}
          <Link className="button button--ghost" to="/">
            Back home
          </Link>
        </div>
      </div>
      <div className="panel panel--preview">
        <WebcamPreview guide />
      </div>
    </section>
  )
}
