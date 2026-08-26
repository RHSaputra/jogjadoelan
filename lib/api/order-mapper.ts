// lib/api/order-mapper.ts
// Konversi row Prisma (enum UPPER) ↔ shape `Order` legacy (lowercase string).

import type {
  order as PrismaOrder,
  orderitem as PrismaItem,
  ordertimeline as PrismaTimeline,
  payment as PrismaPayment,
  order_status as PrismaOrderStatus,
  payment_metode as PrismaMetode,
  order_bankKey as PrismaBankKey,
  ordertimeline_step as PrismaStep,
} from "@prisma/client";
import type { Order, OrderStatus, OrderItemRow, OrderTimelineEntry } from "@/lib/orders-storage";

const STATUS_TO_LOWER: Record<PrismaOrderStatus, OrderStatus> = {
  MENUNGGU_PEMBAYARAN: "menunggu_pembayaran",
  MENUNGGU_KONFIRMASI: "menunggu_konfirmasi",
  DIPROSES: "diproses",
  DIKIRIM: "dikirim",
  SELESAI: "selesai",
  KADALUARSA: "kadaluarsa",
  DIBATALKAN: "dibatalkan",
};
export const STATUS_TO_UPPER: Record<OrderStatus, PrismaOrderStatus> = {
  menunggu_pembayaran: "MENUNGGU_PEMBAYARAN",
  menunggu_konfirmasi: "MENUNGGU_KONFIRMASI",
  diproses: "DIPROSES",
  dikirim: "DIKIRIM",
  selesai: "SELESAI",
  kadaluarsa: "KADALUARSA",
  dibatalkan: "DIBATALKAN",
};

const STEP_TO_LOWER: Record<PrismaStep, string> = {
  DIBUAT: "dibuat",
  DIBAYAR: "dibayar",
  DIKONFIRMASI: "dikonfirmasi",
  DIPROSES: "diproses",
  DIKIRIM: "dikirim",
  SAMPAI: "sampai",
  SELESAI: "selesai",
  DIBATALKAN: "dibatalkan",
  KADALUARSA: "kadaluarsa",
};
export const STEP_TO_UPPER: Record<string, PrismaStep> = {
  dibuat: "DIBUAT",
  dibayar: "DIBAYAR",
  dikonfirmasi: "DIKONFIRMASI",
  diproses: "DIPROSES",
  dikirim: "DIKIRIM",
  sampai: "SAMPAI",
  selesai: "SELESAI",
  dibatalkan: "DIBATALKAN",
  kadaluarsa: "KADALUARSA",
};

export const METODE_TO_LOWER: Record<PrismaMetode, "transfer" | "qris"> = {
  TRANSFER: "transfer", QRIS: "qris",
};
export const METODE_TO_UPPER = { transfer: "TRANSFER" as const, qris: "QRIS" as const };

export const BANK_TO_LOWER: Record<PrismaBankKey, "bca" | "bni" | "bri" | "mandiri"> = {
  BCA: "bca", BNI: "bni", BRI: "bri", MANDIRI: "mandiri",
};
export const BANK_TO_UPPER = {
  bca: "BCA" as const, bni: "BNI" as const, bri: "BRI" as const, mandiri: "MANDIRI" as const,
};

type FullOrder = PrismaOrder & {
  orderitem: PrismaItem[];
  ordertimeline: PrismaTimeline[];
  payment?: PrismaPayment[];
  items?: unknown;
  timeline?: unknown;
  payments?: unknown;
};

export function mapOrderToLegacy(o: FullOrder): Order {
  type ItemLike = {
    produkId: string | null;
    snapNama: string;
    snapGambar: string | null;
    ukuran: string | null;
    qty: number;
    snapHarga: number;
    subtotal: number;
    snapDeskripsi: string | null;
    isCustom: boolean;
    voucherInfo: unknown | null;
  };

  const items: OrderItemRow[] = (o.orderitem ?? []).map((it: ItemLike) => ({
    productId: it.produkId ?? "",
    nama: it.snapNama,
    gambar: it.snapGambar ?? null,
    ukuran: it.ukuran ?? "",
    qty: it.qty,
    harga: it.snapHarga,
    subtotal: it.subtotal,
    deskripsi: it.snapDeskripsi ?? null,
    isCustom: it.isCustom,
    voucher: (it.voucherInfo as OrderItemRow["voucher"] | null) ?? null,
  }));

  return {
    id: o.id,
    userId: o.userId,
    jenisOrder: o.jenisOrder === "CUSTOM" ? "custom" : "reguler",
    items,
    alamat: o.alamat as unknown as Order["alamat"],
    pengiriman: o.pengiriman === "AMBIL" ? "ambil" : "ekspedisi",
    pembayaran: {
      metode: METODE_TO_LOWER[o.metodeBayar],
      bank: o.bankKey ? BANK_TO_LOWER[o.bankKey] : undefined,
    },
    ongkir: o.ongkir,
    biayaPacking: o.biayaPacking,
    subtotal: o.subtotal,
    diskon: o.diskon,
    voucher: (o.voucherInfo as unknown as Order["voucher"]) ?? null,
    total: o.total,
    status: STATUS_TO_LOWER[o.status],
    buktiBayar: o.buktiBayar,
    buktiBayarAt: o.buktiBayarAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    expiredAt: o.expiredAt.toISOString(),
    catatanAdmin: o.catatanAdmin,
    resi: o.resi,
    ekspedisi: (o.ekspedisi as unknown as Order["ekspedisi"]) ?? null,
    estimasiTiba: (o.estimasiTiba as unknown as Order["estimasiTiba"]) ?? null,
    estimasiProsesHari: o.estimasiProsesHari,
    transferInfo: (o.transferInfo as unknown as Order["transferInfo"]) ?? null,
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
    konfirmasiDiterimaAt: o.konfirmasiDiterimaAt?.toISOString() ?? null,
    catatanKurir: o.catatanKurir,
    customMeta: (o.customMeta as unknown as Order["customMeta"]) ?? null,
    timeline: (o.ordertimeline ?? [])
      .slice()
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((t: PrismaTimeline) => {
        const mapped = STEP_TO_LOWER[t.step];
        const step = (mapped ?? t.step) as OrderTimelineEntry["step"];

        return {
          step,
          at: t.at.toISOString(),
          label: t.label,
          sub: t.sub ?? undefined,
        };
      }),
  };
}

export function generateOrderId(prefix: "JD" | "JD-C" = "JD"): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${ymd}-${rnd}`;
}
