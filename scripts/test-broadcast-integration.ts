import "dotenv/config";
import { sendWhatsapp } from "../lib/whatsapp";
import { sendBroadcastToRecipient } from "../lib/notification/broadcast-sender";
import { prisma } from "../lib/db";

async function main() {
  console.log("\n=== Broadcast Integration Test ===\n");

  // 1. Direct Fonnte test
  const testPhone = process.env.TEST_WA_NUMBER || "6281234567890";
  console.log(`1. Direct WA send to ${testPhone}...`);
  const waResult = await sendWhatsapp(testPhone, "[TEST] Broadcast audit dari Jogjadoelan");
  console.log("   Result:", JSON.stringify(waResult, null, 2));

  // 2. In-app broadcast test
  const user = await prisma.user.findFirst({ select: { id: true, username: true } });
  if (user) {
    console.log(`\n2. In-app broadcast to user ${user.username}...`);
    const notifResult = await sendBroadcastToRecipient(
      {
        id: "test-broadcast",
        channel: "notif",
        judul: "Test In-App Broadcast",
        pesan: "Pesan uji coba in-app broadcast",
      },
      { nama: user.username, userId: user.id }
    );
    console.log("   Result:", JSON.stringify(notifResult, null, 2));

    const created = await prisma.notifikasi.findFirst({
      where: { userId: user.id, title: "Test In-App Broadcast" },
      orderBy: { createdAt: "desc" },
    });
    console.log("   DB record:", created ? "CREATED" : "NOT FOUND");
  }

  // 3. Email domain policy test
  const { getEmailSendPolicy, canSendToRecipient } = await import("../lib/email/domain-policy");
  const policy = await getEmailSendPolicy();
  console.log("\n3. Email domain policy:");
  console.log("   ", JSON.stringify(policy, null, 2));

  const adminEmail = process.env.ADMIN_TEST_EMAIL || "admin@test.com";
  const externalEmail = "customer@external.com";
  console.log(`   canSend admin (${adminEmail}):`, canSendToRecipient(adminEmail, policy));
  console.log(`   canSend external (${externalEmail}):`, canSendToRecipient(externalEmail, policy));

  // 4. Check latest WA notification log for error detail
  const lastWaLog = await prisma.notificationlog.findFirst({
    where: { channel: "whatsapp", template: { startsWith: "broadcast:" } },
    orderBy: { created_at: "desc" },
  });
  if (lastWaLog?.provider_response) {
    console.log("\n4. Last WA broadcast log provider_response:");
    console.log("   ", JSON.stringify(lastWaLog.provider_response, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
