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

const adapter = new PrismaMariaDb(parseDbUrl(process.env.DATABASE_URL!));
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("════════════════════════════════════════════════════════════");
  console.log("  MEMBERSIHKAN DATA PESANAN, USER, CHAT & RESTORE STOK");
  console.log("════════════════════════════════════════════════════════════\n");

  // 1. Hitung pengembalian stok dari order aktif (bukan DIBATALKAN / KADALUARSA)
  const activeOrders = await prisma.order.findMany({
    where: {
      status: { notIn: ["DIBATALKAN", "KADALUARSA"] },
    },
    include: { orderitem: true },
  });

  console.log(`📦 Memulihkan stok dari ${activeOrders.length} pesanan aktif...`);
  const stockRestores: Record<string, { nama: string; qty: number }> = {};

  for (const o of activeOrders) {
    for (const it of o.orderitem) {
      if (it.produkId) {
        if (!stockRestores[it.produkId]) {
          stockRestores[it.produkId] = { nama: it.snapNama, qty: 0 };
        }
        stockRestores[it.produkId].qty += it.qty;

        await prisma.produk.update({
          where: { id: it.produkId },
          data: {
            stok: { increment: it.qty },
          },
        });
      }
    }
  }

  for (const [pId, info] of Object.entries(stockRestores)) {
    console.log(`   ✓ [${pId}] ${info.nama}: +${info.qty} dikembalikan ke stok`);
  }

  // Reset angka terjual ke 0 untuk semua produk
  await prisma.produk.updateMany({
    data: { terjual: 0 },
  });
  console.log("   ✓ Semua angka 'terjual' produk di-reset ke 0\n");

  // 2. Bersihkan seluruh data transaksi & data user customer
  console.log("🗑️  Menghapus data pesanan, chat, dan customer...");

  // 2a. Notifikasi & Chat
  const delNotif = await prisma.notifikasi.deleteMany();
  console.log(`   ✓ Notifikasi dihapus: ${delNotif.count}`);

  const delChat = await prisma.chatsupportmessage.deleteMany();
  console.log(`   ✓ Chat support message dihapus: ${delChat.count}`);

  // 2b. Resolusi, Review & Komplain
  const delRefund = await prisma.refund.deleteMany();
  console.log(`   ✓ Refund dihapus: ${delRefund.count}`);

  const delTukar = await prisma.tukar.deleteMany();
  console.log(`   ✓ Tukar dihapus: ${delTukar.count}`);

  const delUlasan = await prisma.ulasan.deleteMany();
  console.log(`   ✓ Ulasan dihapus: ${delUlasan.count}`);

  const delKomplain = await prisma.komplain.deleteMany();
  console.log(`   ✓ Komplain dihapus: ${delKomplain.count}`);

  // 2c. Pembayaran & Timeline
  const delPayment = await prisma.payment.deleteMany();
  console.log(`   ✓ Payment dihapus: ${delPayment.count}`);

  const delTimeline = await prisma.ordertimeline.deleteMany();
  console.log(`   ✓ Order timeline dihapus: ${delTimeline.count}`);

  const delItems = await prisma.orderitem.deleteMany();
  console.log(`   ✓ Order items dihapus: ${delItems.count}`);

  // 2d. Custom Order & Progress
  const delCustomProgress = await prisma.customprogress.deleteMany();
  console.log(`   ✓ Custom progress dihapus: ${delCustomProgress.count}`);

  const delCustomOrder = await prisma.customorder.deleteMany();
  console.log(`   ✓ Custom order dihapus: ${delCustomOrder.count}`);

  // 2e. Regular Order
  const delOrder = await prisma.order.deleteMany();
  console.log(`   ✓ Order reguler dihapus: ${delOrder.count}`);

  // 2f. Vouchers reset
  const delVoucherUsage = await prisma.voucherusage.deleteMany();
  console.log(`   ✓ Voucher usage dihapus: ${delVoucherUsage.count}`);

  await prisma.voucher.updateMany({
    data: { terpakai: 0 },
  });
  console.log(`   ✓ Counter 'terpakai' pada voucher di-reset ke 0`);

  // 2g. Data Pelanggan (Cart, Wishlist, Alamat, Token, User)
  const delCart = await prisma.cartitem.deleteMany();
  console.log(`   ✓ Keranjang belanja (cart) dihapus: ${delCart.count}`);

  const delWishlist = await prisma.wishlistitem.deleteMany();
  console.log(`   ✓ Wishlist dihapus: ${delWishlist.count}`);

  const delAlamat = await prisma.alamat.deleteMany();
  console.log(`   ✓ Alamat customer dihapus: ${delAlamat.count}`);

  const delTokens = await prisma.verificationtoken.deleteMany();
  console.log(`   ✓ Token verifikasi dihapus: ${delTokens.count}`);

  const delUsers = await prisma.user.deleteMany();
  console.log(`   ✓ Customer users dihapus: ${delUsers.count}`);

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("  VERIFIKASI AKHIR DATABASE");
  console.log("════════════════════════════════════════════════════════════\n");

  const [
    finalOrderCount,
    finalCustomCount,
    finalChatCount,
    finalUserCount,
    finalAdminCount,
    products,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.customorder.count(),
    prisma.chatsupportmessage.count(),
    prisma.user.count(),
    prisma.adminuser.count(),
    prisma.produk.findMany({
      select: { id: true, nama: true, stok: true, terjual: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  console.log(`  • Sisa Order Reguler : ${finalOrderCount}`);
  console.log(`  • Sisa Custom Order  : ${finalCustomCount}`);
  console.log(`  • Sisa Chat Support  : ${finalChatCount}`);
  console.log(`  • Sisa Customer User : ${finalUserCount}`);
  console.log(`  • Super Admin Tetap  : ${finalAdminCount} (Aman)`);
  console.log(`  • Total Produk Tetap : ${products.length} (Aman)\n`);

  console.log("📋 Daftar Stok Produk yang Telah Dipulihkan:");
  for (const p of products) {
    console.log(`   - ${p.nama}: Stok = ${p.stok}, Terjual = ${p.terjual}`);
  }

  console.log("\n🎉 SELURUH DATA PESANAN & CUSTOMER BERHASIL DIBERSIHKAN!");
  console.log("   Semua data admin, produk katalog, dan pengaturan tetap aman.");
}

main()
  .catch((e) => {
    console.error("❌ Error saat eksekusi:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
