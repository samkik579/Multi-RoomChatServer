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
        let check;
        if (usernames.hasOwnProperty(data["username"])) {
            check = true;
        }

        if (check != null) {
            io.to(socket.room).emit('badinput_to_client'), { username: data.username };
        }
        else {
            socket.nickname = data["username"];
            console.log("c" + socket.nickname);
            usernames[socket.nickname] = socket.id;
            lobby.users.push(data["username"]);
            io.sockets.in(socket.id).emit('username_to_client', { username: socket.nickname, currusers: lobby.users, allrooms: rooms });

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
            io.to(socket.id).emit('room_already_exists_to_client', { roomname: room["newroom"], currroom: socket.room });
        }

        else {
            let newroom = new Roomobject(nroom, room["newroompass"]);
            myroom = newroom;
            rooms.push(newroom);
            newroom.users.push(socket.nickname);
            socket.leave(socket.room);
            socket.join(room["newroom"]);
            socket.room = room["newroom"];
            io.to(room["newroom"]).emit('newroom_to_client', { roomname: room["newroom"], users: newroom.users });
        }
    });

    socket.on('joinroom_to_server', function (room) {
        console.log("joinroom to server recieved " + room["joinroom"]);
        let jroom;
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
                io.to(socket.id).emit('incorrectpassword_to_client', { roomname: socket.room, username: socket.nickname });
            }
            else {
                let oldroom = myroom;
                jroom.users.push(socket.nickname);
                socket.leave(socket.room);
                socket.room = jroom.roomname;
                socket.join(socket.room);
                myroom = jroom;

                io.to(socket.room).emit('joinroom_to_client', { roomname: socket.room, users: jroom.users, username: socket.nickname });
            }
        }

    });

    socket.on('ban_to_server', function (data) {
        console.log("ban to server recieved");
        let banroom = myroom;
        // get current room 
        // for (let i = 0; i < rooms.length; i++) {
        //     if (rooms[i].roomname === socket.room) {
        //         banroom = rooms[i];
        //     }
        // }
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
            myroom = lobby;

            io.to(socketkick.id).emit('kick_to_client', { currentroom: lobby.roomname, users: lobby.users, kickeduser: data["kicked"] });
            // io.to(socketkick.room).emit('kick_to_client'), { data: data["kicked"], roomname: socketkick.roomname, users: currroom.users };
        }
        else {
            console.log("DONT ENTER HERE");
            console.log(data["kicked"] + " is not in " + kickroom);
            io.to(socket.room).emit('badinput_to_client'), { data: data["kicked"], users: kickroom.users, lobby: lobby.users };
        }
    });

    // socket.on('private_to_server', function (data) {
    //     //let from = socket.user;
    //     //now need to check if user is in the same room as them
    //     let check;
    //     for (let b = 0; b < myroom.users.length; b++) {
    //         console.log(r.users[b]);
    //         if (r.users[b] == data["privateuser"]) {
    //             check = true;
    //         }
    //     }

    //     let touserid;
    //     if (check != null) {
    //         console.log("ahhhh");
    //         for (let i = 0; i < usernames.length; ++i) {
    //             if (usernames[i] == data["privateuser"]) {
    //                 touserid = i;
    //                 console.log(touserid);
    //             }
    //         }
    //         io.to(socket.touserid).emit('private_to_client'), { from: socket.nickname, to: data["privateuser"] };
    //     }
    //     else {
    //         io.to(socket.id).emit('badinput_to_client'), { data: data["privateuser"] };
    //     }


    //     //if room does not exist send them to bad input
    // });

    socket.on('private_to_server', function (data) {
        let socketprivate = io.sockets.sockets[usernames[data["privateuser"]]];
        //now need to check if user is in the same room as them
        /* for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].user === room["joinroom"]) {
                jroom = rooms[i];
            }
        } */
        console.log(data["privatemessage"]);
        io.to(socketprivate.id).emit('private_to_client', { from: socket.nickname, to: data["privateuser"], message: data["privatemessage"] });

        //if room does not exist send them to bad input


    });


    // socket.on('disconnect', function () {
    //     let currroom = myroom;
    //     let allusers = myroom.users;
    //     for (let b = 0; b < currroom.users.length; ++b) {
    //         if (socket.nickname == currroom.users[b]) {
    //             delete currroom.users[b];
    //         }
    //     }
    //     delete usernames[socket.id];
    //     io.to(currroom).emit('disconnect_to_client'), { room: currroom, users: allusers, name: socket.nickname };
    //     console.log('message_to_client', socket.id + ' has left the chat');

    socket.on('disconnect', function () {
        let currroom;
        let allusers;
        let nickname = socket.nickname;
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].roomname == socket.id) {
                for (let b = 0; b < rooms[i].users.length; ++b) {
                    if (socket.nickname == rooms[i].users[b]) {
                        currroom = rooms[i];
                        allusers = rooms[i].users;
                        delete rooms[i].users[b];
                    }
                }
            }
        }
        delete usernames[socket.id];
        // io.to(currroom).emit('disconnect_to_client'), { room: currroom, users: allusers, name: nickname };
        console.log('message_to_client', socket.id + ' has left the chat');

    });


});


