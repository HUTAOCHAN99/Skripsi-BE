<<<<<<< HEAD
// config/database.ts
import { PrismaClient } from '@prisma/client';
=======
import { PrismaClient } from "@prisma/client";

console.log("DATABASE_URL =", process.env.DATABASE_URL);
>>>>>>> d045269800f35fa97086bc9926614514303d114e

const prisma = new PrismaClient();

export default prisma;