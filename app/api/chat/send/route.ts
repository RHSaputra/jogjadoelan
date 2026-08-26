import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import pusher from "@/lib/pusher-server";
import { logAudit } from "@/lib/audit";
import { pushAdminNotification } from "@/lib/admin-notification-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, userId, text, files, context } = body;
    if (!userId) return NextResponse.json({ ok: false, error: "missing userId" }, { status: 400 });

    // Gunakan upsert dengan ID dari client agar ID di DB identik dengan ID
    // optimistic message di UI — mencegah duplikasi pesan saat Pusher event diterima.
    const msg = await prisma.chatsupportmessage.upsert({
      where: { id: id ?? "" },
      create: {
        ...(id ? { id } : {}),
        userId,
        fromRole: "USER",
        pesan: text ?? undefined,
        filesPaths: files ?? [],
        context: context ?? undefined,
      },
      update: {},
    });

    await logAudit({
      action: "CHAT_MESSAGE_SENT",
      entity: "chatsupportmessage",
      entityId: msg.id,
      meta: { userId, fromRole: "USER" },
    });

    // trigger pusher to user's private channel
    await pusher.trigger(`private-chat-${userId}`, "user:message", msg).catch(() => {});
    // also notify admin dashboard/global admin channel so admins see new room
    await pusher.trigger(`admin-chat`, "user:message", { userId, message: msg }).catch(() => {});
    
    // Pusher Admin Notification (for global toast & chat sound)
    pushAdminNotification(
      "Pesan Baru Masuk",
      `Pesan dari Customer (${userId.slice(0, 6)}...)`,
      "info",
      "chat"
    );

    return NextResponse.json({ ok: true, data: msg });
  } catch (e) {
    logger.error("/api/chat/send error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
