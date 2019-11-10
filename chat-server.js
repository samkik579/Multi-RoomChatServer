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

let userlist = [];

app.listen(3456);
// Do the Socket.IO magic:
var io = socketio.listen(app);

var usernames = {};
var rooms = {};

function roomobject(roomname) {
    this.users = {};
    this.roomname = roomname;
    //this.password = password;
}

let lobby = new roomobject("lobby");

io.sockets.on("connection", function (socket) {
    // This callback runs when a new Socket.IO connection is established.
    console.log("user connected ", socket.id);
    socket.join(lobby.roomname);

    socket.on('message_to_server', function (data) {
        // This callback runs when the server receives a new message from the client.
        console.log("message " + data["username"] + ": " + data["message"]); // log it to the Node.JS output
        io.to(data.currroom).emit("message_to_client", { message: data["message"], username: data["username"] }) // broadcast the message to other users
    });

    // client emits updateusers
    socket.on('username_to_server', function (data) {
        console.log("New user has logged in " + data.username);
        socket.nickname = data["username"];
        //console.log(socket.nickname);
        usernames[socket.id] = data["username"];
        //lobby.users[socket.id] = data["username"];
        io.to(data.currroom).emit('username_to_client', { username: socket.nickname });
    });

    socket.on('newroom_to_server', function (data) {
        let newroom = new roomobject(data["newroom"]);
        newroom.users[socket.id] = usernames[socket.id];
        socket.join(newroom.roomname);
        io.to(newroom.roomname).emit('newroom_to_client', { roomname: newroom.roomname, users: newroom.users });
    });

    socket.on('disconnect', function () {
        delete usernames[socket.id];
        console.log('message_to_client', socket.id + ' has left the chat');
    });

});


