# Mini Golf Pinch + Realism Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real putt pinch-drag-release controls to mini-golf and substantially improve the course rendering while preserving deterministic testability.

**Architecture:** Extend shared hand-derived data with pinch-center geometry, add a mini-golf-specific gesture controller to debounce pinch/release behavior, and update the mini-golf engine to launch shots from pull vectors instead of hold-to-charge. Keep the current canvas route, then replace the flat rendering with a richer 2.5D course pass and updated HUD/preview visuals.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright client script, HTML canvas

---

### Task 1: Add pinch-center tracking primitives

**Files:**
- Modify: `/Users/adityagupta/Documents/Codex/Game Website/src/types/arcade.ts`
- Modify: `/Users/adityagupta/Documents/Codex/Game Website/src/tracking/handMath.ts`
- Test: `/Users/adityagupta/Documents/Codex/Game Website/src/tracking/handMath.test.ts`

**Step 1: Write the failing test**

Add assertions that `computeHandDerivedData()` exposes a mirrored `thumbTip` and a `pinchCenter` midpoint suitable for pinch-drag gestures.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/tracking/handMath.test.ts`
Expected: FAIL because the derived shape does not yet expose the new fields.

**Step 3: Write minimal implementation**

Extend the hand-derived types and computation to include `thumbTip` and `pinchCenter`.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/tracking/handMath.test.ts`
Expected: PASS

**Step 5: Commit**

Blocked: no git repository in the workspace.

### Task 2: Add a stable mini-golf pinch gesture controller

**Files:**
- Create: `/Users/adityagupta/Documents/Codex/Game Website/src/games/mini-golf/miniGolfGesture.ts`
- Test: `/Users/adityagupta/Documents/Codex/Game Website/src/games/mini-golf/miniGolfGesture.test.ts`

**Step 1: Write the failing test**

Add tests for:
- starting a shot only when a pinch begins near the ball
- keeping the shot active while pinch stays stable
- releasing into a `released` event
- cancelling instead of releasing when tracking is lost
- ignoring raw pinch jitter until the debounce window is met

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/mini-golf/miniGolfGesture.test.ts`
Expected: FAIL because the controller file does not exist.

**Step 3: Write minimal implementation**

Create a pure controller that consumes raw pinch state, tracking status, pointer position, and ball position and emits stable shot events.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/mini-golf/miniGolfGesture.test.ts`
Expected: PASS

**Step 5: Commit**

Blocked: no git repository in the workspace.

### Task 3: Update the mini-golf engine for pull-based shots

**Files:**
- Modify: `/Users/adityagupta/Documents/Codex/Game Website/src/games/mini-golf/miniGolfEngine.ts`
- Modify: `/Users/adityagupta/Documents/Codex/Game Website/src/games/mini-golf/miniGolfEngine.test.ts`

**Step 1: Write the failing test**

Add tests for:
- launching opposite the pull vector on release
- not incrementing strokes for a tiny release
- cancelling a shot cleanly after loss

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/mini-golf/miniGolfEngine.test.ts`
Expected: FAIL because the engine still uses hold-to-charge behavior.

**Step 3: Write minimal implementation**

Add shot phases and pull-vector launch logic while preserving rolling, collisions, and win detection.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/mini-golf/miniGolfEngine.test.ts`
Expected: PASS

**Step 5: Commit**

Blocked: no git repository in the workspace.

### Task 4: Integrate gesture controller into the mini-golf canvas

**Files:**
- Modify: `/Users/adityagupta/Documents/Codex/Game Website/src/games/mini-golf/MiniGolfCanvas.tsx`
- Modify: `/Users/adityagupta/Documents/Codex/Game Website/src/components/GameCameraCard.tsx`

**Step 1: Write the failing test**

Use existing unit coverage plus Playwright integration as the failure signal by first updating the text-state expectations in the browser validation pass.

**Step 2: Run test to verify it fails**

Run: `node "$HOME/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js" --url http://127.0.0.1:4173/play/mini-golf --actions-json '{"steps":[{"buttons":["space"],"frames":4},{"buttons":[],"frames":4}]}' --screenshot-dir output/mini-golf-controls-red --iterations 1 --pause-ms 150`
Expected: text state and gameplay still reflect hold-to-charge behavior.

**Step 3: Write minimal implementation**

Drive the engine with stable gesture events, update the instruction copy, and expose richer mini-golf text state for automated inspection.

**Step 4: Run test to verify it passes**

Run the Playwright client with a pull-back-and-release keyboard sequence and confirm the new shot phases appear in text state and screenshots.

**Step 5: Commit**

Blocked: no git repository in the workspace.

### Task 5: Replace the flat course art with a richer 2.5D render

**Files:**
- Modify: `/Users/adityagupta/Documents/Codex/Game Website/src/games/mini-golf/MiniGolfCanvas.tsx`
- Modify: `/Users/adityagupta/Documents/Codex/Game Website/progress.md`

**Step 1: Write the failing test**

Define the expected browser validation artifact set for the updated mini-golf visuals and record the current flat screenshot as the baseline to beat.

**Step 2: Run test to verify it fails**

Run the Playwright client against the current route and inspect the screenshot.
Expected: the existing course still looks flat and low-detail.

**Step 3: Write minimal implementation**

Refactor the renderer into layered helpers and add terrain, shadows, dimensional props, and a higher-quality shot preview/HUD.

**Step 4: Run test to verify it passes**

Run the Playwright client again, inspect the screenshot manually, and confirm the richer visuals are present and the text state still matches gameplay.

**Step 5: Commit**

Blocked: no git repository in the workspace.

### Task 6: Full verification and progress handoff

**Files:**
- Modify: `/Users/adityagupta/Documents/Codex/Game Website/progress.md`

**Step 1: Write the verification checklist**

List the required validation commands and artifact paths.

**Step 2: Run verification**

Run:
- `npm run test:run`
- `npm run lint`
- `npm run build`
- Playwright mini-golf validation against the live app

Expected: all commands pass, screenshots show the new visuals, and text state reflects the new gesture model.

**Step 3: Update progress log**

Append the implementation summary, validation artifacts, and any remaining mini-golf tuning notes.

**Step 4: Commit**

Blocked: no git repository in the workspace.
