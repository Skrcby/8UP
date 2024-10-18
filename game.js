// Canvas setup
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game variables
let playerName = '';
let playerCountry = '';
let logo = new Image();
logo.src = 'logo.png';
let logoX = 250;
let logoY = canvas.height / 3;
let logoWidth = 70;
let logoHeight = 70;
let logoVelocity = 0;
let gravity = 0.5;
let obstacleSpeed = 5;
let score = 0;
let obstacles = [];
let highScores = [];
let rotationAngle = 6;
let obstaclesCleared = 0;
let isRotating = false;
let rotationStartTime = 0;
let maxRotation = Math.PI / 1;
let trailEffect = [];
let pulseEffect = 0;
let obstacleWidth = 50;
let gapHeight = 180;
let isJumping = false;
let obstacleInterval;
let difficultyLevel = 1;

// Background music
let bgMusic = new Audio('music.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.01; 

// JSONbin configuration
const BIN_ID = '67121a26ad19ca34f8ba8fe6';
const API_KEY = '$2a$10$KmEvh5N0f4pkx8Ly0CGQFeCbdHS9oeCZwOvzZ4lzNWcAf38Dnb8JS';
const JSON_BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Star field
let starField = [];
function createStarField() {
    for (let i = 0; i < 200; i++) {
        starField.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2 + 1,
            speed: Math.random() * 2 + 1
        });
    }
}
createStarField();

function updateStarField() {
    starField.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = canvas.width;
            star.y = Math.random() * canvas.height;
        }
    });
}

function drawStarField() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    starField.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Logo functions
function drawLogo() {
    ctx.save();
    
    // Apply pulsing effect
    pulseEffect += 0.1;
    let scale = 1 + Math.sin(pulseEffect) * 0.05;
    
    trailEffect.forEach((pos, index) => {
        ctx.save();
        ctx.globalAlpha = 1 - index / trailEffect.length;
        ctx.translate(pos.x + logoWidth / 2, pos.y + logoHeight / 2);
        ctx.rotate(pos.angle);
        ctx.scale(scale, scale);
        ctx.translate(-pos.x - logoWidth / 2, -pos.y - logoHeight / 2);
        ctx.drawImage(logo, pos.x, pos.y, logoWidth, logoHeight);
        ctx.restore();
    });

    ctx.save();
    ctx.translate(logoX + logoWidth / 2, logoY + logoHeight / 2);
    ctx.rotate(rotationAngle);
    ctx.scale(scale, scale);
    ctx.translate(-logoX - logoWidth / 2, -logoY - logoHeight / 2);
    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    ctx.restore();

    ctx.restore();

    trailEffect.unshift({ x: logoX, y: logoY, angle: rotationAngle });
    if (trailEffect.length > 5) trailEffect.pop();
}

function moveLogo() {
    if (isJumping) {
        logoVelocity = -8;
        isJumping = false;
    }
    
    logoVelocity += gravity;
    logoY += logoVelocity;

    if (logoY < 0) {
        logoY = 0;
        logoVelocity = 0;
    }
    if (logoY + logoHeight > canvas.height) {
        logoY = canvas.height - logoHeight;
        logoVelocity = 0;
    }
}

function rotateLogo() {
    if (isRotating) {
        let currentTime = Date.now();
        let rotationDuration = currentTime - rotationStartTime;
        rotationAngle = Math.min((rotationDuration / 1000) * Math.PI, maxRotation);
    } else {
        rotationAngle = Math.max(rotationAngle - 0.1, 0);
    }
}

// Obstacle functions
function createObstacle() {
    let minHeight = 50;
    let maxHeight = canvas.height - gapHeight - minHeight;

    let topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    
    // Ensure there's always a passable gap
    if (obstacles.length > 0) {
        let lastObstacle = obstacles[obstacles.length - 1];
        if (lastObstacle.height > canvas.height / 2) {
            topHeight = Math.min(topHeight, canvas.height / 3);
        } else if (lastObstacle.height < canvas.height / 3) {
            topHeight = Math.max(topHeight, canvas.height / 2);
        }
    }
    
    obstacles.push({
        x: canvas.width,
        y: 0,
        width: obstacleWidth,
        height: topHeight,
        cleared: false
    });
}

function moveObstacles() {
    obstacles.forEach(obstacle => {
        obstacle.x -= obstacleSpeed;
    });
    obstacles = obstacles.filter(obstacle => obstacle.x > -obstacleWidth);
}

function drawObstacles() {
    ctx.fillStyle = "#FF5733";
    obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x, 0, obstacle.width, obstacle.height);
        ctx.fillRect(obstacle.x, obstacle.height + gapHeight, obstacle.width, canvas.height - obstacle.height - gapHeight);
    });
}

// Improved collision detection
function checkCollision() {
    const collisionMargin = 5; // Small margin for more forgiving collision
    const logoCenter = {
        x: logoX + logoWidth / 2,
        y: logoY + logoHeight / 2
    };
    const logoRadius = (logoWidth + logoHeight) / 4 - collisionMargin;

    for (let obstacle of obstacles) {
        // Check if logo is horizontally within the obstacle
        if (logoCenter.x + logoRadius > obstacle.x && logoCenter.x - logoRadius < obstacle.x + obstacle.width) {
            // Check if logo is vertically colliding with top or bottom obstacle
            if (logoCenter.y - logoRadius < obstacle.height || 
                logoCenter.y + logoRadius > obstacle.height + gapHeight) {
                return true;
            }
        }
    }
    return false;
}

