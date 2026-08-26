import "dotenv/config";
import { prisma } from "../lib/db";
import { Prisma } from "@prisma/client";

async function main() {
  console.log("Running API logic test...");

  const search = "";
  const tipe = "";
  const status = "";

  // 1. Fetch WhatsApp transactional logs
  const waWhere: Prisma.whatsapptransactionalWhereInput = {};
  if (search) {
    waWhere.OR = [
      { nama: { contains: search } },
      { noHp: { contains: search } },
      { pesan: { contains: search } },
    ];
  }
  if (tipe) {
    waWhere.tipe = tipe;
  }
  if (status) {
    waWhere.status = status;
  }
  const waLogs = await prisma.whatsapptransactional.findMany({
    where: waWhere,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedWa = waLogs.map((log) => ({
    id: log.id,
    channel: "wa" as const,
    recipient: log.noHp,
    nama: log.nama,
    tipe: log.tipe,
    pesan: log.pesan,
    status: log.status,
    error: log.error,
    createdAt: log.createdAt,
  }));

  console.log(`Fetched ${formattedWa.length} WA logs.`);

  // 2. Fetch Email logs
  const emailWhere: Prisma.emaillogWhereInput = {};
  // ... (Email fetching logic)
  const emailLogs = await prisma.emaillog.findMany({
    where: emailWhere,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const formattedEmail = emailLogs.map((log) => ({
    id: log.id,
    channel: "email" as const,
    recipient: log.recipient,
    nama: log.recipient.split("@")[0] || "User",
    tipe: log.type,
    pesan: log.subject,
    status: log.status,
    error: log.error,
    createdAt: log.createdAt,
  }));
  console.log(`Fetched ${formattedEmail.length} Email logs.`);

  // 3. Fetch In-App Notification logs
  const notifWhere: Prisma.notifikasiWhereInput = {};
  const notifLogs = await prisma.notifikasi.findMany({
    where: notifWhere,
    include: {
      user: {
        select: { username: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedNotif = notifLogs.map((log) => ({
    id: log.id,
    channel: "notif" as const,
    recipient: log.user?.username || "Unknown",
    nama: log.user?.username || "Unknown",
    tipe: log.type,
    pesan: `${log.title}: ${log.body}`,
    status: "SENT" as const,
    error: null,
    createdAt: log.createdAt,
  }));
  console.log(`Fetched ${formattedNotif.length} In-App logs.`);

  // Combine and sort
  const logs = [...formattedWa, ...formattedEmail, ...formattedNotif]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 100);

  console.log(`\nCombined and sorted ${logs.length} logs.`);
  console.log("Top 5 logs:");
  logs.slice(0, 5).forEach((log, index) => {
    console.log(`[${index}] Channel: ${log.channel}, Recipient: ${log.recipient}, CreatedAt: ${log.createdAt.toISOString()}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
