require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/boards');
const assignmentRoutes = require('./routes/assignments');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);

// ✅ CORS setup (IMPORTANT)
const CLIENT_URL = process.env.CLIENT_URL || "*";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

// ─── Socket.io Logic ─────────────────────────────────────────
const boardRooms = new Map();
const globalUsers = new Map();

function getRoom(boardId) {
  if (!boardRooms.has(boardId)) {
    boardRooms.set(boardId, { elements: [], cursors: {}, users: [], messages: [] });
  }
  return boardRooms.get(boardId);
}

function broadcastGlobalPresence() {
  io.emit('global-presence-update', Array.from(globalUsers.values()));
}

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('app-presence-start', ({ user, location = 'dashboard' }) => {
    globalUsers.set(socket.id, { ...user, location });
    broadcastGlobalPresence();
  });

  socket.on('app-location-update', ({ location }) => {
    const data = globalUsers.get(socket.id);
    if (data) {
      data.location = location;
      broadcastGlobalPresence();
    }
  });

  socket.on('workspace-board-created', (board) => {
    socket.broadcast.emit('notif-board-created', board);
  });

  socket.on('workspace-board-deleted', (boardId) => {
    socket.broadcast.emit('notif-board-deleted', boardId);
  });

  socket.on('join-board', ({ boardId, user }) => {
    socket.join(boardId);
    socket.boardId = boardId;
    socket.userData = user;

    const room = getRoom(boardId);

    const gUser = globalUsers.get(socket.id);
    if (gUser) {
      gUser.location = `board:${boardId}`;
      broadcastGlobalPresence();
    }

    const existing = room.users.find((u) => u.id === user.id);
    if (!existing) {
      room.users.push({ id: user.id, name: user.name, color: user.color || '#6366f1' });
    }

    socket.emit('board-state', {
      elements: room.elements,
      users: room.users,
      messages: room.messages,
      theme: room.theme || 'white'
    });

    socket.to(boardId).emit('user-joined', {
      user: { id: user.id, name: user.name, color: user.color || '#6366f1' },
      users: room.users,
    });
  });

  socket.on('message-send', ({ boardId, message }) => {
    const room = getRoom(boardId);
    const msg = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      reactions: {}
    };
    room.messages.push(msg);
    if (room.messages.length > 50) room.messages.shift();
    io.to(boardId).emit('message-received', msg);
  });

  socket.on('element-add', ({ boardId, element }) => {
    const room = getRoom(boardId);
    room.elements.push(element);
    socket.to(boardId).emit('element-added', element);
  });

  socket.on('disconnect', () => {
    const { boardId, userData } = socket;

    globalUsers.delete(socket.id);
    broadcastGlobalPresence();

    if (boardId && userData) {
      const room = getRoom(boardId);
      room.users = room.users.filter((u) => u.id !== userData.id);
      delete room.cursors[socket.id];
      socket.to(boardId).emit('user-left', { userId: userData.id, users: room.users });
    }

    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// ─── DB + Server Start ───────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[DB] MongoDB connected');
    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('[DB] Connection error:', err));