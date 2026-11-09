import type { Server, Socket } from "socket.io";
import {
  ensureMeeting,
  getRecentMessages,
  recordParticipantJoin,
  recordParticipantLeave,
  saveMessage,
} from "../services/meetingService";
import type { PublicUser } from "../services/userService";
import {
  asRecord,
  isAllowedReaction,
  isValidRoomId,
  sanitizeDisplayName,
  sanitizeMessage,
} from "../utils/validation";
import { presence } from "./presence";
import { rateLimiter } from "./rateLimiter";

const MAX_PARTICIPANTS = 100;
const HISTORY_LIMIT = 50;

interface AckResponse {
  ok: boolean;
  error?: string;
  message?: string;
  data?: unknown;
}

// Socket.IO ack callback sirf tab call karein jab client ne ack function bheja ho
function respond(ack: unknown, response: AckResponse): void {
  if (typeof ack === "function") (ack as (r: AckResponse) => void)(response);
}

function fail(ack: unknown, error: string, message: string): void {
  respond(ack, { ok: false, error, message });
}

// Socket.IO rooms ka naam prefix ke saath, taake socket.id room se collision na ho
export function channelFor(roomId: string): string {
  return `meeting:${roomId}`;
}

// Socket ko current meeting se nikaalta hai aur baaki participants ko batata hai
export function leaveCurrentRoom(io: Server, socket: Socket): void {
  const roomId = socket.data.roomId as string | undefined;
  if (!roomId) return;

  const participantRowId = socket.data.participantRowId as string | undefined;
  socket.leave(channelFor(roomId));
  socket.data.roomId = undefined;
  socket.data.participantRowId = undefined;

  if (participantRowId) void recordParticipantLeave(participantRowId);

  const removed = presence.remove(roomId, socket.id);
  if (removed) {
    const at = new Date().toISOString();
    io.to(channelFor(roomId)).emit("room:user-left", { roomId, participant: removed, at });
    io.to(channelFor(roomId)).emit("room:participants", {
      roomId,
      participants: presence.list(roomId),
    });
  }
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  // ---- Room join ----
  socket.on("room:join", async (payload: unknown, ack?: unknown) => {
    if (!rateLimiter.hit(socket.id, "room:join")) {
      return fail(ack, "RATE_LIMITED", "Bahut zyada join attempts. Thodi der baad try karein.");
    }

    const data = asRecord(payload);
    if (!isValidRoomId(data.roomId)) {
      return fail(ack, "INVALID_ROOM_ID", "Meeting ID invalid hai.");
    }
    const roomId = data.roomId;

    // Logged-in user ka naam server ki verified state se aata hai; guest ka naam client se (sanitized)
    const user = socket.data.user as PublicUser | null | undefined;
    const displayName = sanitizeDisplayName(user ? user.name : data.displayName);
    if (displayName === null) {
      return fail(ack, "INVALID_NAME", "Display name invalid hai.");
    }

    try {
      await ensureMeeting(roomId);
      const history = await getRecentMessages(roomId, HISTORY_LIMIT);
      if (!socket.connected) return;

      // Same room mein dobara join (e.g. client refresh) par dobara announce nahi karte
      if (socket.data.roomId === roomId) {
        return respond(ack, {
          ok: true,
          data: {
            roomId,
            self: presence.list(roomId).find((p) => p.participantId === socket.id),
            participants: presence.list(roomId),
            history,
          },
        });
      }

      leaveCurrentRoom(io, socket);

      if (presence.count(roomId) >= MAX_PARTICIPANTS) {
        return fail(ack, "ROOM_FULL", "Meeting full hai.");
      }

      const participantRowId = await recordParticipantJoin({
        roomId,
        userId: user?.id ?? null,
        displayName,
      });
      if (!socket.connected) {
        if (participantRowId) void recordParticipantLeave(participantRowId);
        return;
      }

      const participant = presence.add(roomId, socket.id, displayName);
      socket.join(channelFor(roomId));
      socket.data.roomId = roomId;
      socket.data.displayName = displayName;
      socket.data.participantRowId = participantRowId ?? undefined;

      const at = new Date().toISOString();
      socket.to(channelFor(roomId)).emit("room:user-joined", { roomId, participant, at });
      io.to(channelFor(roomId)).emit("room:participants", {
        roomId,
        participants: presence.list(roomId),
      });

      respond(ack, {
        ok: true,
        data: {
          roomId,
          self: participant,
          participants: presence.list(roomId),
          history,
        },
      });
    } catch (error) {
      console.error("room:join failed:", error);
      fail(ack, "SERVER_ERROR", "Meeting join nahi ho saki. Dobara koshish karein.");
    }
  });

  // ---- Room leave ----
  socket.on("room:leave", (_payload: unknown, ack?: unknown) => {
    leaveCurrentRoom(io, socket);
    respond(ack, { ok: true });
  });

  // ---- Chat message ----
  socket.on("chat:send", async (payload: unknown, ack?: unknown) => {
    if (!rateLimiter.hit(socket.id, "chat:send")) {
      return fail(ack, "RATE_LIMITED", "Messages bahut tez bheje ja rahe hain. Thoda ruk kar try karein.");
    }

    const roomId = socket.data.roomId as string | undefined;
    const data = asRecord(payload);
    // Client ka roomId sirf verify karne ke liye hai; sirf usi room mein bhej sakte hain jisme socket joined hai
    if (!roomId || data.roomId !== roomId) {
      return fail(ack, "NOT_IN_ROOM", "Pehle meeting join karein.");
    }

    const message = sanitizeMessage(data.message);
    if (message === null) {
      return fail(ack, "INVALID_MESSAGE", "Message khali hai ya 1000 characters se lamba hai.");
    }

    try {
      // senderId aur senderName server ki apni state se aate hain, client se nahi
      const saved = await saveMessage({
        roomId,
        senderId: socket.id,
        senderName: socket.data.displayName as string,
        message,
      });
      io.to(channelFor(roomId)).emit("chat:message", saved);
      respond(ack, { ok: true, data: saved });
    } catch (error) {
      console.error("chat:send failed:", error);
      fail(ack, "SERVER_ERROR", "Message save nahi ho saka. Dobara koshish karein.");
    }
  });

  // ---- Typing indicator (persist nahi hota) ----
  socket.on("chat:typing", (payload: unknown) => {
    if (!rateLimiter.hit(socket.id, "chat:typing")) return;

    const roomId = socket.data.roomId as string | undefined;
    const data = asRecord(payload);
    if (!roomId || data.roomId !== roomId) return;

    socket.to(channelFor(roomId)).emit("chat:typing", {
      roomId,
      participantId: socket.id,
      displayName: socket.data.displayName,
      isTyping: data.isTyping === true,
    });
  });

  // ---- Emoji reaction (persist nahi hota) ----
  socket.on("reaction:send", (payload: unknown, ack?: unknown) => {
    if (!rateLimiter.hit(socket.id, "reaction:send")) {
      return fail(ack, "RATE_LIMITED", "Reactions bahut tez bheje ja rahe hain.");
    }

    const roomId = socket.data.roomId as string | undefined;
    const data = asRecord(payload);
    if (!roomId || data.roomId !== roomId) {
      return fail(ack, "NOT_IN_ROOM", "Pehle meeting join karein.");
    }
    if (!isAllowedReaction(data.emoji)) {
      return fail(ack, "INVALID_REACTION", "Ye reaction allowed nahi hai.");
    }

    io.to(channelFor(roomId)).emit("reaction:received", {
      roomId,
      participantId: socket.id,
      displayName: socket.data.displayName,
      emoji: data.emoji,
      at: new Date().toISOString(),
    });
    respond(ack, { ok: true });
  });

  // ---- Disconnect ----
  socket.on("disconnect", () => {
    leaveCurrentRoom(io, socket);
    rateLimiter.forget(socket.id);
  });
}
