export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireAdmin();

    // Get all users who have ever registered (to show all customer rooms)
    // CRITICAL FIX: user model has `username` and `avatar`, not `nama` and `foto`
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, avatar: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    // Get all chat messages (not soft-deleted)
    const msgs = await prisma.chatsupportmessage.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    // Create map of userId -> message array
    const msgMap = new Map<string, typeof msgs>();
    for (const m of msgs) {
      if (!msgMap.has(m.userId)) msgMap.set(m.userId, []);
      msgMap.get(m.userId)!.push(m);
    }

    // Build rooms for all users (even those without messages)
    const rooms = [];
    for (const user of users) {
      const userMessages = msgMap.get(user.id) || [];
      const last = userMessages[userMessages.length - 1];
      const unreadFromUser = userMessages.filter(
        (x) => x.fromRole === "USER" && x.status !== "READ"
      ).length;
      rooms.push({
        userId: user.id,
        userName: user.username || user.email || `User ${user.id.slice(0, 6)}`,
        userEmail: user.email,
        userAvatar: user.avatar || null,
        messages: userMessages,
        lastMessage: last || null,
        lastAt: last ? new Date(last.createdAt).getTime() : new Date(user.createdAt).getTime(),
        totalMessages: userMessages.length,
        unreadFromUser,
        hasUserPending: unreadFromUser > 0,
      });
    }

    rooms.sort((a, b) => b.lastAt - a.lastAt);
    return NextResponse.json({ ok: true, data: rooms });
  } catch (e) {
    logger.error("/api/admin/chat/rooms error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
