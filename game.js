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
    size: 15,
    speed: 4,
    vx: 0,
    vy: 0,
    trail: [],
    maxTrailLength: 20,
};

// Game objects
let enemies = [];
let particles = [];

// Input handling
const keys = {};
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

// Start/restart game
function startGame() {
    gameState = 'playing';
    score = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.vx = 0;
    player.vy = 0;
    player.trail = [];
    player.maxTrailLength = 20;
    enemies = [];
    particles = [];
    frameCount = 0;
    updateUI();
}

// Spawn enemy from edge
function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x, y, vx, vy;
    const speed = GAME_CONFIG.MIN_ENEMY_SPEED + Math.random() * (GAME_CONFIG.MAX_ENEMY_SPEED - GAME_CONFIG.MIN_ENEMY_SPEED);
    const size = 8 + Math.random() * 12;

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

    enemies.push({ x, y, vx, vy, size });
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
    if (gameState !== 'playing') return;

    frameCount++;

    // Player movement
    player.vx = 0;
    player.vy = 0;

    if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.vx = -player.speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) player.vx = player.speed;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) player.vy = -player.speed;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) player.vy = player.speed;

    // Apply diagonal movement normalization
    if (player.vx !== 0 && player.vy !== 0) {
        const factor = Math.sqrt(2) / 2;
        player.vx *= factor;
        player.vy *= factor;
    }

    player.x += player.vx;
    player.y += player.vy;

    // Keep player in bounds
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

    // Update trail
    if (player.vx !== 0 || player.vy !== 0 || player.trail.length === 0) {
        player.trail.push({ x: player.x, y: player.y });
        if (player.trail.length > player.maxTrailLength) {
            player.trail.shift();
        }
    }

    // Spawn enemies (grace period at start, then spawn at intervals)
    if (frameCount > GAME_CONFIG.INITIAL_GRACE_PERIOD_FRAMES && frameCount % GAME_CONFIG.ENEMY_SPAWN_INTERVAL_FRAMES === 0) {
        spawnEnemy();
    }

    // Update enemies
    enemies.forEach((enemy, index) => {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Remove off-screen enemies
        if (
            enemy.x < -enemy.size * 2 ||
            enemy.x > canvas.width + enemy.size * 2 ||
            enemy.y < -enemy.size * 2 ||
            enemy.y > canvas.height + enemy.size * 2
        ) {
            enemies.splice(index, 1);
            return;
        }

        // Check collision with player ship (game over)
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < enemy.size + player.size) {
            gameOver();
            return;
        }

        // Check collision with tail (exclude recent trail points near ship)
        for (let i = 0; i < player.trail.length - GAME_CONFIG.TRAIL_COLLISION_BUFFER; i++) {
            const trail = player.trail[i];
            const tdx = enemy.x - trail.x;
            const tdy = enemy.y - trail.y;
            const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
            if (tdist < enemy.size + 5) {
                // Enemy destroyed by tail
                enemies.splice(index, 1);
                score += Math.floor(enemy.size);
                player.maxTrailLength += GAME_CONFIG.TRAIL_GROWTH_PER_ENEMY;
                createParticles(enemy.x, enemy.y, colors.debris, 15);
                updateUI();
                return;
            }
        }
    });

    // Update particles
    particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.life--;
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
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
    ctx.strokeStyle = colors.tail;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 20;
    ctx.shadowColor = colors.tail;

    if (player.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(player.trail[0].x, player.trail[0].y);
        for (let i = 1; i < player.trail.length; i++) {
            ctx.lineTo(player.trail[i].x, player.trail[i].y);
        }
        ctx.stroke();
    }

    // Draw trail particles
    for (let i = 0; i < player.trail.length; i++) {
        const alpha = i / player.trail.length;
        ctx.fillStyle = `rgba(160, 216, 241, ${alpha * 0.5})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = colors.tail;
        ctx.beginPath();
        ctx.arc(player.trail[i].x, player.trail[i].y, 6 * alpha, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw player ship
    ctx.fillStyle = colors.ship;
    ctx.shadowBlur = 30;
    ctx.shadowColor = colors.ship;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.size);
    ctx.lineTo(player.x - player.size * 0.7, player.y + player.size);
    ctx.lineTo(player.x, player.y + player.size * 0.5);
    ctx.lineTo(player.x + player.size * 0.7, player.y + player.size);
    ctx.closePath();
    ctx.fill();

    // Draw enemies
    enemies.forEach((enemy) => {
        ctx.fillStyle = colors.enemy;
        ctx.shadowBlur = 20;
        ctx.shadowColor = colors.enemy;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();

        // Enemy glow ring
        ctx.strokeStyle = colors.enemy;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size + 3, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Draw particles
    particles.forEach((particle) => {
        const alpha = particle.life / 50;
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
    createParticles(player.x, player.y, colors.ship, 30);
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
updateUI();
gameLoop();
