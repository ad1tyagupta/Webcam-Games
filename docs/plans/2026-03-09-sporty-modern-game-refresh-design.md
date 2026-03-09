# Sporty Modern Game Refresh Design

**Date:** 2026-03-09

## Goal

Refresh the four playable game routes so they feel like one premium webcam-arcade product: stronger finger-response sensitivity, a consistent sporty-modern layout, persistent on-screen start/pause/restart controls, and shared pinch-to-click interaction inside game pages only.

## Scope

In scope:
- Snake, Fruit Ninja, Pool, and Mini Golf game pages
- Shared game-route layout, game-route header treatment, and right-rail camera/control presentation
- A shared in-game fingertip cursor with `pinch = click` for visible game-page controls
- Per-game sensitivity tuning so small finger movement produces larger on-screen motion
- Tests and browser validation for the updated shared behavior

Out of scope:
- Landing page pinch navigation
- Replacing the existing hand-tracking backend
- Rewriting the core gameplay rules beyond sensitivity and UI-trigger changes

## Product Direction

The visual direction is `sporty modern`, not playful or retro. The game routes should feel more like performance surfaces than app forms: darker athletic foundations, crisp highlights, disciplined spacing, sharp typography, bright field-light accents, and restrained motion. Each game keeps its own signature accent color, but the layout, panel language, button language, and information hierarchy stay consistent.

## Layout Architecture

Each game route uses one shared stage layout:
- A slim route-specific top strip for back navigation, title/meta, tracker state, and fullscreen
- A hero gameplay canvas that remains the primary visual focus
- A compact right-side control rail containing the camera preview, interaction status, and short game instructions
- Shared card and panel treatment across all four games

Desktop prioritizes a two-column stage. Mobile stacks the same modules in a consistent order: top strip, canvas, control rail, then instructions/status. The canvas must remain dominant at all breakpoints.

## Interaction Model

Gameplay remains hybrid:
- Snake keeps direction steering
- Fruit Ninja keeps slash/swipe behavior
- Pool and Mini Golf keep pointer-based aiming

On top of that, all four game routes gain a shared UI interaction layer:
- A visible in-game cursor derived from fingertip or pinch-center tracking
- Hover states for visible game controls
- Edge-triggered click activation when thumb and index finger pinch
- No cursor or pinch-click support on the landing page

The cursor layer is separate from gameplay logic so shared menu/control behavior can evolve without rewriting each engine.

## Sensitivity Strategy

Sensitivity should increase without making the controls feel noisy. The update will use two levers:
- Shared motion amplification so normalized hand movement maps to larger canvas travel
- Per-game tuning constants so each game can respond differently while still feeling part of the same system

Expected directional effect:
- Snake: quicker directional commitment from smaller finger-angle changes
- Fruit Ninja: larger slash travel from smaller movement with preserved anti-jitter smoothing
- Pool: more aim travel and faster cue alignment from small fingertip motion
- Mini Golf: more responsive pointer placement while preserving the existing pinch-drag-release putt interaction

## Shared Component Plan

The refactor will introduce a reusable game-stage shell and reusable in-game control helpers rather than duplicate UI logic across four canvases. Shared responsibilities:
- route-level layout and styling
- consistent camera/control rail framing
- cursor rendering and hover state
- pinch edge detection and click dispatch
- status copy for tracking, pinch state, and fallback controls

Each game remains responsible for:
- drawing its own canvas scene
- exposing its own visible actions (`start`, `pause`, `resume`, `restart`)
- applying game-specific sensitivity multipliers

## Error Handling And Fallback

If tracking is unavailable, the pages still function with mouse/keyboard fallback. The shared layout should make this clear without collapsing the page structure. Camera denial, tracker loss, and debug mode should preserve stable panel footprints so the design stays composed.

## Testing Strategy

Validation covers three levels:
- unit tests for shared input helpers and pinch-click edge detection
- component tests for the shared game-stage structure and exposed game controls
- browser validation for all four routes with screenshots and `render_game_to_text` state review

Success means:
- the four game routes read as one coherent system
- on-screen controls are reachable with fingertip hover plus pinch
- small finger movement results in noticeably larger gameplay response
- existing mouse/keyboard fallbacks still work
