import { useEffect, useMemo, useState, type RefObject } from 'react'
import type { HandFrame, Vector2 } from '../../types/arcade'
import { pinchStateFromDistance } from '../../tracking/handMath'
import type { GameUiCursorState } from '../../components/GameUiCursor'
import { amplifyNormalizedPoint } from './input'
import { createGameUiPointerController } from './gameUiPointer'

const DEFAULT_GAIN = { x: 1.72, y: 1.72 }
const TARGET_SELECTOR = '[data-game-ui-target="true"]'

function getTargetId(element: HTMLElement, index: number) {
  return element.dataset.gameUiId ?? element.id ?? `game-ui-target-${index}`
}

function isTargetDisabled(element: HTMLElement) {
  return element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true'
}

interface UseGameUiCursorOptions {
  gain?: number | Vector2
}

export function useGameUiCursor(
  containerRef: RefObject<HTMLElement | null>,
  handFrame: HandFrame,
  options: UseGameUiCursorOptions = {},
): GameUiCursorState {
  const controller = useMemo(() => createGameUiPointerController(), [])
  const [cursor, setCursor] = useState<GameUiCursorState>({
    pinched: false,
    point: null,
    visible: false,
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const targetElements = Array.from(container.querySelectorAll<HTMLElement>(TARGET_SELECTOR))
    const clearHover = () => {
      for (const element of targetElements) {
        element.dataset.gameUiHovered = 'false'
      }
    }

    if (handFrame.status !== 'ready') {
      controller.reset()
      clearHover()
      const frameId = window.requestAnimationFrame(() => {
        setCursor({
          pinched: false,
          point: null,
          visible: false,
        })
      })
      return () => window.cancelAnimationFrame(frameId)
    }

    const bounds = container.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) {
      return
    }

    const pinchState = pinchStateFromDistance(handFrame.derived.pinchDistance)
    const sourcePoint = pinchState === 'pinched' ? handFrame.derived.pinchCenter : handFrame.derived.indexTip
    const amplifiedPoint = amplifyNormalizedPoint(sourcePoint, options.gain ?? DEFAULT_GAIN)
    const pointer = {
      x: amplifiedPoint.x * bounds.width,
      y: amplifiedPoint.y * bounds.height,
    }

    const mappedTargets = targetElements.map((element, index) => {
      const rect = element.getBoundingClientRect()
      return {
        id: getTargetId(element, index),
        element,
        x: rect.left - bounds.left,
        y: rect.top - bounds.top,
        width: rect.width,
        height: rect.height,
        disabled: isTargetDisabled(element),
      }
    })

    const result = controller.update({
      pinchState,
      pointer,
      targets: mappedTargets,
    })

    for (const target of mappedTargets) {
      target.element.dataset.gameUiHovered = result.hoveredTargetId === target.id ? 'true' : 'false'
    }

    if (result.clickedTargetId) {
      mappedTargets.find((target) => target.id === result.clickedTargetId)?.element.click()
    }

    const frameId = window.requestAnimationFrame(() => {
      setCursor({
        pinched: pinchState === 'pinched',
        point: pointer,
        visible: true,
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [containerRef, controller, handFrame, options.gain])

  return cursor
}
