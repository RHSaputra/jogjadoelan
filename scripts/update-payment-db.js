/* eslint-disable @typescript-eslint/no-require-imports -- legacy CJS script, executed directly with node */
// scripts/update-payment-db.js
// Script untuk update Bank dan QRIS config di database langsung
// Usage: node scripts/update-payment-db.js

const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  // Default bank data
  const banks = [
    { keyUnik: "bca", nama: "BCA", noRek: "1234567890", anNama: "JOGJADOELAN", color: "#FF6B1A", urutan: 0, aktif: true },
    { keyUnik: "mandiri", nama: "Mandiri", noRek: "9876543210", anNama: "JOGJADOELAN", color: "#1E2148", urutan: 1, aktif: true },
    { keyUnik: "bni", nama: "BNI", noRek: "1122334455", anNama: "JOGJADOELAN", color: "#1E88E5", urutan: 2, aktif: true },
    { keyUnik: "bri", nama: "BRI", noRek: "5566778899", anNama: "JOGJADOELAN", color: "#1565C0", urutan: 3, aktif: true },
  ];

  // QRIS data - gunakan yang sudah ada
  const qris = {
    merchantName: "Jogjadoelan QRIS",
    qrPath: "/uploads/qris/1781088350031-ko1cw61zde.webp",
    aktif: true,
  };

  console.log('=== Updating Payment Config ===');
  console.log('Banks:', banks.length);
  console.log('QRIS:', qris);

  try {
    // Dynamic import untuk ESM
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaMariaDb } = await import('@prisma/adapter-mariadb');

    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');

    const u = new URL(url);
    const adapter = new PrismaMariaDb({
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username || 'root'),
      password: u.password ? decodeURIComponent(u.password) : undefined,
      database: u.pathname.replace(/^\//, ''),
      connectionLimit: 10,
    });

    const prisma = new PrismaClient({ adapter });

    // 1. Delete existing banks and insert new ones
    console.log('\n--- Updating Banks ---');
    await prisma.bank.deleteMany();

    // Insert one by one (Prisma MariaDB needs explicit id)
    for (const b of banks) {
      const bankId = `${b.keyUnik}-${Date.now()}`;
      await prisma.bank.create({
        data: { id: bankId, ...b },
      });
      console.log(`  Inserted: ${b.nama}`);
    }
    console.log('Banks inserted:', banks.length);

    // 2. Upsert QRIS config
    console.log('\n--- Updating QRIS ---');
    const qrisResult = await prisma.qrisconfig.upsert({
      where: { id: 1 },
      update: qris,
      create: { id: 1, ...qris },
    });
    console.log('QRIS:', qrisResult);

    // 3. Verify
    console.log('\n--- Verification ---');
    const banksVerify = await prisma.bank.findMany({ orderBy: { urutan: 'asc' } });
    console.log('Banks in DB:', banksVerify.map(b => `${b.nama} - ${b.noRek}`));

    const qrisVerify = await prisma.qrisconfig.findUnique({ where: { id: 1 } });
    console.log('QRIS in DB:', qrisVerify);

    console.log('\n✓ Payment config updated successfully!');

    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();