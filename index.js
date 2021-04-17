const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const { Translate } = require('@google-cloud/translate').v2;
require('dotenv').config();
const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);
const translate = new Translate({ credentials: CREDENTIALS, projectId: CREDENTIALS.project_id });
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
    if (error) return callback(error);
    socket.join(user.room);
    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the ${user.room} chat` });
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has entered the chat` });
    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    callback();
  });

  socket.on('sendMessage', async (message, callback) => {
    const user = getUser(socket.id);
    try {
      const text = message;
      const target = 'es';
      const [translation] = await translate.translate(text, target);
      io.to(user.room).emit('message', { user: user.name, text: message, translation });
      console.log(translation);
    } catch (error) {
      console.error(error);
    }
    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left the chat` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    }
  })
});

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));