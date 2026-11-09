import { io, type Socket } from "socket.io-client";
import { config } from "../utils/config";

// Socket.IO client. Koi API key nahi chahiye. Session cookie automatically jati hai
// (withCredentials), taake server logged-in user ko verify kar sake.
export function createMeetingSocket(): Socket {
  const url = config.apiUrl || window.location.origin;

  return io(url, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });
}
