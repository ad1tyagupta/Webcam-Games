import type { ActiveGameRuntime, DirectionIntent, HandFrame } from './arcade'

declare global {
  interface Window {
    advanceTime?: (ms: number) => void | Promise<void>
    render_game_to_text?: () => string
    __arcadeActiveGameRuntime?: ActiveGameRuntime | null
    __arcadeDebug?: {
      setHandFrame: (frame: HandFrame | null) => void
      setDirection: (direction: DirectionIntent) => void
      setPinched: (pinched: boolean) => void
      clear: () => void
    }
  }
}

export {}
