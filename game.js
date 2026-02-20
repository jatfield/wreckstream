// Wreckstream - Neon Space Arcade Game
// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game configuration constants
const GAME_CONFIG = {
    INITIAL_GRACE_PERIOD_FRAMES: 120,  // 2 seconds at 60fps before enemies spawn
    ENEMY_SPAWN_INTERVAL_FRAMES: 90,   // Spawn enemy every 1.5 seconds
    MIN_ENEMY_SPEED: 0.8,
    MAX_ENEMY_SPEED: 2.0,
    WRECKAGE_PICKUP_RADIUS: 8,         // Extra pickup radius for wreckage collection
    TRAIL_COLLISION_BUFFER: 5,         // Exclude last N trail points from collision (prevents instant hits near ship)
    TRAIL_COLLISION_RADIUS: 15,        // Collision detection radius for tail segments (more forgiving)
    DIAGONAL_MOVEMENT_FACTOR: Math.sqrt(2) / 2,  // Normalize diagonal movement
    PARTICLE_MAX_LIFE: 50,             // Maximum particle lifetime for alpha calculations
    MAX_Z_DEPTH: 100,                  // Maximum z-depth for 3D objects
    PERSPECTIVE_SCALE_FACTOR: 200,     // Denominator for perspective scaling (MAX_Z_DEPTH * 2)
    MIN_MOVEMENT_SPEED: 0.5,           // Minimum speed to be considered moving
    MAX_STAR_DEPTH: 1000,              // Maximum z-depth for stars in starfield
    STAR_SIZE_SCALE: 0.5,              // Scale factor for star size based on depth
    STAR_ALPHA_SCALE: 0.3,             // Scale factor for star brightness based on depth
    METEORITE_SPAWN_INTERVAL_FRAMES: 300, // Spawn a meteorite every 5 seconds
    METEORITE_MIN_SPEED: 4.5,
    METEORITE_MAX_SPEED: 8.0,
    BACKGROUND_PULSE_SPEED: 0.03,         // Frequency of the pulsating background oscillation
    TAIL_GLOW_MAX_LENGTH: 80,             // Tail piece count at which background glow reaches full intensity
};

// Background music
const bgMusic = new Audio('score.mp3');
bgMusic.loop = true;
bgMusic.addEventListener('error', () => console.warn('Background music failed to load.'));

// Audio context for synthesised sound effects
let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

// Synthesise a short ship-explosion boom
function playExplosionSound() {
    try {
        const ac = getAudioContext();
        const bufferSize = Math.floor(ac.sampleRate * 0.6);
        const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
        }
        const source = ac.createBufferSource();
        source.buffer = buffer;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(1.2, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, ac.currentTime);
        filter.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.6);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);
        source.start();
    } catch (e) {
        console.warn('Explosion sound failed:', e);
    }
}

// Synthesise a short crackle for tail being severed
function playSeverSound() {
    try {
        const ac = getAudioContext();
        const bufferSize = Math.floor(ac.sampleRate * 0.25);
        const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const source = ac.createBufferSource();
        source.buffer = buffer;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.6, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
        const filter = ac.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, ac.currentTime);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);
        source.start();
    } catch (e) {
        console.warn('Sever sound failed:', e);
    }
}

// Game state
let gameState = 'menu'; // menu, playing, gameover
let score = 0;
let frameCount = 0;
let gameOverDelay = 0; // Delay before showing game over screen
const GAME_OVER_SCREEN_DELAY = 60; // Show screen after 1 second (60 frames)

// Neon pastel colors
const colors = {
    ship: '#ff6ec7',      // Hot pink
    tail: '#a0d8f1',      // Light blue
    debris: '#ffed4e',    // Yellow
    enemy: '#b4f8c8',     // Mint green
    particle: '#ffa8e2',  // Light pink
    meteorite: '#ff3333', // Bright red
};

