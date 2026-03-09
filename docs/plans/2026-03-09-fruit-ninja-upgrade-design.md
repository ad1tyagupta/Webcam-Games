# Fruit Ninja Upgrade Design

## Goal

Upgrade the Fruit Ninja game so it feels substantially more polished and easier to play with webcam hand tracking. The new version should use bright cartoon fruit visuals, stronger fingertip slash detection, higher fruit launches, seven lives, and on-canvas start/pause/resume controls that can be triggered by fingertip interaction.

## Current State

The existing Fruit Ninja route already has a playable canvas, a shared hand-tracking session, a deterministic runtime hook, and a simple engine test file. The current gameplay is intentionally basic:

- Fruit and bombs are drawn as circles.
- Slicing is detected with a loose proximity check against the current pointer only.
- The round ends after three missed fruits.
- There is no pause mode.
- Start and reset controls live below the canvas instead of on the playable surface.

## Approved Direction

### Visual Direction

Use a bright cartoon fruit style instead of abstract circles. The scene should feel lively and readable:

- warm sky-to-market gradient background
- soft clouds/light accents near the top
- playful fruit drawings with stems, leaves, highlights, and color variation
- stronger slash trail with glow and taper
- fruit splash/chunk effects when sliced
- large, high-contrast pill buttons rendered directly on the canvas

### Tracking and Slicing

Improve finger tracking in a way that favors intentional slashes over hover noise:

- smooth fingertip movement over a short recent history window
- ignore micro-jitter so stationary hands do not register as attacks
- derive slash segments from recent fingertip path points instead of using only the current pointer position
- require sufficient swipe speed before a path segment can cut fruit

This keeps camera input responsive while making slice detection more trustworthy.

### Gameplay Changes

The Fruit Ninja engine should evolve from a simple title/play/gameover loop into:

- `title`
- `playing`
- `paused`
- `gameover`

Gameplay tuning changes:

- increase lives from 3 misses to 7 misses
- spawn fruit below the bottom edge and launch it higher so it reaches the upper half of the screen
- slightly lengthen airtime to give the user more time to react
- preserve bombs as instant-fail hazards unless design feedback changes later

### On-Canvas Controls

The game canvas should expose obvious control targets that work with fingertip input and desktop fallback:

- `Start` on the title state
- `Pause` while playing
- `Resume` while paused
- `Restart` on game over

Controls should be targetable by the same tracked pointer used for slicing. The preferred interaction is hover plus pinch, with mouse clicks still supported.

### Failure Handling

If tracking is lost or the camera is unavailable:

- keep the game rendering normally
- fade the active slash trail rather than freezing it
- keep keyboard and mouse fallback usable
- surface tracking status clearly in the HUD/state payload

## Technical Plan

### Hand Tracking Layer

Extend the derived hand data so Fruit Ninja can use smoothed fingertip movement instead of raw frame-to-frame noise. The work should stay within the existing shared tracking layer so improvements benefit the webcam preview and future gesture-driven games.

### Fruit Ninja Engine

Move slicing logic into an explicit slash-aware engine input model:

- recent slash path points
- slash activity flag
- pause/resume support
- seven-life miss handling
- stronger spawn tuning
- transient slice effects for presentation

### Fruit Ninja Canvas

Refactor the canvas renderer to draw a richer environment and actual stylized fruit shapes. The canvas should also own interactive button hit targets, trail rendering, HUD cards, and updated `render_game_to_text` output so automated validation can observe the same state shown visually.

## Validation

Validation should cover both deterministic logic and rendered behavior:

- unit tests for slash detection, pause/resume, and seven-life loss logic
- unit tests for any new hand-math smoothing helpers
- Playwright web-game runs against the Fruit Ninja route
- screenshot review of title, playing, paused, and game-over states
- `render_game_to_text` review to confirm button visibility, lives, tracking status, and fruit positions match the canvas
