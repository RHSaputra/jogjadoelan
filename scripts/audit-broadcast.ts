import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  console.log("\n=== Broadcast Audit ===\n");

  const broadcasts = await prisma.whatsappbroadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      logs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (broadcasts.length === 0) {
    console.log("No broadcasts found.");
  } else {
    for (const b of broadcasts) {
      console.log(`\n[${b.id}] ${b.judul}`);
      console.log(`  channel=${b.channel} target=${b.target} status=${b.status}`);
      console.log(`  total=${b.total} sent=${b.terkirim} fail=${b.gagal} pending=${b.pending}`);
      console.log(`  gambar=${b.gambar ?? "none"}`);
      for (const log of b.logs) {
        console.log(
          `    - ${log.nama} | ${log.status} | userId=${log.userId ?? "null"} | error=${log.error ?? "-"}`
        );
      }
    }
  }

  const recentNotif = await prisma.notifikasi.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { username: true } } },
  });
  console.log("\n=== Recent In-App Notifications ===");
  for (const n of recentNotif) {
    console.log(`  [${n.type}] ${n.title} → ${n.user?.username} (${n.createdAt.toISOString()})`);
  }

  console.log("\n=== Env Check ===");
  console.log(`  FONNTE_TOKEN: ${process.env.FONNTE_TOKEN ? "SET" : "MISSING"}`);
  console.log(`  RESEND_API_KEY: ${process.env.RESEND_API_KEY ? "SET" : "MISSING"}`);
  console.log(`  EMAIL_FROM: ${process.env.EMAIL_FROM ?? "onboarding@resend.dev"}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
