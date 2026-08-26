export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "missing userId" },
        { status: 400 },
      );
    }

    const limitRaw = url.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitRaw ?? "50"), 1), 200);

    /**
     * Cursor-based pagination (latest-first):
     * - cursor is ISO string for createdAt (preferred).
     * - If cursor missing: fetch latest `limit`.
     * - If cursor present: fetch latest `limit` with createdAt < cursor.
     *
     * Response remains ascending (old -> new) to keep UI logic unchanged.
     */
    const cursor = url.searchParams.get("cursor"); // ISO string of createdAt
    const afterCursor = url.searchParams.get("afterCursor"); // ISO string of createdAt

    const whereClause: Prisma.chatsupportmessageWhereInput = { userId, deletedAt: null };
    if (cursor) {
      whereClause.createdAt = { lt: new Date(cursor) };
    } else if (afterCursor) {
      whereClause.createdAt = { gt: new Date(afterCursor) };
    }

    const msgsDesc = await prisma.chatsupportmessage.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const msgsAsc = msgsDesc.slice().reverse();

    return NextResponse.json({ ok: true, data: msgsAsc });
  } catch (e) {
    logger.error("/api/chat/messages error", e);
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 },
    );
  }
}
