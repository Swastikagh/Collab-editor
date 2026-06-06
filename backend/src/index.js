const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const executeRoutes = require('./routes/executeRoutes');
const setupSocket = require('./socket/socketHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ── HTTP SERVER ───────────────────────────────────────────────
// We wrap Express in a raw HTTP server because Socket.io needs
// to attach to the same server (not just the Express app)
const server = http.createServer(app);

// ── SOCKET.IO SERVER ──────────────────────────────────────────
// Socket.io attaches to the HTTP server and handles WebSocket connections
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ── REST API ROUTES ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms', executeRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running!', timestamp: new Date() });
});

// ── WEBSOCKET SETUP ───────────────────────────────────────────
setupSocket(io);

// ── START SERVER ──────────────────────────────────────────────
// Important: use server.listen (not app.listen)
// app.listen creates its OWN http server — Socket.io wouldn't attach
server.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────┐
  │   Collab Editor Backend Running     │
  │   HTTP  → http://localhost:${PORT}      │
  │   WS    → ws://localhost:${PORT}        │
  └─────────────────────────────────────┘
  `);
});
