const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use('/api/', limiter);

// MongoDB Connection
mongoose.connect(
  process.env.MONGODB_URI || 'mongodb://localhost:27017/planboard'
)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));
// Models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  boardId: { type: String, required: true, index: true },
  role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'editor' },
  color: { type: String, required: true },
  socketId: { type: String },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const BoardSchema = new mongoose.Schema({
  boardId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  canvasData: { type: String }, // Base64 encoded canvas
  drawingHistory: [{ type: String }],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const DrawingSchema = new mongoose.Schema({
  boardId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  action: { type: String, required: true }, // 'draw', 'clear', 'undo', etc.
  data: { type: mongoose.Schema.Types.Mixed }, // Drawing data
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Board = mongoose.model('Board', BoardSchema);
const Drawing = mongoose.model('Drawing', DrawingSchema);

// In-memory storage for active sessions
const activeSessions = new Map(); // boardId -> Set of socket IDs
const userCursors = new Map(); // socketId -> cursor data

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Create or join board
app.post('/api/boards/join', async (req, res) => {
  try {
    const { boardName, username, role } = req.body;

    if (!boardName || !username) {
      return res.status(400).json({ error: 'Board name and username required' });
    }

    // Create boardId from name
    const boardId = boardName.toLowerCase().replace(/\s+/g, '-');

    // Check if board exists, create if not
    let board = await Board.findOne({ boardId });
    if (!board) {
      board = new Board({
        boardId,
        name: boardName,
        createdBy: username,
        drawingHistory: []
      });
      await board.save();
    }

    // Generate random color for user
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    res.json({
      success: true,
      board: {
        boardId: board.boardId,
        name: board.name,
        canvasData: board.canvasData
      },
      user: {
        username,
        role: role || 'editor',
        color
      }
    });
  } catch (error) {
    console.error('Error joining board:', error);
    res.status(500).json({ error: 'Failed to join board' });
  }
});

// Get board data
app.get('/api/boards/:boardId', async (req, res) => {
  try {
    const board = await Board.findOne({ boardId: req.params.boardId });
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    res.json(board);
  } catch (error) {
    console.error('Error getting board:', error);
    res.status(500).json({ error: 'Failed to get board' });
  }
});

// Get active users on a board
app.get('/api/boards/:boardId/users', async (req, res) => {
  try {
    const users = await User.find({
      boardId: req.params.boardId,
      lastActive: { $gte: new Date(Date.now() - 30000) } // Active in last 30 seconds
    }).select('-socketId');
    
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('🔌 New connection:', socket.id);

  let currentUser = null;
  let currentBoardId = null;

  // User joins a board
  socket.on('join-board', async (data) => {
    try {
      const { boardId, username, role, color } = data;
      
      currentUser = {
        username,
        role,
        color,
        socketId: socket.id
      };
      currentBoardId = boardId;

      // Save user to database
      await User.findOneAndUpdate(
        { username, boardId },
        { ...currentUser, lastActive: new Date() },
        { upsert: true, new: true }
      );

      // Join Socket.IO room
      socket.join(boardId);

      // Track active session
      if (!activeSessions.has(boardId)) {
        activeSessions.set(boardId, new Set());
      }
      activeSessions.get(boardId).add(socket.id);

      // Get board data
      const board = await Board.findOne({ boardId });
      
      // Notify user
      socket.emit('joined-board', {
        success: true,
        canvasData: board?.canvasData,
        user: currentUser
      });

      // Broadcast to others
      socket.to(boardId).emit('user-joined', {
        username,
        color,
        role
      });

      // Send updated user list to all
      const activeUsers = await getActiveUsers(boardId);
      io.to(boardId).emit('users-update', activeUsers);

      console.log(`✅ ${username} joined board: ${boardId}`);
    } catch (error) {
      console.error('Error joining board:', error);
      socket.emit('error', { message: 'Failed to join board' });
    }
  });

  // Drawing events
  socket.on('draw', async (data) => {
    if (!currentBoardId || !currentUser) return;

    // Broadcast to others in the room
    socket.to(currentBoardId).emit('draw', {
      ...data,
      username: currentUser.username,
      color: currentUser.color
    });

    // Save drawing action
    try {
      await new Drawing({
        boardId: currentBoardId,
        userId: socket.id,
        username: currentUser.username,
        action: 'draw',
        data
      }).save();
    } catch (error) {
      console.error('Error saving drawing:', error);
    }
  });

  // Save canvas state
  socket.on('save-canvas', async (data) => {
    if (!currentBoardId) return;

    try {
      await Board.findOneAndUpdate(
        { boardId: currentBoardId },
        { 
          canvasData: data.canvasData,
          $push: { drawingHistory: data.canvasData },
          updatedAt: new Date()
        }
      );

      // Broadcast to others
      socket.to(currentBoardId).emit('canvas-updated', {
        canvasData: data.canvasData
      });
    } catch (error) {
      console.error('Error saving canvas:', error);
    }
  });

  // Clear board
  socket.on('clear-board', async () => {
    if (!currentBoardId || !currentUser) return;
    if (currentUser.role === 'viewer') return;

    try {
      await Board.findOneAndUpdate(
        { boardId: currentBoardId },
        { 
          canvasData: null,
          drawingHistory: [],
          updatedAt: new Date()
        }
      );

      // Broadcast to everyone including sender
      io.to(currentBoardId).emit('board-cleared', {
        username: currentUser.username
      });

      console.log(`🗑️ Board cleared by ${currentUser.username}`);
    } catch (error) {
      console.error('Error clearing board:', error);
    }
  });

  // Cursor movement
  socket.on('cursor-move', (data) => {
    if (!currentBoardId || !currentUser) return;

    const cursorData = {
      ...data,
      username: currentUser.username,
      color: currentUser.color,
      socketId: socket.id
    };

    userCursors.set(socket.id, cursorData);

    // Broadcast to others
    socket.to(currentBoardId).emit('cursor-update', cursorData);
  });

  // Role change (admin only)
  socket.on('change-role', async (data) => {
    if (!currentBoardId || !currentUser) return;
    if (currentUser.role !== 'admin') return;

    try {
      const { username, newRole } = data;
      
      await User.findOneAndUpdate(
        { username, boardId: currentBoardId },
        { role: newRole }
      );

      // Notify all users
      io.to(currentBoardId).emit('role-changed', {
        username,
        newRole,
        changedBy: currentUser.username
      });

      console.log(`👤 ${currentUser.username} changed ${username}'s role to ${newRole}`);
    } catch (error) {
      console.error('Error changing role:', error);
    }
  });

  // Heartbeat for keeping user active
  socket.on('heartbeat', async () => {
    if (!currentUser || !currentBoardId) return;

    try {
      await User.findOneAndUpdate(
        { username: currentUser.username, boardId: currentBoardId },
        { lastActive: new Date() }
      );
    } catch (error) {
      console.error('Error updating heartbeat:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log('🔌 Disconnected:', socket.id);

    if (currentBoardId && currentUser) {
      // Remove from active sessions
      const sessions = activeSessions.get(currentBoardId);
      if (sessions) {
        sessions.delete(socket.id);
        if (sessions.size === 0) {
          activeSessions.delete(currentBoardId);
        }
      }

      // Remove cursor
      userCursors.delete(socket.id);

      // Update user in database
      try {
        await User.findOneAndUpdate(
          { username: currentUser.username, boardId: currentBoardId },
          { socketId: null, lastActive: new Date() }
        );
      } catch (error) {
        console.error('Error updating user on disconnect:', error);
      }

      // Notify others
      socket.to(currentBoardId).emit('user-left', {
        username: currentUser.username
      });

      // Send updated user list
      const activeUsers = await getActiveUsers(currentBoardId);
      io.to(currentBoardId).emit('users-update', activeUsers);
    }
  });
});

// Helper function to get active users
async function getActiveUsers(boardId) {
  try {
    const users = await User.find({
      boardId,
      lastActive: { $gte: new Date(Date.now() - 30000) }
    }).select('username role color lastActive');
    
    return users;
  } catch (error) {
    console.error('Error getting active users:', error);
    return [];
  }
}

// Cleanup inactive users periodically
setInterval(async () => {
  try {
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    await User.deleteMany({ lastActive: { $lt: thirtySecondsAgo } });
  } catch (error) {
    console.error('Error cleaning up inactive users:', error);
  }
}, 60000); // Run every minute

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 PlanBoard server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };