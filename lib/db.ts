// lib/db.ts
// Singleton PrismaClient — penting di dev (Next.js HMR) supaya tidak
// bikin connection pool baru tiap reload.
//
// Prisma 7 WAJIB pakai driver adapter. Untuk MySQL pakai @prisma/adapter-mariadb
// (mariadb driver wire-protocol-compatible dengan MySQL 5.7+/8.x).

import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

declare global {
  var __PRISMA__: PrismaClient | undefined;
}

function parseDbUrl(url: string) {
  const u = new URL(url);
  const isProd = process.env.NODE_ENV === "production";
  
  // Serverless functions di Vercel harus menggunakan connection limit kecil (e.g. 2-5)
  // untuk mencegah habisnya slot koneksi database (database connection limit exhaustion).
  const defaultLimit = isProd ? 3 : 10;
  const limit = process.env.DATABASE_CONNECTION_LIMIT 
    ? Number(process.env.DATABASE_CONNECTION_LIMIT) 
    : defaultLimit;

  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username || "root"),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: limit,
  };
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL belum diset di .env");
  }
  const adapter = new PrismaMariaDb(parseDbUrl(url));
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = global.__PRISMA__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__PRISMA__ = prisma;
}