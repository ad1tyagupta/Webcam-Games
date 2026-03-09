# Snake Terrarium Design

**Date:** 2026-03-09

**Goal:** Refresh the Snake game so it feels like a natural terrarium scene with a 2D/3D hybrid look, while preserving direct finger-direction steering and ensuring the webcam/debug interaction path remains reliable.

## Approved Direction

- Visual theme: natural terrarium-style scene
- Input model: direct finger-direction steering only
- Recommendation chosen: a 2.5D terrarium presentation rather than full perspective

## Architecture

The existing Snake game keeps its grid-based engine and gesture interpreter. The work stays concentrated in the Snake presentation layer, with a small supporting fix in the shared camera card so the webcam/debug controls do not jump during permission and tracker state changes.

The engine remains the source of truth for movement, collision, score, and food spawning. `SnakeCanvas` continues to bridge webcam input to the engine, but its rendering becomes a richer terrarium scene with layered background, volumetric snake drawing, natural food art, and clearer state overlays.

## Components

### Snake Canvas

`src/games/snake/SnakeCanvas.tsx` will keep a single canvas and runtime hooks, but its draw routine will be reworked into layered terrarium rendering:

- enclosure background with warm glass and soil tones
- floor texture and cell depth cues to keep the board readable
- edge foliage/decor kept away from active cells
- raised food with shadow and highlight
- volumetric snake head/body segments with underside shading and contact shadows
- clearer title / game-over overlays that fit the new art direction

### Shared Camera Card

`src/components/GameCameraCard.tsx` and shared page styling will be adjusted so permission states, tracker errors, and debug controls occupy a stable layout footprint. The objective is to keep the webcam area usable with a real camera while also preventing Playwright/debug interaction failures caused by layout shift.

### Supporting Styles

Global layout and panel styles in `src/index.css` may need light updates so the Snake canvas and camera card feel cohesive with the terrarium look without regressing the other games.

## Data Flow

The gameplay data flow stays the same:

1. Webcam tracker or debug mode produces a `HandFrame`.
2. Snake gesture interpretation converts the pointer vector into a cardinal direction.
3. The Snake engine consumes that direction and updates the grid state.
4. The canvas draw routine renders the updated scene and exposes concise runtime state through `window.render_game_to_text`.

No new gameplay state is required beyond visual-only rendering calculations derived from the existing engine state.

## Error Handling

- Camera permission failures should still leave the debug/simulated control path accessible.
- Tracker loss should remain visible in both text state and on-canvas messaging.
- The camera card should avoid layout jumps when status text changes.
- Keyboard fallback must continue to work if the webcam is unavailable.

## Testing

Testing will cover both logic safety and runtime behavior:

- add or update unit tests around the affected UI/control behavior
- verify the Snake route still exposes deterministic `render_game_to_text` and `advanceTime`
- run the required Playwright client against `/play/snake`
- review screenshots to confirm the terrarium visuals render correctly during gameplay, not only on the title state
- inspect runtime state and console errors after each meaningful change

## Constraints

- Preserve direct finger-direction steering semantics.
- Preserve board readability; visuals cannot make collision paths ambiguous.
- Keep a single canvas as the main play surface.
- Avoid gameplay regressions while improving presentation.
