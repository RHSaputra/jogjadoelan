/**
 * lib/logger.ts
 *
 * Production-safe logger. In development, logs to console.
 * In production, all logs are no-ops (except errors which go to console.error).
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("Server started");
 *   logger.error("Something failed", err);
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Errors always log in dev; in production they go to stderr for monitoring
    if (isDev) {
      console.error(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
};