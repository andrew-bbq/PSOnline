const WIN_THRESH = 7;

const MAX_VELOCITY_X = 15;
const MAX_VELOCITY_Y = 22;

const SLIME_GRAVITY = 0.01;
const BALL_GRAVITY = -1;
const SLIME_HORIZONTAL_VELOCITY = 0.7;
const SLIME_JUMP_VELOCITY = 3.5;
const SLIME_FASTFALL_VELOCITY = 4.5;

// connection info
let code;

// render info
let ctx;
let canvas;
let viewWidth;
let viewHeight;
let courtYPixels;
let pixelsPerUnitX;
let pixelsPerUnitY;
let prevTimestamp;

// colors
let skyColor;
let groundColor;

// game info
let gameWidth, gameHeight;
let ball;
let playerSlime;
let opponentSlime;
let scores = [0,0];
let leftWon;

/**
 * Return new ball object with parameters
 * @param {int} radius for ball
 * @param {string} color for ball
 */
function newBall(radius, color) {
    return {
        radius: radius,
        color: color,
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 0,
        render: function () {
            const xPixels = this.x * pixelsPerUnitX;
            const yPixels = courtYPixels - (this.y * pixelsPerUnitY);
            // original says "add two pixels for visuals" so I'm going to keep that
            const radiusPixels = this.radius * pixelsPerUnitY + 2;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(xPixels, yPixels, radiusPixels, 0, Math.PI * 2);
            ctx.fill();
        }
    };
}

/**
 * Return new slime object with parameters
 * @param {int} radius of slime
 * @param {string} color of slime
 * @param {boolean} left whether or not this slime is on the right
 */
function newSlime(radius, color, left) {
    return {
        left: left,
        radius: radius,
        color: color,
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 0,
        render: function() {
            const xPixels = this.x * pixelsPerUnitX;
            const yPixels = courtYPixels - (this.y * pixelsPerUnitY);
            const radiusPixels = this.radius * (pixelsPerUnitY);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(xPixels, yPixels, radiusPixels, Math.PI, Math.PI * 2);
            ctx.fill();
        }
    };
}

/**
 * Update slime's velocityX and velocityY fields from user input (see scripts/input.js for input retrieval)
 * @param {array} slime Slime object as created in newSlime()
 */
function updateSlimeVelocity(slime) {
    // horizontal movement
    if (keysDown["ArrowLeft"] || keysDown["a"]) {
        if (keysDown["ArrowRight"] || keysDown["d"]) {
            slime.velocityX = 0;
        } else {
            slime.velocityX = -SLIME_HORIZONTAL_VELOCITY;
        }
    } else if (keysDown["ArrowRight"] || keysDown["d"]) {
        slime.velocityX = SLIME_HORIZONTAL_VELOCITY;
    } else {
        slime.velocityX = 0;
    }

    //jumping
    if (slime.y == 0 && (keysDown["ArrowUp"] || keysDown[" "])) {
        if (keysDown["ArrowUp"] && !wasPressed["ArrowUp"]) {
            slime.velocityY = SLIME_JUMP_VELOCITY;
        } else if (keysDown[" "] && !wasPressed[" "]) {
            slime.velocityY = SLIME_JUMP_VELOCITY;
        }
    }

    // fast falling
    if (slime.y != 0 && (keysDown["ArrowDown"] || keysDown["s"]) && slime.velocityY <= 2) {
        if (keysDown["ArrowDown"] && !wasPressed["ArrowDown"]) {
            slime.velocityY = -SLIME_FASTFALL_VELOCITY;
        } else if (keysDown["s"] && !wasPressed["s"]) {
            slime.velocityY = -SLIME_FASTFALL_VELOCITY;
        }
    }

    wasPressed["ArrowUp"] = keysDown["ArrowUp"];
    wasPressed[" "] = keysDown[" "];
    wasPressed["ArrowDown"] = keysDown["ArrowDown"];
    wasPressed["s"] = keysDown["s"];
}

