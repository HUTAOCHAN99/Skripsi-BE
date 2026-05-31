import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

<<<<<<< HEAD
const getParamId = (id: string | string[] | undefined): string | null => {
  if (!id) return null;
  return Array.isArray(id) ? id[0] : id;
};

export const createJadwalSidang = async (req: Request, res: Response) => {
  try {
    const { mahasiswaId, dosenPembimbingId, dosenPengujiId, tanggal, jam, ruang } = req.body;

    if (!mahasiswaId || !dosenPembimbingId || !dosenPengujiId || !tanggal || !jam || !ruang) {
      return res.status(400).json({ error: 'Mahasiswa, dosen, tanggal, jam, dan ruang wajib diisi' });
    }

    if (dosenPembimbingId === dosenPengujiId) {
      return res.status(400).json({ error: 'Dosen pembimbing dan dosen penguji tidak boleh sama' });
    }

    const approved = await prisma.pengajuanJudul.findFirst({
      where: { mahasiswaId, dosenPembimbingId, status: 'APPROVED' }
    });

    if (!approved) {
      return res.status(400).json({ error: 'Mahasiswa belum memiliki pengajuan judul APPROVED dengan dosen pembimbing tersebut' });
    }

=======
export const createJadwalSidang = async (req: Request, res: Response) => {
  try {
    const { mahasiswaId, dosenPembimbingId, dosenPengujiId, tanggal, jam, ruang } = req.body;
    
>>>>>>> d045269800f35fa97086bc9926614514303d114e
    const jadwal = await prisma.jadwalSidang.create({
      data: {
        mahasiswaId,
        dosenPembimbingId,
        dosenPengujiId,
        tanggal: new Date(tanggal),
        jam,
        ruang,
        status: 'SCHEDULED'
<<<<<<< HEAD
      },
      include: { mahasiswa: true, dosenPembimbing: true, dosenPenguji: true }
    });

    res.status(201).json({ success: true, message: 'Jadwal sidang berhasil dibuat', data: jadwal });
  } catch (error) {
    console.error('Create jadwal sidang error:', error);
=======
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Jadwal sidang berhasil dibuat',
      data: jadwal
    });
  } catch (error) {
    console.error(error);
>>>>>>> d045269800f35fa97086bc9926614514303d114e
    res.status(500).json({ error: 'Internal server error' });
  }
};

<<<<<<< HEAD
export const getAllJadwalSidang = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    let where = {};

    if (userRole === 'DOSEN') {
      const dosen = await prisma.dosen.findUnique({ where: { userId: userId! } });
      if (!dosen) return res.status(404).json({ error: 'Dosen tidak ditemukan' });
      where = {
        OR: [
          { dosenPembimbingId: dosen.id },
          { dosenPengujiId: dosen.id }
        ]
      };
    }

    const jadwal = await prisma.jadwalSidang.findMany({
      where,
      include: { mahasiswa: true, dosenPembimbing: true, dosenPenguji: true },
      orderBy: { tanggal: 'asc' }
    });

    res.json({ success: true, data: jadwal });
  } catch (error) {
    console.error('Get all jadwal sidang error:', error);
=======
export const getAllJadwalSidang = async (req: Request, res: Response) => {
  try {
    const jadwal = await prisma.jadwalSidang.findMany({
      include: {
        mahasiswa: true,
        dosenPembimbing: true,
        dosenPenguji: true
      },
      orderBy: { tanggal: 'asc' }
    });
    
    res.json({
      success: true,
      data: jadwal
    });
  } catch (error) {
    console.error(error);
>>>>>>> d045269800f35fa97086bc9926614514303d114e
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getJadwalSidangByMahasiswa = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
<<<<<<< HEAD

    const mahasiswa = await prisma.mahasiswa.findUnique({ where: { userId: userId! } });
    if (!mahasiswa) return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });

    const jadwal = await prisma.jadwalSidang.findUnique({
      where: { mahasiswaId: mahasiswa.id },
      include: { dosenPembimbing: true, dosenPenguji: true, mahasiswa: true }
    });

    res.json({ success: true, data: jadwal });
  } catch (error) {
    console.error('Get jadwal mahasiswa error:', error);
=======
    
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { userId: userId! }
    });
    
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
    
    res.json({
      success: true,
      data: jadwal
    });
  } catch (error) {
    console.error(error);
>>>>>>> d045269800f35fa97086bc9926614514303d114e
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateJadwalSidang = async (req: Request, res: Response) => {
  try {
<<<<<<< HEAD
    const jadwalId = getParamId(req.params.id);
    if (!jadwalId) return res.status(400).json({ error: 'ID jadwal tidak valid' });

    const { tanggal, jam, ruang, status } = req.body;
=======
    const { id } = req.params;
    const { tanggal, jam, ruang, status } = req.body;
    const jadwalId = Array.isArray(id) ? id[0] : id;
    
>>>>>>> d045269800f35fa97086bc9926614514303d114e
    const jadwal = await prisma.jadwalSidang.update({
      where: { id: jadwalId },
      data: {
        tanggal: tanggal ? new Date(tanggal) : undefined,
        jam,
        ruang,
        status
<<<<<<< HEAD
      },
      include: { mahasiswa: true, dosenPembimbing: true, dosenPenguji: true }
    });

    res.json({ success: true, message: 'Jadwal sidang berhasil diupdate', data: jadwal });
  } catch (error) {
    console.error('Update jadwal sidang error:', error);
=======
      }
    });
    
    res.json({
      success: true,
      message: 'Jadwal sidang berhasil diupdate',
      data: jadwal
    });
  } catch (error) {
    console.error(error);
>>>>>>> d045269800f35fa97086bc9926614514303d114e
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelJadwalSidang = async (req: Request, res: Response) => {
  try {
<<<<<<< HEAD
    const jadwalId = getParamId(req.params.id);
    if (!jadwalId) return res.status(400).json({ error: 'ID jadwal tidak valid' });

    const jadwal = await prisma.jadwalSidang.update({
      where: { id: jadwalId },
      data: { status: 'CANCELLED' },
      include: { mahasiswa: true, dosenPembimbing: true, dosenPenguji: true }
    });

    res.json({ success: true, message: 'Jadwal sidang dibatalkan', data: jadwal });
  } catch (error) {
    console.error('Cancel jadwal sidang error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
=======
    const { id } = req.params;
    const jadwalId = Array.isArray(id) ? id[0] : id;
    
    const jadwal = await prisma.jadwalSidang.update({
      where: { id: jadwalId },
      data: { status: 'CANCELLED' }
    });
    
    res.json({
      success: true,
      message: 'Jadwal sidang dibatalkan',
      data: jadwal
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
>>>>>>> d045269800f35fa97086bc9926614514303d114e
