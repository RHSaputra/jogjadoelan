// lib/auth.config.ts
// Edge-safe config — TIDAK BOLEH import Prisma/bcrypt/mariadb.
// Dipakai oleh middleware (edge runtime) DAN di-spread oleh lib/auth.ts.

import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true, // NextAuth v5 beta: allow Turbopack dev origin mismatch
  session: { 
    strategy: "jwt", 
    maxAge: 60 * 60 * 24 * 30, // 30 hari
    updateAge: 60 * 60, // Update token every 1 hour
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    // Providers full ada di lib/auth.ts (butuh Prisma).
    // Di sini kosong supaya middleware tetap bisa baca JWT tanpa import DB.
  ],
  callbacks: {
    async jwt({ token, user }) {
      // First login — set user data
      if (user) {
        const safeUser = user as { id?: string; username?: string; email?: string; role?: "USER" | "ADMIN" | "SUPER_ADMIN"; name?: string };
        token.id = safeUser.id ?? token.id;
        token.username = safeUser.username ?? token.username;
        token.email = safeUser.email ?? token.email;
        token.role = safeUser.role ?? token.role;
        token.name = safeUser.name ?? safeUser.username ?? token.name;
      }
      // Ensure token always has required fields
      if (!token.iat) token.iat = Math.floor(Date.now() / 1000);
      return token;
    },
    async session({ session, token }) {
      // Ensure session.user exists
      if (!session.user) {
        type SessionUserShape = {
          id: string;
          username: string;
          email: string;
          name: string;
          role: "USER" | "ADMIN" | "SUPER_ADMIN";
          avatar: string | null;
          passwordHash: string | null;
          provider: "credentials" | string;
          emailVerified: Date | null;
        };

        const fallbackUser: SessionUserShape = {
          id: "",
          username: "",
          email: "",
          name: "",
          role: "USER",
          avatar: null,
          passwordHash: null,
          provider: "credentials",
          emailVerified: null,
        };

        session.user = fallbackUser;
      }
      
      // Map token to session.user
      if (token) {
        const sessionUser = session.user as {
          id?: string;
          username?: string;
          email?: string;
          role?: "USER" | "ADMIN" | "SUPER_ADMIN";
          name?: string;
        };
        sessionUser.id = typeof token.id === "string" ? token.id : undefined;
        sessionUser.username = typeof token.username === "string" ? token.username : undefined;
        sessionUser.email = typeof token.email === "string" ? token.email : sessionUser.email;
        sessionUser.name = typeof token.name === "string" ? token.name : sessionUser.name;
        sessionUser.role =
          token.role === "USER" || token.role === "ADMIN" || token.role === "SUPER_ADMIN"
            ? token.role
            : undefined;
      }
      return session;
    },
  },
};