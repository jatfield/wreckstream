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
    TRAIL_GROWTH_PER_ENEMY: 3,         // How much tail grows per enemy destroyed
    TRAIL_COLLISION_BUFFER: 5,         // Exclude last N trail points from collision (prevents instant hits near ship)
    TRAIL_COLLISION_RADIUS: 5,         // Collision detection radius for tail segments
    DIAGONAL_MOVEMENT_FACTOR: Math.sqrt(2) / 2,  // Normalize diagonal movement
    PARTICLE_MAX_LIFE: 50,             // Maximum particle lifetime for alpha calculations
    MAX_Z_DEPTH: 100,                  // Maximum z-depth for 3D objects
    PERSPECTIVE_SCALE_FACTOR: 200,     // Denominator for perspective scaling (MAX_Z_DEPTH * 2)
};

// Game state
let gameState = 'menu'; // menu, playing, gameover
let score = 0;
let frameCount = 0;

// Neon pastel colors
const colors = {
    ship: '#ff6ec7',      // Hot pink
    tail: '#a0d8f1',      // Light blue
    debris: '#ffed4e',    // Yellow
    enemy: '#b4f8c8',     // Mint green
    particle: '#ffa8e2',  // Light pink
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
            life: player.maxTrailLength * 2
        });
    }
    
    enemies = [];
    particles = [];
    frameCount = 0;
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
            life: 30 + Math.random() * 20,
            color,
            size: 2 + Math.random() * 3,
        });
    }
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

    // Player movement - use mouse control
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate actual speed based on movement (for tail length calculation)
    let actualSpeed = 0;
    
    if (distance > 5) { // Dead zone to prevent jitter
        const moveSpeed = Math.min(player.speed, distance * 0.15);
        player.vx = (dx / distance) * moveSpeed;
        player.vy = (dy / distance) * moveSpeed;
        actualSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        
        // Update ship rotation to point in direction of movement
        player.angle = Math.atan2(dy, dx) + Math.PI / 2; // +PI/2 because ship points up by default
    } else {
        player.vx = 0;
        player.vy = 0;
    }

    player.x += player.vx;
    player.y += player.vy;

    // Keep player in bounds
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

    // Update trail and visible tail length based on speed
    // speedFactor is in range [0, 1] because actualSpeed is clamped to player.speed above
    const speedFactor = actualSpeed / player.speed;
    const visibleTailLength = Math.floor(player.maxTrailLength * speedFactor);
    
    if (player.vx !== 0 || player.vy !== 0 || player.trail.length === 0) {
        player.trail.push({ x: player.x, y: player.y });
        if (player.trail.length > player.maxTrailLength) {
            player.trail.shift();
        }
    }
    
    // Update debris pieces positions to follow trail
    if (player.trail.length > 0) {
        // Add new debris piece at player position if moving
        if (actualSpeed > 0.5 && frameCount % 3 === 0) {
            player.debrisPieces.unshift({
                x: player.x,
                y: player.y,
                z: 0,
                size: 3 + Math.random() * 2,
                rotation: Math.random() * Math.PI * 2,
                life: player.maxTrailLength * 2
            });
        }
        
        // Update existing debris pieces to follow trail positions
        const spacing = Math.max(1, Math.floor(player.trail.length / Math.min(player.debrisPieces.length, player.maxTrailLength)));
        for (let i = 0; i < player.debrisPieces.length && i * spacing < player.trail.length; i++) {
            const trailIndex = Math.min(i * spacing, player.trail.length - 1);
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
    
    // Remove excess or dead debris pieces
    // Pieces are removed if: lifetime expired, or exceeds max capacity
    // Only remove based on visible tail length when speed is low (stopped)
    for (let i = player.debrisPieces.length - 1; i >= 0; i--) {
        const piece = player.debrisPieces[i];
        const shouldRemove = piece.life <= 0 || 
                           player.debrisPieces.length > player.maxTrailLength ||
                           (actualSpeed < 0.5 && i >= visibleTailLength);
        if (shouldRemove) {
            player.debrisPieces.splice(i, 1);
        }
    }

    // Spawn enemies (grace period at start, then spawn at intervals)
    if (frameCount > GAME_CONFIG.INITIAL_GRACE_PERIOD_FRAMES && frameCount % GAME_CONFIG.ENEMY_SPAWN_INTERVAL_FRAMES === 0) {
        spawnEnemy();
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

        // Check collision with player ship (game over)
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < enemy.size + player.size) {
            gameOver();
            return;
        }

        // Check collision with debris pieces in tail
        let hitByTail = false;
        for (let j = GAME_CONFIG.TRAIL_COLLISION_BUFFER; j < player.debrisPieces.length; j++) {
            const piece = player.debrisPieces[j];
            const pdx = enemy.x - piece.x;
            const pdy = enemy.y - piece.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pdist < enemy.size + piece.size) {
                hitByTail = true;
                break;
            }
        }
        
        if (hitByTail) {
            // Enemy destroyed by tail - break into debris pieces with visual effect
            enemies.splice(i, 1);
            score += Math.floor(enemy.size);
            player.maxTrailLength += GAME_CONFIG.TRAIL_GROWTH_PER_ENEMY;
            
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
                    life: 30 + Math.random() * 30,
                    color: colors.enemy,
                    size: 3 + Math.random() * 4,
                });
            }
            
            // Create debris pieces from destroyed enemy (added to tail)
            const numPieces = Math.floor(enemy.size / 3) + 3;
            for (let p = 0; p < numPieces; p++) {
                const angle = (Math.PI * 2 * p) / numPieces;
                const offsetX = Math.cos(angle) * enemy.size * 0.3;
                const offsetY = Math.sin(angle) * enemy.size * 0.3;
                player.debrisPieces.push({
                    x: enemy.x + offsetX,
                    y: enemy.y + offsetY,
                    z: enemy.z,
                    size: 3 + Math.random() * 3,
                    rotation: Math.random() * Math.PI * 2,
                    life: player.maxTrailLength * 2
                });
            }
            
            // Additional explosion particles
            createParticles(enemy.x, enemy.y, colors.debris, 15);
            updateUI();
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
}

