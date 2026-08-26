"use client";

import { api } from "@/lib/api/fetcher";

/* ====================  TYPES (SAMA seperti versi lama)  ==================== */
export type OrderStatus =
  | "menunggu_pembayaran"
  | "menunggu_konfirmasi"
  | "diproses"
  | "dikirim"
  | "selesai"
  | "kadaluarsa"
  | "dibatalkan";

export type JenisOrder = "reguler" | "custom";

export interface OrderItemRow {
  productId: string | number;
  nama: string;
  gambar: string | null;
  ukuran: string;
  qty: number;
  harga: number;
  subtotal: number;
  voucher?: { id: string; kode: string; judul: string; nominal: number } | null;
  deskripsi?: string | null;
  isCustom?: boolean;
}

export interface OrderAlamat {
  nama: string; noHp: string; alamat: string; kota: string; kodePos: string;
  detail?: string; provinsi?: string; kecamatan?: string;
}

export interface OrderEkspedisi { kurir?: string; resi?: string; shippedAt?: string; }

export interface OrderTimelineEntry {
  step: "dibuat" | "dibayar" | "dikonfirmasi" | "diproses" | "dikirim" | "sampai" | "selesai" | "dibatalkan" | "kadaluarsa";
  at: string; label: string; sub?: string;
}

export interface TransferInfo {
  pengirim: { nama: string; bank: string; norek?: string };
  penerima: { nama: string; lokasi?: string };
  tujuan: { bank: string; norek: string; an?: string };
  nominal?: number;
  validatedAt?: string;
}

export interface OrderCustomMeta {
  customOrderId: string;
  jenis: string;
  ukuran: string;
  finishing: string;
  strap: string;
  bahan: string;
  motifBusa: string;
  aksesoris: string;
  warnaList: { hex: string; nama?: string }[];
  notes: string;
  estimasiHari: number;
  [key: string]: unknown;
}

export interface Order {
  id: string;
  userId: string;
  jenisOrder?: JenisOrder;
  items: OrderItemRow[];
  alamat: OrderAlamat;
  pengiriman: "ambil" | "ekspedisi";
  pembayaran: { metode: "transfer" | "qris"; bank?: string };
  ongkir: number;
  biayaPacking?: number;
  subtotal: number;
  diskon: number;
  voucher?: { id: string; kode: string; judul: string; nominal: number } | null;
  total: number;
  status: OrderStatus;
  buktiBayar?: string | null;
  buktiBayarAt?: string | null;
  createdAt: string;
  expiredAt: string;
  catatanAdmin?: string | null;
  resi?: string | null;
  ekspedisi?: OrderEkspedisi | null;
  timeline?: OrderTimelineEntry[];
  estimasiTiba?: { from: string; to: string } | null;
  estimasiProsesHari?: number | null;
  transferInfo?: TransferInfo | null;
  deliveredAt?: string | null;
  konfirmasiDiterimaAt?: string | null;
  catatanKurir?: string | null;
  customMeta?: OrderCustomMeta | null;
}

export const ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000;

