import "dotenv/config"
import express from "express"
import cors from "cors"
import { createServer } from "http"
import { Server as SocketServer } from "socket.io"
import { decodeToken, resolveIdentity } from "./middleware/auth"
import { registerSocketHandlers } from "./socket/handlers"
import { setDisplayName } from "./lib/user-cache"
import conversationRoutes from "./routes/conversations"
import { createMessageRouter } from "./routes/messages"
import { createUploadRouter } from "./routes/upload"
import { createInternalRouter } from "./routes/internal"
import { ensureBucket } from "./lib/minio"
import prisma from "./lib/prisma"

const PORT = parseInt(process.env.PORT || "4000", 10)

const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173,http://localhost:7001")
  .split(",")
  .map((o) => o.trim())

// ── Express ────────────────────────────────────────────────────────────────
const app = express()

app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
  })
)

app.use(express.json({ limit: "1mb" }))

// Ensure UTF-8 charset on all JSON responses
app.use((_req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  next()
})

// Health check — no auth required
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "kayi-messenger" })
})

// API routes (conversations doesn't need io)
app.use("/api/conversations", conversationRoutes)

// ── HTTP + Socket.io ───────────────────────────────────────────────────────
const httpServer = createServer(app)

const io = new SocketServer(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
  // WebSocket önce denenir; yalnızca WebSocket desteklenmiyorsa polling'e düşülür.
  // Eski sıra (polling-first) her bağlantıda gereksiz HTTP long-poll trafiği üretiyordu.
  transports: ["websocket", "polling"],
  // WebSocket keepalive: 25sn ping, 20sn timeout — bağlantı koparsa sessizce polling'e geçer
  pingInterval: 25000,
  pingTimeout: 20000,
})

// JWT authentication for Socket.io handshake
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    (socket.handshake.headers.authorization as string | undefined)?.replace("Bearer ", "")

  if (!token) {
    return next(new Error("Authentication required"))
  }

  const payload = decodeToken(token)

  if (!payload) {
    return next(new Error("Invalid token"))
  }

  const identity = resolveIdentity(payload)
  socket.data.userId = identity.userId
  socket.data.userType = identity.userType

  // Persist the display name sent from the client during handshake
  const displayName = socket.handshake.auth?.displayName
  if (displayName && typeof displayName === "string") {
    socket.data.displayName = displayName
    // Persist to DB asynchronously so cache survives server restarts
    setDisplayName(identity.userId, displayName, identity.userType as any).catch((err) => {
      console.error(`[socket] Failed to persist displayName for ${identity.userId}:`, err)
    })
  }

  next()
})

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket)
})

// Internal server-to-server routes (registered after io is ready)
app.use("/api/internal", createInternalRouter(io))

// Message and upload routes need io for real-time broadcasting
app.use("/api/conversations", createMessageRouter(io))
app.use("/api/upload", createUploadRouter(io))

// ── Startup ────────────────────────────────────────────────────────────────
async function main() {
  // Verify DB connection
  await prisma.$connect()
  console.log("[db] Connected to PostgreSQL (kayi_messenger)")

  // Ensure MinIO bucket exists
  try {
    await ensureBucket()
  } catch (err) {
    console.warn("[minio] Could not verify bucket (continuing):", (err as Error).message)
  }

  httpServer.listen(PORT, () => {
    console.log(`[kayi-messenger] Listening on port ${PORT}`)
    console.log(`[kayi-messenger] CORS origins: ${CORS_ORIGINS.join(", ")}`)
  })
}

main().catch((err) => {
  console.error("[kayi-messenger] Startup error:", err)
  process.exit(1)
})

// ── Graceful Shutdown ──────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`[kayi-messenger] Received ${signal}, shutting down gracefully…`)
  try {
    // Stop accepting new connections; let in-flight requests finish (30 s max)
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()))
      setTimeout(() => resolve(), 30_000)
    })
    await prisma.$disconnect()
    console.log("[kayi-messenger] Shutdown complete")
    process.exit(0)
  } catch (err) {
    console.error("[kayi-messenger] Error during shutdown:", err)
    process.exit(1)
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
