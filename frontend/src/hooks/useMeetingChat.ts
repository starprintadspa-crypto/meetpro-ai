import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createMeetingSocket } from "../services/socketClient";
import type {
  AckResponse,
  ChatMessageDto,
  ConnectionState,
  JoinAckData,
  Participant,
  ReactionEvent,
  TimelineItem,
  TypingEvent,
} from "../types/chat";

const TYPING_EXPIRE_MS = 3000;
const MAX_TIMELINE_ITEMS = 500;

let keyCounter = 0;
const nextKey = (prefix: string) => `${prefix}-${++keyCounter}`;

function timeOf(item: TimelineItem): string {
  return item.kind === "message" ? item.createdAt : item.at;
}

function sortByTime(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
}

function messageItem(msg: ChatMessageDto): TimelineItem {
  return {
    kind: "message",
    key: `msg-${msg.id}`,
    id: msg.id,
    senderId: msg.senderId,
    senderName: msg.senderName,
    message: msg.message,
    createdAt: msg.createdAt,
  };
}

// Duplicate message (same id) dobara add nahi hota
function appendItem(prev: TimelineItem[], item: TimelineItem): TimelineItem[] {
  if (item.kind === "message" && prev.some((i) => i.kind === "message" && i.id === item.id)) {
    return prev;
  }
  return sortByTime([...prev, item]).slice(-MAX_TIMELINE_ITEMS);
}

// Reconnect ke baad history merge: jo message pehle se hai usko skip
function mergeHistory(prev: TimelineItem[], history: ChatMessageDto[]): TimelineItem[] {
  const knownIds = new Set(prev.flatMap((i) => (i.kind === "message" ? [i.id] : [])));
  const incoming = history.filter((m) => !knownIds.has(m.id)).map(messageItem);
  return sortByTime([...prev, ...incoming]).slice(-MAX_TIMELINE_ITEMS);
}

export function useMeetingChat(roomId: string | null, displayName: string, isChatOpen: boolean) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [typingMap, setTypingMap] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef<string | null>(roomId);
  const displayNameRef = useRef(displayName);
  const isChatOpenRef = useRef(isChatOpen);
  const typingTimersRef = useRef(new Map<string, number>());

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) setUnreadCount(0);
  }, [isChatOpen]);

  // Socket connection lifecycle: connect -> join -> listen; cleanup par leave + disconnect
  useEffect(() => {
    if (!roomId) return;

    const socket = createMeetingSocket();
    socketRef.current = socket;
    const timers = typingTimersRef.current;
    let disposed = false;

    const join = () => {
      socket.emit(
        "room:join",
        { roomId, displayName: displayNameRef.current },
        (res: AckResponse<JoinAckData>) => {
          if (disposed) return;
          if (!res.ok || !res.data) {
            setConnectionState("error");
            setNotice(res.message ?? "Chat se connect nahi ho saka.");
            return;
          }
          setSelfId(res.data.self.participantId);
          setParticipants(res.data.participants);
          setTimeline((prev) => mergeHistory(prev, res.data!.history));
          setConnectionState("connected");
          setNotice(null);
        }
      );
    };

    socket.on("connect", join);

    socket.on("disconnect", (reason: string) => {
      if (disposed) return;
      setConnectionState(reason === "io client disconnect" ? "disconnected" : "reconnecting");
      setTypingMap({});
    });

    socket.on("connect_error", () => {
      if (!disposed) setConnectionState("reconnecting");
    });

    socket.on("server:shutting-down", () => {
      if (!disposed) setNotice("Server restart ho raha hai. Reconnect hona shuru hoga...");
    });

    socket.on("chat:message", (msg: ChatMessageDto) => {
      if (disposed) return;
      setTimeline((prev) => appendItem(prev, messageItem(msg)));
      if (!isChatOpenRef.current) setUnreadCount((count) => count + 1);
    });

    socket.on("room:user-joined", (data: { participant: Participant; at: string }) => {
      if (disposed) return;
      setTimeline((prev) =>
        appendItem(prev, {
          kind: "system",
          key: nextKey("sys"),
          text: `${data.participant.displayName} meeting mein join hue`,
          at: data.at,
        })
      );
    });

    socket.on("room:user-left", (data: { participant: Participant; at: string }) => {
      if (disposed) return;
      setTimeline((prev) =>
        appendItem(prev, {
          kind: "system",
          key: nextKey("sys"),
          text: `${data.participant.displayName} meeting se chale gaye`,
          at: data.at,
        })
      );
    });

    socket.on("room:participants", (data: { participants: Participant[] }) => {
      if (!disposed) setParticipants(data.participants);
    });

    socket.on("chat:typing", (data: TypingEvent) => {
      if (disposed) return;
      const key = data.participantId;
      const existing = timers.get(key);
      if (existing !== undefined) window.clearTimeout(existing);

      if (data.isTyping) {
        // Agar typing stop event na aaye to bhi indicator kuch der baad khud hat jaye
        timers.set(
          key,
          window.setTimeout(() => {
            timers.delete(key);
            setTypingMap((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
          }, TYPING_EXPIRE_MS)
        );
        setTypingMap((prev) => ({ ...prev, [key]: data.displayName }));
      } else {
        timers.delete(key);
        setTypingMap((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    });

    socket.on("reaction:received", (data: ReactionEvent) => {
      if (disposed) return;
      setTimeline((prev) =>
        appendItem(prev, {
          kind: "reaction",
          key: nextKey("rxn"),
          displayName: data.displayName,
          emoji: data.emoji,
          at: data.at,
        })
      );
    });

    socket.connect();

    return () => {
      disposed = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      if (socket.connected) socket.emit("room:leave");
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [roomId]);

  const sendMessage = useCallback((message: string): Promise<boolean> => {
    const socket = socketRef.current;
    const currentRoom = roomIdRef.current;
    if (!socket?.connected || !currentRoom) {
      setNotice("Abhi connected nahi hain. Reconnect hone ka intezar karein.");
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      socket.emit(
        "chat:send",
        { roomId: currentRoom, message },
        (res: AckResponse<ChatMessageDto>) => {
          if (!res.ok) setNotice(res.message ?? "Message send nahi ho saka.");
          resolve(res.ok);
        }
      );
    });
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    const socket = socketRef.current;
    const currentRoom = roomIdRef.current;
    if (!socket?.connected || !currentRoom) return;
    socket.emit("chat:typing", { roomId: currentRoom, isTyping });
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    const socket = socketRef.current;
    const currentRoom = roomIdRef.current;
    if (!socket?.connected || !currentRoom) {
      setNotice("Reaction bhejne ke liye connected hona zaroori hai.");
      return;
    }
    socket.emit(
      "reaction:send",
      { roomId: currentRoom, emoji },
      (res: AckResponse) => {
        if (!res.ok) setNotice(res.message ?? "Reaction send nahi ho saka.");
      }
    );
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  return {
    connectionState,
    timeline,
    participants,
    selfId,
    typingNames: Object.values(typingMap),
    notice,
    dismissNotice,
    unreadCount,
    sendMessage,
    sendTyping,
    sendReaction,
  };
}
