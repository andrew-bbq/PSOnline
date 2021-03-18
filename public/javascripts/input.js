let keysDown = {};
let wasPressed = {};
addEventListener("keydown", function(e) {
    keysDown[e.key] = true;
});

addEventListener("keyup", function(e) {
    keysDown[e.key] = false;
});