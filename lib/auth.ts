// lib/auth.ts
// Full NextAuth config (Node runtime). Import dari API route & server actions.
// JANGAN import file ini di middleware — pakai @/lib/auth.config saja.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

const userLoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      id: "user-credentials",
      name: "User",
      credentials: {
        identifier: { label: "Username/Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = userLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const id = parsed.data.identifier.trim().toLowerCase();
        const user = await prisma.user.findFirst({
          where: { OR: [{ email: id }, { username: id }] },
        });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.username, // Set name for NextAuth session
          role: "USER" as const,
        };
      },
    }),
    Credentials({
      id: "admin-credentials",
      name: "Admin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = adminLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const admin = await prisma.adminuser.findUnique({
          where: { username: parsed.data.username.trim() },
        });
        if (!admin || !admin.aktif) return null;
        const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
        if (!ok) return null;
        // Update lastLoginAt secara aman — pakai await biar tidak unhandled rejection
        await prisma.adminuser
          .update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {});
        return {
          id: admin.id,
          username: admin.username,
          email: admin.email ?? `${admin.username}@admin.local`,
          name: admin.nama || admin.username, // Set name for NextAuth session
          role: admin.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // Only handle Google OAuth — credentials providers handle themselves.
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      type UserWithClaims = typeof user & { username?: string; role?: "USER" };
      const email = user.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });

      if (!existing) {
        // Auto-create user with provider=GOOGLE
        const baseUsername = email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase() || `user${Date.now()}`;
        let username = baseUsername;
        let suffix = 0;
        while (await prisma.user.findUnique({ where: { username } })) {
          suffix++;
          username = `${baseUsername}${suffix}`;
        }
        const created = await prisma.user.create({
          data: {
            email,
            username,
            noHp: "",
            passwordHash: null,
            avatar: user.image ?? null,
            provider: "GOOGLE",
          },
        });
        user.id = created.id;
        (user as UserWithClaims).username = created.username;
        (user as UserWithClaims).role = "USER";
      } else {
        user.id = existing.id;
        (user as UserWithClaims).username = existing.username;
        (user as UserWithClaims).role = "USER";
      }
      return true;
    },
  },
});