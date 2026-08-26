import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import pusher from "@/lib/pusher-server";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { messageId } = body;
    if (!messageId) return NextResponse.json({ ok: false, error: "missing messageId" }, { status: 400 });
    const msg = await prisma.chatsupportmessage.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
    // Kirim real-time event ke customer agar pesan langsung hilang dari UI mereka
    await pusher.trigger(`private-chat-${msg.userId}`, "admin:delete-message", { messageId }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("/api/admin/chat/deleteMessage error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
