import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { createUser, findUserByEmail, type PublicUser } from "../services/userService";
import { hashPassword, verifyPassword } from "../utils/password";
import { signSession } from "../utils/jwt";
import { sessionCookieOptions } from "../utils/cookies";
import { asRecord, isValidPassword, normalizeEmail, sanitizePersonName } from "../utils/validation";
import { getAuthUser } from "../middleware/auth";

// Login par user na mile to bhi same time lage (email enumeration timing attack se bachao)
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("timing-equalizer-not-a-real-password");
  return dummyHashPromise;
}

function setSessionCookie(res: Response, user: PublicUser): void {
  res.cookie(env.AUTH_COOKIE_NAME, signSession(user.id, user.email), sessionCookieOptions());
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = asRecord(req.body);
    const email = normalizeEmail(body.email);
    const name = sanitizePersonName(body.name);

    if (!email) {
      res.status(400).json({ message: "Valid email address daalein." });
      return;
    }
    if (!name) {
      res.status(400).json({ message: "Naam 2 se 60 characters ke beech hona chahiye." });
      return;
    }
    if (!isValidPassword(body.password)) {
      res.status(400).json({ message: "Password 8 se 128 characters ka hona chahiye." });
      return;
    }

    const user = await createUser({
      email,
      name,
      passwordHash: await hashPassword(body.password),
    });
    setSessionCookie(res, user);
    res.status(201).json({ user });
  } catch (error) {
    if ((error as { code?: string }).code === "EMAIL_TAKEN") {
      res.status(409).json({ message: "Ye email pehle se registered hai." });
      return;
    }
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = asRecord(req.body);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" && body.password.length <= 128 ? body.password : "";
    const invalidMessage = "Email ya password galat hai.";

    const user = email ? await findUserByEmail(email) : null;
    const hashToCheck = user?.passwordHash ?? (await getDummyHash());
    const passwordOk = password.length > 0 && (await verifyPassword(password, hashToCheck));

    if (!user || !passwordOk) {
      res.status(401).json({ message: invalidMessage });
      return;
    }

    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
    setSessionCookie(res, publicUser);
    res.json({ user: publicUser });
  } catch (error) {
    next(error);
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(env.AUTH_COOKIE_NAME, { path: "/", httpOnly: true, sameSite: "lax", secure: env.isProduction });
  res.json({ ok: true });
}

export function me(_req: Request, res: Response): void {
  res.json({ user: getAuthUser(res) });
}
