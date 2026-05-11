import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import prisma from './config/database.js';  // ✅ Added .js
import { errorHandler } from './middleware/errorHandler.js';  // ✅ Added .js

// Routes
import authRoutes from './routes/authRoutes.js';  // ✅ Added .js
import pengajuanRoutes from './routes/pengajuanRoutes.js';  // ✅ Added .js
import bimbinganRoutes from './routes/bimbinganRoutes.js';  // ✅ Added .js
import sidangRoutes from './routes/sidangRoutes.js';  // ✅ Added .js
import dosenRoutes from './routes/dosenRoutes.js';  // ✅ Added .js

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://your-frontend-url.a.run.app']
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://your-frontend-url.a.run.app']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pengajuan', pengajuanRoutes);
app.use('/api/bimbingan', bimbinganRoutes);
app.use('/api/sidang', sidangRoutes);
app.use('/api/dosen', dosenRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Skripsi TA System API' });
});

// Error handler
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0'; // Required for Cloud Run

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // ✅ FIX: Dynamic import for Redis with .js extension
    try {
      const redisModule = await import('./config/redis.js');
      const redisClient = redisModule.default;
      await redisClient.connect();
      console.log('✅ Redis connected');
    } catch (redisError) {
      console.warn('⚠️ Redis not available, continuing without Redis:', redisError);
    }
    
    httpServer.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`📝 API available at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };