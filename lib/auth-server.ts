// lib/auth-server.ts
// Helper auth server-side untuk dipakai di API route handler.

import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email ?? "",
    role: session.user.role,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) {
    throw new Response(
      JSON.stringify({ error: { message: "Belum login", code: "UNAUTHENTICATED" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN" && u.role !== "SUPER_ADMIN") {
    throw new Response(
      JSON.stringify({ error: { message: "Akses ditolak", code: "FORBIDDEN" } }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return u;
}

export async function requireCustomer(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "USER") {
    throw new Response(
      JSON.stringify({ error: { message: "Hanya customer", code: "FORBIDDEN" } }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return u;
}