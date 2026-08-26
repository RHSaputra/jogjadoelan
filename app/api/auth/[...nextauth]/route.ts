// app/api/auth/[...nextauth]/route.ts
// NextAuth handler — expose supported auth methods.

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";