import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import pusher from "@/lib/pusher-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, event, data } = body;
    if (!userId || !event) {
      return NextResponse.json({ ok: false, error: "missing userId or event" }, { status: 400 });
    }
    const channel = `private-chat-${userId}`;
    await pusher.trigger(channel, event, data ?? {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("/api/pusher/trigger error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
