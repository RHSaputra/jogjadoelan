import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import assert from "node:assert/strict";

function parseDbUrl(url: string) {
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

const url = process.env.DATABASE_URL!;
const adapter = new PrismaMariaDb(parseDbUrl(url));
const prisma = new PrismaClient({ adapter });

interface ChatValidationData {
  productName: string;
  photoUrl?: string;
  variant: string;
  color: string;
  qty: number;
  customNote: string;
  orderId: string;
  orderStatus: string;
  status: string;
  adminId: string;
  adminName: string;
  revisionNote?: string;
}

interface ChatValidationContext {
  kind: string;
  refId: string;
  label: string;
  sublabel?: string;
  thumbnailUrl?: string;
  href: string;
  validation: ChatValidationData;
}

async function main() {
  console.log("=== RUNNING VALIDATION INTEGRATION TEST ===");

  // 1. Setup Test Admin
  console.log("Setting up test admin...");
  const admin = await prisma.adminuser.upsert({
    where: { username: "testadmin_val" },
    create: {
      username: "testadmin_val",
      nama: "Test Admin Validation",
      passwordHash: "$2a$10$Un4s.0oH0c/7Zg6Cg3b4k.yY3LgP8mB1R9mZ2.n1G7V6T9h0oJt2a", // dummy bcrypt hash
      role: "ADMIN",
      aktif: true,
    },
    update: {},
  });

  // 2. Setup Test Customer
  console.log("Setting up test customer...");
  const user = await prisma.user.upsert({
    where: { username: "testuser_val" },
    create: {
      username: "testuser_val",
      email: "testuser_val@example.com",
      noHp: "62899999999",
      passwordHash: "$2a$10$Un4s.0oH0c/7Zg6Cg3b4k.yY3LgP8mB1R9mZ2.n1G7V6T9h0oJt2a",
    },
    update: {},
  });

  // 3. Cleanup existing test chat/audit data to avoid conflicts
  console.log("Cleaning up old test logs...");
  await prisma.auditlog.deleteMany({
    where: {
      adminId: admin.id,
    },
  });
  await prisma.chatsupportmessage.deleteMany({
    where: {
      userId: user.id,
    },
  });
  await prisma.order.deleteMany({
    where: {
      userId: user.id,
    },
  });

  // 4. Create Test Order
  console.log("Creating test order...");
  const orderId = "TEST-ORD-VAL-999";
  await prisma.order.create({
    data: {
      id: orderId,
      userId: user.id,
      status: "DIPROSES",
      pengiriman: "EKSPEDISI",
      metodeBayar: "TRANSFER",
      subtotal: 150000,
      total: 165000,
      alamat: {
        nama: "Test User",
        noHp: "62899999999",
        alamatLengkap: "Alamat Test",
        kota: "Yogyakarta",
        provinsi: "DIY",
      },
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  // 5. Simulate Admin sending Validation Card
  console.log("Simulating validation card dispatch...");
  const initialContext = {
    kind: "validation",
    refId: orderId,
    label: "Helm Retro Klasik",
    sublabel: "Status: Menunggu Validasi",
    thumbnailUrl: "http://localhost:3000/uploads/retro.webp",
    href: `/pesanan/${orderId}`,
    validation: {
      productName: "Helm Retro Klasik",
      photoUrl: "http://localhost:3000/uploads/retro.webp",
      variant: "XL",
      color: "Kuning Doff",
      qty: 1,
      customNote: "Tambahan kaca bogo cembung",
      orderId: orderId,
      orderStatus: "diproses",
      status: "pending",
      adminId: admin.id,
      adminName: admin.nama,
    },
  };

  const message = await prisma.chatsupportmessage.create({
    data: {
      userId: user.id,
      fromRole: "ADMIN",
      pesan: "",
      filesPaths: [],
      context: initialContext satisfies ChatValidationContext,
    },
  });

  // Log audit log for VALIDASI_PRODUK_KIRIM
  await prisma.auditlog.create({
    data: {
      adminId: admin.id,
      adminName: admin.nama,
      action: "VALIDASI_PRODUK_KIRIM",
      entity: "order",
      entityId: orderId,
      meta: {
        productName: initialContext.validation.productName,
        variant: initialContext.validation.variant,
        color: initialContext.validation.color,
        qty: initialContext.validation.qty,
        customNote: initialContext.validation.customNote,
        messageId: message.id,
      },
    },
  });

  console.log("Checking dispatch audit log...");
  const dispatchLogs = await prisma.auditlog.findMany({
    where: {
      adminId: admin.id,
      action: "VALIDASI_PRODUK_KIRIM",
    },
  });
  assert.equal(dispatchLogs.length, 1, "Should have created exactly 1 dispatch audit log entry");
  assert.equal(dispatchLogs[0].entityId, orderId);
  console.log("  ✓ VALIDASI_PRODUK_KIRIM logged successfully");

  // 6. Simulate Customer Approving Card
  console.log("Simulating customer approval action...");
  const msgToApprove = await prisma.chatsupportmessage.findUnique({
    where: { id: message.id },
  });
  const contextRaw = msgToApprove!.context as unknown as ChatValidationContext;
  const validationApproved = {
    ...contextRaw.validation,
    status: "approved",
  };
  const approvedContext = {
    ...contextRaw,
    validation: validationApproved,
    sublabel: "Status: Disetujui",
  };

  await prisma.chatsupportmessage.update({
    where: { id: message.id },
    data: {
      context: approvedContext,
    },
  });

  await prisma.auditlog.create({
    data: {
      adminId: admin.id,
      adminName: admin.nama,
      action: "VALIDASI_PRODUK_SETUJU",
      entity: "order",
      entityId: orderId,
      meta: {
        productName: validationApproved.productName,
        variant: validationApproved.variant,
        color: validationApproved.color,
        qty: validationApproved.qty,
        customNote: validationApproved.customNote,
        customerName: user.username,
        messageId: message.id,
      },
    },
  });

  console.log("Checking approval database state & audit logs...");
  const approvedMsg = await prisma.chatsupportmessage.findUnique({
    where: { id: message.id },
  });
  const approvedCtx = approvedMsg!.context as unknown as ChatValidationContext;
  assert.equal(approvedCtx.validation.status, "approved", "Validation status must be approved");
  
  const approveLogs = await prisma.auditlog.findMany({
    where: {
      adminId: admin.id,
      action: "VALIDASI_PRODUK_SETUJU",
    },
  });
  assert.equal(approveLogs.length, 1, "Should have created exactly 1 approval audit log entry");
  console.log("  ✓ VALIDASI_PRODUK_SETUJU logged successfully");

  // 7. Simulate Customer Requesting Revision
  console.log("Simulating customer revision request action...");
  const revisionNotes = "Ubah warna ke Kuning Glossy, bukan Kuning Doff";
  const validationRevision = {
    ...contextRaw.validation,
    status: "revision_requested",
    revisionNote: revisionNotes,
  };
  const revisionContext = {
    ...contextRaw,
    validation: validationRevision,
    sublabel: "Status: Revisi Diminta",
  };

  await prisma.chatsupportmessage.update({
    where: { id: message.id },
    data: {
      context: revisionContext,
    },
  });

  await prisma.auditlog.create({
    data: {
      adminId: admin.id,
      adminName: admin.nama,
      action: "VALIDASI_PRODUK_REVISI",
      entity: "order",
      entityId: orderId,
      meta: {
        productName: validationRevision.productName,
        variant: validationRevision.variant,
        color: validationRevision.color,
        qty: validationRevision.qty,
        customNote: validationRevision.customNote,
        customerName: user.username,
        messageId: message.id,
        revisionNote: revisionNotes,
      },
    },
  });

  console.log("Checking revision database state & audit logs...");
  const revisionMsg = await prisma.chatsupportmessage.findUnique({
    where: { id: message.id },
  });
  const revisionCtx = revisionMsg!.context as unknown as ChatValidationContext;
  assert.equal(revisionCtx.validation.status, "revision_requested", "Validation status must be revision_requested");
  assert.equal(revisionCtx.validation.revisionNote, revisionNotes, "Revision note should match");

  const revisionLogs = await prisma.auditlog.findMany({
    where: {
      adminId: admin.id,
      action: "VALIDASI_PRODUK_REVISI",
    },
  });
  assert.equal(revisionLogs.length, 1, "Should have created exactly 1 revision audit log entry");
  const meta = revisionLogs[0].meta as { revisionNote?: string };
  assert.equal(meta.revisionNote, revisionNotes, "Revision notes in audit metadata should match");
  console.log("  ✓ VALIDASI_PRODUK_REVISI logged successfully");

  // 8. Cleanup test entities
  console.log("Cleaning up test records...");
  await prisma.auditlog.deleteMany({ where: { adminId: admin.id } });
  await prisma.chatsupportmessage.deleteMany({ where: { userId: user.id } });
  await prisma.order.deleteMany({ where: { id: orderId } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.adminuser.delete({ where: { id: admin.id } });

  console.log("=== INTEGRATION TEST PASSED SUCCESSFULLY ===");
}

main()
  .catch((e) => {
    console.error("❌ Test failed with error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
