import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

const getParamId = (id: string | string[] | undefined): string | null => {
  if (!id) return null;
  return Array.isArray(id) ? id[0] : id;
};

const pengajuanInclude = {
  mahasiswa: { select: { id: true, nama: true, nim: true, angkatan: true } },
  dosenPembimbing: { select: { id: true, nama: true, nip: true, bidangKeahlian: true } }
} as const;

// ============ MAHASISWA ============
export const createPengajuan = async (req: AuthRequest, res: Response) => {
  try {
    const { judul, abstrak } = req.body;
    const userId = req.user?.userId;

    if (!judul || !String(judul).trim()) {
      return res.status(400).json({ error: 'Judul wajib diisi' });
    }

    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { userId: userId! }
    });

    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }

    // Mahasiswa boleh mengajukan ulang hanya jika pengajuan sebelumnya sudah REJECTED.
    const existingActive = await prisma.pengajuanJudul.findFirst({
      where: {
        mahasiswaId: mahasiswa.id,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (existingActive) {
      return res.status(400).json({
        error: existingActive.status === 'PENDING'
          ? 'Anda masih memiliki pengajuan yang menunggu proses admin/dosen'
          : 'Anda sudah memiliki pengajuan judul yang disetujui'
      });
    }

    const pengajuan = await prisma.pengajuanJudul.create({
      data: {
        mahasiswaId: mahasiswa.id,
        judul: String(judul).trim(),
        abstrak: abstrak ? String(abstrak).trim() : null,
        status: 'PENDING',
        tglAjukan: new Date()
      },
      include: pengajuanInclude
    });

    res.status(201).json({
      success: true,
      message: 'Pengajuan judul berhasil dikirim',
      data: pengajuan
    });
  } catch (error) {
    console.error('Create pengajuan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPengajuanByMahasiswa = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { userId: userId! }
    });

    if (!mahasiswa) {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }

    const pengajuan = await prisma.pengajuanJudul.findMany({
      where: { mahasiswaId: mahasiswa.id },
      include: pengajuanInclude,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: pengajuan });
  } catch (error) {
    console.error('Get pengajuan by mahasiswa error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ ADMIN & DOSEN ============
export const getAllPengajuan = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    let where = {};

    if (userRole === 'ADMIN') {
      // Admin melihat semua pengajuan untuk proses assign dosen dan monitoring status.
      where = {};
    } else if (userRole === 'DOSEN') {
      const dosen = await prisma.dosen.findUnique({ where: { userId: userId! } });
      if (!dosen) {
        return res.status(404).json({ error: 'Dosen tidak ditemukan' });
      }

      // Dosen hanya melihat pengajuan yang SUDAH di-assign kepadanya.
      // Status PENDING = perlu review judul. APPROVED = mahasiswa bimbingan. REJECTED = riwayat penolakan.
      where = { dosenPembimbingId: dosen.id };
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const pengajuan = await prisma.pengajuanJudul.findMany({
      where,
      include: pengajuanInclude,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: pengajuan });
  } catch (error) {
    console.error('Get all pengajuan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ ADMIN ONLY ============
// Admin hanya mengassign dosen pembimbing. Assign TIDAK otomatis approve judul.
export const assignDosenPembimbing = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParamId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID pengajuan tidak valid' });

    const { dosenPembimbingId, catatan } = req.body;
    if (!dosenPembimbingId) {
      return res.status(400).json({ error: 'Dosen pembimbing wajib dipilih' });
    }

    const dosen = await prisma.dosen.findUnique({ where: { id: dosenPembimbingId } });
    if (!dosen) return res.status(404).json({ error: 'Dosen tidak ditemukan' });

    const pengajuan = await prisma.pengajuanJudul.findUnique({ where: { id } });
    if (!pengajuan) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });

    if (pengajuan.status !== 'PENDING') {
      return res.status(400).json({ error: 'Dosen hanya dapat diassign pada pengajuan yang masih pending' });
    }

    const isReassign = Boolean(pengajuan.dosenPembimbingId && pengajuan.dosenPembimbingId !== dosenPembimbingId);
    const isSameAssignment = pengajuan.dosenPembimbingId === dosenPembimbingId;
    const shouldIncrementNewDosen = !isSameAssignment;

    if (shouldIncrementNewDosen && dosen.terisi >= dosen.kuota) {
      return res.status(400).json({ error: `Kuota dosen ${dosen.nama} sudah penuh` });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      if (isReassign && pengajuan.dosenPembimbingId) {
        const oldDosen = await tx.dosen.findUnique({ where: { id: pengajuan.dosenPembimbingId } });
        if (oldDosen && oldDosen.terisi > 0) {
          await tx.dosen.update({
            where: { id: pengajuan.dosenPembimbingId },
            data: { terisi: { decrement: 1 } }
          });
        }
      }

      if (shouldIncrementNewDosen) {
        await tx.dosen.update({
          where: { id: dosenPembimbingId },
          data: { terisi: { increment: 1 } }
        });
      }

      return tx.pengajuanJudul.update({
        where: { id },
        data: {
          dosenPembimbingId,
          // Status tetap PENDING. Approval/reject final dilakukan oleh Dosen.
          status: 'PENDING',
          catatan: catatan ? String(catatan).trim() : pengajuan.catatan || null,
          tglApproved: null
        },
        include: pengajuanInclude
      });
    });

    res.json({
      success: true,
      message: isSameAssignment
        ? 'Dosen pembimbing sudah terassign. Menunggu review dosen.'
        : 'Dosen pembimbing berhasil diassign. Menunggu approval/reject dari dosen.',
      data: updated
    });
  } catch (error) {
    console.error('Assign dosen error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ DOSEN ONLY ============
export const approvePengajuan = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParamId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID pengajuan tidak valid' });

    const { catatan } = req.body;
    const userId = req.user?.userId;

    const dosen = await prisma.dosen.findUnique({ where: { userId: userId! } });
    if (!dosen) return res.status(404).json({ error: 'Dosen tidak ditemukan' });

    const pengajuan = await prisma.pengajuanJudul.findUnique({ where: { id } });
    if (!pengajuan) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });

    if (pengajuan.status !== 'PENDING') {
      return res.status(400).json({ error: `Pengajuan sudah ${pengajuan.status.toLowerCase()}` });
    }

    if (!pengajuan.dosenPembimbingId) {
      return res.status(403).json({ error: 'Pengajuan belum diassign oleh Admin' });
    }

    if (pengajuan.dosenPembimbingId !== dosen.id) {
      return res.status(403).json({ error: 'Anda tidak berwenang memproses pengajuan ini' });
    }

    const updated = await prisma.pengajuanJudul.update({
      where: { id },
      data: {
        status: 'APPROVED',
        catatan: catatan ? String(catatan).trim() : pengajuan.catatan || null,
        tglApproved: new Date()
      },
      include: pengajuanInclude
    });

    res.json({ success: true, message: 'Judul berhasil disetujui oleh dosen', data: updated });
  } catch (error) {
    console.error('Approve pengajuan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectPengajuan = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParamId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID pengajuan tidak valid' });

    const { catatan } = req.body;
    if (!catatan || !String(catatan).trim()) {
      return res.status(400).json({ error: 'Alasan penolakan wajib diisi' });
    }

    const userId = req.user?.userId;
    const dosen = await prisma.dosen.findUnique({ where: { userId: userId! } });
    if (!dosen) return res.status(404).json({ error: 'Dosen tidak ditemukan' });

    const pengajuan = await prisma.pengajuanJudul.findUnique({ where: { id } });
    if (!pengajuan) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });

    if (pengajuan.status !== 'PENDING') {
      return res.status(400).json({ error: `Pengajuan sudah ${pengajuan.status.toLowerCase()}` });
    }

    if (!pengajuan.dosenPembimbingId) {
      return res.status(403).json({ error: 'Pengajuan belum diassign oleh Admin' });
    }

    if (pengajuan.dosenPembimbingId !== dosen.id) {
      return res.status(403).json({ error: 'Anda tidak berwenang memproses pengajuan ini' });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      if (dosen.terisi > 0) {
        await tx.dosen.update({
          where: { id: dosen.id },
          data: { terisi: { decrement: 1 } }
        });
      }

      return tx.pengajuanJudul.update({
        where: { id },
        data: {
          status: 'REJECTED',
          catatan: String(catatan).trim(),
          tglApproved: new Date()
        },
        include: pengajuanInclude
      });
    });

    res.json({ success: true, message: 'Judul ditolak oleh dosen', data: updated });
  } catch (error) {
    console.error('Reject pengajuan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
