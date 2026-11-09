// Room ID generate, validate aur invitation link parse karne ke helpers.
// Room ID frontend par random generate hoti hai (crypto based). Backend
// validation aur database persistence Phase 4 mein aayegi.

const ROOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const ROOM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{4,62}[a-z0-9]$/;
const JITSI_ROOM_PREFIX = "meetpro-";

// Example: "abc-defg-hij"
export function generateRoomId(): string {
  const random = new Uint32Array(10);
  crypto.getRandomValues(random);
  const raw = Array.from(random, (value) => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join("");
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 10)}`;
}

// Room ID ya invitation link (https://.../meeting/abc-defg-hij) dono accept karta hai.
// Valid na ho to null return karta hai.
export function parseRoomInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const segments = trimmed.split(/[?#]/)[0].split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const meetingIndex = segments.lastIndexOf("meeting");
  const candidate =
    (meetingIndex !== -1 ? segments[meetingIndex + 1] : segments[segments.length - 1]) ?? "";

  const normalized = candidate.toLowerCase();
  return ROOM_ID_PATTERN.test(normalized) ? normalized : null;
}

export function toJitsiRoomName(roomId: string): string {
  return `${JITSI_ROOM_PREFIX}${roomId}`;
}

export function buildInviteLink(roomId: string): string {
  return `${window.location.origin}/meeting/${roomId}`;
}