/**
 * Update slime velocity with gravity and position if moving out of bounds
 * @param {array} slime Slime object as created in newSlime()
 * @param {int} leftLimit left bound for slime to stay within
 * @param {int} rightLimit right bound for slime to stay within
 * @param {int} timestamp for computing new position regardless of framerate
 */
function updateSlime(slime, leftLimit, rightLimit, timestamp) {
    if (slime.velocityX != 0) {
        slime.x += (slime.velocityX * (timestamp-prevTimestamp));
        if(slime.x < leftLimit) slime.x = leftLimit;
        else if(slime.x > rightLimit) slime.x = rightLimit;
    }
    if (slime.velocityY != 0 || slime.y > 0) {
        slime.velocityY -= (SLIME_GRAVITY * (timestamp-prevTimestamp));
        slime.y += (slime.velocityY * (timestamp-prevTimestamp));
        if (slime.y < 0) {
            slime.y = 0;
            slime.velocityY = 0;
        }
    }
}

const FUDGE_FACTOR = 5;

/**
 * Check if ball is colliding with slime and update velocity if colliding (NEED TO HANDLE NETCODE HERE)
 * @param {array} slime Slime object as created in newSlime()
 */
function collisionBallSlime(slime) {
    let dx = 2* (ball.x - slime.x);
    let dy = ball.y - slime.y;
    let dist = Math.trunc(Math.sqrt(dx*dx + dy*dy));

    let dVelocityX = ball.VelocityX - slime.velocityX;
    let dVelocityY = ball.velocityY - slime.velocityY;

    if (dy > 0 && dist < ball.radius + slime.radius && dist > FUDGE_FACTOR) {
        // go to edge of slime on collision
        ball.x = slime.x + Math.trunc(Math.trunc((slime.radius + ball.radius) / 2) * dx / dist);
        ball.y = slime.y + Math.trunc((slime.radius + ball.radius) * dy / dist);

        let something = Math.trunc((dx * dVelocityX + dy * dVelocityY) / dist);
        if (something <= 0) {
            ball.velocityX += Math.trunc(slime.velocityX - 2 * dx * something / dist);
            ball.velocityY += Math.trunc(slime.velocityY - 2 * dy * something / dist);
            if (ball.velocityX < -MAX_VELOCITY_X) ball.velocityX = -MAX_VELOCITY_X;
            else if (ball.velocityX > MAX_VELOCITY_X) ball.velocityX = MAX_VELOCITY_X;
            if (ball.velocityY < -MAX_VELOCITY_Y) ball.velocityY = -MAX_VELOCITY_Y;
            else if (ball.velocityY > MAX_VELOCITY_Y) ball.velocityY = MAX_VELOCITY_Y;
        }
    }
}

/**
 * Update ball velocity based on position
 * @param {int} timestamp for computing new position regardless of framerate
 * @return {boolean} true if point ended (ball hit ground) false otherwise.
 */
function updateBall(timestamp) {
    ball.velocityY += -1; // gravity
    if (ball.velocityY < -MAX_VELOCITY_Y) {
        ball.velocityY = -MAX_VELOCITY_Y;
    }

    ball.x += (ball.velocityX * (timestamp-prevTimestamp));
    ball.y += (ball.velocityY * (timestamp-prevTimestamp));

    collisionBallSlime(playerSlime);

    // handle wall hits
    if (ball.x < 15) {
        ball.x = 15;
        ball.velocityX = -ball.velocityX;
    } else if (ball.x > 985) {
        ball.x = 985;
        ball.velocityX = -ball.velocityX;
    }

    // hits the post
    if (ball.x > 480 && ball.x < 520 && ball.y < 140) {
        // bounces off top of net
        if (ball.velocityY < 0 && ball.y > 130) {
            ball.velocityY *= -1;
            ball.y = 130;
        } else if (ball.x < 500) { // hits side of net
            ball.x = 480;
            ball.velocityX = ball.velocityX >= 0 ? -ball.velocityX : ball.velocityX;
        } else {
            ball.x = 520;
            ball.velocityX = ball.velocityX <= 0 ? -ball.velocityX : ball.velocityX;
        }
    }

    // Check for end of point
    if (ball.y < 0) {
        if (ball.x > 500) {
            leftWon = true;
            scores[0]++;
        } else {
            leftWon = false;
            scores[1]++;
        }
        //endPoint()
        return true;
    }
    return false;
}

