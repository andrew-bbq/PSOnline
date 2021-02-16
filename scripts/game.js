const WIN_THRESH = 7;

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
 * @param {boolean} player whether or not this slime is player controlled
 */
function newSlime(radius, color, player) {
    return {
        player: player,
        radius: radius,
        color: color,
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 0,
        render: function() {
            const xPixels = this.x * pixelsPerUnitX;
            const yPixels = courtYPixels - (this.y * pixelsPerUnitY);
            const radiusPixels = this.radius * pixelsPerUnitY;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(xPixels, yPixels, radiusPixels, Math.PI, Math.PI * 2);
        }
    };
}

/**
 * Update slime's velocityX and velocityY fields from user input (see scripts/input.js for input retrieval)
 * @param {array} slime Slime object as created in newSlime()
 */
function updateSlimeVelocity(slime) {
    // horizontal movement
    if (keysDown["ArrowLeft"] || keysDown["A"]) {
        if (keysDown["ArrowRight"] || keysDown["D"]) {
            slime.velocityX = 0;
        } else {
            slime.velocityX = -8;
        }
    } else if (keysDown["ArrowRight"] || keysDown["D"]) {
        slime.velocityX = 8;
    } else {
        slime.velocityX = 0;
    }

    //jumping
    if (slime.y == 0 && (keysDown["ArrowUp"] || keysDown[" "])) {
        if (keysDown["ArrowUp"] && !wasPressed["ArrowUp"]) {
            slime.velocityY = 35;
        } else if (keysDown[" "] && !wasPressed[" "]) {
            slime.velocityY = 35;
        }
    }

    // fast falling
    if (slime.y != 0 && (keysDown["ArrowDown"] || keysDown["S"]) && slime.velocityY <= 7) {
        if (keysDown["ArrowDown"] && !wasPressed["ArrowDown"]) {
            slime.velocityY = -50;
        } else if (keysDown["S"] && !wasPressed["S"]) {
            slime.velocityY = -50;
        }
    }

    wasPressed["ArrowUp"] = keysDown["ArrowUp"];
    wasPressed[" "] = keysDown[" "];
    wasPressed["ArrowDown"] = keysDown["ArrowDown"];
    wasPressed["S"] = keysDown["S"];
}

/**
 * Update slime velocity with gravity and position if moving out of bounds
 * @param {array} slime Slime object as created in newSlime()
 * @param {int} leftLimit left bound for slime to stay within
 * @param {int} rightLimit right bound for slime to stay within
 */
function updateSlime(slime, leftLimit, rightLimit) {
    if (slime.velocityX != 0) {
        slime.x += slime.velocityX;
        if(slime.x < leftLimit) slime.x = leftLimit;
        else if(slime.x > rightLimit) slime.x = rightLimit;
    }
    if (slime.velocityY != 0 || slime.y > 0) {
        slime.velocityY -= 2;
        slime.y += slime.velocityY;
        if (slime.y < 0) {
            slime.y = 0;
            slime.velocityY = 0;
        }
    }
}