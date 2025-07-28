// server.js
const dotenv = require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectdb = require("./config/db.js");
const userRoutes = require('./routes/userRoutes.js');
const chatRoutes = require('./routes/chatRoutes.js');
const messageRoutes = require('./routes/messageRoutes.js');
const { notFound, errorHandler } = require('./middleware/errorMiddleware.js');

const app = express();
app.use(express.json());
app.use(cors());
connectdb();

app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);
app.get('/', (req, res) => res.send('API is working'));
app.use(notFound);
app.use(errorHandler);

const server = app.listen(process.env.PORT || 5000, () =>
  console.log(`🚀 Server running on PORT ${process.env.PORT || 5000}`)
);

const io = require('socket.io')(server, {
  pingTimeout: 60000,
  cors: { origin: "http://localhost:3000" },
});

io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    console.log("✅ User room joined:", userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (roomId) => {
    socket.join(roomId);
    console.log(`🧑 ${socket.id} joined chat room: ${roomId}`);
  });

  socket.on("typing", (roomId) => {
    socket.to(roomId).emit("typing");
  });

  socket.on("stop typing", (roomId) => {
    socket.to(roomId).emit("stop typing");
  });

 socket.on("new message", (newMessage) => {
  const chat = newMessage.chat;
  if (!chat?.users) {
    return console.log("❌ chat.users not defined");
  }

  console.log("🆕 New message event for chat:", chat._id);
  console.log("👥 Chat users:", chat.users.map(u => u._id));
  console.log("🧑 Sender:", newMessage.sender._id);

  chat.users.forEach((u) => {
    if (u._id === newMessage.sender._id) {
      console.log(`⏭️ Skipping sender: ${u._id}`);
      return;
    }
    console.log(`📨 Emitting new message to user: ${u._id}`);
    socket.to(u._id).emit("new message", newMessage);
  });

  console.log(`✅ New message sent to chat: ${chat._id}`);
});

});
  