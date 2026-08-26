import { prisma } from "@/lib/db";
import pusher from "@/lib/pusher-server";
import type { Prisma } from "@prisma/client";

export interface SystemChatContext {
  kind: "komplain" | "order" | "produk" | "custom" | "validation";
  refId: string;
  label: string;
  sublabel?: string;
  thumbnailUrl?: string;
  href: string;
}

type ChatMessageRecord = Awaited<
  ReturnType<Prisma.TransactionClient["chatsupportmessage"]["create"]>
>;

/**
 * Mendorong pesan sistem (seperti "Komplain Disetujui") ke dalam Global Chat Room.
 * Ini menggantikan fungsi `komplainchat` yang sebelumnya terpisah.
 *
 * @param userId ID Customer
 * @param pesan Pesan yang ditampilkan di chat
 * @param context Konteks sematan (contoh: { kind: "komplain", refId: "KMP-123", ... })
 * @param tx Opsional transaksi Prisma jika dipanggil di dalam $transaction
 */
export async function pushSystemChatLog(
  userId: string,
  pesan: string,
  context?: SystemChatContext,
  tx?: Prisma.TransactionClient
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- kontrak lama: hasil await fungsi ini dimasukkan langsung ke array $transaction oleh route legacy
): Promise<any> {
  const db = tx || prisma;

  const msg = await db.chatsupportmessage.create({
    data: {
      userId,
      fromRole: "SYSTEM",
      pesan,
      filesPaths: [],
      context: context ? (context as unknown as Prisma.InputJsonValue) : undefined,
      status: "SENT",
    },
  });

  // Notifikasi real-time via Pusher ke tab aktif Customer & Admin
  // Kita catch error agar jika Pusher gagal, transaksi DB tetap sukses
  if (!tx) {
    // Jika tidak dalam transaksi, kita bisa trigger pusher langsung
    await triggerPusher(userId, msg);
  } else {
    // Jika dalam transaksi, kita tidak bisa await pusher sebelum transaksi selesai sepenuhnya,
    // tapi karena ini dipanggil di dalam Promise.all transaksi, kita trigger fire-and-forget
    triggerPusher(userId, msg).catch(() => {});
  }

  return msg;
}

async function triggerPusher(userId: string, msg: ChatMessageRecord) {
  try {
    await pusher.trigger(`private-chat-${userId}`, "user:message", msg);
    await pusher.trigger(`admin-chat`, "user:message", { userId, message: msg });
  } catch {
    // ignore
  }
}
