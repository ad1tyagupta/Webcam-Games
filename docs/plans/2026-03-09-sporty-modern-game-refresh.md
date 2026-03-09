# Sporty Modern Game Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade all four game pages with a shared sporty-modern stage layout, stronger finger sensitivity, and shared in-game pinch-to-click controls for visible game actions.

**Architecture:** Add one shared game-stage layout and one shared in-game cursor/click helper so route chrome and button interaction are consistent, while each game keeps its own engine and scene rendering. Tune sensitivity at the shared input boundary and, where needed, at individual game canvases so small hand motion maps to larger gameplay response without removing existing smoothing or fallback input.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Playwright web-game client

---

### Task 1: Shared game-stage structure

**Files:**
- Create: `src/components/GameStageLayout.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/index.css`
- Test: `src/components/GameStageLayout.test.tsx`

**Step 1: Write the failing test**

```tsx
it('renders the shared sporty-modern game stage regions', () => {
  render(
    <MemoryRouter>
      <GameStageLayout
        gameId="snake"
        title="Snake Signal"
        subtitle="Fast reaction terrarium"
        cameraCard={<div>camera</div>}
        infoPanel={<div>info</div>}
      >
        <canvas aria-label="Snake board" />
      </GameStageLayout>
    </MemoryRouter>,
  )

  expect(screen.getByText('Snake Signal')).toBeInTheDocument()
  expect(screen.getByTestId('game-stage-canvas')).toBeInTheDocument()
  expect(screen.getByTestId('game-stage-rail')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/GameStageLayout.test.tsx`
Expected: FAIL because `GameStageLayout` does not exist yet.

**Step 3: Write minimal implementation**

Create `src/components/GameStageLayout.tsx` with:
- shared route header/meta row
- hero canvas region
- right rail for camera + info content
- `data-testid` hooks for layout verification

