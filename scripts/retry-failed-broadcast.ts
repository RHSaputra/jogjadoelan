/**
 * Retry all FAILED logs from the latest broadcast (or specific broadcast ID).
 * Usage: pnpm exec tsx scripts/retry-failed-broadcast.ts [broadcastId]
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { sendBroadcastToRecipient } from "../lib/notification/broadcast-sender";

async function main() {
  const broadcastId = process.argv[2];

  const broadcast = broadcastId
    ? await prisma.whatsappbroadcast.findUnique({
        where: { id: broadcastId },
        include: { logs: { where: { status: "FAILED" } } },
      })
    : await prisma.whatsappbroadcast.findFirst({
        orderBy: { createdAt: "desc" },
        include: { logs: { where: { status: "FAILED" } } },
      });

  if (!broadcast) {
    console.error("Broadcast tidak ditemukan");
    process.exit(1);
  }

  const failedLogs = broadcast.logs;
  console.log(`\nRetrying ${failedLogs.length} failed logs for broadcast: ${broadcast.judul} (${broadcast.id})\n`);

  let sent = 0;
  let stillFailed = 0;

  for (const log of failedLogs) {
    const result = await sendBroadcastToRecipient(
      {
        id: broadcast.id,
        channel: broadcast.channel,
        judul: broadcast.judul,
        pesan: broadcast.pesan,
        gambar: broadcast.gambar,
      },
      {
        nama: log.nama,
        noHp: log.noHp,
        email: log.email,
        userId: log.userId,
      }
    );

    await prisma.whatsappbroadcastlog.update({
      where: { id: log.id },
      data: {
        status: result.success ? "SENT" : "FAILED",
        error: result.success ? null : result.error || "Gagal mengirim",
        retries: { increment: 1 },
        sentAt: result.success ? new Date() : null,
      },
    });

    if (result.success) {
      sent++;
      await prisma.whatsappbroadcast.update({
        where: { id: broadcast.id },
        data: { terkirim: { increment: 1 }, gagal: { decrement: 1 } },
      });
      console.log(`  ✓ ${log.nama}`);
    } else {
      stillFailed++;
      console.log(`  ✗ ${log.nama}: ${result.error}`);
    }

    await new Promise((r) => setTimeout(r, 2500));
  }

  console.log(`\nDone: ${sent} recovered, ${stillFailed} still failed\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