// Player ship
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    z: 0,
    size: 15,
    speed: 4,
    vx: 0,
    vy: 0,
    angle: 0, // Ship rotation angle
    trail: [],
    maxTrailLength: 20,
    debrisPieces: [], // Separate debris pieces for tail
};

// Game objects
let enemies = [];
let particles = [];
let wreckage = [];  // Enemy debris waiting on the field to be picked up
let meteorites = [];
let stars = [];

// Input handling
const keys = {};
const mouse = {
    x: canvas.width / 2,
    y: canvas.height / 2
};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') {
        e.preventDefault();
        if (gameState === 'menu' || gameState === 'gameover') {
            startGame();
        }
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Mouse control
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

// Initialize stars for background
function initStars() {
    stars = [];
    const numStars = 200; // Number of stars in the starfield
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: Math.random() * GAME_CONFIG.MAX_STAR_DEPTH, // Depth from 0 to MAX_STAR_DEPTH
            speed: 1 + Math.random() * 2 // Speed toward player
        });
    }
}

// Start/restart game
function startGame() {
    gameState = 'playing';
    score = 0;
    gameOverDelay = 0; // Reset game over delay
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.z = 0;
    player.vx = 0;
    player.vy = 0;
    player.angle = 0;
    player.trail = [];
    player.debrisPieces = [];
    player.maxTrailLength = 20;
    
    // Initialize with some starting debris pieces
    for (let i = 0; i < 10; i++) {
        player.debrisPieces.push({
            x: player.x,
            y: player.y,
            z: 0,
            size: 3 + Math.random() * 2,
            rotation: Math.random() * Math.PI * 2,
            sides: 3 + Math.floor(Math.random() * 4),
            life: player.maxTrailLength * 2
        });
    }
    
    enemies = [];
    particles = [];
    wreckage = [];
    meteorites = [];
    initStars(); // Initialize starfield background
    frameCount = 0;
    bgMusic.currentTime = 0;
    bgMusic.play().catch((e) => { if (e.name !== 'NotAllowedError') console.warn('Music playback failed:', e); });
    updateUI();
}

// Spawn enemy from edge
function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x, y, z, vx, vy;
    const speed = GAME_CONFIG.MIN_ENEMY_SPEED + Math.random() * (GAME_CONFIG.MAX_ENEMY_SPEED - GAME_CONFIG.MIN_ENEMY_SPEED);
    const size = 8 + Math.random() * 12;
    z = Math.random() * GAME_CONFIG.MAX_Z_DEPTH; // Random depth for 3D effect

    switch (edge) {
        case 0: // top
            x = Math.random() * canvas.width;
            y = -size;
            vx = (Math.random() - 0.5) * 2;
            vy = speed;
            break;
        case 1: // right
            x = canvas.width + size;
            y = Math.random() * canvas.height;
            vx = -speed;
            vy = (Math.random() - 0.5) * 2;
            break;
        case 2: // bottom
            x = Math.random() * canvas.width;
            y = canvas.height + size;
            vx = (Math.random() - 0.5) * 2;
            vy = -speed;
            break;
        case 3: // left
            x = -size;
            y = Math.random() * canvas.height;
            vx = speed;
            vy = (Math.random() - 0.5) * 2;
            break;
    }

    enemies.push({ x, y, z, vx, vy, size, rotation: Math.random() * Math.PI * 2 });
}

// Create particles
function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: Math.min(GAME_CONFIG.PARTICLE_MAX_LIFE, 35 + Math.random() * 15),
            color,
            size: 2 + Math.random() * 3,
        });
    }
}

