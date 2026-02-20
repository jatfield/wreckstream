# Vibe coding experiment

## Idea: 

An avoid'em up game. I'd like to see if it's possible to have a fun game without shooting. I'm imagining vibrant colors, polygons, a lot of particles. 
Would be nice to have a soundtrack that reacts to the gameplay, with the music getting more intense as the tail grows and more objects are on the screen.
Maybe pulsating background?

## Starting instructions:

"An arcade 2d javascript game that's set in a neonic pastelle coloured universe. The player controls a ship that has a tail of debris and the goal is to avoid objects flying in from the edges of the screen. The objects caught up in the tail are destroyed, and the debris left by them is added to the tail."

### Initial thoughts:
- The agent emplemented a keyboard control. Suprisingly complete and funcional, totally viable as a proof of concept.
- I mistyped 3d as 2d. In my mind it was supposed to have a Geometry Wars asthetics, with the objects made up of polygonal shapes and the ship leaving a trail of particles.
- The game ends abruptly when the player is hit, with no explosion or visual feedback.

## Prompts:

1. "I'd rather have 3d objects moving on a 2d plane, and also need mouse control. The tail should be made up of separate pieces of debris and the destroyed objects should fall apart and the pieces touched by the tail are added to it. The visible length of the tail is dependent of the player speed, and when the player is destroyed it should result in a magnificient explosion"

### Second version:

- The mouse controls work great, the gameplay is really satisfying. 
- The tail is still just an emission.
- I believe the agent implemented the explosion, but it doesn't appear. Probably hidden by the end game screen.
- When the player stops, the tail disappears and doesn't reappear when they start moving again. The ship also doesn't point in the direction of movement.
- Still no polygons, but let's focus on the bugs first.

2. "Found a bug: when I stop and the tail catches up, it doesn't reappear when I start moving. The ship should also point in the direction of movement. The final explosion doesn't appear. Maybe because the game over screen shows too soon? Also, I don't see the enemies breaking up.  Wouldn't using something like three.js amke handling this easier?"

### Third version:

- The tail now reappears when the player starts moving again, and the ship points in the direction of movement.
- The explosion is also working, and although It's not as magnificent as I imagined, it's a nice improvement.
- The game is a bit hard, I have to move too close to the enemies to catch them with the tail.
- The agent ignored the three.js suggestion, which is fine. It's what I would have experimented with, but I'm not the one writing the code.

3. "Make the collision detection more forgiving, so the tail doesn't have to move so close to the enemies to destroy them. Add a starry background which keeps moving toward the player as if were traveling in space. Also rotate the ship toward the background to show where it's moving."

### Fourth version:

- The agent introduced a TRAIL_COLLISION_RADIUS constant, but didn't implement the functionality.
- The background looks great, but I should've said tilt the player instead of rotating it toward the background. The ship is now pointing in the direction of movement, but it doesn't have a 3d look to it.
- Instead of giving a new prompt, I used the in editor copilot to implement the collision radius, and it works great. The game is much more enjoyable now.
- The copilot also went ahead and implemented logic for the also unused DIAGONAL_MOVEMENT_FACTOR, which makes the ship move faster when moving diagonally. It's a nice touch, but it only works when the player is using the keyboard, not the mouse.

4. "Update the readme to represent the current state. Tilt the ship toward the screen. Change the tail so it's made up of poligons, and also have the wreckage of the enemies stay on the playing field until picked up. The tail grows by picking up the wreckage, depending on the size of the debris."

### Fifth version:

- Did not manage to tilt the ship, and visually it's still too 2d.
- The tail is getting further away from the player as it grows. Maybe this would be fun as a *powerup* (but at a fixed distance), but as the default state it's not very enjoyable.
- It's fun to draw with the tail, maybe we also can do something with that in the future.
- The tail grows not only by picking up the debris, but also by hitting the enemies, which is not what I had in mind.
- The ship should be destroyed when it collides with the tail.