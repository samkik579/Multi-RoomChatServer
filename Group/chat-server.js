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
let printusers = [];
let usernames = [];
let rooms = [];
let roomnames = [];
let myroom;

class Roomobject {
    constructor(roomname, password) {
        this.users = [];
        this.roomname = roomname;
        //this.creator = username;
        this.banned = [];
        this.password = password;
        //this.password = password;
    }
}

let lobby = new Roomobject("Lobby", "");
myroom = lobby;

roomnames.push("lobby");

io.sockets.on("connection", function (socket) {
    // This callback runs when a new Socket.IO connection is established.
    console.log("user connected ", socket.id);
    socket.join(lobby.roomname);
    socket.room = lobby.roomname;

    socket.on('message_to_server', function (data) {
        // This callback runs when the server receives a new message from the client.
        console.log("message " + data["username"] + ": " + data["message"]); // log it to the Node.JS output
        if (data["message"] == "*message") {
            let msgdirections = "To private message a user you must be in the same room as them and enter their username and your message into the private message box below the chatlog.";
            io.to(socket.id).emit("message_to_client", { message: msgdirections, username: "Chat Room Bot" })
        }
        else if (data["message"] == "*allusers") {
            console.log(usernames);
            let msgdirections = "All users on this website: " + printusers;
            io.to(socket.id).emit("message_to_client", { message: msgdirections, username: "Chat Room Bot" })
        }
        else if (data["message"] == "*330") {
            console.log(usernames);
            let msgdirections = "Paste this link in your browser to learn about this project: https://classes.engineering.wustl.edu/cse330/index.php?title=Module_6 ";
            io.to(socket.id).emit("message_to_client", { message: msgdirections, username: "Chat Room Bot" })
        }
        else {
            io.to(socket.room).emit("message_to_client", { message: data["message"], username: data["username"] }) // broadcast the message to other users
        }
    });

    // client emits updateusers
    socket.on('username_to_server', function (data) {
        let check;
        if (usernames.hasOwnProperty(data["username"])) {
            check = true;
        }

        if (check != null) {
            io.to(socket.room).emit('badinput_to_client'), { username: data.username };
        }
        else {
            socket.nickname = data["username"];
            printusers.push(socket.nickname);
            console.log("c " + socket.nickname);
            usernames[socket.nickname] = socket.id;
            lobby.users.push(data["username"]);
            io.sockets.in(socket.room).emit('username_to_client', { username: socket.nickname, currusers: lobby.users, allrooms: roomnames });

        }
    });

    socket.on('newroom_to_server', function (room) {
        console.log("newroom to server recieved: " + room["newroom"]);
        let check = false;
        let nroom = room["newroom"];
        // check if new room is alreay a room
        for (let i = 0; i < rooms.length; i++) {
            if (room["newroom"] === rooms[i].roomname) {
                nroom = null;
            }
        }
        if (nroom == null) {
            io.to(socket.id).emit('room_already_exists_to_client', { roomname: room["newroom"], currroom: socket.room, allrooms: roomnames });
        }

        else {
            let newroom = new Roomobject(nroom, room["newroompass"]);
            myroom = newroom;
            rooms.push(newroom);
            roomnames.push(newroom.roomname);
            newroom.users.push(socket.nickname);
            socket.leave(socket.room);
            socket.join(room["newroom"]);
            socket.room = room["newroom"];
            io.to(room["newroom"]).emit('newroom_to_client', { roomname: room["newroom"], users: newroom.users, allrooms: roomnames });
        }
    });

    socket.on('joinroom_to_server', function (room) {
        console.log("joinroom to server recieved " + room["joinroom"]);
        let jroom;
        let b;
        // check if room exists
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].roomname === room["joinroom"]) {
                jroom = rooms[i];
            }
        }

        //if room does not exist send them to bad input
        if (jroom == null) {
            console.log("Room does not exist " + room["joinroom"]);
            io.to(socket.room).emit('badinput_to_client'), { room: room["joinroom"] };
        }

        else {
            console.log("joinroom called ");

            // check if room has a password:
            if (jroom.password != room["joinroompass"]) {
                console.log("Wrong password");
                io.to(socket.id).emit('incorrectpassword_to_client', { roomname: socket.room, username: socket.nickname, allrooms: roomnames });
            }
            else {
                // check if user has been banned from room: 
                for (let i = 0; i < jroom.banned.length; ++i) {
                    if (jroom.banned[i] == socket.nickname) {
                        console.log("You have been banned from this room and can't join");
                        b = false;
                        io.to(socket.id).emit('bannedfromroom_to_client', { currentroom: jroom.roomname, users: lobby.users, banneduser: socket.nickname, allrooms: roomnames });
                    }
                }
                if (b != false) {
                    let oldroom = myroom;
                    jroom.users.push(socket.nickname);
                    socket.leave(socket.room);
                    socket.room = jroom.roomname;
                    socket.join(socket.room);
                    myroom = jroom;

                    io.to(socket.room).emit('joinroom_to_client', { roomname: socket.room, users: jroom.users, username: socket.nickname, allrooms: roomnames });

                }

            }
        }

    });

    socket.on('ban_to_server', function (data) {
        console.log("ban to server recieved");
        let banroom = myroom;
        let checkbanneduser;

        // check if user exists
        if (usernames.hasOwnProperty(data["banned"])) {
            console.log("banned username exists");
            console.log(data["banned"]);
            banroom.banned.push(data["banned"]);
            console.log(banroom.banned);

            //check if user is in room 
            for (let i = 0; i < banroom.users.length; i++) {
                if (banroom.users[i] == data["banned"]) {
                    delete banroom.users[i];
                    checkbanneduser = true;
                }
            }
            // kick user if they are in the room
            if (checkbanneduser == true) {
                console.log("Am I in here");
                console.log(banroom.users);
                let socketbanned = io.sockets.sockets[usernames[data["banned"]]];
                console.log(socketbanned.id);
                //socketkick = usernames[data["kicked"]];
                socketbanned.leave(socketbanned.roomname);
                socketbanned.room = lobby.roomname;
                socketbanned.join(socketbanned.room);
                console.log(socketbanned.room);

                io.to(socketbanned.id).emit('bannedfromroom_to_client', { currentroom: banroom.roomname, users: lobby.users, banneduser: data["banned"], allrooms: roomnames });
                // io.to(socketkick.room).emit('kick_to_client'), { data: data["kicked"], roomname: socketkick.roomname, users: currroom.users };
            }
        }
        else {
            console.log("DONT ENTER HERE");
            console.log(data["banned"] + " is not a username");
            io.to(socket.room).emit('badinput_to_client'), { data: data["banned"], users: banroom.users, lobby: lobby.users };
        }
    });

    socket.on("kick_to_server", function (data) {
        console.log("kick to server recieved");
        let kickroom = myroom;
        let checkkickeduser;
        console.log(kickroom.users);

        //check if user is in room 
        for (let i = 0; i < kickroom.users.length; i++) {
            if (kickroom.users[i] == data["kicked"]) {
                delete kickroom.users[i];
                checkkickeduser = true;
            }
        }
        console.count("kicked " + data["kicked"]);
        console.count("checkkickeduser " + checkkickeduser);

        if (checkkickeduser != null) {
            console.log(kickroom.users);
            let socketkick = io.sockets.sockets[usernames[data["kicked"]]];
            console.log(socketkick);
            //socketkick = usernames[data["kicked"]];
            socketkick.leave(kickroom.roomname);
            console.log(kickroom.roomname);
            socketkick.room = lobby.roomname;
            socketkick.join(socketkick.room);
            console.log(socketkick.room);

            io.to(socketkick.id).emit('kick_to_client', { currentroom: lobby.roomname, users: lobby.users, kickeduser: data["kicked"], allrooms: roomnames });
            // io.to(socketkick.room).emit('kick_to_client'), { data: data["kicked"], roomname: socketkick.roomname, users: currroom.users };
        }
        else {
            console.log("DONT ENTER HERE");
            console.log(data["kicked"] + " is not in " + kickroom);
            io.to(socket.room).emit('badinput_to_client'), { data: data["kicked"], users: kickroom.users, lobby: lobby.users };
        }
    });


    socket.on('private_to_server', function (data) {
        let socketprivate = io.sockets.sockets[usernames[data["privateuser"]]];
        //now need to check if user is in the same room as them
        let check;
        let r;
        for (let b = 0; b < rooms.length; ++b) {
            if (socket.room == rooms[b].roomname) {
                r = rooms[b];
                for (let i = 0; i < r.users.length; i++) {
                    if (r.users[i] === data["privateuser"]) {
                        check = true;
                    }
                }
            }
        }

        if (check == true) {
            console.log(data["privatemessage"]);
            io.to(socketprivate.id).emit('private_to_client', { from: socket.nickname, to: data["privateuser"], message: data["privatemessage"] });
        }
        else {
            io.to(socket.room).emit('badinput_to_client'), { data: data["privateuser"] };
        }

        //if room does not exist send them to bad input


    });


    socket.on('leaveroom', function () {
        let currroom;
        let allusers;
        let nickname = socket.nickname;
        console.log(socket.room);
        console.log(socket.nickname);
        console.log(lobby.roomname);

        if (socket.room != lobby.roomname) {
            for (let b = 0; b < rooms.length; ++b) {
                if (rooms[b].roomname == socket.room) {
                    currroom = rooms[b];
                    for (let i = 0; i < currroom.users.length; ++i) {
                        if (socket.nickname == currroom.users[i]) {
                            console.log("a");
                            delete currroom.users[i];
                        }
                    }
                }
            }

            lobby.users.push(socket.nickname);
            socket.leave(socket.room);
            socket.room = lobby.roomname;
            socket.join(socket.room);
            myroom = lobby;

            io.to(socket.room).emit('backtolobby_to_client', { roomname: socket.room, users: lobby.users, username: socket.nickname });
        }

        else {
            io.to(socket.id).emit('disconnect_to_client');
        }
    });


});


