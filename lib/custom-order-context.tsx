"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CUSTOM_PALETTE_PRESETS } from "./constants";
import { useAuth } from "@/lib/auth-context";

/* ====================  TYPES (tidak berubah)  ==================== */

export interface WarnaItem {
  hex: string;
  nama?: string;
  sumber: "preset" | "custom";
}

export interface CustomOrderForm {
  jenis: string;
  warnaList: WarnaItem[];
  warnaCatatan: string;
  finishing: string;
  strap: string;
  ukuran: string;
  motifBusa: string;
  bahan: string;
  aksesoris: string;
  referensiFiles: { name: string; size: number; dataUrl?: string }[];
  notes: string;
}

export interface EstimasiItem { label: string; sub: string; harga: number; hari: number; }

export type PaymentMetode = "transfer" | "qris";
export type BankKey = string;
export type PaymentType = "dp" | "lunas";

export interface PaymentRecord {
  amount: number;
  metode: PaymentMetode;
  bank?: BankKey;
  buktiUrl: string;
  at: number;
}

export type CustomStatus =
  | "draft" | "submitted" | "estimated" | "approved" | "rejected"
  | "menunggu_estimasi" | "menunggu_persetujuan" | "menunggu_pembayaran"
  | "menunggu_verifikasi_dp" | "menunggu_verifikasi_lunas" | "menunggu_verifikasi_pelunasan"
  | "diproses" | "siap_dilunasi" | "dikirim" | "selesai" | "ditolak" | "dibatalkan";

export interface ProgressUpdate {
  id: string; tahap: string; deskripsi?: string; fotoUrl?: string; createdAt: number;
}

export interface CustomOrder extends CustomOrderForm {
  id: string;
  createdAt: number;
  status: CustomStatus;
  estimasi?: { items: EstimasiItem[]; total: number };
  userId?: string;
  quotedByAdminAt?: number;
  quotedCatatan?: string;
  customerApprovedAt?: number;
  paymentType?: PaymentType;
  dpPayment?: PaymentRecord;
  lunasPayment?: PaymentRecord;
  pelunasanPayment?: PaymentRecord;
  isLate?: boolean;
  estimasiTanggal?: { mulai: string; selesai: string };
  progressUpdates?: ProgressUpdate[];
}

/* ====================  CONST  ==================== */

export const CUSTOM_STATUS_LABEL: Record<CustomStatus, string> = {
  draft: "Draft",
  submitted: "Menunggu Estimasi",
  estimated: "Menunggu Persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  menunggu_estimasi: "Menunggu Estimasi",
  menunggu_persetujuan: "Menunggu Persetujuan",
  menunggu_pembayaran: "Menunggu Pembayaran",
  menunggu_verifikasi_dp: "Menunggu Verifikasi DP",
  menunggu_verifikasi_lunas: "Menunggu Verifikasi Pelunasan",
  menunggu_verifikasi_pelunasan: "Menunggu Verifikasi Pelunasan",
  diproses: "Sedang Diproduksi",
  siap_dilunasi: "Siap Dilunasi",
  dikirim: "Dikirim",
  selesai: "Selesai",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
};

export const CUSTOM_STATUS_COLOR: Record<CustomStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  submitted: "bg-blue-100 text-blue-700",
  estimated: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  menunggu_estimasi: "bg-blue-100 text-blue-700",
  menunggu_persetujuan: "bg-amber-100 text-amber-700",
  menunggu_pembayaran: "bg-amber-100 text-amber-700",
  menunggu_verifikasi_dp: "bg-blue-100 text-blue-700",
  menunggu_verifikasi_lunas: "bg-blue-100 text-blue-700",
  menunggu_verifikasi_pelunasan: "bg-blue-100 text-blue-700",
  diproses: "bg-violet-100 text-violet-700",
  siap_dilunasi: "bg-amber-100 text-amber-700",
  dikirim: "bg-indigo-100 text-indigo-700",
  selesai: "bg-green-100 text-green-700",
  ditolak: "bg-red-100 text-red-700",
  dibatalkan: "bg-red-100 text-red-700",
};

