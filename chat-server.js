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
        this.banned = [];
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

        //if room does not exist send them to bad input
        if (joinroom == null) {
            console.log("Room does not exist");
            io.to(socket.room).emit('badinput_to_client'), { data: "Room" };
        }
        else {
            console.log("joinroom called " + joinroom);
            joinroom.users.push(socket.nickname);
            socket.leave(socket.room);
            socket.room = joinroom.roomname;
            socket.join(socket.room);

            io.to(socket.room).emit('joinroom_to_client', { roomname: socket.room + ": ", users: joinroom.users, username: socket.nickname });
        }

    });



    //let ishere = 0;
    //console.log(joinroom.roomname);
    //for (let i = 0; i < joinroom.banned.length; i++) {
    //  if (room["username"] == joinroom.banned[i]) {
    //    console.log(room["username"] + " has been banned from " + joinroom.roomname);
    //  ishere = 1;
    //}
    //}
    //if (ishere == 1) {
    //console.log(socket.nickname + " cannot join this room because you have been banned");
    // io.to(socket.room).emit('bannedfromroom_to_client'), { roomname: joinroom.roomname, username: socket.nickname };
    //}
    // else {

    // if room does exist add them to rooms list of users and 

    socket.on('ban_to_server', function (data) {
        console.log("ban to server recieved");
        let banroom;
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].roomname === socket.room) {
                banroom = rooms[i];
            }
        }
        banroom.banned.push(data["banned"]);
        //data["banned"].leave(socket.room);
        for (let i = 0; i < banroom.users.length; i++) {
            if (banroom.users[i] == data["banned"]) {
                banroom.users.splice(i, 1);
            }
        }
        io.to(socket.room).emit('ban_to_client', { roomname: socket.room, banneduser: data["banned"] });
    });

    socket.on("kick_to_server", function (data) {
        console.log("kick to server recieved");
        let kickroom;
        // get kickroom
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].roomname == data["room"]) {
                kickroom = rooms[i];
            }
        }
        let checkkickeduser = 0;

        //check if user is in room 
        for (let i = 0; i < kickroom.users.length; i++) {
            if (kickroom.users[i] == data["kicked"]) {
                checkkickeduser = 1;
            }
        }
        console.count("kicked " + data["kicked"]);
        console.count("checkkickeduser " + checkkickeduser);

        if (checkkickeduser == 1) {
            console.log("b");
            if (socket.nickname == data["kicked"]) {
                console.count("a");
                socket.leave(socket.room);
                console.log(data["kicked"] + " has been kicked out of " + kickroom);
                socket.join(lobby.roomname);
                console.log(data["kicked"] + " has rejoined the lobby ");
                io.to(socket.room).emit('kick_to_client'), { data: data["kicked"] };
            }
        }
        else {
            console.log(data["kicked"] + " is not in " + kickroom);
            io.to(socket.room).emit('badinput_to_client'), { data: data["kicked"] };
        }
    });


    socket.on('disconnect', function () {
        delete usernames[socket.id];
        console.log('message_to_client', socket.id + ' has left the chat');
    });

});


