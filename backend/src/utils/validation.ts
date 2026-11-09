// Client se aane wale data ko yahin validate/sanitize kiya jata hai.
// Client ki kisi bhi value par trust nahi kiya jata.

const ROOM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{4,62}[a-z0-9]$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_TITLE_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// Sirf ye reactions allowed hain (arbitrary text reject)
export const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "👏", "🎉"] as const;

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function isValidRoomId(value: unknown): value is string {
  return typeof value === "string" && ROOM_ID_PATTERN.test(value);
}

// Wrong type -> null (reject). Khali naam -> "Guest"
export function sanitizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  return cleaned.length > 0 ? cleaned : "Guest";
}

// Registration ke liye naam: 2-60 characters, control characters nahi
export function sanitizePersonName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 2 && cleaned.length <= 60 ? cleaned : null;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

export function isValidPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_PASSWORD_LENGTH &&
    value.length <= MAX_PASSWORD_LENGTH
  );
}

export function sanitizeTitle(value: unknown): string {
  if (typeof value !== "string") return "Meeting";
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
  return cleaned.length > 0 ? cleaned : "Meeting";
}

// Control characters hata kar message trim karta hai. Empty ya bahut lamba message null.
export function sanitizeMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (cleaned.length === 0 || cleaned.length > MAX_MESSAGE_LENGTH) return null;
  return cleaned;
}

export function isAllowedReaction(value: unknown): value is (typeof ALLOWED_REACTIONS)[number] {
  return typeof value === "string" && (ALLOWED_REACTIONS as readonly string[]).includes(value);
}
