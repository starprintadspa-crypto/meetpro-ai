import dotenv from "dotenv";
import path from "path";

// Loads backend/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const PLACEHOLDER_SECRET = "replace-with-a-long-random-secret";

// JWT secret ke baghair server start nahi hota (weak/placeholder bhi reject)
function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? "";
  if (secret.length < 32 || secret === PLACEHOLDER_SECRET) {
    throw new Error(
      "JWT_SECRET missing ya weak hai. backend/.env mein 32+ characters ka random secret set karein (README dekhein)."
    );
  }
  return secret;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 5000),
  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:5173",
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
  JITSI_DOMAIN: process.env.JITSI_DOMAIN ?? "meet.jit.si",
  isProduction: process.env.NODE_ENV === "production",
  JWT_SECRET: requireJwtSecret(),
  AUTH_COOKIE_NAME: "meetpro_session",
  SESSION_TTL_DAYS: 7,
};
