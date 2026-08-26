// lib/api/response.ts
// Helper response standar untuk semua API route.
// SUKSES → { data: T }
// GAGAL  → { error: { message, code?, fields? } }

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(
  status: number,
  message: string,
  code?: string,
  fields?: Record<string, string>,
) {
  return NextResponse.json({ error: { message, code, fields } }, { status });
}

/**
 * Wrapper untuk handler API — auto-catch error umum:
 * - ZodError → 422 dengan fields
 * - Response (dari requireUser/requireAdmin) → forward
 * - Error lain → 500 generic
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      // Forward Response thrown by requireUser/requireAdmin
      if (err instanceof Response) return err;

      // Zod validation error
      if (err instanceof ZodError) {
        const fields: Record<string, string> = {};
        const messages: string[] = [];
        for (const issue of err.issues) {
          const key = issue.path.join(".") || "_";
          fields[key] = issue.message;
          messages.push(issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message);
        }
        const msg = messages.length ? messages.join("; ") : "Validasi gagal";
        return fail(422, msg, "VALIDATION", fields);
      }

      console.error("[API ERROR]", err);
      const msg =
        process.env.NODE_ENV === "development"
          ? (err as Error)?.message ?? "Server error"
          : "Terjadi kesalahan server";
      return fail(500, msg, "INTERNAL");
    }
  };
}