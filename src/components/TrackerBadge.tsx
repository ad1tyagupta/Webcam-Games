import { useArcadeSession } from '../session/ArcadeSession'

const STATUS_LABELS = {
  idle: 'Idle',
  requesting: 'Requesting',
  ready: 'Hand ready',
  lost: 'Hand lost',
  error: 'Error',
} as const

export function TrackerBadge() {
  const { handFrame, trackerMode } = useArcadeSession()

  return (
    <div className={`tracker-badge tracker-badge--${handFrame.status}`}>
      <span className="tracker-badge__dot" />
      <span>{STATUS_LABELS[handFrame.status]}</span>
      <span className="tracker-badge__meta">{trackerMode === 'debug' ? 'Simulated' : 'Camera'}</span>
    </div>
  )
}
