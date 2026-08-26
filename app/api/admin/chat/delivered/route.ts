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
    const { userId, messageId } = body;
    
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    const res = await prisma.chatsupportmessage.updateMany({
      where: {
        userId,
        fromRole: "USER",
        status: "SENT",
        deletedAt: null,
        ...(messageId ? { id: messageId } : {}),
      },
      data: { status: "DELIVERED" },
    });

    if (res.count > 0) {
      await logAudit({
        adminId: adminSession.id,
        adminName: adminSession.username,
        action: "CHAT_MESSAGE_DELIVERED",
        entity: "chatsupportmessage",
        entityId: messageId ?? "multiple",
        meta: { userId, fromRole: "USER" },
      });

      // Notify user that their message was delivered
      await pusher.trigger(`private-chat-${userId}`, "user:delivered", { messageId }).catch(() => {});
    }

    return NextResponse.json({ ok: true, data: { count: res.count } });
  } catch (e) {
    logger.error("/api/admin/chat/delivered error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
