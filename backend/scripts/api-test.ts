// REST API integration test. Pehle server chalayein (npm run dev), phir: npm run test:api
import { io, type Socket } from "socket.io-client";

const BASE_URL = process.env.TEST_URL ?? "http://localhost:5000";
const stamp = Date.now().toString(36);
const password = "StrongPass123";
const emailA = `alice-${stamp}@example.com`;
const emailB = `bob-${stamp}@example.com`;
const COOKIE_NAME = "meetpro_session";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}

interface ApiResult {
  status: number;
  json: any;
  setCookie: string[];
}

async function api(path: string, opts: { method?: string; body?: unknown; cookie?: string } = {}): Promise<ApiResult> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  const res = await fetch(BASE_URL + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }
  return { status: res.status, json, setCookie: res.headers.getSetCookie?.() ?? [] };
}

function sessionFrom(result: ApiResult): string {
  const raw = result.setCookie.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return raw ? raw.split(";")[0] : "";
}

function connectSocket(cookie?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      extraHeaders: cookie ? { Cookie: cookie } : {},
    });
    const timer = setTimeout(() => reject(new Error("socket connect timeout")), 5000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("connect_error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function joinRoom(socket: Socket, roomId: string, displayName: string): Promise<any> {
  return new Promise((resolve) => socket.emit("room:join", { roomId, displayName }, resolve));
}

async function main() {
  // ---- Registration ----
  let r = await api("/api/auth/register", { method: "POST", body: { email: emailA, name: "A", password } });
  check("name shorter than 2 chars rejected", r.status === 400, String(r.status));

  r = await api("/api/auth/register", { method: "POST", body: { email: "not-an-email", name: "Alice Tester", password } });
  check("invalid email rejected", r.status === 400, String(r.status));

  r = await api("/api/auth/register", { method: "POST", body: { email: emailA, name: "Alice Tester", password: "short" } });
  check("weak (short) password rejected", r.status === 400, String(r.status));

  r = await api("/api/auth/register", { method: "POST", body: { email: emailA.toUpperCase(), name: "Alice Tester", password } });
  check("registration succeeds (201)", r.status === 201, JSON.stringify(r.json));
  const aliceRegCookie = sessionFrom(r);
  check("session cookie is set on register", aliceRegCookie.length > COOKIE_NAME.length + 1);
  const aliceCookieHeader = r.setCookie.find((c) => c.startsWith(COOKIE_NAME)) ?? "";
  check("cookie is HttpOnly and SameSite=Lax", /HttpOnly/i.test(aliceCookieHeader) && /SameSite=Lax/i.test(aliceCookieHeader), aliceCookieHeader);
  check("email stored normalized (lowercase)", r.json?.user?.email === emailA);
  check("password hash never returned", !JSON.stringify(r.json).includes("scrypt$") && r.json?.user?.passwordHash === undefined);
  const aliceId = r.json?.user?.id as string;

  r = await api("/api/auth/register", { method: "POST", body: { email: emailA, name: "Alice Again", password } });
  check("duplicate email rejected (409)", r.status === 409, String(r.status));

  // ---- Login ----
  r = await api("/api/auth/login", { method: "POST", body: { email: emailA, password: "WrongPass999" } });
  check("wrong password rejected (401)", r.status === 401, String(r.status));
  const wrongPassMsg = r.json?.message;

  r = await api("/api/auth/login", { method: "POST", body: { email: `nobody-${stamp}@example.com`, password } });
  check("unknown email rejected with same message (401)", r.status === 401 && r.json?.message === wrongPassMsg, JSON.stringify(r.json));

  r = await api("/api/auth/login", { method: "POST", body: { email: emailA, password } });
  check("login succeeds (200)", r.status === 200, JSON.stringify(r.json));
  const aliceCookie = sessionFrom(r);
  check("login sets session cookie", aliceCookie.length > 0);

  // ---- Protected routes ----
  r = await api("/api/auth/me");
  check("/me without cookie -> 401", r.status === 401, String(r.status));

  r = await api("/api/auth/me", { cookie: aliceCookie });
  check("/me with valid cookie -> 200 with user", r.status === 200 && r.json?.user?.id === aliceId, JSON.stringify(r.json));

  r = await api("/api/auth/me", { cookie: `${COOKIE_NAME}=eyJhbGciOiJIUzI1NiJ9.e30.invalidsignature` });
  check("forged/tampered cookie -> 401", r.status === 401, String(r.status));

  // ---- Meetings ----
  r = await api("/api/meetings", { method: "POST", body: { title: "No auth" } });
  check("create meeting without login -> 401", r.status === 401, String(r.status));

  r = await api("/api/meetings", { method: "POST", cookie: aliceCookie, body: { title: "  Team <b>Sync</b>  " } });
  check("create meeting with login -> 201", r.status === 201, JSON.stringify(r.json));
  const meeting = r.json?.meeting;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  check("meeting roomId is a UUID v4", uuidPattern.test(meeting?.roomId ?? ""), meeting?.roomId);
  check("title sanitized (angle brackets removed, whitespace collapsed)", meeting?.title === "Team bSync/b", meeting?.title);
  check("invite URL contains roomId", String(meeting?.inviteUrl).endsWith(`/meeting/${meeting?.roomId}`), meeting?.inviteUrl);
  check("hostId is the logged-in user", meeting?.hostId === aliceId);

  r = await api("/api/meetings", { method: "POST", cookie: aliceCookie, body: { scheduledAt: "2001-01-01T10:00:00Z" } });
  check("past scheduledAt rejected", r.status === 400, String(r.status));

  const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  r = await api("/api/meetings", { method: "POST", cookie: aliceCookie, body: { title: "Scheduled", scheduledAt: future } });
  check("future scheduledAt accepted", r.status === 201 && r.json?.meeting?.scheduledAt === future, JSON.stringify(r.json));

  r = await api("/api/auth/register", { method: "POST", body: { email: emailB, name: "Bob Tester", password } });
  const bobCookie = sessionFrom(r);

  r = await api("/api/meetings/mine", { cookie: aliceCookie });
  check("list mine returns Alice's meetings", r.status === 200 && r.json.meetings.length >= 2, JSON.stringify(r.json));
  r = await api("/api/meetings/mine", { cookie: bobCookie });
  check("list mine isolates Bob (no Alice meetings)", r.status === 200 && r.json.meetings.length === 0, JSON.stringify(r.json));

  r = await api(`/api/meetings/${meeting.roomId}`);
  check("public meeting lookup by roomId -> 200", r.status === 200 && r.json?.meeting?.roomId === meeting.roomId, JSON.stringify(r.json));
  check("public lookup does not expose hostId", r.json?.meeting?.hostId === undefined);

  r = await api("/api/meetings/BAD%20ID!");
  check("invalid roomId lookup -> 400", r.status === 400, String(r.status));

  r = await api("/api/meetings/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
  check("unknown roomId lookup -> 404", r.status === 404, String(r.status));

  r = await api("/api/does-not-exist");
  check("unknown API route -> 404 JSON", r.status === 404 && r.json?.message === "Route not found", String(r.status));

  // ---- Logout ----
  r = await api("/api/auth/logout", { method: "POST", cookie: aliceCookie });
  const cleared = r.setCookie.find((c) => c.startsWith(COOKIE_NAME)) ?? "";
  check("logout clears the session cookie", r.status === 200 && /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(cleared), cleared);

  // ---- Socket.IO identity (cookie verified on server) ----
  const loginA = await api("/api/auth/login", { method: "POST", body: { email: emailA, password } });
  const aliceSessionCookie = sessionFrom(loginA);
  const roomId = meeting.roomId as string;

  const verified = await connectSocket(aliceSessionCookie);
  const verifiedJoin = await joinRoom(verified, roomId, "Impostor Name");
  check(
    "logged-in socket uses verified account name (client name ignored)",
    verifiedJoin.ok === true && verifiedJoin.data?.self?.displayName === "Alice Tester",
    JSON.stringify(verifiedJoin)
  );
  verified.disconnect();

  const guest = await connectSocket(`${COOKIE_NAME}=forged.token.value`);
  const guestJoin = await joinRoom(guest, roomId, "Guest Visitor");
  check(
    "forged cookie socket treated as guest (client name used)",
    guestJoin.ok === true && guestJoin.data?.self?.displayName === "Guest Visitor",
    JSON.stringify(guestJoin)
  );
  guest.disconnect();

  const anonymous = await connectSocket();
  const anonJoin = await joinRoom(anonymous, roomId, "Anon");
  check("guest without cookie can still join chat", anonJoin.ok === true);
  anonymous.disconnect();

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("API test crashed:", error);
  process.exit(1);
});
