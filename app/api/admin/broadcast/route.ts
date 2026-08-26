// GET /api/admin/broadcast       — list semua broadcast (terbaru dulu)
// POST /api/admin/broadcast      — buat broadcast baru
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import type { broadcast_target as BroadcastTarget } from "@prisma/client";

// isi format: "[channel] pesan"
function encodeIsi(channel: string, pesan: string): string {
  return `[${channel}] ${pesan}`;
}
function decodeIsi(isi: string): { channel: string; pesan: string } {
  const m = isi.match(/^\[(\w+)\] ([\s\S]+)$/);
  if (m) return { channel: m[1], pesan: m[2] };
  return { channel: "notif", pesan: isi };
}
function uiTargetToDb(t: string): BroadcastTarget {
  if (t === "semua") return "ALL";
  return "PEMBELI";
}
export function dbBroadcastToDTO(b: {
  id: string; judul: string; isi: string; target: BroadcastTarget; sentAt: Date;
}) {
  const { channel, pesan } = decodeIsi(b.isi);
  return {
    id: b.id,
    judul: b.judul,
    pesan,
    channel,
    target: b.target === "ALL" ? "semua" : "aktif",
    sentAt: b.sentAt.toISOString(),
  };
}

const PostBody = z.object({
  judul: z.string().min(1).max(200),
  pesan: z.string().min(1).max(2000),
  channel: z.enum(["wa", "email", "notif"]).default("notif"),
  target: z.string().default("semua"),
});

export const GET = handler(async () => {
  await requireAdmin();
  const rows = await prisma.broadcast.findMany({
    orderBy: { sentAt: "desc" },
    take: 100,
  });
  return ok(rows.map(dbBroadcastToDTO));
});

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(422, "Payload tidak valid");
  const b = parsed.data;

  const row = await prisma.broadcast.create({
    data: {
      judul: b.judul.trim(),
      isi: encodeIsi(b.channel, b.pesan.trim()),
      target: uiTargetToDb(b.target),
    },
  });
  return ok(dbBroadcastToDTO(row));
});