// Draw game
function draw() {
    // Clear canvas with fade effect
    ctx.fillStyle = 'rgba(10, 10, 26, 0.3)';
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
    // Draw debris pieces (tail made of separate pieces)
    player.debrisPieces.forEach((piece, i) => {
        const alpha = Math.min(1, i / (player.debrisPieces.length * 0.3));
        const scale = 1 + (piece.z / GAME_CONFIG.PERSPECTIVE_SCALE_FACTOR); // 3D perspective scaling
        const renderSize = piece.size * scale;
        
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = colors.debris;
        ctx.shadowBlur = 15 * scale;
        ctx.shadowColor = colors.debris;
        ctx.globalAlpha = alpha;
        
        // Draw as a cube-like shape (3D object on 2D plane)
        ctx.fillRect(-renderSize, -renderSize, renderSize * 2, renderSize * 2);
        
        // Add highlight for 3D effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-renderSize, -renderSize, renderSize, renderSize);
        
        ctx.globalAlpha = 1;
        ctx.restore();
    });

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

    // Draw player ship
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = colors.ship;
    ctx.shadowBlur = 30;
    ctx.shadowColor = colors.ship;
    ctx.beginPath();
    ctx.moveTo(0, -player.size);
    ctx.lineTo(-player.size * 0.7, player.size);
    ctx.lineTo(0, player.size * 0.5);
    ctx.lineTo(player.size * 0.7, player.size);
    ctx.closePath();
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

    // Draw particles
    particles.forEach((particle) => {
        const alpha = particle.life / GAME_CONFIG.PARTICLE_MAX_LIFE;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });

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
            life: 60 + Math.random() * 40,
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
            life: 40 + Math.random() * 30,
            color: colors.debris,
            size: piece.size,
        });
    });
    
    updateUI();
}

// Delayed game over screen display
let gameOverDelay = 0;
const GAME_OVER_SCREEN_DELAY = 60; // Show screen after 1 second (60 frames)

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
updateUI();
gameLoop();
