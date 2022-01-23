const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./helpers/formatDate')
const {
    getActiveUser,
    exitRoom,
    newUser,
    getIndividualRoomUsers
} = require('./helpers/userHelper');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set public directory
app.use(express.static(path.join(__dirname, 'public')));

// First we create an Expres server then use it to initialize
// a socket.io server.

// this block will run when the client connects.
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = newUser(socket.id, username, room);

        socket.join(user.room);

        // General welcome message
        socket.emit('message', formatMessage("Chat", 'Messages are limited to this room! '));

        // Broadcast everytime users connects
        socket.broadcast
            .to(user.room)
            .emit(
                'message',
                formatMessage("Chat", `${user.username} has joined the room`)
            );

        // Current active users and room name
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getIndividualRoomUsers(user.room)
        });
    });

    // With the socket server instance initialized, we can now emit
    // and listen to events between the server and client. In our 
    // code, we started by listening to a joinRoom event from the client. 

    // This event handles the following:
    //1. A new client joining a room
    //2. The general message broadcasted when new users connect
    //3. Current users in a room
    socket.on('chatMessage', msg => {
        const user = getActiveUser(socket.id);

        // Next, the server listens for the client messages. Here, 
        // the server emits the client message to the current room.
        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    // Runs when client disconnects
    socket.on('disconnect', () => {
        const user = exitRoom(socket.id);

        if (user) {
            io.to(user.room).emit(
                'message',
                formatMessage("Chat", `${user.username} has left the room`)
            );

            // Current active users and room name
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getIndividualRoomUsers(user.room)
            });
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));