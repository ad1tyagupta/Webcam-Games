import type { CSSProperties } from 'react'
import type { Vector2 } from '../types/arcade'

export interface GameUiCursorState {
  pinched: boolean
  point: Vector2 | null
  visible: boolean
}

interface GameUiCursorProps {
  cursor: GameUiCursorState
}

export function GameUiCursor({ cursor }: GameUiCursorProps) {
  if (!cursor.visible || !cursor.point) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className={`game-ui-cursor ${cursor.pinched ? 'game-ui-cursor--pinched' : ''}`}
      style={
        {
          left: `${cursor.point.x}px`,
          top: `${cursor.point.y}px`,
        } as CSSProperties
      }
    >
      <span className="game-ui-cursor__core" />
      <span className="game-ui-cursor__ring" />
    </div>
  )
}
