/* eslint-disable @typescript-eslint/no-require-imports -- legacy CJS script, executed directly with node */
// scripts/update-qris-db.js
// Script untuk update QRIS config di database langsung
// Usage: node scripts/update-qris-db.js <qrPath> [merchantName]

const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const qrPath = process.argv[2] || '/uploads/qris/1781087577696-qc659ilnxo.webp';
  const merchantName = process.argv[3] || 'Jogjadoelan QRIS';

  console.log('Updating QRIS config...');
  console.log('  qrPath:', qrPath);
  console.log('  merchantName:', merchantName);

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

    const result = await prisma.qrisconfig.upsert({
      where: { id: 1 },
      update: {
        qrPath,
        merchantName,
        aktif: true,
      },
      create: {
        id: 1,
        qrPath,
        merchantName,
        aktif: true,
      },
    });

    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('✓ QRIS updated successfully!');

    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();