// Spawn a fast-moving red meteorite from a random edge
function spawnMeteorite() {
    const edge = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const speed = GAME_CONFIG.METEORITE_MIN_SPEED + Math.random() * (GAME_CONFIG.METEORITE_MAX_SPEED - GAME_CONFIG.METEORITE_MIN_SPEED);
    const size = 6 + Math.random() * 8;

    switch (edge) {
        case 0: x = Math.random() * canvas.width; y = -size; vx = (Math.random() - 0.5) * 2; vy = speed; break;
        case 1: x = canvas.width + size; y = Math.random() * canvas.height; vx = -speed; vy = (Math.random() - 0.5) * 2; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + size; vx = (Math.random() - 0.5) * 2; vy = -speed; break;
        case 3: x = -size; y = Math.random() * canvas.height; vx = speed; vy = (Math.random() - 0.5) * 2; break;
    }

    // Pre-compute irregular shape offsets so the rock looks the same each frame
    const sides = 7;
    const radiusOffsets = [];
    for (let k = 0; k < sides; k++) {
        radiusOffsets.push(0.6 + Math.random() * 0.4);
    }

    meteorites.push({ x, y, vx, vy, size, rotation: Math.random() * Math.PI * 2, radiusOffsets });
}

// Sever the tail starting from debrisPieces[index] to the end
function severTailAt(index) {
    const severed = player.debrisPieces.splice(index);
    for (const piece of severed) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particles.push({
            x: piece.x,
            y: piece.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: Math.min(GAME_CONFIG.PARTICLE_MAX_LIFE, 30 + Math.random() * 20),
            color: colors.meteorite,
            size: piece.size,
        });
    }
    // Shrink maxTrailLength to match the now-smaller tail
    player.maxTrailLength = Math.max(20, player.maxTrailLength - severed.length);
    playSeverSound();
    updateUI();
}

// Draw a regular polygon centered at origin (call inside ctx.save/translate/rotate)
function drawPolygon(ctx, radius, sides) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

