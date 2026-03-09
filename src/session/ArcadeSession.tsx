/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import type { CalibrationProfile, DirectionIntent, HandFrame, TrackerMode } from '../types/arcade'
import { createDebugIdleFrame, createLostDebugFrame, createSyntheticHandFrame } from '../tracking/debugHand'
import { createEmptyHandFrame, isHandCentered } from '../tracking/handMath'
import { BrowserHandTracker } from '../tracking/handTracker'

const PROFILE_KEY = 'webcam-arcade-profile'
const CALIBRATION_TARGET_MS = 1000
const TRACKER_INTERVAL_MS = 1000 / 12

type CameraPermission = 'idle' | 'pending' | 'granted' | 'denied'

interface ArcadeSessionValue {
  trackerMode: TrackerMode
  handFrame: HandFrame
  mediaStream: MediaStream | null
  cameraPermission: CameraPermission
  trackerReady: boolean
  trackerError: string | null
  soundEnabled: boolean
  helpOpen: boolean
  calibrationProgressMs: number
  calibrationReady: boolean
  calibrationProfile: CalibrationProfile | null
  requestCamera: () => Promise<void>
  enableDebugTracker: () => void
  resetCalibration: () => void
  setHelpOpen: (open: boolean) => void
  toggleSound: () => void
}

const ArcadeSessionContext = createContext<ArcadeSessionValue | null>(null)

function loadCalibrationProfile() {
  const raw = window.sessionStorage.getItem(PROFILE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as CalibrationProfile
  } catch {
    return null
  }
}