Update `src/components/AppShell.tsx` and `src/index.css` so `/play/*` routes use the new sporty-modern chrome.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/GameStageLayout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/GameStageLayout.tsx src/components/GameStageLayout.test.tsx src/components/AppShell.tsx src/index.css
git commit -m "feat: add shared sporty game stage layout"
```

### Task 2: Shared pinch-click controller

**Files:**
- Create: `src/games/common/gameUiPointer.ts`
- Test: `src/games/common/gameUiPointer.test.ts`
- Modify: `src/types/arcade.ts`

**Step 1: Write the failing test**

```ts
it('fires one click when pinch closes over a hovered target', () => {
  const controller = createGameUiPointerController()

  const first = controller.update({
    pointer: { x: 100, y: 80 },
    pinchState: 'open',
    targets: [{ id: 'start', x: 60, y: 50, width: 120, height: 48 }],
  })
  const second = controller.update({
    pointer: { x: 100, y: 80 },
    pinchState: 'pinched',
    targets: [{ id: 'start', x: 60, y: 50, width: 120, height: 48 }],
  })

  expect(first.clickedTargetId).toBeNull()
  expect(second.clickedTargetId).toBe('start')
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/common/gameUiPointer.test.ts`
Expected: FAIL because the controller helper does not exist yet.

**Step 3: Write minimal implementation**

Create a small shared controller that:
- tracks hovered target
- detects pinch open -> pinched edges
- emits a single clicked target id
- exposes stable pointer/hover state for rendering

Add any shared UI target types in `src/types/arcade.ts`.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/common/gameUiPointer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/games/common/gameUiPointer.ts src/games/common/gameUiPointer.test.ts src/types/arcade.ts
git commit -m "feat: add shared pinch click controller"
```

### Task 3: Sensitivity helper updates

**Files:**
- Modify: `src/games/common/input.ts`
- Modify: `src/tracking/handMath.ts`
- Test: `src/tracking/handMath.test.ts`

**Step 1: Write the failing test**

```ts
it('amplifies small fingertip movement while preserving bounds', () => {
  const amplified = amplifyNormalizedMotion(
    { x: 0.5, y: 0.5 },
    { x: 0.54, y: 0.46 },
    { x: 1.8, y: 1.8 },
  )

  expect(amplified.x).toBeGreaterThan(0.54)
  expect(amplified.y).toBeLessThan(0.46)
  expect(amplified.x).toBeLessThanOrEqual(1)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/tracking/handMath.test.ts`
Expected: FAIL because the amplification helper or expected behavior is missing.

**Step 3: Write minimal implementation**

Add shared helpers that:
- amplify normalized motion around a stable anchor
- preserve clamping
- keep existing smoothing behavior for noisy camera input

Update any call sites that should use amplified pointer data.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/tracking/handMath.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/games/common/input.ts src/tracking/handMath.ts src/tracking/handMath.test.ts
git commit -m "feat: amplify shared hand motion"
```

### Task 4: Shared in-game cursor rendering and camera rail refresh

**Files:**
- Modify: `src/components/GameCameraCard.tsx`
- Modify: `src/components/GameCameraCard.test.tsx`
- Modify: `src/index.css`

**Step 1: Write the failing test**

```tsx
it('shows pinch-ready guidance inside the camera rail', () => {
  mockUseArcadeSession.mockReturnValue(makeSession())
  render(<GameCameraCard debugButtonId="debug" />)
  expect(screen.getByText(/pinch to click/i)).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/GameCameraCard.test.tsx`
Expected: FAIL because the new camera-rail guidance is not rendered yet.

**Step 3: Write minimal implementation**

Update `GameCameraCard` and shared CSS so the right rail:
- matches the sporty-modern visual system
- exposes pinch/cursor guidance
- keeps a stable footprint across permission states

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/GameCameraCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/GameCameraCard.tsx src/components/GameCameraCard.test.tsx src/index.css
git commit -m "feat: refresh camera rail guidance"
```

### Task 5: Snake and Fruit Ninja stage migration

**Files:**
- Modify: `src/games/snake/SnakeCanvas.tsx`
- Modify: `src/games/fruit-ninja/FruitNinjaCanvas.tsx`
- Test: `src/games/snake/SnakeCanvas.test.tsx`
- Test: `src/games/fruit-ninja/FruitNinjaCanvas.test.tsx`

**Step 1: Write the failing test**

```tsx
it('renders an on-screen start action that can be targeted by the shared game ui layer', () => {
  render(
    <MemoryRouter>
      <FruitNinjaCanvas />
    </MemoryRouter>,
  )

  expect(screen.getByLabelText('Fruit Ninja arena')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/snake/SnakeCanvas.test.tsx src/games/fruit-ninja/FruitNinjaCanvas.test.tsx`
Expected: FAIL because the routes are not using the shared stage metadata/hooks yet.

**Step 3: Write minimal implementation**

Update both canvases to:
- render inside `GameStageLayout`
- register visible action targets for `start`, `pause`, `resume`, and `restart`
- draw the shared cursor and apply stronger sensitivity tuning

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/snake/SnakeCanvas.test.tsx src/games/fruit-ninja/FruitNinjaCanvas.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/games/snake/SnakeCanvas.tsx src/games/snake/SnakeCanvas.test.tsx src/games/fruit-ninja/FruitNinjaCanvas.tsx src/games/fruit-ninja/FruitNinjaCanvas.test.tsx
git commit -m "feat: migrate snake and fruit ninja to shared game stage"
```

### Task 6: Pool and Mini Golf stage migration

**Files:**
- Modify: `src/games/pool/PoolCanvas.tsx`
- Modify: `src/games/mini-golf/MiniGolfCanvas.tsx`
- Test: `src/games/mini-golf/MiniGolfCanvas.test.tsx`

**Step 1: Write the failing test**

```tsx
it('renders the mini golf course inside the shared stage rail layout', () => {
  render(
    <MemoryRouter>
      <MiniGolfCanvas />
    </MemoryRouter>,
  )

  expect(screen.getByTestId('game-stage-rail')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/mini-golf/MiniGolfCanvas.test.tsx`
Expected: FAIL because the route does not yet render the shared stage markers.

**Step 3: Write minimal implementation**

Update Pool and Mini Golf to:
- render inside `GameStageLayout`
- expose shared cursor/pinch control targets where appropriate
- apply stronger pointer sensitivity while preserving existing gameplay rules

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/mini-golf/MiniGolfCanvas.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/games/pool/PoolCanvas.tsx src/games/mini-golf/MiniGolfCanvas.tsx src/games/mini-golf/MiniGolfCanvas.test.tsx
git commit -m "feat: migrate aiming games to shared game stage"
```

### Task 7: Full verification and polish

**Files:**
- Modify: `progress.md`

**Step 1: Run focused tests**

Run:
```bash
npm run test:run -- src/components/GameStageLayout.test.tsx src/games/common/gameUiPointer.test.ts src/components/GameCameraCard.test.tsx src/games/snake/SnakeCanvas.test.tsx src/games/fruit-ninja/FruitNinjaCanvas.test.tsx src/games/mini-golf/MiniGolfCanvas.test.tsx src/tracking/handMath.test.ts
```

Expected: PASS

**Step 2: Run full verification**

Run:
```bash
npm run test:run
npm run lint
npm run build
```

Expected: PASS

**Step 3: Run browser validation**

Run the Playwright web-game client against:
- `/play/snake`
- `/play/fruit-ninja`
- `/play/pool`
- `/play/mini-golf`

Expected:
- screenshots show the shared sporty-modern stage
- on-screen actions remain visible
- text state confirms gameplay still runs

**Step 4: Update progress log**

Append final notes, artifacts, and any remaining hardware-smoke TODOs to `progress.md`.

**Step 5: Commit**

```bash
git add progress.md output
git commit -m "chore: verify sporty modern game refresh"
```
