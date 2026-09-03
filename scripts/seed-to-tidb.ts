import "dotenv/config";
import { prisma as localPrisma } from "c:/jogjadoelan/lib/db";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const TIDB_URL = process.env.DATABASE_URL || "";
if (!TIDB_URL) {
  console.error("DATABASE_URL belum diset.");
  process.exit(1);
}

async function main() {
  console.log("=== SEEDING INITIAL ESSENTIAL DATA TO TIDB CLOUD ===");

  // Create TiDB client
  const u = new URL(TIDB_URL);
  const tidbAdapter = new PrismaMariaDb({
    host: u.hostname,
    port: Number(u.port),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: 3,
    ssl: { rejectUnauthorized: false },
  });
  const tidbPrisma = new PrismaClient({ adapter: tidbAdapter });

  // 1. Copy Admin User
  const admins = await localPrisma.adminuser.findMany();
  console.log(`Found ${admins.length} local admin accounts to copy...`);
  for (const adm of admins) {
    await tidbPrisma.adminuser.upsert({
      where: { username: adm.username },
      update: {},
      create: adm,
    });
  }
  console.log("✓ Admin accounts seeded to TiDB Cloud");

  // 2. Copy Bank Master
  const banks = await localPrisma.bank.findMany();
  console.log(`Found ${banks.length} local bank accounts to copy...`);
  for (const b of banks) {
    await tidbPrisma.bank.upsert({
      where: { id: b.id },
      update: {},
      create: b,
    });
  }
  console.log("✓ Bank accounts seeded to TiDB Cloud");

  // 3. Copy Products
  const products = await localPrisma.produk.findMany({
    include: {
      produkimage: true,
      produkvarian: true,
    },
  });
  console.log(`Found ${products.length} local products to copy...`);
  for (const p of products) {
    const { produkimage, produkvarian, ...prodData } = p;
    await tidbPrisma.produk.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...prodData,
        produkimage: {
          create: produkimage.map((img) => ({
            id: img.id,
            path: img.path,
            urutan: img.urutan,
          })),
        },
        produkvarian: {
          create: produkvarian.map((v) => ({
            id: v.id,
            sku: v.sku,
            ukuran: v.ukuran,
            warna: v.warna,
            stok: v.stok,
            hargaTambahan: v.hargaTambahan,
          })),
        },
      },
    });
  }
  console.log("✓ Products and variants seeded to TiDB Cloud");

  console.log("\n=== TIDB CLOUD SEEDING COMPLETED SUCCESSFULLY ===");
  await localPrisma.$disconnect();
  await tidbPrisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
