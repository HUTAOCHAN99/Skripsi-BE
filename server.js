const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

console.log('=================================');
console.log('🚀 Starting Skripsi Backend Server');
console.log('=================================');
console.log(`📦 PORT: ${PORT}`);
console.log(`☁️  Environment: ${process.env.K_SERVICE ? 'Cloud Run' : 'Local'}`);

// ============ DATABASE URL CONFIGURATION FOR CLOUD RUN ============
if (process.env.K_SERVICE) {
  const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME || 'angelic-bee-477417-t8:asia-southeast2:skripsi-db';
  const databaseUrl = `postgresql://postgres:Skripsi2026!@/skripsi_db?host=/cloudsql/${connectionName}`;
  process.env.DATABASE_URL = databaseUrl;
  console.log('✅ DATABASE_URL configured for Cloud Run');
  console.log(`🔗 Connection: /cloudsql/${connectionName}`);
}

// ============ INITIALIZE PRISMA ============
let prisma;
try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  console.log('✅ Prisma Client initialized');
} catch (error) {
  console.error('❌ Prisma Client init failed:', error.message);
  process.exit(1);
}

// ============ MIDDLEWARE ============
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://your-frontend-url.a.run.app', 'http://localhost:3000']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ HELPER FUNCTIONS ============
const generateToken = (userId, role) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
  return jwt.verify(token, JWT_SECRET);
};

// ============ AUTHENTICATION MIDDLEWARE ============
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    
    next();
  };
};

// ============ HEALTH CHECKS ============
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;
  
  try {
    if (prisma) {
      await prisma.$queryRaw`SELECT 1 as connected`;
      dbStatus = 'connected';
    }
  } catch (error) {
    dbError = error.message;
    console.error('Health check DB error:', error);
  }
  
  res.json({
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      error: dbError
    },
    platform: process.env.K_SERVICE ? 'Cloud Run' : 'Local',
    uptime: process.uptime()
  });
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

