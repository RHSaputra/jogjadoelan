import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import pusher from "@/lib/pusher-server";
import { requireAdmin } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const adminSession = await requireAdmin();
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ ok: false, error: "missing userId" }, { status: 400 });
    const res = await prisma.chatsupportmessage.updateMany({
      where: { userId, fromRole: "USER", status: { not: "READ" }, deletedAt: null },
      data: { status: "READ" },
    });
    
    if (res.count > 0) {
      await logAudit({
        adminId: adminSession.id,
        adminName: adminSession.username,
        action: "CHAT_MESSAGE_READ",
        entity: "chatsupportmessage",
        entityId: "multiple",
        meta: { userId, fromRole: "USER" },
      });
    }

    await pusher.trigger(`private-chat-${userId}`, "admin:read", {}).catch(() => {});
    return NextResponse.json({ ok: true, data: { count: res.count } });
  } catch (e) {
    logger.error("/api/admin/chat/read error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