const DEFAULT_FORM: CustomOrderForm = {
  jenis: "Half Face",
  warnaList: [{ hex: CUSTOM_PALETTE_PRESETS[0].hex, nama: CUSTOM_PALETTE_PRESETS[0].nama, sumber: "preset" }],
  warnaCatatan: "",
  finishing: "Clear Glossy",
  strap: "DD Ring Standard",
  ukuran: "M",
  motifBusa: "Polos Hitam",
  bahan: "ABS (Baru)",
  aksesoris: "Random",
  referensiFiles: [],
  notes: "",
};

/* ====================  INPUTS  ==================== */

interface PayDpInput { amount: number; ongkir?: number; metode: PaymentMetode; bank?: BankKey; buktiUrl: string; }
interface PayLunasInput { ongkir?: number; metode: PaymentMetode; bank?: BankKey; buktiUrl: string; }
interface PayPelunasanInput { ongkir?: number; metode: PaymentMetode; bank?: BankKey; buktiUrl: string; }

interface Ctx {
  draft: CustomOrderForm;
  updateDraft: (p: Partial<CustomOrderForm>) => void;
  resetDraft: () => void;

  currentOrder: CustomOrder | null;
  setCurrentOrder: (o: CustomOrder | null) => void;
  /** ASYNC sekarang: kirim ke server, return order final. */
  submitOrder: () => Promise<CustomOrder>;
  generateEstimasi: () => void;
  /** ASYNC sekarang. */
  approveOrder: () => Promise<CustomOrder | null>;
  /** ASYNC sekarang. */
  rejectOrder: () => Promise<void>;

  orders: CustomOrder[];
  addOrder: (o: CustomOrder) => void;
  updateOrder: (id: string, patch: Partial<CustomOrder>) => void;
  removeOrder: (id: string) => void;
  /** Force refetch dari server (mis. setelah admin verify). */
  refreshOrders: () => Promise<void>;

  currentOrderId: string | null;
  setCurrentOrderId: (id: string | null) => void;
  getOrderById: (id: string) => CustomOrder | undefined;

  /** ASYNC sekarang. */
  payDp: (id: string, input: PayDpInput) => Promise<void>;
  /** ASYNC sekarang. */
  payLunas: (id: string, input: PayLunasInput) => Promise<void>;
  /** ASYNC sekarang. */
  payPelunasan: (id: string, input: PayPelunasanInput) => Promise<void>;

  devSetStatus: (id: string, status: CustomStatus) => void;
  /** ASYNC: customer konfirmasi pesanan diterima (status DIKIRIM → SELESAI). */
  konfirmasiTerima: (id: string) => Promise<void>;
  /** ASYNC: customer batalkan pesanan. */
  cancelOrder: (id: string, alasan?: string) => Promise<void>;
  ordersLoading: boolean;
}

const CustomOrderCtx = createContext<Ctx | null>(null);
const KEY_DRAFT = "jogjadoelan_custom_draft";

/* ====================  HELPERS  ==================== */

interface ApiEnvelope<T> { data?: T; error?: { message: string } }

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j: ApiEnvelope<T> = await r.json();
  if (r.status === 429) {
    const retryAfter = r.headers.get("retry-after");
    const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
    throw new Error(`Terlalu banyak permintaan. Coba lagi dalam ${retrySeconds} detik`);
  }
  if (!r.ok) throw new Error(j.error?.message ?? `POST ${url} gagal (${r.status})`);
  if (!j.data) throw new Error(`POST ${url}: data kosong`);
  return j.data;
}

/** Server DTO sudah memakai shape `CustomOrder` (epoch ms, lowercase enum). */
type ServerCustomOrder = CustomOrder & { referensiPaths?: string[] };
function dtoToOrder(d: ServerCustomOrder): CustomOrder {
  return {
    ...d,
    referensiFiles: (d.referensiPaths ?? []).map((p) => ({
      name: p.split("/").pop() ?? p, size: 0, dataUrl: p,
    })),
  };
}

/* ====================  PROVIDER  ==================== */

