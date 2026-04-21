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

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

// ─── Socket.io Real-time Logic ───────────────────────────────────────────────
const boardRooms = new Map(); // boardId → { elements, cursors, users, messages }
const globalUsers = new Map(); // socket.id → { id, name, color, location }

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

  // ── Global App Presence ───────────────────────────────────────────────────
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

  // ── Workspace Broadcasts ──────────────────────────────────────────────────
  socket.on('workspace-board-created', (board) => {
    socket.broadcast.emit('notif-board-created', board);
  });

  socket.on('workspace-board-deleted', (boardId) => {
    socket.broadcast.emit('notif-board-deleted', boardId);
  });

  // ── Board Settings & Sync ────────────────────────────────────────────────
  socket.on('board-theme-update', ({ boardId, theme }) => {
    const room = getRoom(boardId);
    room.theme = theme;
    socket.to(boardId).emit('board-theme-updated', theme);
  });

  // ── Join Board Room ──────────────────────────────────────────────────────
  socket.on('join-board', ({ boardId, user }) => {
    socket.join(boardId);
    socket.boardId = boardId;
    socket.userData = user;

    const room = getRoom(boardId);

    // Update location in global presence
    const gUser = globalUsers.get(socket.id);
    if (gUser) {
      gUser.location = `board:${boardId}`;
      broadcastGlobalPresence();
    }

    // Add user to room
    const existing = room.users.find((u) => u.id === user.id);
    if (!existing) {
      room.users.push({ id: user.id, name: user.name, color: user.color || '#6366f1' });
    }

    // Send current state to newly joined user
    socket.emit('board-state', { 
      elements: room.elements, 
      users: room.users, 
      messages: room.messages,
      theme: room.theme || 'white'
    });

    // Notify others in the board
    socket.to(boardId).emit('user-joined', {
      user: { id: user.id, name: user.name, color: user.color || '#6366f1' },
      users: room.users,
    });
  });

  // ── Chat Messages & Reactions ────────────────────────────────────────────
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

  socket.on('message-react', ({ boardId, messageId, emoji, userId }) => {
    const room = getRoom(boardId);
    const msg = room.messages.find(m => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
      
      const idx = msg.reactions[emoji].indexOf(userId);
      if (idx === -1) msg.reactions[emoji].push(userId);
      else msg.reactions[emoji].splice(idx, 1);
      
      io.to(boardId).emit('message-reacted', { messageId, reactions: msg.reactions });
    }
  });

  socket.on('chat-typing', ({ boardId, user }) => {
    socket.to(boardId).emit('user-typing', user);
  });

  socket.on('chat-stop-typing', ({ boardId, userId }) => {
    socket.to(boardId).emit('user-stop-typing', userId);
  });

  // ── Drawing / Canvas Updates ─────────────────────────────────────────────
  socket.on('element-add', ({ boardId, element }) => {
    const room = getRoom(boardId);
    room.elements.push(element);
    socket.to(boardId).emit('element-added', element);
  });

  socket.on('element-update', ({ boardId, element }) => {
    const room = getRoom(boardId);
    const idx = room.elements.findIndex((e) => e.id === element.id);
    if (idx !== -1) room.elements[idx] = element;
    else room.elements.push(element);
    socket.to(boardId).emit('element-updated', element);
  });

  socket.on('element-delete', ({ boardId, elementId }) => {
    const room = getRoom(boardId);
    room.elements = room.elements.filter((e) => e.id !== elementId);
    socket.to(boardId).emit('element-deleted', elementId);
  });

  socket.on('board-clear', ({ boardId }) => {
    const room = getRoom(boardId);
    room.elements = [];
    io.to(boardId).emit('board-cleared');
  });

  // ── Undo / Redo: full element state replace ──────────────────────────────
  socket.on('board-replace', ({ boardId, elements }) => {
    const room = getRoom(boardId);
    room.elements = elements;
    socket.to(boardId).emit('board-replaced', { elements });
  });

  // ── Cursor Sync ──────────────────────────────────────────────────────────
  socket.on('cursor-move', ({ boardId, cursor }) => {
    const room = getRoom(boardId);
    room.cursors[socket.id] = cursor;
    socket.to(boardId).emit('cursor-moved', { socketId: socket.id, cursor });
  });

  // ── Sticky Notes ─────────────────────────────────────────────────────────
  socket.on('sticky-add', ({ boardId, sticky }) => {
    const room = getRoom(boardId);
    room.elements.push({ ...sticky, type: 'sticky' });
    socket.to(boardId).emit('sticky-added', sticky);
  });

  socket.on('sticky-move', ({ boardId, id, x, y }) => {
    const room = getRoom(boardId);
    const el = room.elements.find((e) => e.id === id);
    if (el) { el.x = x; el.y = y; }
    socket.to(boardId).emit('sticky-moved', { id, x, y });
  });

  socket.on('sticky-update', ({ boardId, sticky }) => {
    const room = getRoom(boardId);
    const idx = room.elements.findIndex((e) => e.id === sticky.id);
    if (idx !== -1) room.elements[idx] = sticky;
    socket.to(boardId).emit('sticky-updated', sticky);
  });

  socket.on('sticky-delete', ({ boardId, id }) => {
    const room = getRoom(boardId);
    room.elements = room.elements.filter((e) => e.id !== id);
    socket.to(boardId).emit('sticky-deleted', id);
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { boardId, userData } = socket;
    
    // Cleanup global presence
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

// ─── MongoDB + Server Start ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[DB] MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`[Server] Running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('[DB] Connection error:', err));