function saveCalibrationProfile(profile: CalibrationProfile | null) {
  if (!profile) {
    window.sessionStorage.removeItem(PROFILE_KEY)
    return
  }

  window.sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

function getDirectionFromKey(key: string): DirectionIntent {
  if (key === 'ArrowUp' || key.toLowerCase() === 'w') {
    return 'up'
  }
  if (key === 'ArrowDown' || key.toLowerCase() === 's') {
    return 'down'
  }
  if (key === 'ArrowLeft' || key.toLowerCase() === 'a') {
    return 'left'
  }
  if (key === 'ArrowRight' || key.toLowerCase() === 'd') {
    return 'right'
  }
  return 'none'
}

export function ArcadeSessionProvider({ children }: PropsWithChildren) {
  const [trackerMode, setTrackerMode] = useState<TrackerMode>('idle')
  const [handFrame, setHandFrame] = useState<HandFrame>(() => createEmptyHandFrame('idle'))
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [cameraPermission, setCameraPermission] = useState<CameraPermission>('idle')
  const [trackerReady, setTrackerReady] = useState(false)
  const [trackerError, setTrackerError] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)
  const [calibrationProfile, setCalibrationProfile] = useState<CalibrationProfile | null>(() =>
    loadCalibrationProfile(),
  )
  const [calibrationProgressMs, setCalibrationProgressMs] = useState(0)
  const [calibrationReady, setCalibrationReady] = useState(Boolean(loadCalibrationProfile()))
  const trackerRef = useRef<BrowserHandTracker | null>(null)
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null)
  const calibrationStartRef = useRef<number | null>(null)
  const calibrationProfileRef = useRef<CalibrationProfile | null>(calibrationProfile)
  const calibrationReadyRef = useRef(calibrationReady)
  const debugDirectionRef = useRef<DirectionIntent>('up')
  const debugPinchedRef = useRef(false)
  const debugOverrideRef = useRef<HandFrame | null>(null)

  useEffect(() => {
    calibrationProfileRef.current = calibrationProfile
  }, [calibrationProfile])

  useEffect(() => {
    calibrationReadyRef.current = calibrationReady
  }, [calibrationReady])

  const evaluateCalibration = (nextFrame: HandFrame) => {
    if (nextFrame.status !== 'ready' || !isHandCentered(nextFrame)) {
      calibrationStartRef.current = null
      setCalibrationProgressMs(0)
      if (!calibrationProfileRef.current) {
        setCalibrationReady(false)
      }
      return
    }

    if (calibrationReadyRef.current) {
      return
    }

    if (calibrationStartRef.current === null) {
      calibrationStartRef.current = nextFrame.timestampMs
    }

    const progress = nextFrame.timestampMs - calibrationStartRef.current
    setCalibrationProgressMs(progress)

    if (progress >= CALIBRATION_TARGET_MS) {
      const profile: CalibrationProfile = {
        dominantHand: nextFrame.handedness,
        baselineHandSize: nextFrame.derived.handSize,
      }
      calibrationProfileRef.current = profile
      calibrationReadyRef.current = true
      setCalibrationProfile(profile)
      setCalibrationReady(true)
      saveCalibrationProfile(profile)
    }
  }

  useEffect(() => {
    window.__arcadeDebug = {
      setHandFrame: (frame) => {
        debugOverrideRef.current = frame
        if (frame) {
          setTrackerMode('debug')
          setHandFrame(frame)
        }
      },
      setDirection: (direction) => {
        debugDirectionRef.current = direction
        setTrackerMode('debug')
      },
      setPinched: (pinched) => {
        debugPinchedRef.current = pinched
        setTrackerMode('debug')
      },
      clear: () => {
        debugOverrideRef.current = null
        debugDirectionRef.current = 'up'
        debugPinchedRef.current = false
        setHandFrame(createEmptyHandFrame('idle'))
        setTrackerMode('idle')
      },
    }

    return () => {
      window.__arcadeDebug = undefined
    }
  }, [])

  useEffect(() => {
    if (trackerMode !== 'debug') {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const direction = getDirectionFromKey(event.key)
      if (direction !== 'none') {
        debugDirectionRef.current = direction
      }
      if (event.code === 'Space') {
        debugPinchedRef.current = true
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        debugPinchedRef.current = false
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [trackerMode])

  useEffect(() => {
    if (trackerMode !== 'debug') {
      return
    }

    let animationFrameId = 0
    let previousFrame: HandFrame | undefined

    const tick = () => {
      const timestampMs = performance.now()
      const frame =
        debugOverrideRef.current ??
        createSyntheticHandFrame(
          {
            direction: debugDirectionRef.current,
            pinched: debugPinchedRef.current,
            timestampMs,
          },
          previousFrame,
        )
      previousFrame = frame
      setTrackerReady(true)
      setTrackerError(null)
      setHandFrame(frame)
      evaluateCalibration(frame)
      animationFrameId = window.requestAnimationFrame(tick)
    }

    animationFrameId = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [trackerMode])

  useEffect(() => {
    if (trackerMode !== 'camera' || !mediaStream) {
      return
    }

    let cancelled = false
    let rafId = 0
    let videoFrameId = 0
    let lastInference = 0

    const video = document.createElement('video')
    video.srcObject = mediaStream
    video.muted = true
    video.playsInline = true
    hiddenVideoRef.current = video

    const tracker = trackerRef.current ?? new BrowserHandTracker()
    trackerRef.current = tracker

    const step = () => {
      if (cancelled) {
        return
      }

      const now = performance.now()
      if (video.readyState >= 2 && now - lastInference >= TRACKER_INTERVAL_MS) {
        const nextFrame = tracker.detect(video, now)
        setHandFrame(nextFrame)
        evaluateCalibration(nextFrame)
        setTrackerReady(true)
        lastInference = now
      }

      schedule()
    }

    const schedule = () => {
      const requestVideoFrameCallback = (
        video as HTMLVideoElement & {
          requestVideoFrameCallback?: (callback: () => void) => number
        }
      ).requestVideoFrameCallback
      if (typeof requestVideoFrameCallback === 'function') {
        videoFrameId = requestVideoFrameCallback.call(video, step)
      } else {
        rafId = window.requestAnimationFrame(step)
      }
    }

    const start = async () => {
      try {
        setTrackerError(null)
        await tracker.initialize()
        if (cancelled) {
          return
        }
        await video.play()
        if (cancelled) {
          return
        }
        setTrackerReady(true)
        schedule()
      } catch (error) {
        if (cancelled) {
          return
        }
        setTrackerReady(false)
        setTrackerError(error instanceof Error ? error.message : 'Unable to load the hand tracker.')
        setHandFrame(createEmptyHandFrame('error'))
      }
    }

    void start()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(rafId)
      if ('cancelVideoFrameCallback' in video) {
        ;(
          video as HTMLVideoElement & {
            cancelVideoFrameCallback?: (handle: number) => void
          }
        ).cancelVideoFrameCallback?.(videoFrameId)
      }
      video.pause()
      tracker.reset()
      hiddenVideoRef.current = null
    }
  }, [mediaStream, trackerMode])

  const requestCamera = useCallback(async () => {
    if (mediaStream) {
      setTrackerMode('camera')
      return
    }

    try {
      setCameraPermission('pending')
      setTrackerMode('camera')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      setMediaStream(stream)
      setCameraPermission('granted')
      setTrackerError(null)
      setHandFrame(createEmptyHandFrame('requesting'))
    } catch (error) {
      setCameraPermission('denied')
      setTrackerMode('idle')
      setTrackerReady(false)
      setTrackerError(
        error instanceof Error ? error.message : 'Camera permission was denied or unavailable.',
      )
      setHandFrame(createEmptyHandFrame('error'))
    }
  }, [mediaStream])

  const enableDebugTracker = useCallback(() => {
    const debugFrame = createDebugIdleFrame()
    const profile: CalibrationProfile = {
      dominantHand: debugFrame.handedness,
      baselineHandSize: debugFrame.derived.handSize,
    }
    setTrackerMode('debug')
    setTrackerError(null)
    setTrackerReady(true)
    setHandFrame(debugFrame)
    setCalibrationProgressMs(CALIBRATION_TARGET_MS)
    setCalibrationReady(true)
    setCalibrationProfile(profile)
    calibrationReadyRef.current = true
    calibrationProfileRef.current = profile
    saveCalibrationProfile(profile)
  }, [])

  const resetCalibration = useCallback(() => {
    calibrationStartRef.current = null
    calibrationReadyRef.current = false
    calibrationProfileRef.current = null
    setCalibrationProgressMs(0)
    setCalibrationReady(false)
    setCalibrationProfile(null)
    saveCalibrationProfile(null)
    if (trackerMode === 'debug') {
      setHandFrame(createLostDebugFrame())
    } else {
      setHandFrame(createEmptyHandFrame(mediaStream ? 'lost' : 'idle'))
    }
  }, [mediaStream, trackerMode])

  const value: ArcadeSessionValue = {
    trackerMode,
    handFrame,
    mediaStream,
    cameraPermission,
    trackerReady,
    trackerError,
    soundEnabled,
    helpOpen,
    calibrationProgressMs,
    calibrationReady,
    calibrationProfile,
    requestCamera,
    enableDebugTracker,
    resetCalibration,
    setHelpOpen,
    toggleSound: () => setSoundEnabled((current) => !current),
  }

  return <ArcadeSessionContext.Provider value={value}>{children}</ArcadeSessionContext.Provider>
}

export function useArcadeSession() {
  const value = useContext(ArcadeSessionContext)
  if (!value) {
    throw new Error('useArcadeSession must be used inside ArcadeSessionProvider.')
  }

  return value
}
