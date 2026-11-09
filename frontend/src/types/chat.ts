// Chat aur presence ke types. Backend ke events ke saath match karte hain.

// Backend ki allowed reactions list ke saath same honi chahiye
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "👏", "🎉"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const CHAT_MAX_LENGTH = 1000;

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

export interface Participant {
  participantId: string;
  displayName: string;
  joinedAt: string;
}

export interface ChatMessageDto {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface TypingEvent {
  roomId: string;
  participantId: string;
  displayName: string;
  isTyping: boolean;
}

export interface ReactionEvent {
  roomId: string;
  participantId: string;
  displayName: string;
  emoji: string;
  at: string;
}

export interface AckResponse<T = unknown> {
  ok: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface JoinAckData {
  roomId: string;
  self: Participant;
  participants: Participant[];
  history: ChatMessageDto[];
}

// Chat panel mein dikhne wali sab items (messages, system notices, reactions)
export type TimelineItem =
  | {
      kind: "message";
      key: string;
      id: string;
      senderId: string;
      senderName: string;
      message: string;
      createdAt: string;
    }
  | { kind: "system"; key: string; text: string; at: string }
  | { kind: "reaction"; key: string; displayName: string; emoji: string; at: string };