/**
 * Call all update functions for frame cycle
 */
function updateFrame(timestamp) {
    updateSlimeVelocity(playerSlime);

    const leftBound = playerSlime.left ? 50 : 555;
    const rightBound = playerSlime.left ? 445 : 950;

    updateSlime(playerSlime, leftBound, rightBound, timestamp);

    if (updateBall()) {
        return;
    }

    prevTimestamp = timestamp;
}

function gameIteration(timestamp) {
    if (!prevTimestamp) {
        prevTimestamp = timestamp;
    }
    updateFrame(timestamp);
    renderGame();
    requestAnimationFrame(gameIteration);
}

/**
 * Render background
 */
function renderBackground() {
    ctx.fillStyle = skyColor;
    ctx.fillRect(0,0,viewWidth, courtYPixels);
    ctx.fillStyle = groundColor;
    ctx.fillRect(0,courtYPixels, viewWidth, viewHeight-courtYPixels);
    ctx.fillStyle = "#fff";
    ctx.fillRect(viewWidth / 2 - 2, 7 * viewHeight/10, 4, viewHeight/10+5);
}

/**
 * Call all previous render functions, update all frames
 */
function renderGame() {
    renderBackground();
    ctx.fillStyle = '#000';
    ball.render();
    playerSlime.render();
    opponentSlime.render();
}

/**
 * Reset game for new point
 * @param {boolean} server True for left slime serving, false for right slime serving
 */
function initRound(server) {
    ball.x = server ? 200 : 800;
    ball.y = 356;
    ball.velocityX = 0;
    ball.velocityY = 0;

    const playerX = playerSlime.left ? 200 : 800;
    const oppX = opponentSlime.left ? 200 : 800;

    playerSlime.x = playerX;
    playerSlime.y = 0;
    opponentSlime.x = oppX;
    opponentSlime.y = 0;

    playerSlime.velocityX = 0;
    playerSlime.velocityY = 0;
    opponentSlime.velocityX = 0;
    opponentSlime.velocityY = 0;
}

/**
 * Update size of canvas and scaling for rendering
 * @param {int} width of canvas
 * @param {int} height of canvas
 */
function updateWindowSize(width, height) {
    viewWidth = width;
    viewHeight = height;
    pixelsPerUnitX = viewWidth/gameWidth;
    pixelsPerUnitY = viewHeight/gameHeight;
    courtYPixels = 4 * viewHeight / 5;
}

/**
 * Set styling for newly created canvas element
 * @param {CanvasElement} canvas to set style for
 */
function setupView(canvas) {

}

/**
 * Set up canvas, slimes, etc.
 */
function bodyload() {
    let contentDiv = document.getElementById('GameContentDiv');

    // Create render objects
    canvas = document.getElementById('canvas');
    canvas.width = window.innerWidth;
    canvas.height = canvas.width * 0.5625;

    ctx = canvas.getContext("2d");
    ctx.font = "20px Georgia";

    gameWidth = 1000;
    gameHeight = 1000;
    updateWindowSize(canvas.width, canvas.height);
    
    nextSlimeIndex = Math.floor(Math.random()*2);

    let playerColor = document.getElementById("player-color").value;
    let playerLeft = Boolean(document.getElementById("player-left").value);
    // need slimeLeftColor && playerLeft from hidden html elements, decided in previous screen.
    playerSlime = newSlime(100, playerColor, playerLeft);
    opponentSlime = newSlime(100, "green", !playerLeft);
    ball = newBall(25, "#ff0");

    skyColor = "#00f";
    groundColor = "#888";

    gameIteration();
}


function start() {
    scores = [0,0];
    skyColor = "#00f";
    groundColor = "#888";
}

window.onresize = function () {
    canvas.width = window.innerWidth;
    canvas.height = canvas.width * 0.5625;
    updateWindowSize(canvas.width, canvas.height);
    console.log(pixelsPerUnitY);
}