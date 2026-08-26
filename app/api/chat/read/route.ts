import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import pusher from "@/lib/pusher-server";
import { requireCustomer } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit";

export async function POST() {
  try {
    const customer = await requireCustomer();
    const userId = customer.id;

    const res = await prisma.chatsupportmessage.updateMany({
      where: {
        userId,
        fromRole: "ADMIN",
        status: { not: "READ" },
        deletedAt: null,
      },
      data: { status: "READ" },
    });

    if (res.count > 0) {
      await logAudit({
        action: "CHAT_MESSAGE_READ",
        entity: "chatsupportmessage",
        entityId: "multiple",
        meta: { userId, fromRole: "ADMIN" },
      });
    }

    // Notify admin channel that customer has read the messages
    await pusher.trigger(`private-chat-${userId}`, "user:read", {}).catch(() => {});

    return NextResponse.json({ ok: true, data: { count: res.count } });
  } catch (e) {
    logger.error("/api/chat/read error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
