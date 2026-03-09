import type { ActiveGameRuntime } from '../types/arcade'

export function installWindowBindings(getFallbackTextState: () => string) {
  window.render_game_to_text = () =>
    window.__arcadeActiveGameRuntime?.getTextState() ?? getFallbackTextState()
  window.advanceTime = (ms: number) => {
    if (window.__arcadeActiveGameRuntime) {
      window.__arcadeActiveGameRuntime.advanceTime(ms)
      return
    }

    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms)
    })
  }
}

export function registerActiveGameRuntime(runtime: ActiveGameRuntime | null) {
  window.__arcadeActiveGameRuntime = runtime
}
