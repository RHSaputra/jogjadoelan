/**
 * HAPUS DATA PESANAN & CHAT SAJA
 * 
 * Run: pnpm tsx scripts/cleanup-orders-and-chat.ts
 * 
 * Yang DIHAPUS:
 *   • Semua Order (Ready Stok / Reguler)
 *   • Semua Custom Order
 *   • Semua riwayat Chat (ChatSupportMessage + KomplainChat)
 *   • Data yang ikut terhapus karena cascade FK: 
 *     - OrderItem, OrderTimeline, Payment
 *     - CustomProgress
 *     - Komplain, Refund, Tukar (karena terikat ke Order/CustomOrder via cascade)
 *     - Ulasan (karena terikat ke OrderItem via cascade)
 *     - Notifikasi (opsional — yang terkait order, agar tidak broken link)
 * 
 * Yang TETAP TERSIMPAN:
 *   • Data User (customer & admin)
 *   • Data Produk (stok & terjual TIDAK di-reset)
 *   • Cart (keranjang)
 *   • Wishlist
 *   • Voucher & VoucherUsage
 *   • Konfigurasi Bank, Ekspedisi, Cabang, dll
 *   • AuditLog
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username || "root"),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: 10,
  };
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL tidak ditemukan di .env");
  process.exit(1);
}

const adapter = new PrismaMariaDb(parseDbUrl(databaseUrl));
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

async function main() {
  console.log("═".repeat(60));
  console.log("  CLEANUP — HAPUS DATA PESANAN & CHAT SAJA");
  console.log("═".repeat(60));
  console.log("");

  // ====================================================================
  // STEP 1: Hitung data sebelum hapus
  // ====================================================================
  const [
    orderCount,
    customOrderCount,
    komplainCount,
    refundCount,
    tukarCount,
    ulasanCount,
    notifCount,
    chatCount,
    ,
    cartCount,
    wishlistCount,
    voucherUsageCount,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.customorder.count(),
    prisma.komplain.count(),
    prisma.refund.count(),
    prisma.tukar.count(),
    prisma.ulasan.count(),
    prisma.notifikasi.count(),
    prisma.chatsupportmessage.count(),
    prisma.chatsupportmessage.count(),
    prisma.cartitem.count(),
    prisma.wishlistitem.count(),
    prisma.voucherusage.count(),
  ]);

  console.log("📊 Data saat ini:");
  console.log(`   Order (Ready Stok)  : ${orderCount}`);
  console.log(`   Custom Order        : ${customOrderCount}`);
  console.log(`   Komplain            : ${komplainCount}`);
  console.log(`   Refund              : ${refundCount}`);
  console.log(`   Tukar               : ${tukarCount}`);
  console.log(`   Ulasan              : ${ulasanCount}`);
  console.log(`   Notifikasi          : ${notifCount}`);
  console.log(`   Chat Support        : ${chatCount}`);
  console.log("");
  console.log(`   🛡️  Cart Items       : ${cartCount}  (TETAP DISIMPAN)`);
  console.log(`   🛡️  Wishlist          : ${wishlistCount}  (TETAP DISIMPAN)`);
  console.log(`   🛡️  Voucher Usage     : ${voucherUsageCount}  (TETAP DISIMPAN)`);
  console.log("");

  const totalUntukDihapus =
    orderCount + customOrderCount + komplainCount + refundCount +
    tukarCount + ulasanCount + chatCount;

  if (totalUntukDihapus === 0) {
    console.log("✅ Tidak ada data pesanan atau chat — database sudah bersih.");
    await prisma.$disconnect();
    return;
  }

  // ====================================================================
  // STEP 2: Konfirmasi
  // ====================================================================
  console.log("⚠️  PERINGATAN:");
  console.log("   Karena foreign key cascade, data berikut juga IKUT TERHAPUS:");
  console.log("   • Komplain, Refund, Tukar (terikat ke Order/CustomOrder)");
  console.log("   • Ulasan (terikat ke OrderItem)");
  console.log("   • Notifikasi yang terkait order");
  console.log("");
  console.log("   Data berikut TIDAK disentuh:");
  console.log("   • User, Produk, Cart, Wishlist, Voucher");
  console.log("   • Bank, Ekspedisi, Cabang, Konfigurasi");
  console.log("");

  // ====================================================================
  // STEP 3: Hapus data — urutan aman (child dulu, baru parent)
  // ====================================================================
  console.log("🗑️  Menghapus data...");
  console.log("");

  // 3a. Notifikasi (yang terkait order, agar tidak broken link)
  console.log("   → Notifikasi (terkait order)...");
  const deletedNotif = await prisma.notifikasi.deleteMany({
    where: { orderId: { not: null } },
  });
  console.log(`     ✅ ${deletedNotif.count} notifikasi dihapus`);

  // 3b. (komplainchat sudah dihapus)

  // 3c. ChatSupportMessage
  console.log("   → ChatSupportMessage...");
  await prisma.chatsupportmessage.deleteMany();
  console.log("     ✅");

  // 3d. Refund (fk → Komplain, Order, User)
  //     Akan ikut terhapus via cascade saat Order/Komplain dihapus,
  //     tapi kita hapus explicit untuk aman
  console.log("   → Refund...");
  await prisma.refund.deleteMany();
  console.log("     ✅");

  // 3e. Tukar (fk → Komplain, Order, User)
  console.log("   → Tukar...");
  await prisma.tukar.deleteMany();
  console.log("     ✅");

  // 3f. Ulasan (fk → OrderItem, Order)
  console.log("   → Ulasan...");
  await prisma.ulasan.deleteMany();
  console.log("     ✅");

  // 3g. Komplain (fk → Order, CustomOrder, User)
  console.log("   → Komplain...");
  await prisma.komplain.deleteMany();
  console.log("     ✅");

  // 3h. Payment (fk → Order, CustomOrder)
  console.log("   → Payment...");
  await prisma.payment.deleteMany();
  console.log("     ✅");

  // 3i. OrderTimeline (fk → Order)
  console.log("   → OrderTimeline...");
  await prisma.ordertimeline.deleteMany();
  console.log("     ✅");

  // 3j. OrderItem (fk → Order)
  console.log("   → OrderItem...");
  await prisma.orderitem.deleteMany();
  console.log("     ✅");

  // 3k. CustomProgress (fk → CustomOrder)
  console.log("   → CustomProgress...");
  await prisma.customprogress.deleteMany();
  console.log("     ✅");

  // 3l. CustomOrder (fk → User) — HAPUS
  console.log("   → CustomOrder...");
  await prisma.customorder.deleteMany();
  console.log("     ✅");

  // 3m. Order / Ready Stok (fk → User) — HAPUS
  console.log("   → Order (Ready Stok)...");
  await prisma.order.deleteMany();
  console.log("     ✅");

  console.log("");
  console.log("═".repeat(60));
  console.log("  🎉 DATA PESANAN & CHAT BERHASIL DIHAPUS!");
  console.log("═".repeat(60));
  console.log("");
  console.log("🗑️  Yang DIHAPUS:");
  console.log("   • Semua Order (Ready Stok / Reguler)");
  console.log("   • Semua Custom Order");
  console.log("   • Semua Chat Support & Komplain Chat");
  console.log("   • Semua Komplain, Refund, Tukar (cascade)");
  console.log("   • Semua Ulasan (cascade)");
  console.log("   • Notifikasi yang terkait order");
  console.log("");
  console.log("🛡️  Yang TETAP TERSIMPAN:");
  console.log("   • Data User (customer & admin)");
  console.log("   • Data Produk (stok & terjual TIDAK di-reset)");
  console.log("   • Cart / Keranjang");
  console.log("   • Wishlist");
  console.log("   • Voucher & VoucherUsage");
  console.log("   • Konfigurasi Bank, Ekspedisi, Cabang, dll");
  console.log("   • AuditLog");
  console.log("");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Gagal:", e);
  prisma.$disconnect().then(() => process.exit(1));
});