export function CustomOrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? "";

  const [draft, setDraft] = useState<CustomOrderForm>(DEFAULT_FORM);
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [currentOrderId, setCurrentOrderIdState] = useState<string | null>(null);
  const [currentOrder, setCurrentOrderState] = useState<CustomOrder | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);

  /* Ref for currentOrderId so refreshOrders doesn't depend on state */
  const currentOrderIdRef = useRef<string | null>(null);
  useEffect(() => { currentOrderIdRef.current = currentOrderId; }, [currentOrderId]);

  /* AbortController for in-flight request deduplication */
  const abortRef = useRef<AbortController | null>(null);

  /* ----- draft persist (LS, UX-only) ----- */
  useEffect(() => {
    let mounted = true;

    try {
      const d = localStorage.getItem(KEY_DRAFT);
      if (d && mounted) {
        const parsed = JSON.parse(d) as Partial<CustomOrderForm>;

        // Defer state updates to avoid ESLint/react "setState in effect body" warnings
        window.setTimeout(() => {
          if (!mounted) return;
          setDraft({ ...DEFAULT_FORM, ...parsed });
          setHydrated(true);
        }, 0);
      } else {
        window.setTimeout(() => {
          if (!mounted) return;
          setHydrated(true);
        }, 0);
      }
    } catch {
      window.setTimeout(() => {
        if (!mounted) return;
        setHydrated(true);
      }, 0);
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY_DRAFT, JSON.stringify(draft)); } catch {}
  }, [draft, hydrated]);

  /* ----- refresh orders dari server ----- */
  // Throttle: prevent rapid successive refresh calls
  const lastRefreshRef = useRef(0);
  const MIN_REFRESH_INTERVAL = 15_000; // 15 seconds minimum between refreshes
  const refreshInFlightRef = useRef(false);

  const refreshOrders = useCallback(async () => {
    if (!uid) { setOrders([]); setOrdersLoading(false); return; }

    // Guard: skip if a refresh is already in-flight
    if (refreshInFlightRef.current) return;

    const now = Date.now();
    if (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL) return;

    // Cancel any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    lastRefreshRef.current = now;
    refreshInFlightRef.current = true;
    try {
      const r = await fetch("/api/custom", { credentials: "include", cache: "no-store", signal: controller.signal });
      if (!r.ok) return;
      const j = await r.json();
      const list: ServerCustomOrder[] = j.data ?? [];
      if (controller.signal.aborted) return;
      const mapped = list.map(dtoToOrder);
      setOrders(mapped);
      // Use ref to avoid dependency on currentOrderId state
      const cid = currentOrderIdRef.current;
      if (cid) {
        const fresh = mapped.find((o) => o.id === cid);
        if (fresh) setCurrentOrderState(fresh);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("[custom-order] refresh failed:", e);
      }
    } finally {
      setOrdersLoading(false);
      refreshInFlightRef.current = false;
    }
  }, [uid]); // ← ONLY depends on uid, no more currentOrderId!

  // Initial fetch on mount / uid change
  useEffect(() => {
    const t = window.setTimeout(() => { void refreshOrders(); }, 0);
    return () => window.clearTimeout(t);
  }, [refreshOrders]);

  /* ----- focus / visibility → soft refetch ----- */
  // Use a stable ref so we don't re-register listeners on every refreshOrders identity change
  const refreshOrdersRef = useRef(refreshOrders);
  useEffect(() => { refreshOrdersRef.current = refreshOrders; }, [refreshOrders]);

  useEffect(() => {
    if (!uid) return;
    const tick = () => { void refreshOrdersRef.current(); };
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", tick);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", tick);
    };
  }, [uid]); // ← only depends on uid, not refreshOrders

  /* ----- draft helpers ----- */
  const updateDraft = useCallback((p: Partial<CustomOrderForm>) => setDraft((prev) => ({ ...prev, ...p })), []);
  const resetDraft = useCallback(() => setDraft(DEFAULT_FORM), []);

  /* ----- mutations (ASYNC) ----- */
  const submitOrder = useCallback(async (): Promise<CustomOrder> => {
    if (!user?.id) {
      // Customer tidak bisa submit custom order kalau belum login
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Silakan login terlebih dahulu");
    }

    const payload = {
      jenis: draft.jenis,
      ukuran: draft.ukuran,
      finishing: draft.finishing,
      strap: draft.strap,
      motifBusa: draft.motifBusa,
      bahan: draft.bahan,
      aksesoris: draft.aksesoris,
      warnaList: draft.warnaList,
      warnaCatatan: draft.warnaCatatan,
      notes: draft.notes,
      referensiPaths: (draft.referensiFiles ?? [])
        .map((f) => f.dataUrl)
        .filter((p): p is string => typeof p === "string" && p.startsWith("/uploads/")),
    };

    const dto = await apiPost<ServerCustomOrder>("/api/custom", payload);
    const order = dtoToOrder(dto);
    setOrders((prev) => [order, ...prev]);
    setCurrentOrderState(order);
    setCurrentOrderIdState(order.id);
    return order;
  }, [draft, user?.id]);

  const generateEstimasi = useCallback(() => {/* no-op — admin set via /admin/custom/[id] */}, []);

  const approveOrder = useCallback(async (): Promise<CustomOrder | null> => {
    if (!currentOrder) return null;
    const dto = await apiPost<ServerCustomOrder>(`/api/custom/${currentOrder.id}/approve`, {});
    const updated = dtoToOrder(dto);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setCurrentOrderState(updated);
    return updated;
  }, [currentOrder]);

  const rejectOrder = useCallback(async () => {
    if (!currentOrder) return;
    const dto = await apiPost<ServerCustomOrder>(`/api/custom/${currentOrder.id}/reject`, {});
    const updated = dtoToOrder(dto);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setCurrentOrderState(updated);
  }, [currentOrder]);

  const setCurrentOrder = useCallback((o: CustomOrder | null) => {
    setCurrentOrderState(o);
    setCurrentOrderIdState(o?.id ?? null);
    currentOrderIdRef.current = o?.id ?? null;
  }, []);

  /* ----- list helpers ----- */
  const addOrder = useCallback((o: CustomOrder) => setOrders((prev) => [o, ...prev]), []);
  const updateOrder = useCallback((id: string, patch: Partial<CustomOrder>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    setCurrentOrderState((p) => (p && p.id === id ? { ...p, ...patch } : p));
  }, []);
  const removeOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setCurrentOrderState((p) => (p && p.id === id ? null : p));
    setCurrentOrderIdState((cid) => (cid === id ? null : cid));
  }, []);

  const setCurrentOrderId = useCallback((id: string | null) => {
    setCurrentOrderIdState(id);
    currentOrderIdRef.current = id;
    if (id) {
      // Use functional update to read latest orders without depending on orders in deps
      setOrders((currentOrders) => {
        const found = currentOrders.find((o) => o.id === id);
        if (found) setCurrentOrderState(found);
        return currentOrders; // no change to orders
      });
    } else {
      setCurrentOrderState(null);
    }
  }, []); // ← no dependencies, fully stable

  const getOrderById = useCallback((id: string): CustomOrder | undefined => {
    const inList = orders.find((o) => o.id === id);
    if (inList) return inList;
    if (currentOrder && currentOrder.id === id) return currentOrder;
    return undefined;
  }, [orders, currentOrder]);

  /* ----- pembayaran (ASYNC) ----- */
  const payDp = useCallback(async (id: string, input: PayDpInput) => {
    const dto = await apiPost<ServerCustomOrder>(`/api/custom/${id}/pay`, {
      kind: "dp", amount: input.amount, ongkir: input.ongkir ?? 0, metode: input.metode, bank: input.bank,
      buktiDataUrl: input.buktiUrl,
    });
    const updated = dtoToOrder(dto);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    setCurrentOrderState((p) => (p && p.id === id ? updated : p));
  }, []);

  const payLunas = useCallback(async (id: string, input: PayLunasInput) => {
    const dto = await apiPost<ServerCustomOrder>(`/api/custom/${id}/pay`, {
      kind: "lunas", ongkir: input.ongkir ?? 0, metode: input.metode, bank: input.bank,
      buktiDataUrl: input.buktiUrl,
    });
    const updated = dtoToOrder(dto);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    setCurrentOrderState((p) => (p && p.id === id ? updated : p));
  }, []);

  const payPelunasan = useCallback(async (id: string, input: PayPelunasanInput) => {
    const dto = await apiPost<ServerCustomOrder>(`/api/custom/${id}/pay`, {
      kind: "pelunasan", ongkir: input.ongkir ?? 0, metode: input.metode, bank: input.bank,
      buktiDataUrl: input.buktiUrl,
    });
    const updated = dtoToOrder(dto);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    setCurrentOrderState((p) => (p && p.id === id ? updated : p));
  }, []);

  /* ----- konfirmasiTerima: customer konfirmasi diterima (DIKIRIM → SELESAI) ----- */
  const konfirmasiTerima = useCallback(async (id: string) => {
    const dto = await apiPost<ServerCustomOrder>(`/api/custom/${id}/konfirmasi-terima`, {});
    const updated = dtoToOrder(dto);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    setCurrentOrderState((p) => (p && p.id === id ? updated : p));
  }, []);

  /* ----- cancelOrder: customer batalkan pesanan ----- */
  const cancelOrder = useCallback(async (id: string, alasan?: string) => {
    const dto = await apiPost<ServerCustomOrder>(`/api/custom/${id}/cancel`, { alasan: alasan ?? "Dibatalkan oleh pelanggan" });
    const updated = dtoToOrder(dto);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    setCurrentOrderState((p) => (p && p.id === id ? updated : p));
  }, []);

  /* ----- devSetStatus: stub ----- */
  const devSetStatus = useCallback((_id: string, _status: CustomStatus) => {
    void _id;
    void _status;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[custom-order] devSetStatus tidak aktif lagi — pakai /admin/custom/[id]");
    }
  }, []);

  return (
    <CustomOrderCtx.Provider
      value={{
        draft, updateDraft, resetDraft,
        currentOrder, setCurrentOrder,
        submitOrder, generateEstimasi, approveOrder, rejectOrder,
        orders, addOrder, updateOrder, removeOrder, refreshOrders,
        currentOrderId, setCurrentOrderId, getOrderById,
        payDp, payLunas, payPelunasan, konfirmasiTerima, cancelOrder, devSetStatus,
        ordersLoading,
      }}
    >
      {children}
    </CustomOrderCtx.Provider>
  );
}

