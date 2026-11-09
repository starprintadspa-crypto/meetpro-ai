import type { CookieOptions } from "express";
import { env } from "../config/env";

// Cookie header parse karta hai (Socket.IO handshake mein express cookie-parser nahi hota)
export function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const rawValue = part.slice(index + 1).trim();
    try {
      result[key] = decodeURIComponent(rawValue);
    } catch {
      // malformed cookie ignore
    }
  }
  return result;
}

// httpOnly: JavaScript cookie padh nahi sakta (XSS se token chori nahi)
export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}
