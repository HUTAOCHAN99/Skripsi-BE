import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

const getParamId = (id: string | string[] | undefined): string | null => {
  if (!id) return null;
  return Array.isArray(id) ? id[0] : id;
};

export const createLogBimbingan = async (req: AuthRequest, res: Response) => {
  try {
    const { mahasiswaId, topik, catatan, tanggal } = req.body;
    const userId = req.user?.userId;

    if (!mahasiswaId || !topik || !catatan || !tanggal) {
      return res.status(400).json({ error: 'Mahasiswa, topik, catatan, dan tanggal wajib diisi' });
    }

    const dosen = await prisma.dosen.findUnique({ where: { userId: userId! } });
    if (!dosen) return res.status(404).json({ error: 'Dosen tidak ditemukan' });

    // Dosen hanya boleh membuat log untuk mahasiswa yang sudah di-assign kepadanya.
    const assigned = await prisma.pengajuanJudul.findFirst({
      where: {
        mahasiswaId,
        dosenPembimbingId: dosen.id,
        status: 'APPROVED'
      }
    });

    if (!assigned) {
      return res.status(403).json({ error: 'Mahasiswa ini bukan mahasiswa bimbingan Anda' });
    }

    const count = await prisma.logBimbingan.count({ where: { mahasiswaId, dosenId: dosen.id } });

    const log = await prisma.logBimbingan.create({
      data: {
        mahasiswaId,
        dosenId: dosen.id,
        pertemuanKe: count + 1,
        tanggal: new Date(tanggal),
        topik,
        catatan,
        status: 'APPROVED'
      },
      include: {
        mahasiswa: true,
        dosen: true
      }
    });

    res.status(201).json({ success: true, message: 'Log bimbingan berhasil ditambahkan', data: log });
  } catch (error) {
    console.error('Create log bimbingan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLogBimbinganByMahasiswa = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const mahasiswa = await prisma.mahasiswa.findUnique({ where: { userId: userId! } });
    if (!mahasiswa) return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });

    const logs = await prisma.logBimbingan.findMany({
      where: { mahasiswaId: mahasiswa.id },
      include: { dosen: true, mahasiswa: true },
      orderBy: { tanggal: 'desc' }
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Get bimbingan mahasiswa error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllLogBimbingan = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    let where = {};

    if (userRole === 'DOSEN') {
      const dosen = await prisma.dosen.findUnique({ where: { userId: userId! } });
      if (!dosen) return res.status(404).json({ error: 'Dosen tidak ditemukan' });
      where = { dosenId: dosen.id };
    }
    // ADMIN: where {} → read-only semua log

    const logs = await prisma.logBimbingan.findMany({
      where,
      include: { mahasiswa: true, dosen: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Get all bimbingan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveLogBimbingan = async (req: AuthRequest, res: Response) => {
  try {
    const logId = getParamId(req.params.id);
    if (!logId) return res.status(400).json({ error: 'ID log tidak valid' });

    const dosen = await prisma.dosen.findUnique({ where: { userId: req.user?.userId! } });
    if (!dosen) return res.status(404).json({ error: 'Dosen tidak ditemukan' });

    const existing = await prisma.logBimbingan.findFirst({ where: { id: logId, dosenId: dosen.id } });
    if (!existing) {
      return res.status(403).json({ error: 'Anda tidak berwenang memproses log bimbingan ini' });
    }

    const log = await prisma.logBimbingan.update({
      where: { id: logId },
      data: { status: 'APPROVED' },
      include: { mahasiswa: true, dosen: true }
    });

    res.json({ success: true, message: 'Log bimbingan disetujui', data: log });
  } catch (error) {
    console.error('Approve bimbingan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectLogBimbingan = async (req: AuthRequest, res: Response) => {
  try {
    const logId = getParamId(req.params.id);
    if (!logId) return res.status(400).json({ error: 'ID log tidak valid' });

    const dosen = await prisma.dosen.findUnique({ where: { userId: req.user?.userId! } });
    if (!dosen) return res.status(404).json({ error: 'Dosen tidak ditemukan' });

    const existing = await prisma.logBimbingan.findFirst({ where: { id: logId, dosenId: dosen.id } });
    if (!existing) {
      return res.status(403).json({ error: 'Anda tidak berwenang memproses log bimbingan ini' });
    }

    const log = await prisma.logBimbingan.update({
      where: { id: logId },
      data: { status: 'REJECTED' },
      include: { mahasiswa: true, dosen: true }
    });

    res.json({ success: true, message: 'Log bimbingan ditolak', data: log });
  } catch (error) {
    console.error('Reject bimbingan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
