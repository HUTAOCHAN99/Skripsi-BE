import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";

import { createServer } from "http";
import { Server } from "socket.io";
import prisma from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import pengajuanRoutes from "./routes/pengajuanRoutes";
import bimbinganRoutes from "./routes/bimbinganRoutes";
import sidangRoutes from "./routes/sidangRoutes";
import dosenRoutes from "./routes/dosenRoutes";
import mahasiswaRoutes from "./routes/mahasiswaRoutes";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? [
            process.env.FRONTEND_URL ||
              "https://skripsi-frontend-xxxx-uc.a.run.app",
          ]
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  },
});

// ============ MIDDLEWARE ============
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ SOCKET.IO ============
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("join-room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ============ ROUTES ============
app.use("/api/auth", authRoutes);
app.use("/api/pengajuan", pengajuanRoutes);
app.use("/api/bimbingan", bimbinganRoutes);
app.use("/api/sidang", sidangRoutes);
app.use("/api/dosen", dosenRoutes);
app.use("/api/mahasiswa", mahasiswaRoutes); // ✅ TAMBAHKAN ROUTE INI

// ============ HEALTH CHECK ============
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({ message: "Skripsi TA System API", status: "running" });
});

// ============ ERROR HANDLER ============
app.use(errorHandler);

// ============ START SERVER ============
const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = "0.0.0.0";

async function startServer() {
  try {
    console.log("K_SERVICE =", process.env.K_SERVICE);
    console.log(
      "CLOUD_SQL_CONNECTION_NAME =",
      process.env.CLOUD_SQL_CONNECTION_NAME,
    );

    httpServer.listen(PORT, HOST, async () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);

      try {
        await prisma.$connect();
        console.log("✅ Database connected");
      } catch (dbError) {
        console.error("❌ Database failed:", dbError);
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// ============ GRACEFUL SHUTDOWN ============
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing gracefully...");
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing gracefully...");
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export { io };