export function useCustomOrder() {
  const ctx = useContext(CustomOrderCtx);
  if (!ctx) throw new Error("useCustomOrder harus di dalam CustomOrderProvider");
  return ctx;
}

/* ====================  DERIVE STATUS  ==================== */

/**
 * Derive custom order status from DB fields.
 * Uses dpPayment/pelunasanPayment status (from DTO) instead of
 * the old dpStatus/pelunasanStatus which don't exist on the DTO.
 */
export function deriveCustomStatus(o: {
  dpPayment?: { status: string } | null;
  pelunasanPayment?: { status: string } | null;
  lunasPayment?: { status: string } | null;
  shippedAt?: string | number | null;
  deliveredAt?: string | number | null;
  konfirmasiDiterimaAt?: string | number | null;
  cancelledAt?: string | number | null;
  resi?: string | null;
  status?: string;
}): CustomStatus {
  // If the status is already set from DB, trust it
  if (o.status) {
    const s = o.status.toLowerCase();
    // Map known DB statuses to our CustomStatus
    const map: Record<string, CustomStatus> = {
      "draft": "draft",
      "submitted": "submitted",
      "estimated": "estimated",
      "approved": "approved",
      "rejected": "rejected",
      "ditolak": "ditolak",
      "menunggu_estimasi": "menunggu_estimasi",
      "menunggu_persetujuan": "menunggu_persetujuan",
      "menunggu_pembayaran": "menunggu_pembayaran",
      "menunggu_verifikasi_dp": "menunggu_verifikasi_dp",
      "menunggu_verifikasi_lunas": "menunggu_verifikasi_lunas",
      "menunggu_verifikasi_pelunasan": "menunggu_verifikasi_pelunasan",
      "diproses": "diproses",
      "siap_dilunasi": "siap_dilunasi",
      "dikirim": "dikirim",
      "selesai": "selesai",
      "dibatalkan": "dibatalkan",
    };
    if (map[s]) return map[s];
  }

  // Fallback: derive from payment/shipping fields
  if (o.cancelledAt) return "dibatalkan";
  if (o.konfirmasiDiterimaAt) return "selesai";
  if (o.deliveredAt) return "selesai";
  if (o.shippedAt || o.resi) return "dikirim";

  // Check pelunasan payment
  if (o.pelunasanPayment?.status === "verified") return "diproses";
  if (o.pelunasanPayment?.status === "pending") return "menunggu_verifikasi_pelunasan";

  // Check DP payment
  if (o.dpPayment?.status === "verified") return "diproses";
  if (o.dpPayment?.status === "pending") return "menunggu_verifikasi_dp";

  // Check full payment
  if (o.lunasPayment?.status === "verified") return "diproses";
  if (o.lunasPayment?.status === "pending") return "menunggu_verifikasi_lunas";

  return "menunggu_pembayaran";
}