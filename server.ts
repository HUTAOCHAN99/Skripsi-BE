import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

console.log('=================================');
console.log('🚀 Starting Skripsi Backend Server');
console.log('=================================');
console.log(`📦 PORT: ${PORT}`);
console.log(`📦 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Setup database untuk Cloud Run
if (process.env.K_SERVICE) {
  const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
  if (connectionName) {
    const databaseUrl = `postgresql://postgres:Skripsi2026!@/skripsi_db?host=/cloudsql/${connectionName}`;
    process.env.DATABASE_URL = databaseUrl;
    console.log('✅ Cloud SQL configured');
  }
}

// Prisma Client
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (sederhana dulu)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/db-test', async (req, res) => {
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT NOW() as time`;
    res.json({ success: true, time: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Skripsi API Running', 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Start server - HARUS listen di 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`📍 Health: http://0.0.0.0:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing...');
  await prisma.$disconnect();
  process.exit(0);
});