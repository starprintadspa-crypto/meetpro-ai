import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import apiRoutes from "./routes";

export const app = express();

// Security headers
app.use(helmet());

// Sirf apna frontend allow karein (cookies ke saath)
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Request body size limit
app.use(express.json({ limit: "100kb" }));

// Global rate limiting (15 minute mein 300 requests per IP)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check route
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "MEETPRO AI API",
    time: new Date().toISOString(),
  });
});

// Auth aur meeting APIs
app.use("/api", apiRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler (internal details frontend ko nahi bhejte)
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Server error:", err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
);
