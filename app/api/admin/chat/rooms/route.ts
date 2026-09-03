export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10)));

    // Ambil user secara terarah dan terindeks dengan batasan (limit), 
    // bukan men-dump seluruh database ke RAM Node.js.
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : undefined,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        // Eager load messages hanya untuk user yang diambil, memanfaatkan @@index([userId, createdAt])
        chatsupportmessage: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    const rooms = users.map((user) => {
      const userMessages = user.chatsupportmessage || [];
      const last = userMessages[userMessages.length - 1];
      const unreadFromUser = userMessages.filter(
        (x) => x.fromRole === "USER" && x.status !== "READ"
      ).length;

      return {
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
      };
    });

    rooms.sort((a, b) => b.lastAt - a.lastAt);
    return NextResponse.json({ ok: true, data: rooms });
  } catch (e) {
    logger.error("/api/admin/chat/rooms error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
