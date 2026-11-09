import { config } from "../utils/config";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Cookies ke saath request (session cookie httpOnly hai, JS se access nahi hota)
async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : {},
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new ApiError(data.message ?? "Kuch ghalat hua. Dobara koshish karein.", response.status);
  }
  return data as T;
}

export const authApi = {
  me: () => request<{ user: AuthUser }>("/api/auth/me"),
  register: (input: { name: string; email: string; password: string }) =>
    request<{ user: AuthUser }>("/api/auth/register", { method: "POST", body: input }),
  login: (input: { email: string; password: string }) =>
    request<{ user: AuthUser }>("/api/auth/login", { method: "POST", body: input }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
};
