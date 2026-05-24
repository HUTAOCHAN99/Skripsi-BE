# API Dokumentasi - Skripsi TA System

**Base URL:** `https://skripsi-backend-514828886605.asia-southeast2.run.app`

**Server:** Google Cloud Run (Production)

**Format Response:** JSON

**Authentication:** Bearer Token (JWT)

---

## 📋 Daftar Isi

1. [Authentication](#authentication)
   - Register
   - Login
   - Get Profile (Me)
2. [Pengajuan Judul](#pengajuan-judul)
   - Create Pengajuan
   - Get Pengajuan Saya
   - Get All Pengajuan (Admin/Dosen)
   - Approve Pengajuan (Admin/Dosen)
   - Reject Pengajuan (Admin/Dosen)
3. [Bimbingan](#bimbingan)
   - Create Log Bimbingan (Dosen)
   - Get Log Bimbingan Saya (Mahasiswa)
   - Get All Log Bimbingan (Admin/Dosen)
   - Approve Log Bimbingan (Dosen)
   - Reject Log Bimbingan (Dosen)
4. [Dosen (Admin Only)](#dosen-admin-only)
   - Get All Dosen
   - Get Dosen By ID
   - Create Dosen
   - Update Dosen
   - Delete Dosen
5. [Sidang](#sidang)
   - Create Jadwal Sidang (Admin)
   - Get All Jadwal Sidang (Admin/Dosen)
   - Get Jadwal Sidang Saya (Mahasiswa)
   - Update Jadwal Sidang (Admin)
   - Cancel Jadwal Sidang (Admin)
6. [Public Endpoints](#public-endpoints)

---

## 🔐 Authentication

### Register

**Endpoint:** `POST /api/auth/register`

**Role:** Public (semua bisa)

**Request Body:**

| Field | Type | Required | Keterangan |
|-------|------|----------|-------------|
| email | string | ✅ Ya | Email unik |
| password | string | ✅ Ya | Password |
| role | string | ✅ Ya | `MAHASISWA`, `DOSEN`, atau `ADMIN` |
| nama | string | ✅ Ya | Nama lengkap |
| nim | string | ✅ (Mahasiswa) | Nomor Induk Mahasiswa |
| angkatan | integer | ✅ (Mahasiswa) | Tahun angkatan |
| nip | string | ✅ (Dosen) | Nomor Induk Pegawai |
| bidangKeahlian | string | ✅ (Dosen) | Bidang keahlian dosen |

**Contoh Request (Mahasiswa):**
```json
{
  "email": "mahasiswa@test.com",
  "password": "test123",
  "role": "MAHASISWA",
  "nama": "Budi Santoso",
  "nim": "2024001",
  "angkatan": 2024
}