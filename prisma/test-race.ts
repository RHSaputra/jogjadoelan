import "dotenv/config";
import { prisma } from "../lib/db";
import { mutateProductStock } from "../lib/server/stock-mutation";

async function runTest() {
  console.log("=== Memulai Simulasi Race Condition ===");

  // 1. Buat produk dummy dengan stok 1
  const produkId = "test-race-produk-1";
  await prisma.produk.upsert({
    where: { id: produkId },
    update: { stok: 1 },
    create: {
      id: produkId,
      nama: "Helm Balap Race Test",
      jenis: "fullface",
      jenisLabel: "Full Face",
      kondisi: "Baru",
      spesifikasi: "Test",
      deskripsiSingkat: "Test",
      deskripsi: {},
      ukuranList: {},
      harga: 100000,
      stok: 1, // HANYA 1
      isActive: true,
    },
  });

  console.log("✔ Produk test berhasil disiapkan (stok = 1)");

  // 2. Simulasi 10 request bersamaan yang ingin membeli produk ini
  const requests = Array.from({ length: 10 }).map(async (_, index) => {
    try {
      await prisma.$transaction(async (tx) => {
        // Cek stok (seperti di app/api/order/route.ts)
        const p = await tx.produk.findUnique({ where: { id: produkId } });
        if (!p) throw new Error("Produk tidak ditemukan");
        if (p.stok < 1) throw new Error("Stok produk tidak cukup");

        // Kurangi stok atomic
        await mutateProductStock(tx, produkId, null, null, -1, { guardNegative: true });
        
        // Sengaja kasih delay sedikit dalam transaksi jika perlu, tapi kita anggap ini cepat
      });
      return { index, success: true, error: null };
    } catch (error) {
      return {
        index,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log("⏳ Mengirim 10 request secara bersamaan...");
  const results = await Promise.all(requests);

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n=== HASIL SIMULASI ===`);
  console.log(`Request Sukses : ${successful.length}`);
  console.log(`Request Gagal  : ${failed.length}`);

  if (successful.length === 1) {
    console.log("✅ PENGUJIAN BERHASIL! Hanya 1 transaksi yang lolos.");
  } else {
    console.error("❌ PENGUJIAN GAGAL! Terjadi overselling atau kegagalan transaksi lainnya.");
  }

  // Verifikasi stok akhir di DB
  const finalProduk = await prisma.produk.findUnique({ where: { id: produkId } });
  console.log(`\nStok akhir di database: ${finalProduk?.stok}`);
  if (finalProduk?.stok === 0) {
    console.log("✅ Stok akhir sudah benar (0).");
  } else {
    console.error(`❌ Stok akhir SALAH (${finalProduk?.stok}).`);
  }

  // Cleanup
  await prisma.produk.delete({ where: { id: produkId } });
}

runTest()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
