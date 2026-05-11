require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// ============ DATABASE CONNECTION FIX FOR CLOUD RUN ============
let databaseUrl = process.env.DATABASE_URL;

// Cek apakah berjalan di Cloud Run
if (process.env.K_SERVICE) {
  const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
  if (connectionName) {
    // ✅ FORMAT EKSPLISIT UNTUK UNIX SOCKET (TERBUKTI BERHASIL)
    // Format: postgresql://USER:PASSWORD@/DATABASE?host=/path/to/socket
    const user = 'postgres';
    const password = 'Skripsi2026!';
    const database = 'skripsi_db';
    const socketPath = `/cloudsql/${connectionName}`;
    
    databaseUrl = `postgresql://${user}:${password}@/${database}?host=${socketPath}&schema=public`;
    
    console.log('✅ Running on Cloud Run');
    console.log(`📍 Connection Name: ${connectionName}`);
    console.log(`📍 Socket Path: ${socketPath}`);
    console.log(`📍 Database URL format: postgresql://${user}:****@/${database}?host=${socketPath}`);
  } else {
    console.error('❌ CLOUD_SQL_CONNECTION_NAME environment variable is missing!');
    process.exit(1);
  }
} else {
  console.log('📍 Running locally');
  if (!databaseUrl) {
    databaseUrl = 'postgresql://postgres:Skripsi2026!@localhost:5432/skripsi_db?schema=public';
  }
}

console.log(`📍 Database: ${databaseUrl ? 'configured' : 'MISSING'}`);

// Inisialisasi Prisma Client dengan URL yang sudah benar
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// ============ TEST DATABASE CONNECTION ============
async function testDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// ============ MIDDLEWARE ============
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ HEALTH CHECKS ============
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK', 
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      platform: process.env.K_SERVICE ? 'Cloud Run' : 'Local'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'skripsi-backend',
    timestamp: new Date().toISOString() 
  });
});

// ============ ROOT ENDPOINT ============
app.get('/', (req, res) => {
  res.json({ 
    message: 'Skripsi TA System API', 
    status: 'running',
    version: '1.0.0',
    platform: process.env.K_SERVICE ? 'Cloud Run' : 'Local',
    endpoints: [
      'GET /health',
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/mahasiswa',
      'GET /api/dosen',
      'GET /api/pengajuan',
      'POST /api/pengajuan',
      'GET /api/bimbingan',
      'GET /api/sidang'
    ]
  });
});

