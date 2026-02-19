# Wreckstream 🚀

A neon-styled arcade 2D JavaScript game set in a pastel-colored universe.

## About

Wreckstream is an arcade game where you control a ship with a glowing debris tail. Your mission: avoid objects flying in from the edges of the screen while using your tail to destroy them. Each destroyed object adds more debris to your tail, making it longer and more powerful!

## Features

- **Neon Pastel Aesthetics**: Beautiful neon pink, blue, yellow, and mint green color palette
- **Dynamic Debris Tail**: Your ship leaves a glowing trail that grows as you destroy enemies
- **Smooth Controls**: Use arrow keys or WASD to navigate through space
- **Progressive Difficulty**: Enemies spawn continuously, increasing the challenge
- **Particle Effects**: Stunning visual effects when enemies are destroyed
- **Score Tracking**: Earn points for each enemy caught in your tail

## How to Play

1. Open `index.html` in your web browser
2. Press **SPACE** to start the game
3. Use **Arrow Keys** or **WASD** to move your ship
4. Avoid letting enemies hit your ship directly (Game Over!)
5. Catch enemies in your debris tail to destroy them and grow longer
6. Earn points and try to beat your high score!

## Gameplay Mechanics

- **Ship**: The player-controlled pink neon ship
- **Debris Tail**: A glowing blue trail that follows your ship's movement
- **Enemies**: Green objects that spawn from screen edges and fly across
- **Collision**: 
  - Direct hit on ship = Game Over
  - Enemy touches tail = Enemy destroyed, tail grows, score increases

## Controls

- **Movement**: Arrow Keys or WASD
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