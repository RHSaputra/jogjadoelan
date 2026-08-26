// prisma/seed.ts
// Seed minimal — cuma admin default + bank kosong + QRIS singleton.
// Produk, ekspedisi, settings, dll. di-seed di S9 setelah semua API siap.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import type { instruksipembayaran_key } from "@prisma/client";

function parseDbUrl(url: string) {
  // mysql://user[:pass]@host:port/db
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username || "root"),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  };
}

const adapter = new PrismaMariaDb(parseDbUrl(process.env.DATABASE_URL!));
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ============================================================
  // 1. ADMIN DEFAULT (sesuai ADMIN_CREDENTIALS di lib/admin-constants.ts)
  // ============================================================
  const adminPwd = "admin123";
  const adminHash = await bcrypt.hash(adminPwd, 10);

    const admin = await prisma.adminuser.upsert({
      where: { username: "admin" },
      update: { email: "jogjadoelantechforlocal.id@gmail.com" }, // pastikan email sesuai
      create: {
        username: "admin",
        nama: "Super Admin",
        email: "jogjadoelantechforlocal.id@gmail.com",
        noHp: "081234567890",
        passwordHash: adminHash,
        role: "SUPER_ADMIN",
        aktif: true,
      },
    });
  console.log(`  ✅ Admin: ${admin.username} — password sesuai seed.ts baris 32`);

  // ============================================================
  // 2. QRIS singleton (kosong, admin upload nanti)
  // ============================================================
  await prisma.qrisconfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      merchantName: "Jogjadoelan QRIS",
      qrPath: null,
      aktif: false,
    },
  });
  console.log("  ✅ QRIS singleton ready");

  // ============================================================
  // 3. INSTRUKSI PEMBAYARAN default
  // ============================================================
  const instruksiDefaults: { key: instruksipembayaran_key; isi: string }[] = [
    { key: "READY_STOK", isi: "Lakukan pembayaran sesuai total tagihan ke salah satu rekening di atas." },
    { key: "CUSTOM_DP",  isi: "Bayar DP minimal 50% agar pesanan custom Anda segera mulai diproduksi." },
    { key: "PELUNASAN",  isi: "Lakukan pelunasan sisa tagihan. Barang akan dikirim setelah pelunasan dikonfirmasi." },
  ];
  for (const ins of instruksiDefaults) {
    await prisma.instruksipembayaran.upsert({
      where: { key: ins.key },
      update: {},
      create: ins,
    });
  }
  console.log(`  ✅ Instruksi pembayaran (${instruksiDefaults.length} entries)`);

  // ============================================================
  // 4. EKSPEDISI default (7 kurir)
  // ============================================================
  const ekspedisiDefaults = [
    { keyUnik: "jne-reg",  nama: "JNE Reguler",     trackUrlTemplate: "https://www.jne.co.id/id/tracking/trace?awb={resi}", urutan: 1 },
    { keyUnik: "jne-yes",  nama: "JNE YES",         trackUrlTemplate: "https://www.jne.co.id/id/tracking/trace?awb={resi}", urutan: 2 },
    { keyUnik: "jnt",      nama: "J&T Express",     trackUrlTemplate: "https://www.jet.co.id/track?awb={resi}",             urutan: 3 },
    { keyUnik: "sicepat",  nama: "SiCepat REG",     trackUrlTemplate: "https://www.sicepat.com/checkAwb?awb={resi}",        urutan: 4 },
    { keyUnik: "anteraja", nama: "Anteraja",        trackUrlTemplate: "https://anteraja.id/tracking?awb={resi}",            urutan: 5, isApi: true, forReturn: true },
    { keyUnik: "gosend",   nama: "Gosend Same Day", trackUrlTemplate: "https://www.gojek.com/gosend/",                       urutan: 6 },
    { keyUnik: "grab",     nama: "Grab Express",    trackUrlTemplate: "https://www.grab.com/id/express/",                    urutan: 7 },
  ];
  for (const e of ekspedisiDefaults) {
    await prisma.ekspedisi.upsert({
      where: { keyUnik: e.keyUnik },
      update: {},
      create: e,
    });
  }
  console.log(`  ✅ Ekspedisi (${ekspedisiDefaults.length} kurir)`);

  console.log("✅ Seed selesai.");
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });