-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DOSEN', 'MAHASISWA');

-- CreateEnum
CREATE TYPE "StatusPengajuan" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StatusBimbingan" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StatusSidang" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MAHASISWA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mahasiswa" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "angkatan" INTEGER NOT NULL,
    "noTelp" TEXT,
    "alamat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mahasiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dosen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "bidangKeahlian" TEXT NOT NULL,
    "noTelp" TEXT,
    "kuota" INTEGER NOT NULL DEFAULT 5,
    "terisi" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dosen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengajuanJudul" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "abstrak" TEXT,
    "dosenPembimbingId" TEXT,
    "status" "StatusPengajuan" NOT NULL DEFAULT 'PENDING',
    "catatan" TEXT,
    "tglAjukan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tglApproved" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PengajuanJudul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogBimbingan" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "pertemuanKe" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "topik" TEXT NOT NULL,
    "catatan" TEXT NOT NULL,
    "status" "StatusBimbingan" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogBimbingan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JadwalSidang" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "dosenPembimbingId" TEXT NOT NULL,
    "dosenPengujiId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jam" TEXT NOT NULL,
    "ruang" TEXT NOT NULL,
    "status" "StatusSidang" NOT NULL DEFAULT 'SCHEDULED',
    "hasil" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JadwalSidang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Mahasiswa_userId_key" ON "Mahasiswa"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Mahasiswa_nim_key" ON "Mahasiswa"("nim");

-- CreateIndex
CREATE UNIQUE INDEX "Dosen_userId_key" ON "Dosen"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Dosen_nip_key" ON "Dosen"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "JadwalSidang_mahasiswaId_key" ON "JadwalSidang"("mahasiswaId");

-- AddForeignKey
ALTER TABLE "Mahasiswa" ADD CONSTRAINT "Mahasiswa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dosen" ADD CONSTRAINT "Dosen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanJudul" ADD CONSTRAINT "PengajuanJudul_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanJudul" ADD CONSTRAINT "PengajuanJudul_dosenPembimbingId_fkey" FOREIGN KEY ("dosenPembimbingId") REFERENCES "Dosen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogBimbingan" ADD CONSTRAINT "LogBimbingan_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogBimbingan" ADD CONSTRAINT "LogBimbingan_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "Dosen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalSidang" ADD CONSTRAINT "JadwalSidang_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalSidang" ADD CONSTRAINT "JadwalSidang_dosenPembimbingId_fkey" FOREIGN KEY ("dosenPembimbingId") REFERENCES "Dosen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalSidang" ADD CONSTRAINT "JadwalSidang_dosenPengujiId_fkey" FOREIGN KEY ("dosenPengujiId") REFERENCES "Dosen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
