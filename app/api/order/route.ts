// GET  /api/order   — list pesanan user login
// POST /api/order   — create order baru (dari checkout)

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import {
  mapOrderToLegacy,
  generateOrderId,
  METODE_TO_UPPER,
} from "@/lib/api/order-mapper";
import { mutateProductStock } from "@/lib/server/stock-mutation";
import { sendOrderEmail, sendAdminEmail } from "@/lib/email/send";
import { pushAdminNotification } from "@/lib/admin-notification-server";
import type { order_bankKey } from "@prisma/client";


const ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000;

const alamatSchema = z.object({
  nama: z.string().min(1),
  noHp: z.string().min(8),
  alamat: z.string().min(1),
  kota: z.string().min(1),
  kodePos: z.string().min(3),
  detail: z.string().optional(),
  provinsi: z.string().optional(),
  kecamatan: z.string().optional(),
});

const itemSchema = z.object({
  productId: z.string().min(1),
  ukuran: z.string().default(""),
  qty: z.number().int().min(1),
});

const createSchema = z.object({
  items: z.array(itemSchema).min(1),
  alamat: alamatSchema,
  pengiriman: z.enum(["ambil", "ekspedisi"]),
  pembayaran: z.object({
    metode: z.enum(["transfer", "qris"]),
    // bank key dinamis — tidak hardcoded agar kompatibel dengan bank apapun yang admin setup
    bank: z.string().optional(),
  }),
  ongkir: z.number().int().min(0).default(0),
  biayaPacking: z.number().int().min(0).default(0),
  voucher: z
    .object({ id: z.string(), kode: z.string(), judul: z.string(), nominal: z.number() })
    .nullable()
    .optional(),
});

