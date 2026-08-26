"use client";

import { api } from "@/lib/api/fetcher";

export interface DashboardSummary {
  revenue: { today: number; last7: number; last30: number; allTime: number };
  orders: {
    today: number; last7: number; last30: number; allTime: number;
    pending: { menungguPembayaran: number; menungguVerifikasi: number; diproses: number; dikirim: number };
  };
  customers: { new7: number; new30: number; total: number };
  urgent: { komplainBaru: number; refundReview: number; tukarReview: number; lowStockCount: number; totalAction: number };
}

export interface SalesTrendPoint { date: string; revenue: number; orders: number; }
export interface TopProduct {
  produkId: string; nama: string; gambar: string | null;
  harga: number; stokSaatIni: number; totalTerjual: number; totalRevenue: number;
}
export interface LowStockItem { id: string; nama: string; gambarUtama: string | null; stok: number; harga: number; }
export interface RecentOrder { id: string; userName: string; total: number; status: string; createdAt: string; }

export interface AuditLogItem {
  id: string; adminId: string; adminName: string;
  action: string; entity: string; entityId: string | null;
  meta: Record<string, unknown>; ip: string | null; userAgent: string | null;
  createdAt: string;
}

export interface AuditListResponse {
  items: AuditLogItem[]; total: number; page: number; limit: number;
}

// ─── TIC INTERFACES ───────────────────────────────────────────────
export interface TICSummary {
  orders: {
    total: number; selesai: number; pending: number;
    diproses: number; dikirim: number; dibatalkan: number; kadaluarsa: number;
  };
  financials: {
    grossRevenue: number; netRevenue: number;
    grossProfit: number; netProfit: number;
    totalRefundAmount: number; totalRefundCount: number;
    totalOngkir: number; totalBiayaPacking: number; totalVerifiedPayment: number;
  };
  ratios: {
    refundRatio: number; cancellationRatio: number; profitMargin: number;
  };
}

export interface TICTransaction {
  id: string; invoice: string; customer: string; customerEmail: string;
  tanggal: string; jenisOrder: string;
  totalPembayaran: number; subtotal: number; ongkir: number;
  biayaPacking: number; diskon: number; refund: number; profit: number;
  status: string; rawStatus: string; metode: string | null;
}

export interface TICTransactionResponse {
  items: TICTransaction[]; total: number; page: number; limit: number;
}

export interface TICTrendPoint {
  date: string; revenue: number; profit: number; refund: number; orders: number;
}

export interface TICTopProduct {
  produkId: string; nama: string; gambar: string | null;
  totalRevenue: number; totalQty: number; totalProfit: number;
}

export interface TICTopCustomer {
  username: string; totalTransaksi: number; totalRevenue: number;
}

export interface TICChartsResponse {
  trend: TICTrendPoint[];
  topProducts: TICTopProduct[];
  topCustomers: TICTopCustomer[];
  period: string;
}

// ─── API HELPERS ──────────────────────────────────────────────────
export const dashboard = {
  summary: () => api.get<DashboardSummary>("/api/admin/dashboard/summary"),
  salesTrend: (days = 30) =>
    api.get<{ days: number; series: SalesTrendPoint[] }>(`/api/admin/dashboard/sales-trend?days=${days}`),
  topProducts: (days = 30, limit = 10) =>
    api.get<TopProduct[]>(`/api/admin/dashboard/top-products?days=${days}&limit=${limit}`),
  lowStock: (threshold = 5, limit = 20) =>
    api.get<LowStockItem[]>(`/api/admin/dashboard/low-stock?threshold=${threshold}&limit=${limit}`),
  recentOrders: (limit = 10) =>
    api.get<RecentOrder[]>(`/api/admin/dashboard/recent-orders?limit=${limit}`),
};

export const audit = {
  list: (filter: {
    adminId?: string; action?: string; entity?: string; entityId?: string;
    from?: string; to?: string; page?: number; limit?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => v != null && qs.set(k, String(v)));
    return api.get<AuditListResponse>(`/api/admin/audit${qs.toString() ? `?${qs}` : ""}`);
  },
  clear: () => api.delete<{ message: string }>("/api/admin/audit"),
};

export const tic = {
  summary: (filter: { from?: string; to?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => v && qs.set(k, String(v)));
    return api.get<TICSummary>(`/api/admin/tic/summary${qs.toString() ? `?${qs}` : ""}`);
  },
  transactions: (filter: {
    page?: number; limit?: number; from?: string; to?: string;
    status?: string; jenisOrder?: string; search?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => v != null && String(v) !== "" && qs.set(k, String(v)));
    return api.get<TICTransactionResponse>(`/api/admin/tic/transactions${qs.toString() ? `?${qs}` : ""}`);
  },
  charts: (filter: { period?: string; days?: number; from?: string; to?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => v != null && String(v) !== "" && qs.set(k, String(v)));
    return api.get<TICChartsResponse>(`/api/admin/tic/charts${qs.toString() ? `?${qs}` : ""}`);
  },
};