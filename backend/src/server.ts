import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { disconnectDatabase } from "./database/prisma";
import { createSocketServer } from "./socket";

const server = http.createServer(app);
const io = createSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`MEETPRO AI backend running on http://localhost:${env.PORT}`);
});

let shuttingDown = false;

// Graceful shutdown: naye connections band, clients ko notify, DB disconnect
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  const forceTimer = setTimeout(() => {
    console.error("Graceful shutdown timeout. Forcing exit.");
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  io.emit("server:shutting-down", { at: new Date().toISOString() });

  // io.close() connected sockets band karta hai aur HTTP server bhi
  await new Promise<void>((resolve) => io.close(() => resolve()));

  try {
    await disconnectDatabase();
  } catch (error) {
    console.error("Database disconnect failed:", error);
  }

  console.log("Shutdown complete.");
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