// Update game
function update() {
    if (gameState !== 'playing') {
        // Continue updating particles during game over for explosion effect
        if (gameState === 'gameover') {
            gameOverDelay++;
            // Update particles even in game over state
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vx *= 0.98;
                particle.vy *= 0.98;
                particle.life--;
                if (particle.life <= 0) {
                    particles.splice(i, 1);
                }
            }
        }
        return;
    }

    frameCount++;

    // Player movement - keyboard (WASD/Arrows) or mouse control
    const keyboardX = (keys['d'] || keys['D'] || keys['ArrowRight'] ? 1 : 0) - (keys['a'] || keys['A'] || keys['ArrowLeft'] ? 1 : 0);
    const keyboardY = (keys['s'] || keys['S'] || keys['ArrowDown'] ? 1 : 0) - (keys['w'] || keys['W'] || keys['ArrowUp'] ? 1 : 0);
    const hasKeyboardInput = keyboardX !== 0 || keyboardY !== 0;

    const dx = hasKeyboardInput ? keyboardX : mouse.x - player.x;
    const dy = hasKeyboardInput ? keyboardY : mouse.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate actual speed based on movement (for tail length calculation)
    let actualSpeed = 0;
    
    if (distance > (hasKeyboardInput ? 0 : 5)) { // Dead zone only for mouse to prevent jitter
        const moveSpeed = hasKeyboardInput ? player.speed : Math.min(player.speed, distance * 0.15);
        let velocityX = (dx / distance) * moveSpeed;
        let velocityY = (dy / distance) * moveSpeed;

        // Normalize keyboard diagonal movement
        if (hasKeyboardInput && keyboardX !== 0 && keyboardY !== 0) {
            velocityX *= GAME_CONFIG.DIAGONAL_MOVEMENT_FACTOR;
            velocityY *= GAME_CONFIG.DIAGONAL_MOVEMENT_FACTOR;
        }

        player.vx = velocityX;
        player.vy = velocityY;
        actualSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        
        // Update ship rotation to point in direction of movement
        // Adjust by π/2 radians because the ship's default orientation points upward (0 radians)
        player.angle = Math.atan2(dy, dx) + Math.PI / 2;
    } else {
        player.vx = 0;
        player.vy = 0;
    }

    player.x += player.vx;
    player.y += player.vy;

    // Keep player in bounds
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

    if (player.vx !== 0 || player.vy !== 0 || player.trail.length === 0) {
        player.trail.push({ x: player.x, y: player.y });
        if (player.trail.length > player.maxTrailLength) {
            player.trail.shift();
        }
    }
    
    // Update debris pieces positions to follow trail
    if (player.trail.length > 0) {
        // Add new debris piece at player position if moving
        if (actualSpeed > GAME_CONFIG.MIN_MOVEMENT_SPEED && frameCount % 3 === 0) {
            player.debrisPieces.unshift({
                x: player.x,
                y: player.y,
                z: 0,
                size: 3 + Math.random() * 2,
                rotation: Math.random() * Math.PI * 2,
                sides: 3 + Math.floor(Math.random() * 4),
                life: player.maxTrailLength * 2
            });
        }
        
        // Update existing debris pieces to follow trail positions
        // debrisPieces[0] is the newest piece (closest to ship), mapped to trail[trail.length-1] (most recent position)
        const spacing = Math.max(1, Math.floor(player.trail.length / Math.min(player.debrisPieces.length, player.maxTrailLength)));
        for (let i = 0; i < player.debrisPieces.length && i * spacing < player.trail.length; i++) {
            const trailIndex = Math.max(0, (player.trail.length - 1) - i * spacing);
            const piece = player.debrisPieces[i];
            if (player.trail[trailIndex]) {
                // Smoothly move debris to trail position
                piece.x = player.trail[trailIndex].x;
                piece.y = player.trail[trailIndex].y;
            }
            piece.life--;
            piece.rotation += 0.05;
        }
    }
    
    // Remove excess or dead debris pieces (lifetime expired or exceeds max capacity)
    for (let i = player.debrisPieces.length - 1; i >= 0; i--) {
        const piece = player.debrisPieces[i];
        const shouldRemove = piece.life <= 0 || player.debrisPieces.length > player.maxTrailLength;
        if (shouldRemove) {
            player.debrisPieces.splice(i, 1);
        }
    }

    // Spawn enemies (grace period at start, then spawn at intervals)
    if (frameCount > GAME_CONFIG.INITIAL_GRACE_PERIOD_FRAMES && frameCount % GAME_CONFIG.ENEMY_SPAWN_INTERVAL_FRAMES === 0) {
        spawnEnemy();
    }
    // Spawn meteorites (after grace period, less frequent than regular enemies)
    if (frameCount > GAME_CONFIG.INITIAL_GRACE_PERIOD_FRAMES && frameCount % GAME_CONFIG.METEORITE_SPAWN_INTERVAL_FRAMES === 0) {
        spawnMeteorite();
    }

    // Update enemies (reverse loop to safely remove elements)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        enemy.rotation += 0.02; // Rotate for 3D effect

        // Remove off-screen enemies
        if (
            enemy.x < -enemy.size * 2 ||
            enemy.x > canvas.width + enemy.size * 2 ||
            enemy.y < -enemy.size * 2 ||
            enemy.y > canvas.height + enemy.size * 2
        ) {
            enemies.splice(i, 1);
            continue;
        }

        // Check collision with player ship (game over) - use squared distance for performance
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const shipThresh = enemy.size + player.size;
        if (dx * dx + dy * dy < shipThresh * shipThresh) {
            gameOver();
            return;
        }

        // Check collision with debris pieces in tail
        let hitByTail = false;
        for (let j = GAME_CONFIG.TRAIL_COLLISION_BUFFER; j < player.debrisPieces.length; j++) {
            const piece = player.debrisPieces[j];
            const pdx = enemy.x - piece.x;
            const pdy = enemy.y - piece.y;
            const tailThresh = enemy.size + piece.size + GAME_CONFIG.TRAIL_COLLISION_RADIUS;
            if (pdx * pdx + pdy * pdy < tailThresh * tailThresh) {
                hitByTail = true;
                break;
            }
        }
        if (hitByTail) {
            // Enemy destroyed by tail - break into wreckage that stays on the field
            enemies.splice(i, 1);
            score += Math.floor(enemy.size);
            
            // Create visual break-up particles (enemy breaking apart)
            const breakPieces = Math.floor(enemy.size / 2) + 5;
            for (let p = 0; p < breakPieces; p++) {
                const angle = (Math.PI * 2 * p) / breakPieces + Math.random() * 0.5;
                const speed = 2 + Math.random() * 3;
                particles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: Math.min(GAME_CONFIG.PARTICLE_MAX_LIFE, 40 + Math.random() * 10),
                    color: colors.enemy,
                    size: 3 + Math.random() * 4,
                });
            }
            
            // Spawn wreckage pieces on the field (player must sweep tail over them to pick up)
            const numPieces = Math.floor(enemy.size / 3) + 3;
            for (let p = 0; p < numPieces; p++) {
                const angle = (Math.PI * 2 * p) / numPieces + Math.random() * 0.4;
                const speed = 1.5 + Math.random() * 2.5;
                wreckage.push({
                    x: enemy.x + Math.cos(angle) * enemy.size * 0.3,
                    y: enemy.y + Math.sin(angle) * enemy.size * 0.3,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * (enemy.size / 3),
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.08,
                    sides: 3 + Math.floor(Math.random() * 4),
                    friction: 0.97,
                });
            }
            
            // Additional explosion particles
            createParticles(enemy.x, enemy.y, colors.debris, 15);
            updateUI();
        }
    }

    // Update meteorites (fast red rocks that sever the tail)
    for (let i = meteorites.length - 1; i >= 0; i--) {
        const m = meteorites[i];
        m.x += m.vx;
        m.y += m.vy;
        m.rotation += 0.06;

        // Remove off-screen meteorites
        if (
            m.x < -m.size * 2 ||
            m.x > canvas.width + m.size * 2 ||
            m.y < -m.size * 2 ||
            m.y > canvas.height + m.size * 2
        ) {
            meteorites.splice(i, 1);
            continue;
        }

        // Check collision with player ship (game over)
        const mdx = m.x - player.x;
        const mdy = m.y - player.y;
        const mShipThresh = m.size + player.size;
        if (mdx * mdx + mdy * mdy < mShipThresh * mShipThresh) {
            gameOver();
            return;
        }

        // Check collision with tail pieces – sever tail at the hit point
        for (let j = GAME_CONFIG.TRAIL_COLLISION_BUFFER; j < player.debrisPieces.length; j++) {
            const piece = player.debrisPieces[j];
            const pdx = m.x - piece.x;
            const pdy = m.y - piece.y;
            const mTailThresh = m.size + piece.size;
            if (pdx * pdx + pdy * pdy < mTailThresh * mTailThresh) {
                severTailAt(j);
                createParticles(m.x, m.y, colors.meteorite, 12);
                meteorites.splice(i, 1);
                break;
            }
        }
    }

    // Update wreckage (stays on field until picked up by tail)
    for (let i = wreckage.length - 1; i >= 0; i--) {
        const w = wreckage[i];
        w.x += w.vx;
        w.y += w.vy;
        w.vx *= w.friction;
        w.vy *= w.friction;
        w.rotation += w.rotationSpeed;

        // Keep wreckage within the playing field
        if (w.x < w.size) { w.x = w.size; w.vx *= -0.5; }
        if (w.x > canvas.width - w.size) { w.x = canvas.width - w.size; w.vx *= -0.5; }
        if (w.y < w.size) { w.y = w.size; w.vy *= -0.5; }
        if (w.y > canvas.height - w.size) { w.y = canvas.height - w.size; w.vy *= -0.5; }

        // Check if picked up by any tail piece
        for (let j = 0; j < player.debrisPieces.length; j++) {
            const piece = player.debrisPieces[j];
            const pdx = w.x - piece.x;
            const pdy = w.y - piece.y;
            const pickThresh = piece.size + w.size + GAME_CONFIG.WRECKAGE_PICKUP_RADIUS;
            if (pdx * pdx + pdy * pdy < pickThresh * pickThresh) {
                // Pick up wreckage: add to tail, grow maxTrailLength proportional to debris size
                // Divide by 2 so small pieces (~size 3) add 1-2 length, large pieces (~size 6) add 3
                player.maxTrailLength += Math.max(1, Math.ceil(w.size / 2));
                player.debrisPieces.push({
                    x: w.x,
                    y: w.y,
                    z: 0,
                    size: w.size,
                    rotation: w.rotation,
                    sides: w.sides,
                    life: player.maxTrailLength * 2,
                });
                wreckage.splice(i, 1);
                createParticles(w.x, w.y, colors.tail, 5);
                updateUI();
                break;
            }
        }
    }

    // Update particles (reverse loop to safely remove elements)
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.life--;
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Update stars (move toward player as if traveling through space)
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.z -= star.speed; // Move star toward player
        
        // Recycle star when it passes the player
        if (star.z <= 0) {
            star.z = GAME_CONFIG.MAX_STAR_DEPTH;
            star.x = Math.random() * canvas.width;
            star.y = Math.random() * canvas.height;
        }
    }
}

