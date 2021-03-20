const WIN_THRESH = 7;

const MAX_VELOCITY_X = 1.05;
const MAX_VELOCITY_Y = 2;

const SLIME_GRAVITY = 0.01;
const BALL_GRAVITY = -0.006;
const SLIME_HORIZONTAL_VELOCITY = 0.7;
const SLIME_JUMP_VELOCITY = 2.9;
const SLIME_FASTFALL_VELOCITY = 4.5;
const FUDGE_FACTOR = 5;

const POLL_RATE = 45;
const VELOCITY_FIXER = 1000;
let poller = 0;

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

let currentTimestamp = 0;

let gameStarted = false;


// socketio stuff
let socket = io();
const code = document.getElementById("game-code").value;
let playerLeft = Boolean(document.getElementById("player-left").value);
let playerColor = "#" + document.getElementById("player-color").value;

socket.emit('join', {code:code, left: playerLeft, color: playerColor});

socket.on('joinData', (data) => {
    if (data.players.length == 2) {
        playerSlime.left = !data.left;
        playerSlime.x = playerSlime.left ? 200: 800;
        const server = Boolean(Math.random() * 2);
        socket.emit('startGame', {code: code, server: server, timestamp: Date.now(), color: playerColor});
        socket.emit('requestOpponentColor', {code: code, color: playerColor});
    }
    if (data.players.length > 2) {
        window.location.replace("/?err=gip");
    }
});

socket.on("requestOpponentColor", (data) => {
    opponentSlime.color = data.color;
    socket.emit('fulfillColorRequest', {code: code, color: playerColor, side: playerSlime.left});
});

socket.on("fulfillColorRequest", (data) => {
    opponentSlime.left = data.side;
    playerSlime.left = !data.side;
    playerSlime.x = playerSlime.left ? 200 : 800;
    opponentSlime.color = data.color;
});

socket.on('firstPoint', (data) => {
    scores = [0,0];
    if (!playerSlime.left) {
        opponentSlime.left = true;
    }
    console.log("first point");
    gameStarted = true;
    initRound(data.server);
    updateBall(Date.now() - data.timestamp);
});

socket.on('updateBall', (data) => {
    ball.x = data.ball.x;
    ball.y = data.ball.y;
    ball.velocityX = data.ball.velocityX;
    ball.velocityY = data.ball.velocityY;
    updateBall(Date.now() - data.timestamp);
})

socket.on('frameUpdate', (data) => {
    // if we didn't send this data
    if (data.slime.left != playerSlime.left) {
        // update opponent slime with data from opponent
        const leftBound = playerSlime.left ? 555 : 50;
        const rightBound = playerSlime.left ? 950 : 445;
        opponentSlime.x = data.slime.x;
        opponentSlime.y = data.slime.y;
        opponentSlime.velocityX = data.slime.velocityX;
        opponentSlime.velocityY = data.slime.velocityY;
        if (Date.now > data.timestamp) {
            updateSlime(opponentSlime, leftBound, rightBound, Date.now() - data.timestamp);
        }
    }
});

