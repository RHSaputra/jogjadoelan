import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";
import pusher from "@/lib/pusher-server";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ ok: false, error: "missing userId" }, { status: 400 });
    await prisma.chatsupportmessage.updateMany({ where: { userId }, data: { deletedAt: new Date() } });
    // Kirim real-time event ke customer agar seluruh room langsung dibersihkan di UI mereka
    await pusher.trigger(`private-chat-${userId}`, "admin:delete-room", {}).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("/api/admin/chat/deleteRoom error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
