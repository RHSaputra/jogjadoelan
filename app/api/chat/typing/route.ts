import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import pusher from "@/lib/pusher-server";
import { getSessionUser } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, isTyping, fromRole } = body;

    if (!userId || isTyping === undefined || !fromRole) {
      return NextResponse.json({ ok: false, error: "missing required fields" }, { status: 400 });
    }

    if (fromRole === "USER") {
      // Notify admin page (both global list and active room channel)
      await Promise.all([
        pusher.trigger("admin-chat", "user:typing", { userId, isTyping }),
        pusher.trigger(`private-chat-${userId}`, "user:typing", { userId, isTyping })
      ]).catch(() => {});
    } else {
      // Notify customer private channel
      await pusher.trigger(`private-chat-${userId}`, "admin:typing", isTyping).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("/api/chat/typing error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
