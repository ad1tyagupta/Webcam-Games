export type TrackingStatus = 'idle' | 'requesting' | 'ready' | 'lost' | 'error'
export type Handedness = 'Left' | 'Right' | 'Unknown'
export type TrackerMode = 'idle' | 'camera' | 'debug'
export type DirectionIntent = 'up' | 'down' | 'left' | 'right' | 'none'
export type PinchState = 'pinched' | 'open' | 'unknown'
export type GameStatus = 'playable' | 'coming-soon'
export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface Vector2 {
  x: number
  y: number
}

export interface LandmarkPoint extends Vector2 {
  z: number
}

export interface HandDerivedData {
  handCenter: Vector2
  handSize: number
  indexTip: Vector2
  pointerVector: Vector2
  pinchDistance: number
  swipeVelocity: Vector2
}

export interface HandFrame {
  status: TrackingStatus
  source: 'camera' | 'debug' | 'none'
  timestampMs: number
  handedness: Handedness
  confidence: number
  landmarks: LandmarkPoint[]
  derived: HandDerivedData
}

export interface GameInput {
  directionIntent: DirectionIntent
  pointer: Vector2 | null
  swipeSpeed: number
  pinchState: PinchState
  trackingStatus: TrackingStatus
}

export interface GameDefinition {
  id: 'snake' | 'fruit-ninja' | 'pool' | 'mini-golf'
  route: string
  title: string
  imagePath: string
  description: string
  status: GameStatus
  accent: string
  difficulty: Difficulty
  controlSummary: string
}

export interface ActiveGameRuntime {
  advanceTime: (ms: number) => void
  getTextState: () => string
}

export interface CalibrationProfile {
  dominantHand: Handedness
  baselineHandSize: number
}
