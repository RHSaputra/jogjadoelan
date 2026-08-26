import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import pusher from "@/lib/pusher-server";
import { requireUser, requireAdmin, getSessionUser } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    let socket_id: string | null = null;
    let channel_name: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      socket_id = body.socket_id;
      channel_name = body.channel_name;
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      socket_id = params.get("socket_id");
      channel_name = params.get("channel_name");
    }

    if (!socket_id || !channel_name) {
      return NextResponse.json({ ok: false, error: "missing socket_id or channel_name" }, { status: 400 });
    }

    // Authorization rules:
    // - admin channels (admin-chat, private-admin-*) require admin
    // - private-chat-<userId> allowed for the matching user or for admins
    // - private-komplain-<komplainId> allowed for the matching user or for admins
    if (channel_name === "admin-chat" || channel_name.startsWith("private-admin")) {
      await requireAdmin();
    } else if (channel_name.startsWith("private-chat-")) {
      const session = await getSessionUser();
      const target = channel_name.replace("private-chat-", "");
      if (!session) {
        return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      }
      const isAdmin = session.role === "ADMIN" || session.role === "SUPER_ADMIN";
      if (!isAdmin && session.id !== target) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    } else if (channel_name.startsWith("private-komplain-")) {
      const session = await getSessionUser();
      const komplainId = channel_name.replace("private-komplain-", "");
      if (!session) {
        return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      }
      const k = await prisma.komplain.findUnique({ where: { id: komplainId } });
      if (!k) {
        return NextResponse.json({ ok: false, error: "complaint not found" }, { status: 404 });
      }
      const isAdmin = session.role === "ADMIN" || session.role === "SUPER_ADMIN";
      if (!isAdmin && k.userId !== session.id) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    } else {
      // default: require user
      await requireUser();
    }

    const auth = pusher.authenticate(socket_id, channel_name);
    return new Response(JSON.stringify(auth), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    logger.error("/api/pusher/auth error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
