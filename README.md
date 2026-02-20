# Wreckstream 🚀

A neon-styled arcade JavaScript game set in a pastel-colored universe with 3D perspective visuals.

## About

Wreckstream is an arcade game where you pilot a ship with a glowing polygon debris tail through a starfield. Enemies spawn from the edges of the screen and fly across the field — catch them in your tail to destroy them. The wreckage they leave behind stays on the field; sweep your tail over it to collect it and grow longer. The bigger the debris, the more your tail grows!

## Features

- **Neon Pastel Aesthetics**: Beautiful neon pink, blue, yellow, and mint green color palette
- **3D Starfield Background**: Parallax star field that gives the feel of traveling through space
- **3D Tilted Ship**: The player ship has a depth/perspective effect with the nose tilting toward the viewer, a visible underside, and engine glow
- **Polygon Debris Tail**: Your ship trails a chain of glowing polygon shapes that grows as you collect wreckage
- **Wreckage Pickup Mechanic**: Destroyed enemies leave debris on the field — collect it by sweeping your tail over it; the tail grows in proportion to debris size
- **Speed-Dependent Tail**: The visible tail length scales with your movement speed
- **Mouse & Keyboard Controls**: Smooth mouse-driven movement with optional WASD/Arrow key control
- **Progressive Difficulty**: Enemies spawn continuously, increasing the challenge
- **Particle Effects**: Stunning visual effects when enemies are destroyed and wreckage is collected
- **Score Tracking**: Earn points for each enemy caught in your tail

## How to Play

1. Open `index.html` in your web browser
2. Press **SPACE** to start the game
3. Use your **mouse** (or Arrow Keys / WASD) to steer your ship
4. Avoid letting enemies hit your ship directly (Game Over!)
5. Catch enemies in your debris tail to destroy them — watch the wreckage scatter!
6. Sweep your tail over the wreckage left on the field to collect it and grow your tail
7. Earn points and try to beat your high score!

## Gameplay Mechanics

- **Ship**: The player-controlled pink neon ship, rendered with a 3D tilt toward the screen
- **Polygon Debris Tail**: A chain of glowing polygons (triangles, quads, pentagons, hexagons) that follow your ship's path; visible length depends on speed
- **Enemies**: Green 3D objects that spawn from screen edges and fly across the field
- **Wreckage**: When an enemy is destroyed, polygon debris pieces scatter and stay on the field; collect them by moving your tail over them
- **Tail Growth**: Picking up wreckage grows your tail — larger debris pieces add more length
- **Collision**:
  - Direct hit on ship = Game Over
  - Enemy touches tail = Enemy destroyed, wreckage scattered
  - Tail touches wreckage = Wreckage collected, tail grows

## Controls

- **Movement**: Mouse (primary) or Arrow Keys / WASD
- **Start/Restart**: Space Bar

## Technology

- Pure vanilla JavaScript
- HTML5 Canvas for rendering
- No dependencies required

## Installation

Simply clone the repository and open `index.html` in any modern web browser:

```bash
git clone https://github.com/jatfield/wreckstream.git
cd wreckstream
open index.html  # or just double-click the file
```

No build process or installation required!

## Browser Compatibility

Works in all modern browsers that support HTML5 Canvas:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## License

MIT