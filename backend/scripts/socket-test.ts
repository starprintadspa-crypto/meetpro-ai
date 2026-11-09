// Socket.IO integration test. Pehle server chalayein: npm run dev
// Phir: npm run test:socket
import { io, type Socket } from "socket.io-client";

const BASE_URL = process.env.TEST_URL ?? "http://localhost:5000";
const suffix = Date.now().toString(36);
const ROOM_A = `t-${suffix}-a`;
const ROOM_B = `t-${suffix}-b`;

type Inbox = { event: string; payload: any }[];
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) return false;
    await sleep(50);
  }
  return true;
}

function connect(options: Record<string, unknown> = {}): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      ...options,
    });
    const timer = setTimeout(() => reject(new Error("connect timeout")), 5000);
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

function track(socket: Socket): Inbox {
  const inbox: Inbox = [];
  socket.onAny((event: string, payload: any) => inbox.push({ event, payload }));
  return inbox;
}

const got = (inbox: Inbox, event: string, match: (p: any) => boolean = () => true) =>
  inbox.some((e) => e.event === event && match(e.payload));

function call(socket: Socket, event: string, payload: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ack timeout: ${event}`)), 5000);
    socket.emit(event, payload, (response: any) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

async function main() {
  const alice = await connect();
  const aliceIn = track(alice);
  const bob = await connect();
  const bobIn = track(bob);
  const carol = await connect();
  const carolIn = track(carol);

  // ---- Validation ----
  let r = await call(alice, "room:join", { roomId: "BAD ROOM!", displayName: "Alice" });
  check("invalid room id is rejected", r.ok === false && r.error === "INVALID_ROOM_ID", JSON.stringify(r));

  r = await call(alice, "room:join", { roomId: ROOM_A, displayName: "<b>Alice</b>" });
  check("alice joins room A", r.ok === true, JSON.stringify(r));
  check("display name HTML characters stripped", r.data?.self?.displayName === "bAlice/b", r.data?.self?.displayName);

  r = await call(bob, "room:join", { roomId: ROOM_A, displayName: "Bob" });
  check("bob joins room A", r.ok === true);
  check("bob's join ack lists 2 participants", r.data?.participants?.length === 2, String(r.data?.participants?.length));
  await sleep(200);
  check("alice gets user-joined for bob", got(aliceIn, "room:user-joined", (p) => p.participant.displayName === "Bob"));

  // ---- Messaging ----
  r = await call(alice, "chat:send", { roomId: ROOM_A, message: "Hello Bob", senderName: "Spoofed", senderId: "x" });
  check("alice sends message ok", r.ok === true, JSON.stringify(r));
  await sleep(200);
  const bobMsg = bobIn.find((e) => e.event === "chat:message" && e.payload.message === "Hello Bob");
  check("bob receives alice's message instantly", !!bobMsg);
  check(
    "sender identity set by server (client spoofing ignored)",
    bobMsg?.payload.senderName === "bAlice/b" && bobMsg?.payload.senderId === alice.id,
    JSON.stringify(bobMsg?.payload)
  );
  check("message carries timestamp", typeof bobMsg?.payload.createdAt === "string");
  const aliceCopies = aliceIn.filter((e) => e.event === "chat:message" && e.payload.message === "Hello Bob").length;
  check("sender receives exactly one copy", aliceCopies === 1, `copies=${aliceCopies}`);

  // ---- Room isolation ----
  r = await call(carol, "room:join", { roomId: ROOM_B, displayName: "Carol" });
  check("carol joins room B", r.ok === true);
  await call(carol, "chat:send", { roomId: ROOM_B, message: "Secret for B only" });
  await sleep(300);
  check(
    "room B message not delivered to room A",
    !got(aliceIn, "chat:message", (p) => p.message === "Secret for B only") &&
      !got(bobIn, "chat:message", (p) => p.message === "Secret for B only")
  );
  check(
    "room A not notified about room B participant",
    !got(aliceIn, "room:user-joined", (p) => p.participant.displayName === "Carol")
  );
  check(
    "room A message not delivered to room B",
    !got(carolIn, "chat:message", (p) => p.message === "Hello Bob")
  );
  r = await call(carol, "chat:send", { roomId: ROOM_A, message: "Intruder" });
  check("cannot send to a room you have not joined", r.ok === false && r.error === "NOT_IN_ROOM", JSON.stringify(r));

  // ---- Typing and reactions ----
  alice.emit("chat:typing", { roomId: ROOM_A, isTyping: true });
  await sleep(200);
  check(
    "bob sees alice typing",
    got(bobIn, "chat:typing", (p) => p.displayName === "bAlice/b" && p.isTyping === true)
  );
  check("alice does not receive own typing event", !got(aliceIn, "chat:typing"));

  r = await call(bob, "reaction:send", { roomId: ROOM_A, emoji: "👍" });
  await sleep(200);
  check("reaction accepted", r.ok === true, JSON.stringify(r));
  check(
    "reaction delivered to both participants",
    got(aliceIn, "reaction:received", (p) => p.emoji === "👍") &&
      got(bobIn, "reaction:received", (p) => p.emoji === "👍")
  );
  r = await call(bob, "reaction:send", { roomId: ROOM_A, emoji: "<script>" });
  check("arbitrary reaction text rejected", r.error === "INVALID_REACTION", JSON.stringify(r));

  // ---- Message validation ----
  r = await call(bob, "chat:send", { roomId: ROOM_A, message: "   " });
  check("empty message rejected", r.error === "INVALID_MESSAGE");
  r = await call(bob, "chat:send", { roomId: ROOM_A, message: "x".repeat(1001) });
  check("message over 1000 chars rejected", r.error === "INVALID_MESSAGE");
  r = await call(bob, "chat:send", { roomId: ROOM_A, message: "<img src=x onerror=alert(1)>" });
  check(
    "HTML stored as plain text (escaped by UI)",
    r.ok === true && r.data?.message === "<img src=x onerror=alert(1)>",
    JSON.stringify(r)
  );

  // ---- History ----
  const eve = await connect();
  r = await call(eve, "room:join", { roomId: ROOM_A, displayName: "Eve" });
  const texts: string[] = (r.data?.history ?? []).map((m: any) => m.message);
  check(
    "new joiner receives saved chat history",
    texts.includes("Hello Bob") && texts.includes("<img src=x onerror=alert(1)>"),
    JSON.stringify(texts)
  );
  eve.disconnect();

  // ---- Rate limiting ----
  const dave = await connect();
  await call(dave, "room:join", { roomId: ROOM_A, displayName: "Dave" });
  let limited = false;
  for (let i = 0; i < 12; i++) {
    const res = await call(dave, "chat:send", { roomId: ROOM_A, message: `spam ${i}` });
    if (res.error === "RATE_LIMITED") limited = true;
  }
  check("rate limiter blocks message flood", limited);
  dave.disconnect();

  // ---- Join / leave notifications ----
  bob.disconnect();
  await sleep(300);
  check("alice gets user-left when bob disconnects", got(aliceIn, "room:user-left", (p) => p.participant.displayName === "Bob"));
  r = await call(alice, "room:join", { roomId: ROOM_A, displayName: "bAlice/b" });
  check(
    "presence list no longer contains bob",
    !(r.data?.participants ?? []).some((p: any) => p.displayName === "Bob"),
    JSON.stringify(r.data?.participants)
  );

  // ---- Reconnection after network interruption ----
  const frank = await connect({ reconnection: true, reconnectionDelay: 300, reconnectionDelayMax: 500 });
  const frankIn = track(frank);
  let joinedOnce = false;
  let frankJoinOks = 0;
  const joinFrank = async () => {
    const res = await call(frank, "room:join", { roomId: ROOM_A, displayName: "Frank" });
    if (res.ok) frankJoinOks++;
    return res;
  };
  frank.on("connect", () => {
    if (joinedOnce) void joinFrank();
  });
  await joinFrank();
  joinedOnce = true;
  const beforeId = frank.id;
  // Network drop simulate: transport band karna (client auto-reconnect karega)
  (frank.io as any).engine.close();
  const reconnected = await waitFor(() => frank.connected && frank.id !== beforeId, 8000);
  await sleep(300);
  check("client auto-reconnects after network drop", reconnected);
  check("client rejoins its meeting after reconnect", frankJoinOks >= 2, `joins=${frankJoinOks}`);
  r = await call(frank, "chat:send", { roomId: ROOM_A, message: "Back online" });
  check("messages work after reconnect", r.ok === true, JSON.stringify(r));
  await sleep(200);
  check("alice receives message sent after reconnect", got(aliceIn, "chat:message", (p) => p.message === "Back online"));
  check(
    "others saw frank leave and rejoin",
    got(aliceIn, "room:user-left", (p) => p.participant.displayName === "Frank") &&
      aliceIn.filter((e) => e.event === "room:user-joined" && e.payload.participant.displayName === "Frank").length >= 2
  );

  // ---- Cleanup ----
  [alice, carol, frank].forEach((s) => s.disconnect());
  void frankIn;

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Test crashed:", error);
  process.exit(1);
});
