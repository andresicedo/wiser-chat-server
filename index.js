const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const CREDENTIALS = JSON.parse(process.env.CREDENTIALS)
const PROJECT_ID = CREDENTIALS.projectId
const {Translate} = require('@google-cloud/translate').v2;
const translate = new Translate({ projectId: PROJECT_ID });

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on('connect', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if(error) return callback(error);

    socket.join(user.room);

    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the ${user.room} chat`});
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has entered the chat` });

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);
    try {
      async function quickStart() {
        const [translated] = await translate.translate(message, 'es');
        io.to(user.room).emit('message', { user: user.name, text: message, translated });
      }
      quickStart()
    } catch (error) {
      console.log(error)
    }
    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left the chat` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  })
});

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));