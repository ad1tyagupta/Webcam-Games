import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { HandFrame, Handedness } from '../types/arcade'
import { coerceLandmarks, computeHandDerivedData, createEmptyHandFrame } from './handMath'

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
const MODEL_ASSET =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

interface CategoryLike {
  categoryName?: string
  score?: number
}

interface HandResultLike {
  landmarks?: Array<Array<{ x: number; y: number; z?: number }>>
  handednesses?: Array<CategoryLike[]>
}

export class BrowserHandTracker {
  private landmarker: HandLandmarker | null = null

  private previousFrame: HandFrame | undefined

  async initialize() {
    if (this.landmarker) {
      return
    }

    const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_ASSET,
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.65,
      minHandPresenceConfidence: 0.65,
      minTrackingConfidence: 0.65,
    })
  }

  detect(video: HTMLVideoElement, timestampMs: number) {
    if (!this.landmarker) {
      return createEmptyHandFrame('idle', timestampMs)
    }

    const result = this.landmarker.detectForVideo(video, timestampMs) as HandResultLike
    const landmarks = result.landmarks?.[0]

    if (!landmarks || landmarks.length < 21) {
      const lostFrame = createEmptyHandFrame('lost', timestampMs)
      lostFrame.source = 'camera'
      this.previousFrame = lostFrame
      return lostFrame
    }

    const normalizedLandmarks = coerceLandmarks(landmarks)
    const firstHandedness = result.handednesses?.[0]?.[0]
    const handedness = (firstHandedness?.categoryName ?? 'Unknown') as Handedness
    const confidence = firstHandedness?.score ?? 0.85

    const handFrame: HandFrame = {
      status: 'ready',
      source: 'camera',
      timestampMs,
      handedness,
      confidence,
      landmarks: normalizedLandmarks,
      derived: computeHandDerivedData(normalizedLandmarks, timestampMs, this.previousFrame),
    }

    this.previousFrame = handFrame
    return handFrame
  }

  reset() {
    this.previousFrame = undefined
  }
}
