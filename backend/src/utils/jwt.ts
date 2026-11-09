import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface SessionPayload {
  sub: string;
  email: string;
}

const TTL_SECONDS = env.SESSION_TTL_DAYS * 24 * 60 * 60;

export function signSession(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: TTL_SECONDS,
  });
}

// Invalid, expired ya tampered token par null
export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decoded !== "object" || typeof decoded.sub !== "string") return null;
    return { sub: decoded.sub, email: String(decoded.email ?? "") };
  } catch {
    return null;
  }
}
