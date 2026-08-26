// next-auth.d.ts
// Type augmentation supaya session.user punya field custom kita.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "USER" | "ADMIN" | "SUPER_ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    role: "USER" | "ADMIN" | "SUPER_ADMIN";
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "USER" | "ADMIN" | "SUPER_ADMIN";
  }
}