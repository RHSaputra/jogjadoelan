// middleware.ts
// Edge runtime — wajib import dari lib/auth.config (tanpa Prisma/bcrypt).

import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { rateLimit, API_GENERAL, API_AUTH, API_WRITE } from "@/lib/rate-limit";

const { auth } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/admin/:path*",
    // Jangan jalankan middleware untuk endpoint internal Auth.js.
    // Endpoint seperti /api/auth/session dan /api/auth/csrf dipanggil otomatis
    // oleh next-auth/react; jika ikut rate limit, client bisa terkena
    // ClientFetchError saat SessionProvider/signIn mengambil data auth.
    "/api/:path*",
  ],
};

const AUTH_JS_INTERNAL_PATHS = [
  "/api/auth/session",
  "/api/auth/csrf",
  "/api/auth/providers",
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/auth/error",
  "/api/auth/verify-request",
  "/api/auth/webauthn-options",
];

/** Auth.js endpoints used by next-auth/react internally. */
function isAuthJsInternalPath(pathname: string): boolean {
  return (
    AUTH_JS_INTERNAL_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    ) || pathname.startsWith("/api/auth/callback/")
  );
}

/** Get client IP from request headers */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Add Cache-Control headers based on route type */
function addCacheHeaders(req: NextRequest, res: NextResponse): void {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return;

  // Auth / upload — never cache
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/admin/upload")
  ) {
    res.headers.set("Cache-Control", "private, no-store");
    return;
  }

  // Admin routes — never cache (sensitive data)
  if (pathname.startsWith("/api/admin/")) {
    res.headers.set("Cache-Control", "private, no-store");
    return;
  }

  // User-specific data — private, revalidate
  if (
    pathname.startsWith("/api/cart") ||
    pathname.startsWith("/api/wishlist") ||
    pathname.startsWith("/api/notifikasi") ||
    pathname.startsWith("/api/akun") ||
    pathname.startsWith("/api/order") ||
    pathname.startsWith("/api/custom") ||
    pathname.startsWith("/api/komplain") ||
    pathname.startsWith("/api/refund") ||
    pathname.startsWith("/api/tukar") ||
    pathname.startsWith("/api/ulasan") ||
    pathname.startsWith("/api/chat")
  ) {
    res.headers.set("Cache-Control", "private, must-revalidate");
    return;
  }

  // Public read-only data — cache 60s, stale-while-revalidate 5min
  if (
    pathname.startsWith("/api/produk") ||
    pathname.startsWith("/api/kategori") ||
    pathname.startsWith("/api/wilayah") ||
    pathname.startsWith("/api/ongkir") ||
    pathname.startsWith("/api/qris")
  ) {
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    return;
  }

  // Default — no cache
  res.headers.set("Cache-Control", "private, no-store");
}

/** Apply rate limiting to /api/* routes */
function applyApiRateLimit(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return null;

  // Auth.js internal endpoints are fetched frequently by next-auth/react
  // (/session, /csrf, /providers, OAuth callbacks). Let Auth.js handle them
  // directly so middleware rate-limit responses do not surface as
  // Auth.js ClientFetchError in the browser console.
  if (isAuthJsInternalPath(pathname)) return null;

  const ip = getClientIp(req);
  const method = req.method;

  // Sensitive custom auth endpoints — strictest (10 req/min).
  // GET /api/auth/me is allowed to fall through to the general read limiter.
  if (pathname.startsWith("/api/auth/") && method !== "GET" && method !== "HEAD") {
    const result = rateLimit(`auth:${ip}`, API_AUTH.maxRequests, API_AUTH.windowMs);
    if (!result.allowed) {
      return NextResponse.json(
        { error: { message: "Terlalu banyak percobaan. Coba lagi dalam beberapa saat." } },
        { status: 429, headers: { "Retry-After": String(result.retryAfter), "X-RateLimit-Remaining": "0" } },
      );
    }
    return null;
  }

  // Upload endpoints — moderate (20 req/min)
  if (pathname.startsWith("/api/upload") || pathname.startsWith("/api/admin/upload")) {
    const result = rateLimit(`upload:${ip}`, 20, 60_000);
    if (!result.allowed) {
      return NextResponse.json(
        { error: { message: "Terlalu banyak upload. Coba lagi dalam beberapa saat." } },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
      );
    }
    return null;
  }

  // Write endpoints (POST/PUT/DELETE/PATCH) — moderate (30 req/min)
  if (method !== "GET" && method !== "HEAD") {
    const result = rateLimit(`write:${ip}`, API_WRITE.maxRequests, API_WRITE.windowMs);
    if (!result.allowed) {
      return NextResponse.json(
        { error: { message: "Terlalu banyak permintaan. Coba lagi dalam beberapa saat." } },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
      );
    }
    return null;
  }

  // Read endpoints (GET) — generous (100 req/min)
  const result = rateLimit(`read:${ip}`, API_GENERAL.maxRequests, API_GENERAL.windowMs);
  if (!result.allowed) {
    return NextResponse.json(
      { error: { message: "Terlalu banyak permintaan. Coba lagi dalam beberapa saat." } },
      { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
    );
  }
  return null;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  // Safety net in case matcher behavior changes: never interfere with
  // Auth.js internal endpoints used by SessionProvider/signIn/signOut.
  if (isAuthJsInternalPath(pathname)) {
    return NextResponse.next();
  }

  // Rate limit — applies to /api/* routes
  const rateLimitResponse = applyApiRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  // For API routes — add Cache-Control and return (no admin auth needed)
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    addCacheHeaders(req, res);
    return res;
  }

  // === Admin auth logic (only for /admin/* routes) ===

  // /admin/login boleh diakses tanpa session
  if (pathname === "/admin/login") {
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  // Lupa password halaman publik
  if (pathname.startsWith("/admin/lupa-password")) {
    return NextResponse.next();
  }

  // Proteksi sisa /admin/*
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});