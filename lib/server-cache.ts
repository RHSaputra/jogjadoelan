/**
 * lib/server-cache.ts
 *
 * In-memory server-side cache dengan TTL.
 * Digunakan untuk cache hasil query DB yang jarang berubah
 * (misal: settings toko, kategori produk, dll.)
 *
 * NOTE: Cache ini per-instance (in-process).
 * Untuk multi-instance production, gunakan Redis.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ServerCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-cleanup setiap 5 menit
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Hapus semua key yang diawali prefix */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** Jalankan fungsi jika cache miss, simpan hasilnya */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fn();
    this.set(key, data, ttlMs);
    return data;
  }

  /** Bersihkan entri expired */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  get size(): number {
    return this.store.size;
  }
}

// Singleton — dibuat sekali per process
declare global {
  var __SERVER_CACHE__: ServerCache | undefined;
}

export const serverCache = global.__SERVER_CACHE__ ?? new ServerCache();

if (process.env.NODE_ENV !== "production") {
  global.__SERVER_CACHE__ = serverCache;
}

// ─── TTL constants ─────────────────────────────────────────────────
export const TTL = {
  /** 30 detik — data yang cukup sering berubah */
  SHORT: 30_000,
  /** 5 menit — data semi-static */
  MEDIUM: 5 * 60 * 1000,
  /** 15 menit — data yang jarang berubah */
  LONG: 15 * 60 * 1000,
  /** 1 jam — data sangat jarang berubah */
  VERY_LONG: 60 * 60 * 1000,
} as const;
