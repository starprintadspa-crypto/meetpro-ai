// Per-socket, per-event fixed window rate limiter
interface RateRule {
  max: number;
  windowMs: number;
}

export class SocketRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(private readonly rules: Record<string, RateRule>) {}

  hit(socketId: string, event: string): boolean {
    const rule = this.rules[event];
    if (!rule) return true;

    const key = `${socketId}:${event}`;
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < rule.windowMs);

    if (recent.length >= rule.max) {
      this.hits.set(key, recent);
      return false;
    }

    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  // Disconnect par us socket ka record saaf karta hai
  forget(socketId: string): void {
    for (const key of this.hits.keys()) {
      if (key.startsWith(`${socketId}:`)) this.hits.delete(key);
    }
  }
}

export const rateLimiter = new SocketRateLimiter({
  "room:join": { max: 5, windowMs: 30_000 },
  "chat:send": { max: 10, windowMs: 10_000 },
  "chat:typing": { max: 30, windowMs: 10_000 },
  "reaction:send": { max: 10, windowMs: 10_000 },
});
