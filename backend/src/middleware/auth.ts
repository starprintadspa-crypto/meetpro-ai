import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { findUserById, type PublicUser } from "../services/userService";
import { parseCookies } from "../utils/cookies";
import { verifySession } from "../utils/jwt";

// Cookie se user nikalta hai. Koi bhi galti -> null (kabhi throw nahi karta)
export async function resolveUserFromCookieHeader(header: string | undefined): Promise<PublicUser | null> {
  try {
    const token = parseCookies(header)[env.AUTH_COOKIE_NAME];
    if (!token) return null;
    const session = verifySession(token);
    if (!session) return null;
    // Token valid hai to bhi DB se user confirm karte hain (deleted user ka session nahi chalega)
    return await findUserById(session.sub);
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveUserFromCookieHeader(req.headers.cookie);
    if (!user) {
      res.status(401).json({ message: "Login zaroori hai." });
      return;
    }
    res.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function getAuthUser(res: Response): PublicUser {
  return res.locals.user as PublicUser;
}