// ============ AUTH ENDPOINTS ============
app.post('/api/auth/login', async (req, res) => {
  console.log('📝 Login request:', req.body);
  const { email, password } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  
  try {
    // Cari user di database
    let user = await prisma.user.findUnique({
      where: { email }
    });
    
    // Jika belum ada, buat baru (for demo)
    if (!user) {
      console.log('📝 Creating new user:', email);
      user = await prisma.user.create({
        data: {
          email,
          password: password || 'dummy-password',
          role: email.includes('dosen') ? 'DOSEN' : 'MAHASISWA'
        }
      });
      
      // Buat profile sesuai role
      if (user.role === 'MAHASISWA') {
        await prisma.mahasiswa.create({
          data: {
            userId: user.id,
            nama: email.split('@')[0],
            nim: '202101001',
            angkatan: 2021
          }
        });
        console.log('✅ Mahasiswa profile created');
      } else if (user.role === 'DOSEN') {
        await prisma.dosen.create({
          data: {
            userId: user.id,
            nama: email.split('@')[0],
            nip: '197501011998021001',
            bidangKeahlian: 'Teknik Informatika',
            kuota: 5,
            terisi: 0
          }
        });
        console.log('✅ Dosen profile created');
      }
    }
    
    // Generate token sederhana
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Database connection issue'
    });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const userId = Buffer.from(token, 'base64').toString().split(':')[0];
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    let profile = null;
    if (user.role === 'MAHASISWA') {
      profile = await prisma.mahasiswa.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'DOSEN') {
      profile = await prisma.dosen.findUnique({ where: { userId: user.id } });
    }
    
    res.json({ success: true, data: { user, profile } });
  } catch (error) {
    console.error('❌ Auth me error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ MAHASISWA ENDPOINTS ============
app.get('/api/mahasiswa', async (req, res) => {
  try {
    const mahasiswa = await prisma.mahasiswa.findMany({
      include: { user: { select: { email: true } } }
    });
    res.json({ success: true, data: mahasiswa });
  } catch (error) {
    console.error('❌ Get mahasiswa error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/mahasiswa/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { id },
      include: { user: { select: { email: true } } }
    });
    if (!mahasiswa) {
      return res.status(404).json({ success: false, error: 'Mahasiswa not found' });
    }
    res.json({ success: true, data: mahasiswa });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ DOSEN ENDPOINTS ============
app.get('/api/dosen', async (req, res) => {
  try {
    const dosen = await prisma.dosen.findMany({
      include: { user: { select: { email: true } } }
    });
    res.json({ success: true, data: dosen });
  } catch (error) {
    console.error('❌ Get dosen error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dosen/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dosen = await prisma.dosen.findUnique({
      where: { id },
      include: { user: { select: { email: true } }, pembimbing: true }
    });
    if (!dosen) {
      return res.status(404).json({ success: false, error: 'Dosen not found' });
    }
    res.json({ success: true, data: dosen });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ PENGAJUAN JUDUL ENDPOINTS ============
app.get('/api/pengajuan', async (req, res) => {
  try {
    const pengajuan = await prisma.pengajuanJudul.findMany({
      include: {
        mahasiswa: true,
        dosenPembimbing: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: pengajuan });
  } catch (error) {
    console.error('❌ Get pengajuan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/pengajuan', async (req, res) => {
  const { mahasiswaId, judul, abstrak } = req.body;
  
  if (!mahasiswaId || !judul) {
    return res.status(400).json({ success: false, error: 'mahasiswaId and judul are required' });
  }
  
  try {
    const pengajuan = await prisma.pengajuanJudul.create({
      data: {
        mahasiswaId,
        judul,
        abstrak: abstrak || '',
        status: 'PENDING'
      }
    });
    res.status(201).json({ success: true, data: pengajuan });
  } catch (error) {
    console.error('❌ Create pengajuan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/pengajuan/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { dosenPembimbingId, catatan } = req.body;
  
  try {
    const pengajuan = await prisma.pengajuanJudul.update({
      where: { id },
      data: {
        status: 'APPROVED',
        dosenPembimbingId,
        catatan: catatan || '',
        tglApproved: new Date()
      }
    });
    res.json({ success: true, data: pengajuan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/pengajuan/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { catatan } = req.body;
  
  try {
    const pengajuan = await prisma.pengajuanJudul.update({
      where: { id },
      data: {
        status: 'REJECTED',
        catatan: catatan || ''
      }
    });
    res.json({ success: true, data: pengajuan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ BIMBINGAN ENDPOINTS ============
app.get('/api/bimbingan', async (req, res) => {
  try {
    const bimbingan = await prisma.logBimbingan.findMany({
      include: {
        mahasiswa: true,
        dosen: true
      },
      orderBy: { tanggal: 'desc' }
    });
    res.json({ success: true, data: bimbingan });
  } catch (error) {
    console.error('❌ Get bimbingan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bimbingan', async (req, res) => {
  const { mahasiswaId, dosenId, topik, catatan, tanggal, pertemuanKe } = req.body;
  
  try {
    const bimbingan = await prisma.logBimbingan.create({
      data: {
        mahasiswaId,
        dosenId,
        topik,
        catatan,
        tanggal: new Date(tanggal),
        pertemuanKe: pertemuanKe || 1,
        status: 'PENDING'
      }
    });
    res.status(201).json({ success: true, data: bimbingan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/bimbingan/:id/approve', async (req, res) => {
  const { id } = req.params;
  
  try {
    const bimbingan = await prisma.logBimbingan.update({
      where: { id },
      data: { status: 'APPROVED' }
    });
    res.json({ success: true, data: bimbingan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/bimbingan/:id/reject', async (req, res) => {
  const { id } = req.params;
  
  try {
    const bimbingan = await prisma.logBimbingan.update({
      where: { id },
      data: { status: 'REJECTED' }
    });
    res.json({ success: true, data: bimbingan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ JADWAL SIDANG ENDPOINTS ============
app.get('/api/sidang', async (req, res) => {
  try {
    const sidang = await prisma.jadwalSidang.findMany({
      include: {
        mahasiswa: true,
        dosenPembimbing: true,
        dosenPenguji: true
      },
      orderBy: { tanggal: 'asc' }
    });
    res.json({ success: true, data: sidang });
  } catch (error) {
    console.error('❌ Get sidang error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sidang', async (req, res) => {
  const { mahasiswaId, dosenPembimbingId, dosenPengujiId, tanggal, jam, ruang } = req.body;
  
  try {
    const sidang = await prisma.jadwalSidang.create({
      data: {
        mahasiswaId,
        dosenPembimbingId,
        dosenPengujiId,
        tanggal: new Date(tanggal),
        jam,
        ruang,
        status: 'SCHEDULED'
      }
    });
    res.status(201).json({ success: true, data: sidang });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /health',
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/mahasiswa',
      'GET /api/mahasiswa/:id',
      'GET /api/dosen',
      'GET /api/dosen/:id',
      'GET /api/pengajuan',
      'POST /api/pengajuan',
      'PUT /api/pengajuan/:id/approve',
      'PUT /api/pengajuan/:id/reject',
      'GET /api/bimbingan',
      'POST /api/bimbingan',
      'PUT /api/bimbingan/:id/approve',
      'PUT /api/bimbingan/:id/reject',
      'GET /api/sidang',
      'POST /api/sidang'
    ]
  });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// ============ START SERVER ============
async function startServer() {
  // Test database connection first
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected && process.env.K_SERVICE) {
    console.error('❌ Cannot start: Database not connected');
    process.exit(1);
  }
  
  app.listen(PORT, HOST, () => {
    console.log(`=================================`);
    console.log(`✅ Server running successfully!`);
    console.log(`📍 Host: ${HOST}`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 URL: http://${HOST}:${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Platform: ${process.env.K_SERVICE ? 'Cloud Run' : 'Local'}`);
    console.log(`=================================`);
  });
}

startServer();

// ============ GRACEFUL SHUTDOWN ============
process.on('SIGTERM', async () => {
  console.log('📝 SIGTERM received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📝 SIGINT received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});