/* ====================  ID GENERATOR  ==================== */
export function generateOrderId(prefix: "JD" | "JD-C" = "JD"): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${ymd}-${rnd}`;
}

/* ====================  CORE — ASYNC API  ==================== */
export async function getOrders(_userId?: string): Promise<Order[]> {
  void _userId;
  try { return await api.get<Order[]>("/api/order"); } catch { return []; }
}

export async function getOrder(_userId: string, orderId: string): Promise<Order | null> {
  try {
    return await api.get<Order>(`/api/order/${orderId}`);
  } catch {
    try {
      return await api.get<Order>(`/api/admin/order/${orderId}`);
    } catch {
      return null;
    }
  }
}

export async function addOrder(_userId: string, payload: {
  items: {
    productId: string;
    ukuran: string;
    qty: number;
  }[];
  alamat: OrderAlamat;
  pengiriman: "ambil" | "ekspedisi";
  pembayaran: {
    metode: "transfer" | "qris";
    bank?: string;
  };
  ongkir: number;
  biayaPacking?: number;
  voucher?: { id: string; kode: string; judul: string; nominal: number } | null;
}): Promise<Order> {
  return api.post<Order>("/api/order", payload);
}

export async function updateOrder(
  _userId: string,
  _orderId: string,
  _patch: Partial<Order>,
): Promise<Order | null> {
  void _userId;
  void _orderId;
  void _patch;
  console.warn("[orders-storage] updateOrder(): tidak didukung lagi — pakai action helper.");
  return null;
}

export async function cancelOrder(_userId: string, orderId: string): Promise<Order | null> {
  try { return await api.post<Order>(`/api/order/${orderId}/actions`, { action: "cancel" }); }
  catch { return null; }
}

export async function deleteOrder(_userId: string, orderId: string): Promise<void> {
  await api.post(`/api/order/${orderId}/actions`, { action: "delete" });
}

export async function customerKonfirmasiDiterima(
  _userId: string, orderId: string,
): Promise<Order | null> {
  try { return await api.post<Order>(`/api/order/${orderId}/actions`, { action: "konfirmasi-diterima" }); }
  catch { return null; }
}

/** Upload bukti bayar. File + metadata pengirim. */
export async function uploadBuktiBayar(
  orderId: string,
  file: File,
  meta?: { pengirimNama?: string; pengirimBank?: string; pengirimNoRek?: string; jamTransfer?: string },
): Promise<Order> {
  const fd = new FormData();
  fd.append("file", file);
  if (meta?.pengirimNama) fd.append("pengirimNama", meta.pengirimNama);
  if (meta?.pengirimBank) fd.append("pengirimBank", meta.pengirimBank);
  if (meta?.pengirimNoRek) fd.append("pengirimNoRek", meta.pengirimNoRek);
  if (meta?.jamTransfer) fd.append("jamTransfer", meta.jamTransfer);
  return api.upload<Order>(`/api/order/${orderId}/bayar`, fd);
}

export function isExpired(order: Order): boolean {
  if (order.status !== "menunggu_pembayaran") return false;
  return new Date(order.expiredAt).getTime() <= Date.now();
}

/* ====================  ADMIN GLOBAL HELPERS (async)  ==================== */
export async function getAllOrdersGlobal(): Promise<Order[]> {
  try { return await api.get<Order[]>("/api/admin/order?limit=5000"); } catch { return []; }
}

export async function findOrderGlobal(orderId: string): Promise<Order | null> {
  try { return await api.get<Order>(`/api/admin/order/${orderId}`); } catch { return null; }
}

export async function updateOrderGlobal(_orderId: string, _patch: Partial<Order>): Promise<Order | null> {
  void _orderId;
  void _patch;
  console.warn("[orders-storage] updateOrderGlobal(): pakai admin actions helper.");
  return null;
}

/* ====================  LABELS  ==================== */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  menunggu_konfirmasi: "Menunggu Konfirmasi",
  diproses: "Diproses",
  dikirim: "Dikirim",
  selesai: "Selesai",
  kadaluarsa: "Kadaluarsa",
  dibatalkan: "Dibatalkan",
};
export const STATUS_COLOR: Record<OrderStatus, string> = {
  menunggu_pembayaran: "bg-amber-100 text-amber-700",
  menunggu_konfirmasi: "bg-blue-100 text-blue-700",
  diproses: "bg-indigo-100 text-indigo-700",
  dikirim: "bg-purple-100 text-purple-700",
  selesai: "bg-green-100 text-green-700",
  kadaluarsa: "bg-zinc-100 text-zinc-600",
  dibatalkan: "bg-red-100 text-red-700",
};

/* ====================  BANK / QRIS / EKSPEDISI  ==================== */
export {
  getAdminBanks as getBanks,
  getAdminQris as getQrisConfig,
} from "@/lib/admin-bank-helpers";

export interface EkspedisiOption {
  id: string; nama: string; trackUrl: (resi: string) => string;
  isApi?: boolean; forReturn?: boolean;
}

// Hanya J&T Express — satu-satunya ekspedisi yang digunakan
const EKSPEDISI_DEFAULT: EkspedisiOption[] = [
  { id: "jnt", nama: "J&T Express", trackUrl: (r) => `https://www.jet.co.id/track?awb=${r}`, isApi: true, forReturn: true },
];

/** Sync fallback — returns default list. Use getEkspedisiListAsync() for DB data. */
export function getEkspedisiList(): EkspedisiOption[] {
  return EKSPEDISI_DEFAULT;
}

