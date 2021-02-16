let keysDown = {};
addEventListener("keydown", function(e) {
    keysDown[e.key] = true;
    console.log(e.key);
});

addEventListener("keyup", function(e) {
    keysDown[e.key] = false;
    console.log(e.key);
})