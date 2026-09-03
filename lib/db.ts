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

function parseDbUrl(rawUrl: string) {
  const url = rawUrl.trim().replace(/^["']|["']$/g, "");
  const u = new URL(url);
  const isProd = process.env.NODE_ENV === "production";
  
  // Serverless functions di Vercel harus menggunakan connection limit kecil (e.g. 2-5)
  // untuk mencegah habisnya slot koneksi database (database connection limit exhaustion).
  const defaultLimit = isProd ? 3 : 10;
  const rawLimit = process.env.DATABASE_CONNECTION_LIMIT 
    ? Number(process.env.DATABASE_CONNECTION_LIMIT) 
    : defaultLimit;
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(20, rawLimit)) : defaultLimit;

  // Cloud database (seperti TiDB Cloud Serverless / Aiven) mewajibkan koneksi TLS/SSL
  const isRemote = u.hostname !== "localhost" && u.hostname !== "127.0.0.1";
  const sslParam = u.searchParams.get("ssl") || u.searchParams.get("sslaccept");
  const useSsl = isRemote || Boolean(sslParam);

  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username || "root"),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: limit,
    connectTimeout: 20000,
    acquireTimeout: 20000,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
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

// Persist singleton on globalThis to guarantee connection pool reuse across warm executions
global.__PRISMA__ = prisma;