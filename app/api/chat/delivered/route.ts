import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import pusher from "@/lib/pusher-server";
import { requireCustomer } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const customer = await requireCustomer();
    const userId = customer.id;
    const body = await req.json();
    const { messageId } = body;

    // We can mark a specific message as delivered, or all pending ones.
    // Let's mark all SENT admin messages as DELIVERED, up to the received message
    const res = await prisma.chatsupportmessage.updateMany({
      where: {
        userId,
        fromRole: "ADMIN",
        status: "SENT",
        deletedAt: null,
        ...(messageId ? { id: messageId } : {}),
      },
      data: { status: "DELIVERED" },
    });

    if (res.count > 0) {
      await logAudit({
        action: "CHAT_MESSAGE_DELIVERED",
        entity: "chatsupportmessage",
        entityId: messageId ?? "multiple",
        meta: { userId, fromRole: "ADMIN" },
      });

      // Notify sender (Admin) that the message was delivered
      // We trigger this to the admin channel and the user's private channel
      await pusher.trigger(`private-chat-${userId}`, "admin:delivered", { messageId }).catch(() => {});
      await pusher.trigger("admin-chat", "user:delivered", { userId, messageId }).catch(() => {});
    }

    return NextResponse.json({ ok: true, data: { count: res.count } });
  } catch (e) {
    logger.error("/api/chat/delivered error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