// ============ DATABASE TEST ENDPOINT ============
app.get('/db-test', async (req, res) => {
  if (!prisma) {
    return res.status(500).json({ error: 'Prisma not initialized' });
  }
  
  try {
    // Test basic query
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as postgres_version`;
    
    // Try to count users
    let userCount = 0;
    try {
      userCount = await prisma.user.count();
    } catch (e) {
      // Table might not exist yet
      userCount = -1;
    }
    
    res.json({
      success: true,
      database: 'connected',
      currentTime: result[0].current_time,
      postgresVersion: result[0].postgres_version,
      userCount: userCount,
      tables: {
        hasUserTable: userCount !== -1
      }
    });
  } catch (error) {
    console.error('DB Test Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// ============ AUTH ENDPOINTS ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role, nama, nim, angkatan, nip, bidangKeahlian } = req.body;
    
    if (!prisma) throw new Error('Database not ready');
    
    // Check existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'MAHASISWA'
      }
    });
    
    // Create profile based on role
    if (role === 'MAHASISWA') {
      await prisma.mahasiswa.create({
        data: {
          userId: user.id,
          nama,
          nim,
          angkatan: parseInt(angkatan)
        }
      });
    } else if (role === 'DOSEN') {
      await prisma.dosen.create({
        data: {
          userId: user.id,
          nama,
          nip,
          bidangKeahlian
        }
      });
    }
    
    const token = generateToken(user.id, user.role);
    
    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: { token, user: { id: user.id, email: user.email, role: user.role } }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!prisma) throw new Error('Database not ready');
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    
    const token = generateToken(user.id, user.role);
    
    let profile = null;
    if (user.role === 'MAHASISWA') {
      profile = await prisma.mahasiswa.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'DOSEN') {
      profile = await prisma.dosen.findUnique({ where: { userId: user.id } });
    }
    
    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    let profile = null;
    if (user.role === 'MAHASISWA') {
      profile = await prisma.mahasiswa.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'DOSEN') {
      profile = await prisma.dosen.findUnique({ where: { userId: user.id } });
    }
    
    res.json({
      success: true,
      data: { user, profile }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ DOSEN ENDPOINTS ============
app.get('/api/dosen', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const dosen = await prisma.dosen.findMany({
      include: {
        user: {
          select: { email: true }
        }
      }
    });
    
    res.json({ success: true, data: dosen });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/dosen/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const dosen = await prisma.dosen.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } }
      }
    });
    
    if (!dosen) {
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }
    
    res.json({ success: true, data: dosen });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/dosen', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { email, password, nama, nip, bidangKeahlian, kuota } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'DOSEN'
      }
    });
    
    const dosen = await prisma.dosen.create({
      data: {
        userId: user.id,
        nama,
        nip,
        bidangKeahlian,
        kuota: kuota || 5
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Dosen berhasil ditambahkan',
      data: dosen
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/dosen/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, bidangKeahlian, kuota, noTelp } = req.body;
    
    const dosen = await prisma.dosen.update({
      where: { id },
      data: { nama, bidangKeahlian, kuota, noTelp }
    });
    
    res.json({
      success: true,
      message: 'Data dosen berhasil diupdate',
      data: dosen
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/dosen/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const dosen = await prisma.dosen.findUnique({ where: { id } });
    if (!dosen) {
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }
    
    await prisma.user.delete({ where: { id: dosen.userId } });
    
    res.json({ success: true, message: 'Dosen berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ PENGADUAN JUDUL ENDPOINTS ============
app.post('/api/pengajuan', authenticate, authorize('MAHASISWA'), async (req, res) => {
  try {
    const { judul, abstrak } = req.body;
    const userId = req.user.userId;
    
    const mahasiswa = await prisma.mahasiswa.findUnique({ where: { userId } });
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    const pengajuan = await prisma.pengajuanJudul.create({
      data: {
        mahasiswaId: mahasiswa.id,
        judul,
        abstrak
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Pengajuan judul berhasil',
      data: pengajuan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/pengajuan/me', authenticate, authorize('MAHASISWA'), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const mahasiswa = await prisma.mahasiswa.findUnique({ where: { userId } });
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    const pengajuan = await prisma.pengajuanJudul.findMany({
      where: { mahasiswaId: mahasiswa.id },
      include: { dosenPembimbing: true }
    });
    
    res.json({ success: true, data: pengajuan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/pengajuan', authenticate, authorize('ADMIN', 'DOSEN'), async (req, res) => {
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
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/pengajuan/:id/approve', authenticate, authorize('ADMIN', 'DOSEN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { dosenPembimbingId, catatan } = req.body;
    
    const pengajuan = await prisma.pengajuanJudul.update({
      where: { id },
      data: {
        status: 'APPROVED',
        dosenPembimbingId,
        catatan,
        tglApproved: new Date()
      }
    });
    
    if (dosenPembimbingId) {
      await prisma.dosen.update({
        where: { id: dosenPembimbingId },
        data: { terisi: { increment: 1 } }
      });
    }
    
    res.json({ success: true, message: 'Pengajuan disetujui', data: pengajuan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/pengajuan/:id/reject', authenticate, authorize('ADMIN', 'DOSEN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { catatan } = req.body;
    
    const pengajuan = await prisma.pengajuanJudul.update({
      where: { id },
      data: { status: 'REJECTED', catatan }
    });
    
    res.json({ success: true, message: 'Pengajuan ditolak', data: pengajuan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ BIMBINGAN ENDPOINTS ============
app.post('/api/bimbingan', authenticate, authorize('DOSEN'), async (req, res) => {
  try {
    const { mahasiswaId, topik, catatan, tanggal } = req.body;
    const userId = req.user.userId;
    
    const dosen = await prisma.dosen.findUnique({ where: { userId } });
    if (!dosen) {
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }
    
    const count = await prisma.logBimbingan.count({ where: { mahasiswaId } });
    
    const log = await prisma.logBimbingan.create({
      data: {
        mahasiswaId,
        dosenId: dosen.id,
        pertemuanKe: count + 1,
        tanggal: new Date(tanggal),
        topik,
        catatan,
        status: 'PENDING'
      }
    });
    
    res.status(201).json({ success: true, message: 'Log bimbingan berhasil ditambahkan', data: log });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/bimbingan/me', authenticate, authorize('MAHASISWA'), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const mahasiswa = await prisma.mahasiswa.findUnique({ where: { userId } });
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    const logs = await prisma.logBimbingan.findMany({
      where: { mahasiswaId: mahasiswa.id },
      include: { dosen: true },
      orderBy: { tanggal: 'desc' }
    });
    
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/bimbingan/:id/approve', authenticate, authorize('DOSEN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await prisma.logBimbingan.update({
      where: { id },
      data: { status: 'APPROVED' }
    });
    
    res.json({ success: true, message: 'Log bimbingan disetujui', data: log });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/bimbingan/:id/reject', authenticate, authorize('DOSEN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await prisma.logBimbingan.update({
      where: { id },
      data: { status: 'REJECTED' }
    });
    
    res.json({ success: true, message: 'Log bimbingan ditolak', data: log });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ SIDANG ENDPOINTS ============
app.post('/api/sidang', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { mahasiswaId, dosenPembimbingId, dosenPengujiId, tanggal, jam, ruang } = req.body;
    
    const jadwal = await prisma.jadwalSidang.create({
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
    
    res.status(201).json({ success: true, message: 'Jadwal sidang berhasil dibuat', data: jadwal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sidang', authenticate, authorize('ADMIN', 'DOSEN'), async (req, res) => {
  try {
    const jadwal = await prisma.jadwalSidang.findMany({
      include: {
        mahasiswa: true,
        dosenPembimbing: true,
        dosenPenguji: true
      },
      orderBy: { tanggal: 'asc' }
    });
    
    res.json({ success: true, data: jadwal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sidang/me', authenticate, authorize('MAHASISWA'), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const mahasiswa = await prisma.mahasiswa.findUnique({ where: { userId } });
    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }
    
    const jadwal = await prisma.jadwalSidang.findUnique({
      where: { mahasiswaId: mahasiswa.id },
      include: {
        dosenPembimbing: true,
        dosenPenguji: true
      }
    });
    
    res.json({ success: true, data: jadwal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ROOT ENDPOINT ============
app.get('/', (req, res) => {
  res.json({
    message: 'Skripsi TA System API',
    status: 'running',
    version: '1.0.0',
    platform: process.env.K_SERVICE ? 'Cloud Run' : 'Local',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: 'GET /health',
      dbTest: 'GET /db-test',
      auth: 'POST /api/auth/login, POST /api/auth/register, GET /api/auth/me',
      dosen: 'GET/POST/PUT/DELETE /api/dosen',
      pengajuan: 'GET/POST /api/pengajuan',
      bimbingan: 'GET/POST /api/bimbingan',
      sidang: 'GET/POST /api/sidang'
    }
  });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============ START SERVER ============
async function startServer() {
  try {
    // Test database connection
    if (prisma) {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      
      // Run a test query
      const result = await prisma.$queryRaw`SELECT NOW() as time`;
      console.log(`📅 Database time: ${result[0].time}`);
    } else {
      throw new Error('Prisma client not initialized');
    }
    
    // Start HTTP server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n=================================`);
      console.log(`✅ Server successfully started!`);
      console.log(`=================================`);
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📍 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`📍 DB Test: http://0.0.0.0:${PORT}/db-test`);
      console.log(`🌍 Environment: ${process.env.K_SERVICE ? 'Cloud Run' : 'Local'}`);
      console.log(`=================================\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully...');
  if (prisma) {
    await prisma.$disconnect();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing gracefully...');
  if (prisma) {
    await prisma.$disconnect();
  }
  process.exit(0);
});

// Start the server
startServer();