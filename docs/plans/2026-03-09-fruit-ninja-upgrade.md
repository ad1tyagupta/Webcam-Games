# Fruit Ninja Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Fruit Ninja with better fingertip slash tracking, bright cartoon fruit visuals, higher fruit arcs, seven lives, and on-canvas start/pause/resume controls.

**Architecture:** Keep the shared webcam tracking/session layer, extend derived hand data with stable slash-friendly motion, and move Fruit Ninja to a richer engine/canvas model. The engine remains deterministic and testable, while the canvas handles stylized rendering and in-canvas controls.

**Tech Stack:** React, TypeScript, Vite, Vitest, canvas 2D, shared webcam tracking session, Playwright web-game client

---

### Task 1: Lock in engine expectations with failing tests

**Files:**
- Modify: `src/games/fruit-ninja/fruitNinjaEngine.test.ts`
- Test: `src/games/fruit-ninja/fruitNinjaEngine.test.ts`

**Step 1: Write the failing tests**

Add tests that assert:

- slicing only happens when a slash path crosses a fruit with enough speed
- the game enters `paused` and does not advance fruit motion while paused
- missed fruit are allowed up to seven lives before `gameover`

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/fruit-ninja/fruitNinjaEngine.test.ts`

Expected: FAIL because the engine does not yet support slash segments, pause state, or seven-life handling.

**Step 3: Write minimal implementation**

Modify `src/games/fruit-ninja/fruitNinjaEngine.ts` to add the missing state and update behavior with the smallest working implementation.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/fruit-ninja/fruitNinjaEngine.test.ts`

Expected: PASS

**Step 5: Commit**

Skip commit in this workspace if `.git` is unavailable.

### Task 2: Lock in fingertip smoothing behavior with failing tests

**Files:**
- Modify: `src/tracking/handMath.test.ts`
- Modify: `src/tracking/handMath.ts`
- Modify: `src/types/arcade.ts`
- Test: `src/tracking/handMath.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- smoothed index-tip output dampening sudden jitter
- swipe velocity remaining small for tiny stationary movements
- any new slash-friendly derived fields staying mirrored correctly

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/tracking/handMath.test.ts`

Expected: FAIL because the new derived tracking behavior is not implemented yet.

**Step 3: Write minimal implementation**

Extend the derived hand data and smoothing math just enough to satisfy the tests while preserving existing consumers.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/tracking/handMath.test.ts`

Expected: PASS

**Step 5: Commit**

Skip commit in this workspace if `.git` is unavailable.

### Task 3: Add pause/control plumbing and richer text state

**Files:**
- Modify: `src/games/fruit-ninja/FruitNinjaCanvas.tsx`
- Modify: `src/types/arcade.ts`
- Modify: `src/games/common/input.ts`

**Step 1: Write the failing test**

Use the engine tests from Task 1 as the behavioral guardrail and add any small helper tests only if a pure function is introduced for button hit testing or pointer smoothing.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/fruit-ninja/fruitNinjaEngine.test.ts src/tracking/handMath.test.ts`

Expected: FAIL until the canvas input model matches the upgraded engine contract.

**Step 3: Write minimal implementation**

Update the canvas to:

- feed slash path segments and slash-active state into the engine
- expose on-canvas button targets for start/pause/resume/restart
- support fingertip hover-plus-pinch activation
- extend `render_game_to_text` with lives, visible controls, slash state, and key visual entities

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/fruit-ninja/fruitNinjaEngine.test.ts src/tracking/handMath.test.ts`

Expected: PASS

**Step 5: Commit**

Skip commit in this workspace if `.git` is unavailable.

### Task 4: Upgrade the canvas art and layout polish

**Files:**
- Modify: `src/games/fruit-ninja/FruitNinjaCanvas.tsx`
- Modify: `src/index.css`
- Modify: `progress.md`

**Step 1: Write the failing test**

No additional unit test is required if this task is strictly rendering/layout work. Reuse deterministic state tests and rely on screenshot validation for visual changes.

**Step 2: Run test to verify baseline still passes**

Run: `npm run test:run -- src/games/fruit-ninja/fruitNinjaEngine.test.ts src/tracking/handMath.test.ts`

Expected: PASS before visual refactor starts.

**Step 3: Write minimal implementation**

Redraw the game with:

- bright cartoon fruit shapes instead of circles
- richer background and HUD treatment
- visible lives indicator out of seven
- slice effects and a cleaner slash trail
- polished in-game controls that remain readable on desktop and mobile

**Step 4: Run test to verify it still passes**

Run: `npm run test:run -- src/games/fruit-ninja/fruitNinjaEngine.test.ts src/tracking/handMath.test.ts`

Expected: PASS

**Step 5: Commit**

Skip commit in this workspace if `.git` is unavailable.

### Task 5: Validate the game end-to-end with the web-game loop

**Files:**
- Modify: `progress.md`
- Review artifacts under: `output/fruit-upgrade/`

**Step 1: Run targeted checks**

Run:

- `npm run lint`
- `npm run test:run`
- `npm run build`

Expected: PASS

**Step 2: Run Playwright validation**

Run the required client against the local dev server with actions that cover:

- starting from title
- entering gameplay
- pausing and resuming
- slicing fruit
- allowing misses to accumulate

Recommended command shape:

`node "$WEB_GAME_CLIENT" --url http://localhost:5173/play/fruit-ninja --actions-json '<JSON>' --iterations 1 --pause-ms 250 --output-dir output/fruit-upgrade`

**Step 3: Inspect results**

Review:

- latest screenshot(s)
- latest `state-*.json`
- console error output

**Step 4: Fix and rerun until stable**

Repeat the loop until screenshots and text state agree with the intended behavior.

**Step 5: Commit**

Skip commit in this workspace if `.git` is unavailable.