socket.on('reportScore', (data) => {
    scores = data.scores;
    scoreRedirect();
    ball.x = data.ball.x;
    ball.y = data.ball.y;
    ball.velocityX = data.ball.velocityX;
    ball.velocityY = data.ball.velocityY;

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
    
    updateBall(Date.now() - data.timestamp);
});

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

            // draw eye
            let eyeX = this.x +(this.left ? 1 : -1) * this.radius/4;
            let eyeY = this.y +this.radius/2;
            let eyeXPix = eyeX * pixelsPerUnitX;
            let eyeYPix = courtYPixels - (eyeY * pixelsPerUnitY);
            ctx.save();
            ctx.translate(eyeXPix, eyeYPix);
            ctx.fillStyle ="#fff";
            ctx.beginPath();
            ctx.arc(0,0, radiusPixels/4, 0, Math.PI * 2);
            ctx.fill();

            // draw pupil
            let dx = ball.x - eyeX;
            let dy = eyeY-ball.y;
            let dist = Math.sqrt(dx*dx+dy*dy);
            let pupilRadius = radiusPixels/8;
            ctx.fillStyle="black";
            ctx.beginPath();
            ctx.arc(pupilRadius*dx/dist, pupilRadius*dy/dist, pupilRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
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
    if (slime.y == 0 && (keysDown["ArrowUp"] || keysDown[" "] || keysDown["w"])) {
        if (keysDown["ArrowUp"] && !wasPressed["ArrowUp"]) {
            slime.velocityY = SLIME_JUMP_VELOCITY;
        } else if (keysDown[" "] && !wasPressed[" "]) {
            slime.velocityY = SLIME_JUMP_VELOCITY;
        } else if (keysDown["w"] && !wasPressed["w"]) {
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

    wasPressed["w"] = keysDown["w"];
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
 * @param {int} deltaTime for computing new position regardless of framerate
 */
function updateSlime(slime, leftLimit, rightLimit, deltaTime) {
    if (slime.velocityX != 0) {
        slime.x += (slime.velocityX * (deltaTime));
        if(slime.x < leftLimit) slime.x = leftLimit;
        else if(slime.x > rightLimit) slime.x = rightLimit;
    }
    if (slime.velocityY != 0 || slime.y > 0) {
        slime.y += (slime.velocityY * (deltaTime)) - (0.5 * SLIME_GRAVITY * (deltaTime)*(deltaTime));
        slime.velocityY -= (SLIME_GRAVITY * (deltaTime));
        if (slime.y < 0) {
            slime.y = 0;
            slime.velocityY = 0;
        }
    }
}

/**
 * Check if ball is colliding with slime and update velocity if colliding (NEED TO HANDLE NETCODE HERE)
 * @param {array} slime Slime object as created in newSlime()
 */
function collisionBallSlime(slime) {
    let dx = 2* (ball.x - slime.x);
    let dy = ball.y - slime.y;
    let dist = Math.trunc(Math.sqrt(dx*dx + dy*dy));

    let dVelocityX = (ball.velocityX * VELOCITY_FIXER) - (slime.velocityX * VELOCITY_FIXER);
    let dVelocityY = (ball.velocityY * VELOCITY_FIXER) - (slime.velocityY * VELOCITY_FIXER);

    if (dy > 0 && dist < ball.radius + slime.radius && dist > FUDGE_FACTOR) {
        // go to edge of slime on collision
        ball.x = slime.x + Math.trunc(Math.trunc((slime.radius + ball.radius) / 2) * dx / dist);
        ball.y = slime.y + Math.trunc((slime.radius + ball.radius) * dy / dist);

        let something = Math.trunc((dx * dVelocityX + dy * dVelocityY) / dist);
        if (something <= 1) {
            ball.velocityX += (Math.trunc((slime.velocityX * VELOCITY_FIXER) - 2 * dx * something / dist));
            ball.velocityY += (Math.trunc((slime.velocityY * VELOCITY_FIXER) - 2 * dy * something / dist));
            if (ball.velocityX < -MAX_VELOCITY_X) ball.velocityX = -MAX_VELOCITY_X;
            else if (ball.velocityX > MAX_VELOCITY_X) ball.velocityX = MAX_VELOCITY_X;
            if (ball.velocityY < -MAX_VELOCITY_Y) ball.velocityY = -MAX_VELOCITY_Y;
            else if (ball.velocityY > MAX_VELOCITY_Y) ball.velocityY = MAX_VELOCITY_Y;
        }
        // send ball info to server
        socket.emit("updateBall", {timestamp: currentTimestamp, ball: ball, code: code});
    }
}

/**
 * Update ball velocity based on position
 * @param {int} deltaTime for computing new position regardless of framerate
 * @return {boolean} true if point ended (ball hit ground) false otherwise.
 */
function updateBall(deltaTime) {
    if (ball.velocityY < -MAX_VELOCITY_Y) {
        ball.velocityY = -MAX_VELOCITY_Y;
    }
    
    ball.x += (ball.velocityX * (deltaTime));
    ball.y += (ball.velocityY * (deltaTime)) + (0.5 * BALL_GRAVITY * ((deltaTime)*(deltaTime)));

    ball.velocityY += (BALL_GRAVITY * (deltaTime)); // gravity

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
        if (!gameStarted) {
            return true;
        }
        // only let loser report score b/c rollback
        if (ball.x >= 500 && !playerSlime.left) {
            leftWon = true;
            scores[0]++;
            initRound(leftWon);
            socket.emit('reportScore', {code: code, scores: scores, leftWon: leftWon, ball: ball, timestamp: currentTimestamp});
            //endPoint()
            return true;
        } else if (ball.x < 500 && playerSlime.left) {
            leftWon = false;
            scores[1]++;
            initRound(leftWon);
            socket.emit('reportScore', {code: code, scores: scores, leftWon: leftWon, ball: ball, timestamp: currentTimestamp});
            //endPoint()
            return true;
        }
        
    }
    return false;
}

/**
 * Call all update functions for frame cycle
 */
function updateFrame(timestamp) {
    currentTimestamp = timestamp;
    updateSlimeVelocity(playerSlime);

    const leftBound = playerSlime.left ? 50 : 555;
    const rightBound = playerSlime.left ? 445 : 950;

    const leftBound2 = playerSlime.left ? 555 : 50;
    const rightBound2 = playerSlime.left ? 950 : 445;
    
    let deltaTime = timestamp - prevTimestamp;
    updateSlime(playerSlime, leftBound, rightBound, deltaTime);
    updateSlime(opponentSlime, leftBound2, rightBound2, deltaTime);

    if (updateBall(deltaTime)) {
        if(!gameStarted) {
            ball.x = playerSlime.left ? 200 : 800;
            ball.y = 400;
            ball.velocityX = 0;
            ball.velocityY = 0;
        }
        scoreRedirect();
    }

    prevTimestamp = timestamp;
}

function gameIteration() {
    let timestamp = Date.now();
    if (!prevTimestamp) {
        prevTimestamp = timestamp;
    }
    updateFrame(timestamp);
    renderGame();
    requestAnimationFrame(gameIteration);
    poller++;
    if(poller >= POLL_RATE) {
        socket.emit("frameUpdate", {timestamp: timestamp, slime: playerSlime, code: code});
    }
}

function renderPoints(score, initialX, xDiff, right) {
    
    xDiff *= pixelsPerUnitX;
    ctx.fillStyle = '#ff0';
    var x = right ? canvas.width - (initialX * pixelsPerUnitX) : (initialX * pixelsPerUnitX);
    for(var i = 0; i < score; i++) {
      ctx.beginPath();
      ctx.arc(x, 100 *pixelsPerUnitY, 12*pixelsPerUnitX, 0, Math.PI * 2);
      ctx.fill();
      x += xDiff;
    }
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    x = right ? canvas.width - (initialX * pixelsPerUnitX) : (initialX * pixelsPerUnitX);
    for(var i = 0; i < WIN_THRESH; i++) {
      ctx.beginPath();
      ctx.arc(x, 100 *pixelsPerUnitY, 12*pixelsPerUnitX, 0, Math.PI * 2);
      ctx.stroke();
      x += xDiff;
    }
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

    // render scores
    renderPoints(scores[0], 30, 40, false);
    renderPoints(scores[1], 30, -40, true);
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
    let top = (window.innerHeight - (0.5625*window.innerWidth))/2;
    canvas.style.top = top;
}

/**
 * Set up canvas, slimes, etc.
 */
function bodyload() {
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

    let playerColor = "#" + document.getElementById("player-color").value;
    let playerLeft = document.getElementById("player-left").value == "true";
    // need slimeLeftColor && playerLeft from hidden html elements, decided in previous screen.
    playerSlime = newSlime(100, playerColor, playerLeft);
    opponentSlime = newSlime(100, "green", !playerLeft);
    ball = newBall(25, "#ff0");

    playerSlime.x = playerSlime.left ? 200 : 800;
    ball.x = playerSlime.left ? 200 : 800;
    ball.y = 356;

    opponentSlime.x = -2000;

    skyColor = "#00f";
    groundColor = "#888";

    gameIteration(0);
}

function scoreRedirect() {
    if (scores[0] >= WIN_THRESH || scores[1] >= WIN_THRESH) {
        socket.emit('close', {code: code});
    }
}

socket.on('finalclose', (data) => {
    if (scores[0] >= WIN_THRESH) {
        if (playerSlime.left) {
            window.location.replace("/gameover?won=true&close="+code);
        } else {
            window.location.replace("/gameover?won=false");
        }
    }
    if (scores[1] >= WIN_THRESH) {
        if (playerSlime.left) {
            window.location.replace("/gameover?won=false");
        } else {
            window.location.replace("/gameover?won=true&close="+code);
        }
    }
});

window.onresize = function () {
    canvas.width = window.innerWidth;
    canvas.height = canvas.width * 0.5625;
    updateWindowSize(canvas.width, canvas.height);
}
