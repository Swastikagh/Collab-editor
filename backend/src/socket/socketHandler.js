const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

// Track who is online in each room
// { roomId: { userId: { name, socketId, cursor } } }
const onlineUsers = {};

const setupSocket = (io) => {

  // ── AUTHENTICATE SOCKET CONNECTION ──────────────────────────
  // This runs before any socket connects
  // WebSocket auth works differently from HTTP — token comes in handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // ── JOIN ROOM ──────────────────────────────────────────────
    // When user opens a room, they join a Socket.io "room"
    // A Socket.io room = a group where events are broadcast together
    socket.on('join_room', async ({ roomId, userName }) => {
      socket.join(roomId);

      // Track this user as online in this room
      if (!onlineUsers[roomId]) onlineUsers[roomId] = {};
      onlineUsers[roomId][socket.userId] = {
        name: userName,
        socketId: socket.id
      };

      // Tell everyone in room who is online
      io.to(roomId).emit('online_users', Object.entries(onlineUsers[roomId]).map(
        ([userId, data]) => ({ userId, ...data })
      ));

      console.log(`${userName} joined room ${roomId}`);
    });

    // ── CODE CHANGE ───────────────────────────────────────────
    // When a user types, broadcast the change to all OTHER users in room
    // This is the core of real-time collaboration
    socket.on('code_change', async ({ roomId, fileId, content, userId }) => {
      // Broadcast to everyone in room EXCEPT the sender
      socket.to(roomId).emit('code_update', { fileId, content, userId });

      // Save to database (debounced on client side — only sent every 2s)
      try {
        await prisma.file.update({
          where: { id: fileId },
          data: { content }
        });

        // Save version snapshot every time content is persisted
        await prisma.fileVersion.create({
          data: { fileId, content }
        });
      } catch (err) {
        console.error('Error saving file:', err);
      }
    });

    // ── CURSOR POSITION ───────────────────────────────────────
    // Broadcast where each user's cursor is in the editor
    socket.on('cursor_move', ({ roomId, position, userName }) => {
      socket.to(roomId).emit('cursor_update', {
        userId: socket.userId,
        userName,
        position
      });
    });

    // ── CHAT MESSAGE ──────────────────────────────────────────
    socket.on('send_message', async ({ roomId, content, userName }) => {
      try {
        const message = await prisma.message.create({
          data: {
            content,
            userId: socket.userId,
            roomId
          },
          include: {
            user: { select: { id: true, name: true } }
          }
        });

        // Broadcast to ALL users in room (including sender)
        io.to(roomId).emit('new_message', message);
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      // Remove user from all rooms they were in
      for (const roomId in onlineUsers) {
        if (onlineUsers[roomId][socket.userId]) {
          delete onlineUsers[roomId][socket.userId];

          // Tell remaining users this person left
          io.to(roomId).emit('online_users', Object.entries(onlineUsers[roomId]).map(
            ([userId, data]) => ({ userId, ...data })
          ));
        }
      }
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

module.exports = setupSocket;
