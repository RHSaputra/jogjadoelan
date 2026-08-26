import "dotenv/config";
import { prisma } from "@/lib/db";

interface KomplainChatRow {
  id: string;
  komplainId: string;
  fromRole: "USER" | "ADMIN" | "SYSTEM";
  pesan: string | null;
  filesPaths: string[] | null;
  createdAt: Date;
}

async function main() {
  console.log("Memulai migrasi komplainchat -> chatsupportmessage...");

  // Kita gunakan query raw untuk membaca tabel komplainchat jika sudah dihapus dari schema
  const oldChats = await prisma.$queryRaw<KomplainChatRow[]>`SELECT * FROM komplainchat`;

  if (oldChats.length === 0) {
    console.log("Tidak ada data chat komplain yang perlu dimigrasi.");
    process.exit(0);
  }

  console.log(`Ditemukan ${oldChats.length} pesan. Memulai penyalinan...`);

  let count = 0;
  for (const chat of oldChats) {
    // Cari userId dari komplain
    const komplain = await prisma.komplain.findUnique({
      where: { id: chat.komplainId },
      select: { userId: true },
    });

    if (!komplain) {
      console.log(`- Lewati chat ${chat.id}: Komplain ${chat.komplainId} tidak ditemukan.`);
      continue;
    }

    // Role mapping
    // komplainchat: fromRole (USER, ADMIN, SYSTEM)
    // chatsupportmessage: fromRole (USER, ADMIN, SYSTEM)
    const role = chat.fromRole;

    const context = {
      kind: "komplain",
      refId: chat.komplainId,
      label: "Komplain " + chat.komplainId,
      href: "/komplain/" + chat.komplainId,
    };

    await prisma.chatsupportmessage.create({
      data: {
        userId: komplain.userId,
        fromRole: role,
        pesan: chat.pesan,
        filesPaths: chat.filesPaths || [],
        createdAt: chat.createdAt,
        status: "READ",
        context,
      },
    });

    count++;
  }

  console.log(`✅ Berhasil migrasi ${count} dari ${oldChats.length} pesan komplain!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
