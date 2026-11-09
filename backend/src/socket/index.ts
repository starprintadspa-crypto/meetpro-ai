import type http from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { resolveUserFromCookieHeader } from "../middleware/auth";
import { registerSocketHandlers } from "./handlers";

export function createSocketServer(httpServer: http.Server): Server {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      // Sirf apna frontend origin allow hai; baaki origins ko CORS header nahi milta
      origin: (origin, callback) => {
        callback(null, origin === env.CLIENT_URL);
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    // Bade payloads reject (DoS se bachao)
    maxHttpBufferSize: 10 * 1024,
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // Identity server verify karta hai (session cookie se). Guest bhi join kar sakte hain.
  io.use(async (socket, next) => {
    socket.data.user = await resolveUserFromCookieHeader(socket.handshake.headers.cookie);
    next();
  });

  io.on("connection", (socket) => {
    registerSocketHandlers(io, socket);
  });

  return io;
}
