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

5. "The tail gets separated from the ship as it grows, this should be fixed. The tail should only grow when picking up debris, not when an enemy is destroyed. Collision with the tail should destroy the ship when it's moving. Add score.mp3 in present in repo as background music."
6. "The ship still gets separated from the tail. When I stop and start there's a strange effect where the tail gets rebuilt from lines and points. Doesn't play music."

### Sixth version:

- Didn't make the tail kill the player, but I've decided that I like being able to make loops with the tail without worrying about colliding with it, so maybe it's better to leave it as is.
- An enemy type that can severe the tail would make it more exciting
- It gets choppy as the tail grows. Wonder if I can get the agent to optimize the code to make it smoother.

7. "Introduce a fast moving red meteorite that can sever the tail. The part that's cut off disappears with some visual effects. The game slows down as the tail grows. See if you can optimize it. A sound effect for the explosion of the ship would also be nice. Run through the journal and see if you get some ideas that need implementing."

### Seventh version:

- Meteorite's work great, but doesn't make the tail shorter.
- The sound effect is underwhelming.
- New *powerup* idea: magnets that attract the debris to the tail, making it easier to grow.
- The agent said that it implemented the pulsating background, but it's too subtle and not reactive.
- Above 200 tail length it slows down on some machines, needs more optimization.
- The edges should be teleports.
- *Idea* for later: drawing signs activate powerups.

8. "The meteorite doesn't sever the tail. The length displayed decreases, but it should end where the meteorite passes. The death sound should be at least as magnificient as the explosion. The edges should be teleports, allowing the player to leave appearing on the opposite end. Add more colors to the enemies and have the tail represent the colors picked up."

### Eighth version:

- Severing works better, but not perfect.
- Wraparound is good, but the mouse exits the playable area. There should be an edge around the play area that still registers mouse movement, but doesn't let the cursor leave the screen.
- The colors picked up blend in after a while, maybe the tail should have segments that keep their color until they disappear.
- The edge color could represent the color of the piece picked up (*idea* later the next enemy appearing)
- High score should be kept - in memory for now