// Draw game
function draw() {
    // Clear canvas with fade effect; pulsate background glow when playing and tail is growing
    if (gameState === 'playing') {
        const pulse = Math.sin(frameCount * GAME_CONFIG.BACKGROUND_PULSE_SPEED) * 0.5 + 0.5;
        const tailIntensity = Math.min(1, player.debrisPieces.length / GAME_CONFIG.TAIL_GLOW_MAX_LENGTH);
        const r = Math.floor(10 + pulse * 15 * tailIntensity);
        const b = Math.floor(26 + pulse * 30 * tailIntensity);
        ctx.fillStyle = `rgba(${r}, 8, ${b}, 0.3)`;
    } else {
        ctx.fillStyle = 'rgba(10, 10, 26, 0.3)';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'menu') {
        drawMenu();
        return;
    }

    // Draw game elements (for both playing and gameover states)
    drawGameElements();

    if (gameState === 'gameover') {
        drawGameOver();
    }
}

// Draw game elements
function drawGameElements() {
    // Draw stars (moving starfield background)
    // Shadow set once for all stars to avoid 200 GPU state changes per frame
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 3;
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        // Calculate perspective: closer stars (lower z) appear larger and brighter
        const scale = GAME_CONFIG.MAX_STAR_DEPTH / (star.z + 1);
        const screenX = (star.x - canvas.width / 2) * scale + canvas.width / 2;
        const screenY = (star.y - canvas.height / 2) * scale + canvas.height / 2;
        const size = Math.max(0.5, scale * GAME_CONFIG.STAR_SIZE_SCALE);
        const alpha = Math.min(1, scale * GAME_CONFIG.STAR_ALPHA_SCALE);

        // Only draw stars that are on screen
        if (screenX >= 0 && screenX <= canvas.width && screenY >= 0 && screenY <= canvas.height) {
            ctx.globalAlpha = alpha;
            ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);
        }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Draw debris pieces (tail made of polygon shapes)
    // shadowBlur and shadowColor set once outside the loop to avoid per-piece GPU state changes
    ctx.shadowBlur = 12;
    ctx.shadowColor = colors.debris;
    for (let i = 0; i < player.debrisPieces.length; i++) {
        const piece = player.debrisPieces[i];
        const alpha = Math.min(1, i / (player.debrisPieces.length * 0.3));
        const cos = Math.cos(piece.rotation);
        const sin = Math.sin(piece.rotation);

        ctx.globalAlpha = alpha;
        // setTransform avoids save/restore overhead: translate to piece position then rotate
        ctx.setTransform(cos, sin, -sin, cos, piece.x, piece.y);

        ctx.fillStyle = colors.debris;
        drawPolygon(ctx, piece.size, piece.sides || 4);
        ctx.fill();

        // Add highlight for depth effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        drawPolygon(ctx, piece.size * 0.5, piece.sides || 4);
        ctx.fill();
    }
    // Reset transform and alpha
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Draw connecting line between debris pieces (subtle)
    if (player.debrisPieces.length > 1) {
        ctx.strokeStyle = colors.tail;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors.tail;
        ctx.globalAlpha = 0.3;
        
        ctx.beginPath();
        ctx.moveTo(player.debrisPieces[0].x, player.debrisPieces[0].y);
        for (let i = 1; i < player.debrisPieces.length; i++) {
            ctx.lineTo(player.debrisPieces[i].x, player.debrisPieces[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Draw wreckage pieces (on-field debris waiting to be picked up by the tail)
    wreckage.forEach((w) => {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.rotation);
        ctx.fillStyle = colors.enemy;
        ctx.shadowBlur = 18;
        ctx.shadowColor = colors.enemy;
        ctx.globalAlpha = 0.9;
        drawPolygon(ctx, w.size, w.sides);
        ctx.fill();
        // Pulsing outline to indicate it's collectible
        ctx.strokeStyle = colors.tail;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
    });

    // Draw player ship (tilted toward screen with 3D depth effect)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    const s = player.size;
    // Ship underside/depth layer (darker, slightly offset to simulate nose tilting toward viewer)
    ctx.fillStyle = 'rgba(150, 30, 90, 0.9)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.85);      // nose depth offset
    ctx.lineTo(-s * 0.65, s * 1.1);      // left wing tip (extended depth)
    ctx.lineTo(s * 0.1, s * 0.6);        // center back (offset)
    ctx.lineTo(s * 0.65, s * 1.1);       // right wing tip (extended depth)
    ctx.closePath();
    ctx.fill();

    // Main hull top surface (bright, overlaid on depth layer)
    ctx.fillStyle = colors.ship;
    ctx.shadowBlur = 30;
    ctx.shadowColor = colors.ship;
    ctx.beginPath();
    ctx.moveTo(0, -s);                   // nose tip (closest to viewer)
    ctx.lineTo(-s * 0.7, s * 0.8);      // left wing
    ctx.lineTo(0, s * 0.4);             // center notch
    ctx.lineTo(s * 0.7, s * 0.8);       // right wing
    ctx.closePath();
    ctx.fill();

    // Nose highlight (tip of ship closest to viewer)
    ctx.fillStyle = 'rgba(255, 210, 240, 0.9)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, -s * 0.85, s * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Engine glow (back of ship, farther from viewer)
    ctx.fillStyle = 'rgba(130, 70, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(130, 70, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(-s * 0.3, s * 0.75, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.3, s * 0.75, s * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw enemies as 3D cubes
    enemies.forEach((enemy) => {
        const scale = 1 + (enemy.z / GAME_CONFIG.PERSPECTIVE_SCALE_FACTOR); // Perspective scaling based on z
        const renderSize = enemy.size * scale;
        
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy.rotation);
        
        ctx.fillStyle = colors.enemy;
        ctx.shadowBlur = 20 * scale;
        ctx.shadowColor = colors.enemy;
        
        // Draw main face
        ctx.fillRect(-renderSize, -renderSize, renderSize * 2, renderSize * 2);
        
        // Draw side faces for 3D effect
        ctx.fillStyle = 'rgba(180, 248, 200, 0.6)';
        ctx.beginPath();
        ctx.moveTo(renderSize, -renderSize);
        ctx.lineTo(renderSize * 1.3, -renderSize * 1.3);
        ctx.lineTo(renderSize * 1.3, renderSize * 1.3);
        ctx.lineTo(renderSize, renderSize);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = 'rgba(180, 248, 200, 0.4)';
        ctx.beginPath();
        ctx.moveTo(-renderSize, -renderSize);
        ctx.lineTo(-renderSize * 1.3, -renderSize * 1.3);
        ctx.lineTo(renderSize * 1.3, -renderSize * 1.3);
        ctx.lineTo(renderSize, -renderSize);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    });

    // Draw meteorites (fast-moving red rocks that sever the tail)
    ctx.shadowColor = colors.meteorite;
    ctx.shadowBlur = 20;
    for (let i = 0; i < meteorites.length; i++) {
        const m = meteorites[i];
        const cos = Math.cos(m.rotation);
        const sin = Math.sin(m.rotation);
        ctx.setTransform(cos, sin, -sin, cos, m.x, m.y);
        ctx.fillStyle = colors.meteorite;

        // Draw pre-computed irregular rock shape
        ctx.beginPath();
        const sides = m.radiusOffsets.length;
        for (let k = 0; k < sides; k++) {
            const angle = (k / sides) * Math.PI * 2;
            const r = m.size * m.radiusOffsets[k];
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Bright core highlight
        ctx.fillStyle = 'rgba(255, 160, 160, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, m.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowBlur = 0;

    // Draw particles - shadowBlur set once outside loop
    ctx.shadowBlur = 10;
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const alpha = particle.life / GAME_CONFIG.PARTICLE_MAX_LIFE;
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 0;
}

// Draw menu
function drawMenu() {
    ctx.fillStyle = colors.ship;
    ctx.shadowBlur = 20;
    ctx.shadowColor = colors.ship;
    ctx.font = '48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('WRECKSTREAM', canvas.width / 2, canvas.height / 2 - 50);

    ctx.fillStyle = colors.tail;
    ctx.shadowColor = colors.tail;
    ctx.font = '24px Courier New';
    ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2 + 50);
}

// Draw game over
function drawGameOver() {
    // Only show game over screen after delay to let explosion be visible
    if (gameOverDelay < GAME_OVER_SCREEN_DELAY) {
        return;
    }
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(10, 10, 26, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = colors.ship;
    ctx.shadowBlur = 30;
    ctx.shadowColor = colors.ship;
    ctx.font = '48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);

    ctx.fillStyle = colors.debris;
    ctx.shadowColor = colors.debris;
    ctx.font = '32px Courier New';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

    ctx.fillStyle = colors.tail;
    ctx.shadowColor = colors.tail;
    ctx.font = '20px Courier New';
    ctx.fillText('Press SPACE to Restart', canvas.width / 2, canvas.height / 2 + 80);
}

// Game over
function gameOver() {
    gameState = 'gameover';
    bgMusic.pause();
    playExplosionSound();
    
    // Magnificent explosion with multiple waves
    createParticles(player.x, player.y, colors.ship, 50);
    createParticles(player.x, player.y, colors.debris, 40);
    createParticles(player.x, player.y, colors.tail, 30);
    
    // Create expanding ring particles
    for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = 3 + Math.random() * 4;
        particles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: Math.min(GAME_CONFIG.PARTICLE_MAX_LIFE, 45 + Math.random() * 5),
            color: colors.ship,
            size: 4 + Math.random() * 6,
        });
    }
    
    // Scatter all debris pieces from tail
    player.debrisPieces.forEach(piece => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        particles.push({
            x: piece.x,
            y: piece.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: Math.min(GAME_CONFIG.PARTICLE_MAX_LIFE, 38 + Math.random() * 12),
            color: colors.debris,
            size: piece.size,
        });
    });
    
    updateUI();
}

// Update UI
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('tailLength').textContent = player.maxTrailLength;
    
    let status = '';
    if (gameState === 'menu') status = 'Press SPACE to Start';
    else if (gameState === 'playing') status = 'Playing';
    else if (gameState === 'gameover') status = 'Game Over';
    
    document.getElementById('status').textContent = status;
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize
initStars(); // Initialize starfield background
updateUI();
gameLoop();
