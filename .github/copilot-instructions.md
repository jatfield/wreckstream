# Copilot Instructions for Wreckstream

## Project Overview

Wreckstream is a neon-styled arcade browser game written in pure vanilla JavaScript and rendered on an HTML5 Canvas. The player pilots a ship with a trailing chain of polygon debris pieces, catches enemies in the tail to destroy them, and sweeps the field to collect wreckage and grow the tail.

## Tech Stack

- **Language**: Vanilla JavaScript (ES6+) — no frameworks, no build step
- **Rendering**: HTML5 Canvas 2D API (`game.js`)
- **Audio**: HTML5 `<audio>` element (`score.mp3`)
- **Entry point**: `index.html` — open directly in any modern browser

## Repository Structure

```
index.html   – Game shell: canvas, HUD elements, script tag
game.js      – All game logic and rendering (single file)
score.mp3    – Background music
README.md    – Player-facing documentation
journal.md   – Design/development diary
```

## Development Conventions

- All game configuration lives in the `GAME_CONFIG` object at the top of `game.js`; add new tunable values there rather than scattering magic numbers through the code.
- Keep all game logic in `game.js`. Avoid splitting into multiple files unless the file becomes unmanageable.
- Use `const` for values that never change, `let` for mutable state.
- Follow the existing code-comment style: brief inline comments on non-obvious logic, and section header comments (e.g. `// Draw player ship`) for logical blocks.
- Colors are centralised in the `colors` object; use those constants rather than raw hex strings.
- No external libraries or package managers are used — keep it that way unless there is a compelling reason.

## How to Run and Test

There is no build step or test suite. To validate changes:

1. Open `index.html` in a modern browser (Chrome/Edge recommended).
2. Press **Space** to start a game and exercise the changed behaviour.
3. Check the browser DevTools console for errors or warnings.
4. Test both mouse and keyboard (WASD / Arrow Keys) controls.
5. Verify game-over and restart flows still work correctly.

## Key Design Goals

- **Neon pastel aesthetic** — colors should stay within the existing pink/blue/yellow/green palette.
- **Minimal dependencies** — the game must run by opening a single HTML file with no server or install step.
- **Smooth 60 fps gameplay** — avoid allocations in the hot `update`/`draw` loop where possible.
