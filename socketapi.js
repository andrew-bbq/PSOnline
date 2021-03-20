const io = require("socket.io")();
const socketapi = {
    io: io
};

let games = {};

// socket io logic goes here
io.on("connection", (socket) => {
    socket.on("join", data => {
        let code = data.code;
        // join room for code
        socket.join(code);

        if (!(code in games)) {
            games[code] = { players: [socket.id] };
        } else {
            games[code].players.push(socket.id);
        }

        socket.emit('joinData', { players: games[code].players, left: data.left, color: data.color });
    });

    socket.on('startGame', (data) => {
        socket.to(data.code).emit("firstPoint", { server: data.server, timestamp: data.timestamp, color: data.color });
        socket.emit("firstPoint", { server: data.server, timestamp: data.timestamp, color: data.color });
    })

    socket.on('frameUpdate', (data) => {
        socket.to(data.code).emit('frameUpdate', data);
    });

    socket.on('updateBall', (data) => {
        socket.to(data.code).emit('updateBall', data);
    });

    socket.on('reportScore', (data) => {
        socket.to(data.code).emit('reportScore', data);
    });

    socket.on('requestOpponentColor', (data) => {
        socket.to(data.code).emit('requestOpponentColor', data);
    });

    socket.on('fulfillColorRequest', (data) => {
        socket.to(data.code).emit('fulfillColorRequest', data);
    });

    socket.on('close', (data) => {
        delete games[data.code];
        socket.emit('finalclose', {code: data.code});
    });
});

module.exports = socketapi;