// New function to increase difficulty
function increaseDifficulty() {
    difficultyLevel++;
    obstacleSpeed += 0.5;
    gapHeight = Math.max(gapHeight - 5, 120); // Decrease gap height, but not below 120
    clearInterval(obstacleInterval);
    obstacleInterval = setInterval(createObstacle, Math.max(2000 - difficultyLevel * 100, 1000));
}

// Game logic
function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    
    score = 0;
    obstacles = [];
    logoY = canvas.height / 2;
    logoVelocity = 0;
    obstaclesCleared = 0;
    rotationAngle = 0;
    obstacleSpeed = 5;
    difficultyLevel = 1;
    gapHeight = 180;

    bgMusic.play();

    obstacleInterval = setInterval(createObstacle, 2000);
    let gameInterval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateStarField();
        drawStarField();

        drawLogo();
        moveLogo();
        rotateLogo();
        moveObstacles();
        drawObstacles();

        score += 1;
        ctx.fillStyle = "#FFF";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Score: ${score}`, canvas.width / 2, 50);

        obstacles.forEach(obstacle => {
            if (obstacle.x + obstacle.width < logoX && !obstacle.cleared) {
                obstacle.cleared = true;
                obstaclesCleared += 1;
            }
        });

        // Increase difficulty every 1000 points after the first 20 obstacles
        if (obstaclesCleared > 20 && score % 1000 === 0) {
            increaseDifficulty();
        }

        if (checkCollision()) {
            clearInterval(obstacleInterval);
            clearInterval(gameInterval);
            endGame();
        }
    }, 1000 / 60);
}

function endGame() {
    document.getElementById("gameOverScreen").style.display = 'flex';
    bgMusic.pause();
    bgMusic.currentTime = 0;
    updateHighScores();
}

// High score functions
async function updateHighScores() {
    try {
        const response = await fetch(JSON_BIN_URL, {
            headers: {
                'X-Master-Key': API_KEY
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load high scores');
        }

        const data = await response.json();
        highScores = data.record.highScores || [];

        const lowerPlayerName = playerName.toLowerCase();
        let playerIndex = highScores.findIndex(entry => entry.name.toLowerCase() === lowerPlayerName);
        
        if (playerIndex !== -1) {
            if (score > highScores[playerIndex].score) {
                highScores[playerIndex].score = score;
                highScores[playerIndex].name = playerName;
                highScores[playerIndex].country = playerCountry;
            }
        } else {
            highScores.push({ name: playerName, score: score, country: playerCountry });
        }
        
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 50);

        await fetch(JSON_BIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ highScores: highScores })
        });

        updateHighScoreDisplay();
    } catch (error) {
        console.error('Error updating high scores:', error);
    }
}

function updateHighScoreDisplay() {
    let highScoresList = document.getElementById("highScoresList");
    highScoresList.innerHTML = "";
    highScores.slice(0, 10).forEach((entry, index) => {
        let li = createHighScoreItem(entry, index);
        highScoresList.appendChild(li);
    });
}

function createHighScoreItem(player, index) {
    const li = document.createElement('li');
    const flagSpan = document.createElement('span');
    flagSpan.className = `flag-icon flag-icon-${player.country}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${index + 1}. ${player.name}: ${player.score}`;
    
    const medalSpan = document.createElement('span');
    medalSpan.className = 'medal';
    
    if (index === 0) {
        medalSpan.textContent = '🥇';
    } else if (index === 1) {
        medalSpan.textContent = '🥈';
    } else if (index === 2) {
        medalSpan.textContent = '🥉';
    }
    
    li.appendChild(flagSpan);
    li.appendChild(nameSpan);
    li.appendChild(medalSpan);
    
    return li;
}

async function loadHighScores() {
    try {
        const response = await fetch(JSON_BIN_URL, {
            headers: {
                'X-Master-Key': API_KEY
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load high scores');
        }

        const data = await response.json();
        highScores = data.record.highScores || [];
        updateHighScoreDisplay();
    } catch (error) {
        console.error('Error loading high scores:', error);
    }
}

// Event listeners
document.getElementById('startGame').addEventListener('click', () => {
    playerName = document.getElementById('playerNameInput').value.trim();
    playerCountry = document.getElementById('countrySelect').value;
    if (playerName && playerCountry) {
        startGame();
    } else {
        alert("Please enter your name and select your country!");
    }
});

document.getElementById('restartGame').addEventListener('click', startGame);

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        isJumping = true;
        isRotating = true;
        rotationStartTime = Date.now();
    } else if (e.code === 'Enter' && document.getElementById('gameOverScreen').style.display === 'flex') {
        startGame();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        isRotating = false;
    }
});

canvas.addEventListener('mousedown', () => {
    isJumping = true;
    isRotating = true;
    rotationStartTime = Date.now();
});

canvas.addEventListener('mouseup', () => {
    isRotating = false;
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isJumping = true;
    isRotating = true;
    rotationStartTime = Date.now();
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isRotating = false;
});

document.getElementById('joinDiscord').addEventListener('click', function() {
    window.open('https://discord.gg/HauCydfJ', '_blank');
});

window.addEventListener('load', loadHighScores);