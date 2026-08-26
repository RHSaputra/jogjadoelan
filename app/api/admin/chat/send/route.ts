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
    const { id, userId, text, files, context } = body;
    if (!userId) return NextResponse.json({ ok: false, error: "missing userId" }, { status: 400 });
    
    let finalContext = context;

    if (context && context.kind === "validation") {
      const admin = await prisma.adminuser.findUnique({
        where: { id: adminSession.id },
      });
      if (admin) {
        finalContext = {
          ...context,
          validation: {
            ...context.validation,
            adminId: admin.id,
            adminName: admin.nama,
          },
        };
      }
    }

    const msg = await prisma.chatsupportmessage.upsert({
      where: { id: id ?? "" },
      create: {
        ...(id ? { id } : {}),
        userId,
        fromRole: "ADMIN",
        pesan: text ?? undefined,
        filesPaths: files ?? [],
        context: finalContext ?? undefined,
      },
      update: {},
    });

    await logAudit({
      adminId: adminSession.id,
      adminName: adminSession.username,
      action: "CHAT_MESSAGE_SENT",
      entity: "chatsupportmessage",
      entityId: msg.id,
      meta: { userId, fromRole: "ADMIN" },
    });

    // mark user's messages as read
    await prisma.chatsupportmessage.updateMany({
      where: { userId, fromRole: "USER", status: { not: "READ" }, deletedAt: null },
      data: { status: "READ" },
    }).catch(() => {});

    // trigger pusher to user's private channel
    await pusher.trigger(`private-chat-${userId}`, "admin:message", msg).catch(() => {});
    
    // Audit log if validation card was sent
    if (finalContext && finalContext.kind === "validation" && finalContext.validation) {
      const v = finalContext.validation;
      const isCustomOrder = v.orderId.startsWith("JD-C-") || v.orderId.includes("-C-") || finalContext.href.includes("/custom");
      const adminName = v.adminName ?? adminSession.username;
      
      await logAudit({
        adminId: adminSession.id,
        adminName,
        action: "VALIDASI_PRODUK_KIRIM",
        entity: isCustomOrder ? "customorder" : "order",
        entityId: v.orderId,
        meta: {
          productName: v.productName,
          variant: v.variant ?? "—",
          color: v.color ?? "—",
          qty: v.qty,
          customNote: v.customNote ?? "—",
          messageId: msg.id,
        },
      });
    }

    return NextResponse.json({ ok: true, data: msg });
  } catch (e) {
    logger.error("/api/admin/chat/send error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
