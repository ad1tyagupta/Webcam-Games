# Mini Golf Pinch + Realism Design

**Date:** 2026-03-09

**Goal:** Replace the current hold-to-charge mini-golf input with a real putt gesture based on thumb/index pinch-drag-release, and substantially improve the mini-golf visuals without changing the overall app architecture.

## Current Context

- The project is a Vite + React + TypeScript webcam arcade.
- Mini-golf already exists as a canvas game with a shared `ArcadeSession` hand-tracking layer.
- Current mini-golf behavior is binary: pinch to charge, release to fire toward the current pointer.
- Existing deterministic test hooks already exist: `window.advanceTime(ms)` and `window.render_game_to_text()`.

## Architecture

- Keep [`/Users/adityagupta/Documents/Codex/Game Website/src/games/mini-golf/MiniGolfCanvas.tsx`](/Users/adityagupta/Documents/Codex/Game Website/src/games/mini-golf/MiniGolfCanvas.tsx) as the integration layer between hand tracking and the mini-golf engine.
- Extend [`/Users/adityagupta/Documents/Codex/Game Website/src/tracking/handMath.ts`](/Users/adityagupta/Documents/Codex/Game Website/src/tracking/handMath.ts) so mini-golf can use a pinch center rather than just an index fingertip and normalized pinch distance.
- Add a mini-golf-specific gesture state machine that translates noisy pinch/open tracking into stable shot events.
- Keep [`/Users/adityagupta/Documents/Codex/Game Website/src/games/mini-golf/miniGolfEngine.ts`](/Users/adityagupta/Documents/Codex/Game Website/src/games/mini-golf/miniGolfEngine.ts) as the gameplay authority, but upgrade it from charge-on-hold to gesture-driven shot phases.

## Interaction Model

- The user starts a shot by pinching near the ball.
- While still pinched, dragging backward from the ball defines the pull vector.
- Releasing the pinch launches the ball in the opposite direction of that pull vector, like a real putt.
- If the pull distance is too small, release should cancel back to aiming instead of counting as a stroke.
- If tracking is lost mid-shot, the gesture should cancel instead of firing accidentally.
- Pinch/open transitions should be debounced so small landmark jitter does not create accidental release events.

## Visual Direction

- Stay on the current 2D canvas, but move to a more realistic 2.5D presentation rather than a flat arcade sketch.
- Add layered course rendering: shaded grass, a defined fairway ribbon, rough, sand, cup depth, flag shading, shadows, richer barriers, and a more dimensional golf ball.
- Replace the bright debug-looking aim presentation with a more believable shot preview: projected guide, club/pull visualization, better power meter, and softer HUD styling.
- Preserve readability and input clarity over photorealism; the scene should look richer without making aiming harder.

## Error Handling

- No shot should fire from tracker loss.
- Debug keyboard fallback should still work and mirror the new pinch-drag-release model.
- The game should continue to expose concise text state for automated validation, including shot phase and preview state if active.

## Testing

- Add unit coverage for new hand-derived pinch geometry.
- Add unit coverage for the mini-golf gesture controller, especially debounce, release, and cancel-on-loss cases.
- Add unit coverage for the engine launch behavior using pull vectors rather than hold-to-charge.
- Validate the integrated game with the Playwright web-game client after each meaningful mini-golf change.
- Inspect generated gameplay screenshots and `render_game_to_text` output before considering the task complete.

## Constraints / Notes

- The workspace is not inside a git repository, so this design doc cannot be committed even though the normal brainstorming workflow expects a commit.