/** Async version — fetch aktif ekspedisi from database via API. */
export async function getEkspedisiListAsync(): Promise<EkspedisiOption[]> {
  try {
    const res = await fetch("/api/ekspedisi");
    const j = await res.json();
    const rows = j?.data;
    if (!Array.isArray(rows) || rows.length === 0) return EKSPEDISI_DEFAULT;
    return rows.map((s: { id: string; keyUnik: string; nama: string; trackUrlTemplate: string | null; isApi?: boolean; forReturn?: boolean }) => ({
      id: s.keyUnik ?? s.id,
      nama: s.nama,
      trackUrl: (r: string) => (s.trackUrlTemplate ?? "{resi}").replace("{resi}", r),
      isApi: s.isApi,
      forReturn: s.forReturn,
    }));
  } catch { return EKSPEDISI_DEFAULT; }
}
export const EKSPEDISI_LIST: EkspedisiOption[] = EKSPEDISI_DEFAULT;
export const EKSPEDISI_OPTIONS = EKSPEDISI_LIST.map((e) => e.nama);
export function getEkspedisiByName(nama?: string | null): EkspedisiOption | undefined {
  if (!nama) return undefined;
  return EKSPEDISI_LIST.find((e) => e.nama === nama || e.id === nama);
}
export function getReturnEkspedisi(): EkspedisiOption {
  return EKSPEDISI_LIST.find((e) => e.forReturn) ?? EKSPEDISI_LIST[0];
}

/* ====================  TIMELINE HELPERS  ==================== */
const ID_BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

export function formatTanggalID(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${ID_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}
export function formatTanggalJamID(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const jam = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${d.getDate()} ${ID_BULAN[d.getMonth()]} ${d.getFullYear()} · ${jam}`;
}
export function formatRangeTanggalID(range?: { from: string; to: string } | null): string {
  if (!range?.from || !range?.to) return "-";
  const f = new Date(range.from);
  const t = new Date(range.to);
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return "-";
  if (f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear())
    return `${f.getDate()}-${t.getDate()} ${ID_BULAN[f.getMonth()]} ${f.getFullYear()}`;
  if (f.getFullYear() === t.getFullYear())
    return `${f.getDate()} ${ID_BULAN[f.getMonth()]} - ${t.getDate()} ${ID_BULAN[t.getMonth()]} ${f.getFullYear()}`;
  return `${formatTanggalID(range.from)} - ${formatTanggalID(range.to)}`;
}

export function buildDefaultTimeline(o: Order): OrderTimelineEntry[] {
  const tl: OrderTimelineEntry[] = [];
  tl.push({ step: "dibuat", at: o.createdAt, label: "Pesanan Dibuat" });
  if (o.buktiBayarAt)
    tl.push({ step: "dibayar", at: o.buktiBayarAt, label: "Bukti Pembayaran Diunggah" });
  const sudahKonfirmasi = ["diproses", "dikirim", "selesai"].includes(o.status);
  if (sudahKonfirmasi) {
    tl.push({
      step: "dikonfirmasi",
      at: o.transferInfo?.validatedAt ?? o.buktiBayarAt ?? o.createdAt,
      label: "Pembayaran Dikonfirmasi Admin",
    });
    tl.push({
      step: "diproses",
      at: o.transferInfo?.validatedAt ?? o.buktiBayarAt ?? o.createdAt,
      label: "Pesanan Diproses",
      sub: "Admin sedang menyiapkan pesanan",
    });
  }
  if (o.ekspedisi?.shippedAt)
    tl.push({
      step: "dikirim",
      at: o.ekspedisi.shippedAt,
      label: "Pesanan Dikirim",
      sub: o.ekspedisi.kurir ?? undefined,
    });
  if (o.deliveredAt)
    tl.push({ step: "sampai", at: o.deliveredAt, label: "Paket Tiba di Alamat" });
  if (o.konfirmasiDiterimaAt)
    tl.push({ step: "selesai", at: o.konfirmasiDiterimaAt, label: "Pesanan Selesai" });
  return tl;
}

export function getOrderTimeline(o: Order): OrderTimelineEntry[] {
  return o.timeline && o.timeline.length > 0 ? o.timeline : buildDefaultTimeline(o);
}

export function deriveEstimasiTiba(
  shippedAtIso?: string | null,
): { from: string; to: string } | null {
  if (!shippedAtIso) return null;
  const base = new Date(shippedAtIso);
  if (isNaN(base.getTime())) return null;
  const f = new Date(base); f.setDate(f.getDate() + 3);
  const t = new Date(base); t.setDate(t.getDate() + 5);
  return { from: f.toISOString(), to: t.toISOString() };
}

/* ====================  LEGACY STUBS  ==================== */
export async function appendTimeline(): Promise<Order | null> { return null; }

export function restoreStockOnCancelLocal(): void {
  // no-op: server akan restore stock di action `cancel`
}