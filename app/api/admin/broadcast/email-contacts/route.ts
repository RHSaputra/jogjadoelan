import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { NextRequest } from "next/server";

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();

  const target = req.nextUrl.searchParams.get("target") || "semua";

  let userIds: string[] | null = null;

  if (target === "aktif") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const active = await prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ["userId"],
    });
    userIds = active.map((o) => o.userId);
  }

  const where: Record<string, unknown> = { email: { not: "" } };
  if (userIds !== null) {
    where.id = { in: userIds };
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, username: true, email: true },
    orderBy: { username: "asc" },
  });

  return ok({
    contacts: users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
    })),
  });
});