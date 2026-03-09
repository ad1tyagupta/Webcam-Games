import { useEffect, useRef } from 'react'
import { useArcadeSession } from '../session/ArcadeSession'

interface WebcamPreviewProps {
  compact?: boolean
  guide?: boolean
}

export function WebcamPreview({ compact = false, guide = false }: WebcamPreviewProps) {
  const { mediaStream, handFrame, trackerMode } = useArcadeSession()
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    if (mediaStream) {
      video.srcObject = mediaStream
      void video.play().catch(() => undefined)
      return
    }

    video.srcObject = null
  }, [mediaStream])

  const x = handFrame.derived.indexTip.x * 100
  const y = handFrame.derived.indexTip.y * 100

  return (
    <div className={`webcam-preview ${compact ? 'webcam-preview--compact' : ''}`}>
      {mediaStream ? (
        <video ref={videoRef} muted playsInline className="webcam-preview__video" />
      ) : (
        <div className="webcam-preview__fallback">
          <span>{trackerMode === 'debug' ? 'Debug hand feed active' : 'Camera preview ready after permission'}</span>
        </div>
      )}
      {guide ? <div className="webcam-preview__guide" /> : null}
      {handFrame.status === 'ready' ? (
        <div
          className="webcam-preview__tracker-point"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ) : null}
    </div>
  )
}
