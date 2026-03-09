# Snake Terrarium Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Snake route into a natural terrarium-style scene with 2D/3D hybrid rendering, while keeping direct finger-direction steering and fixing camera-card layout instability that breaks automated webcam/debug validation.

**Architecture:** Keep the existing Snake engine and gesture interpreter intact. Concentrate changes in the Snake canvas renderer, light shared styling, and the shared camera card so the gameplay remains deterministic while the presentation and webcam/debug usability improve.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright client, canvas 2D rendering

---

### Task 1: Add a failing regression test for the camera card layout contract

**Files:**
- Modify: `src/components/GameCameraCard.tsx`
- Create: `src/components/GameCameraCard.test.tsx`
- Test: `src/components/GameCameraCard.test.tsx`

**Step 1: Write the failing test**

Create a test that renders the camera card through a mocked arcade session and asserts the action area and helper text container remain present for both neutral and error states, so layout-critical sections are always reserved.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/GameCameraCard.test.tsx`
Expected: FAIL because the current markup does not expose a stable layout contract for these states.

**Step 3: Write minimal implementation**

Update `src/components/GameCameraCard.tsx` to render stable subcontainers / test ids for the preview, message, and actions area regardless of permission or tracker state.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/GameCameraCard.test.tsx`
Expected: PASS

**Step 5: Commit**

If git is available:

```bash
git add src/components/GameCameraCard.tsx src/components/GameCameraCard.test.tsx
git commit -m "test: lock camera card layout contract"
```

If git is unavailable, skip commit and continue.

### Task 2: Add a failing Snake canvas rendering/state test

**Files:**
- Modify: `src/games/snake/SnakeCanvas.tsx`
- Create: `src/games/snake/SnakeCanvas.test.tsx`
- Test: `src/games/snake/SnakeCanvas.test.tsx`

**Step 1: Write the failing test**

Create a focused test that mounts `SnakeCanvas`, registers mocked canvas APIs, and asserts the route exposes `window.render_game_to_text` while rendering the new Snake heading / control shell without crashing.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/snake/SnakeCanvas.test.tsx`
Expected: FAIL because the current test scaffolding for the richer canvas/runtime path is missing.

**Step 3: Write minimal implementation**

Add the minimal test helpers or component adjustments required so the Snake canvas can be mounted and exercised safely in jsdom.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/snake/SnakeCanvas.test.tsx`
Expected: PASS

**Step 5: Commit**

If git is available:

```bash
git add src/games/snake/SnakeCanvas.tsx src/games/snake/SnakeCanvas.test.tsx
git commit -m "test: cover snake canvas runtime hooks"
```

If git is unavailable, skip commit and continue.

### Task 3: Implement the terrarium renderer

**Files:**
- Modify: `src/games/snake/SnakeCanvas.tsx`
- Modify: `src/index.css`

**Step 1: Write the failing test**

Extend the Snake canvas test with expectations that the new presentation shell still renders core controls and state text after the renderer changes.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/snake/SnakeCanvas.test.tsx`
Expected: FAIL if the component structure or runtime wiring regresses during the renderer rewrite.

**Step 3: Write minimal implementation**

Rework the draw routine to add:

- terrarium background layers
- subtle board depth cues
- natural food art with shadows
- segmented volumetric snake body/head rendering
- updated overlay cards and title/game-over presentation

Add only the CSS required to support the revised stage presentation.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/snake/SnakeCanvas.test.tsx`
Expected: PASS

**Step 5: Commit**

If git is available:

```bash
git add src/games/snake/SnakeCanvas.tsx src/index.css
git commit -m "feat: add terrarium snake presentation"
```

If git is unavailable, skip commit and continue.

### Task 4: Stabilize camera-card layout and Snake route integration

**Files:**
- Modify: `src/components/GameCameraCard.tsx`
- Modify: `src/index.css`
- Modify: `src/games/snake/SnakeCanvas.tsx`

**Step 1: Write the failing test**

Add assertions that the camera card keeps the preview, helper copy, and action row in place across tracker states used by Snake.

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/GameCameraCard.test.tsx`
Expected: FAIL before the state containers and sizing are stabilized.

**Step 3: Write minimal implementation**

Reserve space for preview/status/action regions and update copy/layout so permission errors, ready state, and debug mode do not shift the button enough to break automated interaction.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/GameCameraCard.test.tsx`
Expected: PASS

**Step 5: Commit**

If git is available:

```bash
git add src/components/GameCameraCard.tsx src/index.css src/games/snake/SnakeCanvas.tsx
git commit -m "fix: stabilize snake camera card interactions"
```

If git is unavailable, skip commit and continue.

### Task 5: Verify the full Snake route

**Files:**
- Modify: `progress.md`
- Output: `output/snake-terrarium/*`

**Step 1: Run targeted unit tests**

Run:

```bash
npm run test:run -- src/components/GameCameraCard.test.tsx src/games/snake/SnakeCanvas.test.tsx src/games/snake/snakeEngine.test.ts src/games/snake/snakeInput.test.ts
```

Expected: PASS

**Step 2: Run broader verification**

Run:

```bash
npm run build
```

Expected: PASS

**Step 3: Run Playwright validation**

Run the required client against the Snake route with gameplay inputs and capture screenshots/state in `output/snake-terrarium`.

Expected:
- no new console errors
- screenshots show the terrarium visuals during gameplay
- text state matches gameplay state

**Step 4: Update progress log**

Append the implementation summary, validation commands, artifacts, and any remaining TODOs to `progress.md`.

**Step 5: Commit**

If git is available:

```bash
git add progress.md output/snake-terrarium
git commit -m "docs: record snake terrarium validation"
```

If git is unavailable, skip commit and continue.
