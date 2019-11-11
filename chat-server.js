// Require the packages we will use:
var http = require("http"),
    socketio = require("socket.io"),
    fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function (req, resp) {
    // This callback runs when a new connection is made to our HTTP server.

    fs.readFile("client.html", function (err, data) {
        // This callback runs when the client.html file has been read from the filesystem.

        if (err) return resp.writeHead(500);
        resp.writeHead(200);
        resp.end(data);
    });
});

app.listen(3456);
// Do the Socket.IO magic:
var io = socketio.listen(app);

var usernames = [];
var rooms = [];

class Roomobject {
    constructor(roomname, username) {
        this.users = [];
        this.roomname = roomname;
        this.creator = username;
        //this.password = password;
    }
}

let lobby = new Roomobject("lobby");

io.sockets.on("connection", function (socket) {
    // This callback runs when a new Socket.IO connection is established.
    console.log("user connected ", socket.id);
    socket.join(lobby.roomname);
    socket.room = lobby.roomname;

    socket.on('message_to_server', function (data) {
        // This callback runs when the server receives a new message from the client.
        console.log("message " + data["username"] + ": " + data["message"]); // log it to the Node.JS output
        io.to(socket.room).emit("message_to_client", { message: data["message"], username: data["username"] }) // broadcast the message to other users
    });

    // client emits updateusers
    socket.on('username_to_server', function (data) {
        console.log("New user has logged in " + data.username);
        socket.nickname = data["username"];
        usernames[socket.id] = data["username"];
        lobby.users[socket.id] = data["username"];
        io.sockets.in(data["currentroom"]).emit('username_to_client', { username: socket.nickname, currusers: lobby.users });
    });

    socket.on('newroom_to_server', function (room) {
        console.log("newroom to server recieved: " + room);
        let newroom = new Roomobject(room["newroom"], room["username"]);
        rooms.push(newroom);
        newroom.users.push(socket.nickname);
        socket.leave(socket.room);
        socket.join(room["newroom"]);
        socket.room = room["newroom"];
        io.to(room["newroom"]).emit('newroom_to_client', { roomname: room["newroom"], users: newroom.users });
    });

    socket.on('joinroom_to_server', function (room) {
        console.log("joinroom to server recieved " + room);
        let joinroom;
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].roomname === room["joinroom"]) {
                joinroom = rooms[i];
            }
        }
        console.log("joinroom called " + joinroom);
        joinroom.users.push(socket.nickname);
        socket.leave(socket.room);
        socket.room = joinroom.roomname;
        socket.join(socket.room);

        io.to(socket.room).emit('joinroom_to_client', { roomname: socket.room + ": ", users: joinroom.users });

    })

    socket.on('disconnect', function () {
        delete usernames[socket.id];
        console.log('message_to_client', socket.id + ' has left the chat');
    });

});


