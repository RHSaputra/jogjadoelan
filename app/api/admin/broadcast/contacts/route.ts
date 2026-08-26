// app/api/admin/broadcast/contacts/route.ts
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

export const GET = handler(async () => {
  await requireAdmin();

  // Fetch all users
  const users = await prisma.user.findMany({
    select: { id: true, username: true, noHp: true, email: true },
    orderBy: { username: "asc" },
  });

  // Fetch all user IDs who have ordered
  const orderedUsers = await prisma.order.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });
  const orderedUserIds = new Set(orderedUsers.map((o) => o.userId));

  return ok({
    contacts: users.map((u) => ({
      id: u.id,
      username: u.username,
      noHp: u.noHp || "",
      email: u.email || "",
      hasOrder: orderedUserIds.has(u.id),
    })),
  });
});

