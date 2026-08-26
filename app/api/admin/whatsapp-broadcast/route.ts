// app/api/admin/whatsapp-broadcast/route.ts
import { z } from "zod";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { runWhatsappBroadcast } from "@/lib/whatsapp";

const csvRecipientSchema = z.object({
  nama: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  noHp: z.string().optional(),
});

const broadcastSchema = z.object({
  channel: z.enum(["wa", "email", "notif", "hybrid"]).default("wa"),
  judul: z.string().min(1, "Judul wajib diisi"),
  pesan: z.string().min(1, "Pesan wajib diisi"),
  gambar: z.string().url("Format URL gambar tidak valid").or(z.literal("")).optional(),
  target: z.enum(["semua", "aktif", "order", "custom", "csv"]),
  customCustomerIds: z.array(z.string()).optional(),
  csvRecipients: z.array(csvRecipientSchema).optional(),
});

type Recipient = { id: string; username: string; noHp: string; email: string };

async function resolveRecipients(
  target: string,
  customCustomerIds?: string[],
  csvRecipients?: z.infer<typeof csvRecipientSchema>[]
): Promise<Recipient[]> {
  if (target === "csv" && csvRecipients?.length) {
    return csvRecipients.map((r, i) => ({
      id: `csv-${i}`,
      username: r.nama,
      noHp: r.noHp || "",
      email: r.email || "",
    }));
  }

  if (target === "semua") {
    return prisma.user.findMany({
      select: { id: true, username: true, noHp: true, email: true },
    });
  }

  if (target === "aktif") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeOrders = await prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
    });
    const userIds = activeOrders.map((o) => o.userId);
    if (userIds.length === 0) return [];
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, noHp: true, email: true },
    });
  }

  if (target === "order") {
    const orderedUsers = await prisma.order.findMany({
      select: { userId: true },
      distinct: ["userId"],
    });
    const userIds = orderedUsers.map((o) => o.userId);
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, noHp: true, email: true },
    });
  }

  if (target === "custom" && customCustomerIds?.length) {
    return prisma.user.findMany({
      where: { id: { in: customCustomerIds } },
      select: { id: true, username: true, noHp: true, email: true },
    });
  }

  return [];
}

function filterByChannel(recipients: Recipient[], channel: string): Recipient[] {
  if (channel === "wa") {
    return recipients.filter((r) => r.noHp && r.noHp.trim() !== "");
  }
  if (channel === "email") {
    return recipients.filter((r) => r.email && r.email.trim() !== "");
  }
  if (channel === "hybrid") {
    return recipients.filter(
      (r) =>
        (r.noHp && r.noHp.trim() !== "") || (r.email && r.email.trim() !== "")
    );
  }
  return recipients;
}

export const GET = handler(async () => {
  await requireAdmin();

  const broadcasts = await prisma.whatsappbroadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok({ broadcasts });
});

export const POST = handler(async (req: Request) => {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const parsed = broadcastSchema.safeParse(body);
  if (!parsed.success) {
    return fail(422, parsed.error.issues[0]?.message || "Payload tidak valid");
  }

  const { channel, judul, pesan, gambar, target, customCustomerIds, csvRecipients } =
    parsed.data;

  if (target === "csv" && (!csvRecipients || csvRecipients.length === 0)) {
    return fail(400, "Upload CSV wajib berisi minimal 1 penerima");
  }

  let recipients = await resolveRecipients(target, customCustomerIds, csvRecipients);
  recipients = filterByChannel(recipients, channel);

  if (recipients.length === 0) {
    return fail(400, "Tidak ada customer target yang memenuhi kriteria channel");
  }

  const broadcast = await prisma.$transaction(async (tx) => {
    const b = await tx.whatsappbroadcast.create({
      data: {
        channel,
        judul,
        pesan,
        gambar: gambar || null,
        target,
        status: "PENDING",
        total: recipients.length,
        pending: recipients.length,
        terkirim: 0,
        gagal: 0,
      },
    });

    await tx.whatsappbroadcastlog.createMany({
      data: recipients.map((r) => ({
        broadcastId: b.id,
        nama: r.username,
        noHp: r.noHp || null,
        email: r.email || null,
        userId: r.id.startsWith("csv-") ? null : r.id,
        status: "PENDING",
        retries: 0,
      })),
    });

    return b;
  });

  after(() => {
    runWhatsappBroadcast(broadcast.id).catch((err) => {
      console.error("[BROADCAST] Failed to run broadcast:", err);
    });
  });

  return ok({
    message: "Broadcast berhasil dimulai di background",
    broadcast,
  });
});