export const GET = handler(async () => {
  const me = await requireCustomer();
  const rows = await prisma.order.findMany({
    where: { userId: me.id },
    include: { orderitem: true, ordertimeline: { orderBy: { at: "asc" } }, payment: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(rows.map((r) => mapOrderToLegacy({
    ...r,
    items: r.orderitem,
    timeline: r.ordertimeline,
    payments: r.payment,
  })));
});

export const POST = handler(async (req: Request) => {
  const me = await requireCustomer();
  const body = createSchema.parse(await req.json());

  // --- VALIDASI IDEMPOTENCY / DOUBLE CLICK ---
  const tenSecondsAgo = new Date(Date.now() - 10000);
  const recentOrder = await prisma.order.findFirst({
    where: {
      userId: me.id,
      createdAt: { gte: tenSecondsAgo },
    },
    select: { id: true },
  });
  if (recentOrder) {
    return fail(429, "Pesanan sedang diproses. Mohon tunggu beberapa saat sebelum membuat pesanan baru.");
  }

  // --- VALIDASI STOK & PRODUK ---
  const ids = body.items.map((i) => i.productId);
  const produks = await prisma.produk.findMany({
    where: { id: { in: ids } },
    include: { produkimage: { orderBy: { urutan: "asc" }, take: 1 } },
  });
  const pMap = new Map(produks.map((p) => [p.id, p]));

  // Siapkan data produk untuk itemRows (stok divalidasi di dalam transaksi)
  const itemRows: Array<{
    produkId: string;
    snapNama: string;
    snapHarga: number;
    snapGambar: string | null;
    snapJenis: string;
    ukuran: string | null;
    warna: string | null;
    qty: number;
    subtotal: number;
  }> = [];
  let subtotal = 0;

  for (const it of body.items) {
    const p = pMap.get(it.productId);
    if (!p) {
      throw new Error(`Produk ${it.productId} tidak ditemukan`);
    }
    const sub = p.harga * it.qty;
    subtotal += sub;
    itemRows.push({
      produkId: p.id,
      snapNama: p.nama,
      snapHarga: p.harga,
      snapGambar: p.produkimage[0]?.path ?? null,
      snapJenis: p.jenisLabel,
      ukuran: it.ukuran || null,
      warna: null,
      qty: it.qty,
      subtotal: sub,
    });
  }

  // --- VALIDASI VOUCHER (jika ada) ---
  let diskon = 0;
  let voucherData = null;
  if (body.voucher) {
    const voucher = await prisma.voucher.findUnique({
      where: { kode: body.voucher.kode },
    });
    if (!voucher || !voucher.aktif) {
      throw new Error("Voucher tidak valid");
    }
    if (voucher.expiredAt && voucher.expiredAt < new Date()) {
      throw new Error("Voucher sudah kadaluwarsa");
    }
    if (voucher.kuota !== null && voucher.terpakai >= voucher.kuota) {
      throw new Error("Kuota voucher habis");
    }
    if (subtotal < voucher.minOrder) {
      throw new Error(`Minimal belanja Rp ${voucher.minOrder.toLocaleString()} untuk voucher ini`);
    }
    if (voucher.jenis === "PERSEN") {
      diskon = Math.min(subtotal * voucher.nilai / 100, voucher.maxDiscount ?? Infinity);
    } else {
      diskon = voucher.nilai;
    }
    if (diskon > subtotal) diskon = subtotal;
    voucherData = {
      id: voucher.id,
      kode: voucher.kode,
      judul: voucher.judul,
      nominal: diskon,
    };
  } else {
    diskon = 0;
  }

  const total = Math.max(0, subtotal + body.ongkir + body.biayaPacking - diskon);
  const now = new Date();
  const expired = new Date(now.getTime() + ORDER_EXPIRY_MS);
  const orderId = generateOrderId("JD");

  const itemIds = itemRows.map(() => crypto.randomUUID());
  const timelineId = crypto.randomUUID();

  // --- TRANSACTION ATOMIK (email dikirim SETELAH transaksi) ---
  const created = await prisma.$transaction(async (tx) => {
    // 1. Validasi stok DI DALAM transaksi (race condition guard)
    const produksInTx = await tx.produk.findMany({
      where: { id: { in: ids } },
      select: { id: true, stok: true, nama: true },
    });
    const pInTxMap = new Map(produksInTx.map((p) => [p.id, p]));

    for (const it of body.items) {
      const p = pInTxMap.get(it.productId);
      if (!p) {
        throw new Error(`Produk ${it.productId} tidak ditemukan`);
      }
      if (p.stok < it.qty) {
        throw new Error(`Stok produk ${p.nama} tidak cukup (tersisa ${p.stok})`);
      }
    }

    // 2. Kurangi stok produk (handle varian + guard negatif)
    for (const it of body.items) {
      const itemRow = itemRows.find((r) => r.produkId === it.productId);
      await mutateProductStock(tx, it.productId, itemRow?.ukuran ?? null, null, -it.qty, {
        guardNegative: true,
      });
    }

    // 3. Jika pakai voucher, increment terpakai
    if (voucherData) {
      await tx.voucher.update({
        where: { kode: body.voucher!.kode },
        data: { terpakai: { increment: 1 } },
      });
      // Catat usage (opsional)
      await tx.voucherusage.create({
        data: {
          id: crypto.randomUUID(),
          voucherId: voucherData.id,
          userId: me.id,
          orderId: orderId,
        },
      });
    }

    // 4. Buat order
    const order = await tx.order.create({
      data: {
        id: orderId,
        userId: me.id,
        jenisOrder: "REGULER",
        status: "MENUNGGU_PEMBAYARAN",
        pengiriman: body.pengiriman === "ambil" ? "AMBIL" : "EKSPEDISI",
        metodeBayar: METODE_TO_UPPER[body.pembayaran.metode],
        bankKey: body.pembayaran.bank ? (body.pembayaran.bank.toUpperCase() as order_bankKey) : null,
        subtotal,
        ongkir: body.ongkir,
        biayaPacking: body.biayaPacking,
        diskon,
        total,
        voucherCode: body.voucher?.kode ?? null,
        voucherInfo: voucherData ?? undefined,
        alamat: body.alamat,
        expiredAt: expired,
        orderitem: { create: itemRows.map((r, i) => ({ id: itemIds[i], ...r })) },
        ordertimeline: {
          create: [{ id: timelineId, step: "DIBUAT", label: "Pesanan Dibuat", at: now }],
        },
      },
      include: { orderitem: true, ordertimeline: { orderBy: { at: "asc" } }, payment: true },
    });

    return order;
  });

  // Email SETELAH transaksi berhasil (non-blocking)
  void sendOrderEmail("order-created", {
    recipientEmail: me.email,
    recipientName: me.username,
    recipientPhone: body.alamat.noHp,
    userId: me.id,
    orderId: orderId,
    total,
    expiredAt: expired.toISOString(),
  });

  // Notifikasi admin (non-blocking)
  prisma.adminuser.findMany({ where: { aktif: true }, select: { email: true, nama: true } })
    .then((admins) => {
      admins.forEach((admin) => {
        if (admin.email) {
          sendAdminEmail("new-order", {
            adminEmail: admin.email,
            adminName: admin.nama,
            orderId: orderId,
            total,
            customerName: me.username,
          }).catch(err => console.error(`[EMAIL] admin new-order to ${admin.email} failed:`, err));
        }
      });
    }).catch(err => console.error("[EMAIL] admin new-order query failed:", err));

  // Pusher Admin Notification
  pushAdminNotification(
    "Pesanan Baru",
    `Order ${created.id} dari ${me.username} telah dibuat.`,
    "info",
    "order"
  );

  return ok(mapOrderToLegacy({
    ...created,
    items: created.orderitem,
    timeline: created.ordertimeline,
    payments: created.payment,
  }));
});