"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  tic, audit,
  type TICSummary, type TICTransaction, type TICTrendPoint,
  type TICTopProduct, type TICTopCustomer, type AuditLogItem,
} from "@/lib/dashboard-helpers";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package,
  RotateCcw, AlertCircle, CheckCircle, XCircle, Clock,
  FileSpreadsheet, FileText, Search, Filter,
  BarChart2, Layers, Shield, ChevronLeft, ChevronRight,
  Users, Star, Trash2
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

// ─── HELPERS ─────────────────────────────────────────────────────
const IDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const PCT = (n: number) => `${n.toFixed(2)}%`;

type Tab = "dashboard" | "transactions" | "laporan" | "activity";
type TrendPeriod = "daily" | "weekly" | "monthly";
type TrendMetric = "revenue" | "profit" | "refund";

// ─── STATUS LABEL MAP ─────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  SELESAI:             { label: "Selesai",         color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  icon: <CheckCircle className="h-3 w-3" /> },
  DIPROSES:            { label: "Diproses",         color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",        icon: <Package className="h-3 w-3" /> },
  DIKIRIM:             { label: "Dikirim",          color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200",    icon: <ShoppingBag className="h-3 w-3" /> },
  MENUNGGU_PEMBAYARAN: { label: "Menunggu Bayar",   color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",      icon: <Clock className="h-3 w-3" /> },
  MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirm", color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",    icon: <Clock className="h-3 w-3" /> },
  DIBATALKAN:          { label: "Dibatalkan",       color: "text-red-700",     bg: "bg-red-50 border-red-200",          icon: <XCircle className="h-3 w-3" /> },
  KADALUARSA:          { label: "Kadaluarsa",       color: "text-gray-600",    bg: "bg-gray-50 border-gray-200",        icon: <AlertCircle className="h-3 w-3" /> },
  REFUND_PENUH:        { label: "Refund Penuh",     color: "text-purple-700",  bg: "bg-purple-50 border-purple-200",    icon: <RotateCcw className="h-3 w-3" /> },
  REFUND_SEBAGIAN:     { label: "Refund Sebagian",  color: "text-pink-700",    bg: "bg-pink-50 border-pink-200",        icon: <RotateCcw className="h-3 w-3" /> },
};

const getStatus = (s: string) =>
  STATUS_MAP[s] ?? { label: s, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: null };

// ─── DOWNLOAD HELPERS ────────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  setTimeout(() => {
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  }, 100);
}

function triggerPrint(html: string) {
  const frameId = "__tic_print_frame";
  const existing = document.getElementById(frameId);
  if (existing) existing.remove();
  const iframe = document.createElement("iframe");
  iframe.id = frameId;
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;border:none";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { /* noop */ }
      setTimeout(() => iframe.remove(), 2000);
    }, 600);
    return true;
  }
  return false;
}

// ─── STAT CARD ────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}

function StatCard({ title, value, sub, icon, accent }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
        <div className="flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center sm:ml-3 sm:order-2" style={{ backgroundColor: accent + "18" }}>
          <span style={{ color: accent }} className="scale-[0.8] sm:scale-100">{icon}</span>
        </div>
        <div className="flex-1 min-w-0 sm:order-1 w-full">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5 sm:mb-1 truncate">{title}</p>
          <p className="text-base sm:text-xl font-bold text-gray-900 truncate">{value}</p>
          {sub && <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 line-clamp-2 sm:line-clamp-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl p-3 shadow-xl text-xs space-y-1 min-w-36">
      <p className="font-semibold text-gray-300 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold">{p.value > 1000 ? IDR(p.value * 1000) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function TransactionIntelligencePage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard",    label: "Dashboard Keuangan", icon: <BarChart2 className="h-4 w-4" /> },
    { id: "transactions", label: "Tabel Transaksi",    icon: <Layers className="h-4 w-4" /> },
    { id: "laporan",      label: "Laporan Keuangan",   icon: <FileText className="h-4 w-4" /> },
    { id: "activity",     label: "Activity Log",       icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* Header */}
      <AdminPageHeader
        title="Transaction Intelligence Center"
        subtitle="Pusat monitoring analitik keuangan, rasio profitabilitas, dan audit integritas arus transaksi"
        breadcrumbs={[{ label: "Sistem" }, { label: "Transaction Intelligence" }]}
        icon={TrendingUp}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-xs text-xs">
              <span className="text-slate-500 font-medium">Dari:</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="text-xs text-slate-800 bg-transparent focus:outline-none" />
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-xs text-xs">
              <span className="text-slate-500 font-medium">Sampai:</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="text-xs text-slate-800 bg-transparent focus:outline-none" />
            </div>
            {(from || to) && (
              <button onClick={() => { setFrom(""); setTo(""); }} className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition">
                Reset
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-2 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
              activeTab === t.id
                ? "bg-[#FF6B1A] text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div>
        {activeTab === "dashboard"    && <DashboardTab from={from} to={to} />}
        {activeTab === "transactions" && <TransactionsTab from={from} to={to} />}
        {activeTab === "laporan"      && <LaporanTab from={from} to={to} />}
        {activeTab === "activity"     && <ActivityTab from={from} to={to} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  TAB 1: DASHBOARD KEUANGAN
// ════════════════════════════════════════════════════════════════
function DashboardTab({ from, to }: { from: string; to: string }) {
  const [summary, setSummary] = useState<TICSummary | null>(null);
  const [trend, setTrend] = useState<TICTrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TICTopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TICTopCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TrendPeriod>("daily");
  const [metric, setMetric] = useState<TrendMetric>("revenue");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        tic.summary({ from: from || undefined, to: to || undefined }),
        tic.charts({ period, from: from || undefined, to: to || undefined }),
      ]);
      setSummary(s);
      setTrend(c.trend);
      setTopProducts(c.topProducts);
      setTopCustomers(c.topCustomers);
    } catch {
      toast.error("Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }, [from, to, period]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- tampilkan skeleton saat reload
  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-28 sm:h-24 bg-white rounded-2xl border border-gray-100" />)}
      </div>
      <div className="h-80 bg-white rounded-2xl" />
    </div>
  );
  if (!summary) return null;

  const { orders, financials, ratios } = summary;

  const statCards: StatCardProps[] = [
    { title: "Total Transaksi",  value: orders.total.toLocaleString("id-ID"),       sub: "Semua status",               icon: <ShoppingBag className="h-5 w-5" />, accent: "#475569" },
    { title: "Order Selesai",    value: orders.selesai.toLocaleString("id-ID"),     sub: "Completed orders",           icon: <CheckCircle className="h-5 w-5" />, accent: "#10b981" },
    { title: "Order Pending",    value: orders.pending.toLocaleString("id-ID"),     sub: "Menunggu pembayaran/konfirm", icon: <Clock className="h-5 w-5" />,       accent: "#f59e0b" },
    { title: "Order Dibatalkan", value: orders.dibatalkan.toLocaleString("id-ID"),  sub: `Ratio: ${PCT(ratios.cancellationRatio)}`, icon: <XCircle className="h-5 w-5" />, accent: "#f43f5e" },
    { title: "Total Refund",     value: `${financials.totalRefundCount} order`,     sub: IDR(financials.totalRefundAmount), icon: <RotateCcw className="h-5 w-5" />, accent: "#f43f5e" },
    { title: "Gross Revenue",    value: IDR(financials.grossRevenue),               sub: "Total pemasukan bruto",      icon: <DollarSign className="h-5 w-5" />,  accent: "#10b981" },
    { title: "Net Revenue",      value: IDR(financials.netRevenue),                 sub: "Revenue - Refund",           icon: <TrendingUp className="h-5 w-5" />,  accent: "#10b981" },
    { title: "Gross Profit",     value: IDR(financials.grossProfit),                sub: "Revenue - Ongkir - Packing", icon: <BarChart2 className="h-5 w-5" />,   accent: "#0ea5e9" },
    { title: "Net Profit",       value: IDR(financials.netProfit),                  sub: "Gross Profit - Refund",      icon: <TrendingUp className="h-5 w-5" />,  accent: "#FF6B1A" },
    { title: "Profit Margin",    value: PCT(ratios.profitMargin),                   sub: "(Net Profit / Revenue) × 100", icon: <TrendingUp className="h-5 w-5" />, accent: "#FF6B1A" },
  ];

  const chartData = trend.map((p) => ({
    ...p,
    revenue: Math.round(p.revenue / 1000),
    profit: Math.round(p.profit / 1000),
    refund: Math.round(p.refund / 1000),
  }));

  const metricConfig = {
    revenue: { key: "revenue", label: "Revenue (Ribu)", color: "#fc970a" },
    profit:  { key: "profit",  label: "Profit (Ribu)",  color: "#10b981" },
    refund:  { key: "refund",  label: "Refund (Ribu)",  color: "#ef4444" },
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((c) => <StatCard key={c.title} {...c} />)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Refund Ratio",       value: PCT(ratios.refundRatio),       color: "#a855f7", desc: "(Refund / Revenue) × 100" },
          { label: "Cancellation Ratio", value: PCT(ratios.cancellationRatio), color: "#ef4444", desc: "(Batal / Total Order) × 100" },
          { label: "Profit Margin",      value: PCT(ratios.profitMargin),      color: "#22c55e", desc: "(Net Profit / Revenue) × 100" },
        ].map((r) => (
          <div key={r.label} className="bg-white rounded-2xl border border-gray-100 p-3.5 sm:p-4 shadow-sm text-center">
            <p className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">{r.label}</p>
            <p className="text-xl sm:text-2xl font-bold" style={{ color: r.color }}>{r.value}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-gray-900">Trend Keuangan</h3>
            <p className="text-xs text-gray-500">Revenue · Profit · Refund</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {(["revenue", "profit", "refund"] as TrendMetric[]).map((m) => (
                <button key={m} onClick={() => setMetric(m)}
                  className={`px-3 py-1.5 font-medium capitalize transition-colors ${metric === m ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {(["daily", "weekly", "monthly"] as TrendPeriod[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 font-medium transition-colors ${period === p ? "text-white" : "text-gray-500 hover:bg-gray-50"}`}
                  style={period === p ? { background: "#fc970a" } : {}}>
                  {p === "daily" ? "Harian" : p === "weekly" ? "Mingguan" : "Bulanan"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={metricConfig[metric].color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={metricConfig[metric].color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey={metricConfig[metric].key} name={metricConfig[metric].label}
              stroke={metricConfig[metric].color} strokeWidth={2.5} fill="url(#gradMetric)"
              dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <Package className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Top Produk</h3>
              <p className="text-xs text-gray-400">Berdasarkan profit</p>
            </div>
          </div>
          <div className="space-y-2">
            {topProducts.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Belum ada data</p>}
            {topProducts.slice(0, 7).map((p, i) => (
              <div key={p.produkId} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"}`}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.nama}</p>
                  <p className="text-xs text-gray-400">{p.totalQty} terjual · {IDR(p.totalProfit)} profit</p>
                </div>
                <span className="text-xs font-bold text-emerald-600">{IDR(p.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Top Customer</h3>
              <p className="text-xs text-gray-400">Berdasarkan total transaksi</p>
            </div>
          </div>
          <div className="space-y-2">
            {topCustomers.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Belum ada data</p>}
            {topCustomers.slice(0, 7).map((c, i) => (
              <div key={c.username} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"}`}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">@{c.username}</p>
                  <p className="text-xs text-gray-400">{c.totalTransaksi} transaksi</p>
                </div>
                <span className="text-xs font-bold text-orange-500">{IDR(c.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  TAB 2: TABEL TRANSAKSI
// ════════════════════════════════════════════════════════════════
function TransactionsTab({ from: globalFrom, to: globalTo }: { from: string; to: string }) {
  const [items, setItems] = useState<TICTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [jenisOrder, setJenisOrder] = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tic.transactions({
        page, limit: LIMIT,
        from: globalFrom || undefined, to: globalTo || undefined,
        status: status || undefined, jenisOrder: jenisOrder || undefined,
        search: search || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      toast.error("Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  }, [page, globalFrom, globalTo, status, jenisOrder, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- tampilkan skeleton saat reload
  useEffect(() => { load(); }, [load]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ke halaman 1 saat filter berubah
  useEffect(() => { setPage(1); }, [globalFrom, globalTo, status, jenisOrder, search]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // ── BUILD EXCEL HTML ─────────────────────────────────────────
  function buildExcelHtml(data: TICTransaction[]) {
    let html = "";
    html += "<!DOCTYPE html>";
    html += "<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\" xmlns=\"http://www.w3.org/TR/REC-html40\">";
    html += "<head>";
    html += "<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>";
    html += "<x:Name>TIC Transaksi</x:Name>";
    html += "</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->";
    html += "<meta charset=\"utf-8\">";
    html += "<style>body{font-family:Arial,sans-serif;font-size:11px}";
    html += "h2{color:#fc970a;font-size:15px;margin-bottom:4px}p{margin:2px 0;font-size:10px;color:#555}";
    html += "table{border-collapse:collapse;width:100%;margin-top:10px}";
    html += "th{background-color:#fc970a;color:white;font-weight:bold;border:1px solid #ddd;padding:7px;font-size:11px}";
    html += "td{border:1px solid #ddd;padding:6px 7px;font-size:11px;vertical-align:top}";
    html += "tr:nth-child(even){background-color:#fafafa}";
    html += ".num{text-align:right}</style></head><body>";
    html += "<h2>Transaction Intelligence Center — Export Transaksi</h2>";
    html += "<p>Diekspor: " + new Date().toLocaleString("id-ID") + "</p>";
    html += "<p>Periode: " + (globalFrom || "Semua") + " s/d " + (globalTo || "Sekarang") + "</p>";
    if (status) html += "<p>Filter Status: " + status + "</p>";
    if (jenisOrder) html += "<p>Jenis Order: " + jenisOrder + "</p>";
    html += "<p>Total: " + data.length + " transaksi</p>";
    html += "<table><thead><tr>";
    html += "<th>No</th><th>Invoice</th><th>Customer</th><th>Email</th><th>Tanggal</th><th>Jenis</th>";
    html += "<th>Total Bayar</th><th>Subtotal</th><th>Ongkir</th><th>Packing</th><th>Diskon</th><th>Refund</th><th>Profit</th><th>Status</th>";
    html += "</tr></thead><tbody>";
    data.forEach((r, i) => {
      html += "<tr>";
      html += "<td style=\"text-align:center\">" + (i + 1) + "</td>";
      html += "<td style=\"font-family:Consolas,monospace;font-size:9px\">" + r.invoice + "</td>";
      html += "<td>" + r.customer + "</td>";
      html += "<td>" + r.customerEmail + "</td>";
      html += "<td style=\"white-space:nowrap\">" + new Date(r.tanggal).toLocaleDateString("id-ID") + "</td>";
      html += "<td>" + r.jenisOrder + "</td>";
      html += "<td class=\"num\">" + IDR(r.totalPembayaran) + "</td>";
      html += "<td class=\"num\">" + IDR(r.subtotal) + "</td>";
      html += "<td class=\"num\">" + IDR(r.ongkir) + "</td>";
      html += "<td class=\"num\">" + IDR(r.biayaPacking) + "</td>";
      html += "<td class=\"num\">" + (r.diskon > 0 ? IDR(r.diskon) : "-") + "</td>";
      html += "<td class=\"num\">" + (r.refund > 0 ? IDR(r.refund) : "-") + "</td>";
      html += "<td class=\"num\" style=\"font-weight:bold;color:" + (r.profit >= 0 ? "#166534" : "#991b1b") + "\">" + IDR(r.profit) + "</td>";
      html += "<td>" + getStatus(r.status).label + "</td>";
      html += "</tr>";
    });
    html += "</tbody></table></body></html>";
    return html;
  }

  // ── BUILD PDF HTML ───────────────────────────────────────────
  function buildPdfHtml(data: TICTransaction[]) {
    const genAt = new Date().toLocaleString("id-ID");
    let rows = "";
    data.forEach((r, i) => {
      rows += "<tr>";
      rows += "<td style=\"text-align:center;color:#888\">" + (i + 1) + "</td>";
      rows += "<td style=\"font-family:monospace;font-size:8px\">" + r.invoice.slice(0, 16) + "</td>";
      rows += "<td>" + r.customer + "</td>";
      rows += "<td style=\"white-space:nowrap\">" + new Date(r.tanggal).toLocaleDateString("id-ID") + "</td>";
      rows += "<td>" + r.jenisOrder + "</td>";
      rows += "<td style=\"text-align:right;font-weight:bold\">" + IDR(r.totalPembayaran) + "</td>";
      rows += "<td style=\"text-align:right\">" + IDR(r.ongkir) + "</td>";
      rows += "<td style=\"text-align:right;color:" + (r.refund > 0 ? "#7c3aed" : "#9ca3af") + "\">" + (r.refund > 0 ? IDR(r.refund) : "-") + "</td>";
      rows += "<td style=\"text-align:right;font-weight:bold;color:" + (r.profit >= 0 ? "#059669" : "#dc2626") + "\">" + IDR(r.profit) + "</td>";
      rows += "<td><span style=\"background:" + (r.profit >= 0 ? "#dcfce7" : "#fee2e2") + ";color:" + (r.profit >= 0 ? "#166534" : "#991b1b") + ";padding:2px 5px;border-radius:3px;font-size:8px\">" + getStatus(r.status).label + "</span></td>";
      rows += "</tr>";
    });
    let html = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>TIC Export</title><style>";
    html += "* { box-sizing: border-box; margin: 0; padding: 0; }";
    html += "body { font-family: Arial, sans-serif; padding: 20px 24px; color: #333; font-size: 10px; }";
    html += ".hdr { border-bottom: 2px solid #fc970a; padding-bottom: 10px; margin-bottom: 12px; }";
    html += ".hdr h1 { font-size: 16px; color: #fc970a; font-weight: bold; margin-bottom: 3px; }";
    html += ".hdr p { font-size: 9px; color: #666; }";
    html += "table { width: 100%; border-collapse: collapse; font-size: 9px; }";
    html += "thead { display: table-header-group; }";
    html += "tr { page-break-inside: avoid; }";
    html += "th { background: #fc970a; color: #fff; border: 1px solid #e0821a; padding: 5px 6px; text-align: left; white-space: nowrap; }";
    html += "td { border: 1px solid #e0e0e0; padding: 4px 6px; vertical-align: middle; }";
    html += "tr:nth-child(even) td { background: #fafafa; }";
    html += ".footer { margin-top: 14px; font-size: 8px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }";
    html += "@media print { body { padding: 8px; } }";
    html += "</style></head><body>";
    html += "<div class=\"hdr\"><h1>Transaction Intelligence Center — Export PDF</h1>";
    html += "<p>Diekspor: " + genAt + " &bull; Total: " + data.length + " transaksi</p>";
    html += "<p>Periode: " + (globalFrom || "Semua") + " s/d " + (globalTo || "Sekarang") + "</p></div>";
    html += "<table><thead><tr>";
    html += "<th>No</th><th>Invoice</th><th>Customer</th><th>Tanggal</th><th>Jenis</th>";
    html += "<th>Total Bayar</th><th>Ongkir</th><th>Refund</th><th>Profit</th><th>Status</th>";
    html += "</tr></thead><tbody>" + rows + "</tbody></table>";
    html += "<div class=\"footer\">Dibuat otomatis oleh Jogjadoelan TIC &mdash; " + genAt + "</div>";
    html += "<script>window.onload=function(){setTimeout(function(){window.print();},400);};</" + "script>";
    html += "</body></html>";
    return html;
  }

  // ── EXPORT EXCEL ─────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (total === 0) { toast.warning("Tidak ada data untuk diekspor"); return; }
    const tid = toast.loading("Menyiapkan Excel...");
    setExporting(true);
    try {
      const res = await tic.transactions({
        page: 1, limit: 5000,
        from: globalFrom || undefined, to: globalTo || undefined,
        status: status || undefined, jenisOrder: jenisOrder || undefined,
        search: search || undefined,
      });
      const data = res.items;
      if (!data || data.length === 0) { toast.dismiss(tid); toast.warning("Tidak ada data"); return; }
      const html = buildExcelHtml(data);
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      triggerDownload(blob, "tic-transaksi-" + dateStr + ".xls");
      toast.dismiss(tid);
      toast.success("Excel berhasil diunduh (" + data.length + " transaksi)");
    } catch (err) {
      console.error("[TIC] Excel export error:", err);
      toast.dismiss(tid);
      toast.error("Gagal membuat file Excel");
    } finally {
      setExporting(false);
    }
  };

  // ── EXPORT PDF ───────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (total === 0) { toast.warning("Tidak ada data untuk diekspor"); return; }
    const tid = toast.loading("Menyiapkan PDF...");
    setExporting(true);
    try {
      const res = await tic.transactions({
        page: 1, limit: 5000,
        from: globalFrom || undefined, to: globalTo || undefined,
        status: status || undefined, jenisOrder: jenisOrder || undefined,
        search: search || undefined,
      });
      const data = res.items;
      if (!data || data.length === 0) { toast.dismiss(tid); toast.warning("Tidak ada data"); return; }
      const html = buildPdfHtml(data);
      const opened = triggerPrint(html);
      if (!opened) {
        // Fallback: open as blob in new tab
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        setTimeout(() => { a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 2000); }, 100);
      }
      toast.dismiss(tid);
      toast.success("PDF disiapkan (" + data.length + " transaksi) — gunakan Ctrl+P untuk cetak");
    } catch (err) {
      console.error("[TIC] PDF export error:", err);
      toast.dismiss(tid);
      toast.error("Gagal membuat PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <label className="text-xs font-semibold text-gray-500">Cari Invoice / Customer</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
                placeholder="Invoice ID, username, email..."
                className="border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="">Semua Status</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">Jenis Order</label>
            <select value={jenisOrder} onChange={(e) => setJenisOrder(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="">Semua Jenis</option>
              <option value="REGULER">Reguler</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <button onClick={() => setSearch(searchInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white shadow-sm"
            style={{ background: "#fc970a" }}>
            <Filter className="h-3.5 w-3.5" /> Cari
          </button>
          {(search || status || jenisOrder) && (
            <button onClick={() => { setSearch(""); setSearchInput(""); setStatus(""); setJenisOrder(""); }}
              className="text-xs text-red-500 hover:text-red-700 underline">Reset</button>
          )}
          <div className="flex-1" />
          <button onClick={handleExportExcel} disabled={exporting || loading || total === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <FileSpreadsheet className="h-4 w-4" />
            {exporting ? "..." : "Excel"}
          </button>
          <button onClick={handleExportPDF} disabled={exporting || loading || total === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <FileText className="h-4 w-4" />
            {exporting ? "..." : "PDF"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                {["#", "Invoice", "Customer", "Tanggal", "Jenis", "Total Bayar", "Ongkir", "Packing", "Diskon", "Refund", "Profit", "Status"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={12} className="py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                    Memuat data...
                  </div>
                </td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={12} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="h-8 w-8 text-gray-200" />
                    <span className="text-sm">Tidak ada transaksi</span>
                  </div>
                </td></tr>
              )}
              {items.map((r, idx) => {
                const st = getStatus(r.status);
                return (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-orange-50/40 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-gray-400 text-center">{(page - 1) * LIMIT + idx + 1}</td>
                    <td className="px-3 py-2.5"><span className="font-mono text-xs text-gray-600">{r.invoice.slice(0, 8)}...</span></td>
                    <td className="px-3 py-2.5"><p className="text-xs font-semibold text-gray-800">{r.customer}</p></td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(r.tanggal).toLocaleDateString("id-ID")}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.jenisOrder === "CUSTOM" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                        {r.jenisOrder}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-gray-900">{IDR(r.totalPembayaran)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{IDR(r.ongkir)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{IDR(r.biayaPacking)}</td>
                    <td className="px-3 py-2.5 text-xs text-emerald-600">{r.diskon > 0 ? `-${IDR(r.diskon)}` : "-"}</td>
                    <td className="px-3 py-2.5 text-xs font-medium text-purple-600">{r.refund > 0 ? IDR(r.refund) : "-"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold ${r.profit > 0 ? "text-emerald-600" : r.profit < 0 ? "text-red-600" : "text-gray-400"}`}>
                        {r.profit > 0 ? "+" : ""}{IDR(r.profit)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${st.bg} ${st.color}`}>
                        {st.icon}{st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 bg-gray-50/50">
          <span className="text-xs text-gray-500">
            <strong className="text-gray-900">{total}</strong> transaksi
            {total > 0 && <span className="text-gray-400 ml-1">(menampilkan {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)})</span>}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs text-gray-600 font-medium">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  TAB 3: LAPORAN KEUANGAN
// ════════════════════════════════════════════════════════════════
function LaporanTab({ from, to }: { from: string; to: string }) {
  const [summary, setSummary] = useState<TICSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tampilkan skeleton saat reload
    setLoading(true);
    tic.summary({ from: from || undefined, to: to || undefined })
      .then((r) => setSummary(r))
      .catch(() => toast.error("Gagal memuat laporan"))
      .finally(() => setLoading(false));
  }, [from, to]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
      <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      Memuat...
    </div>
  );
  if (!summary) return null;

  const { financials, ratios, orders } = summary;

  const laporanSections = [
    {
      title: "Revenue Report", color: "#fc970a", bg: "from-orange-50 to-amber-50", border: "border-orange-200",
      icon: <DollarSign className="h-5 w-5" />,
      items: [
        { label: "Gross Revenue (Total Pemasukan)",        value: IDR(financials.grossRevenue),          positive: true },
        { label: "Total Ongkir",                          value: "-" + IDR(financials.totalOngkir),      positive: false },
        { label: "Total Biaya Packing",                   value: "-" + IDR(financials.totalBiayaPacking), positive: false },
        { label: "Total Refund",                          value: "-" + IDR(financials.totalRefundAmount), positive: false },
        { label: "Net Revenue (Pemasukan Bersih)",        value: IDR(financials.netRevenue),             positive: true, bold: true },
      ],
    },
    {
      title: "Profit Report", color: "#10b981", bg: "from-emerald-50 to-green-50", border: "border-emerald-200",
      icon: <TrendingUp className="h-5 w-5" />,
      items: [
        { label: "Gross Revenue",                         value: IDR(financials.grossRevenue),           positive: true },
        { label: "Gross Profit (Revenue - Ongkir - Packing)", value: IDR(financials.grossProfit),        positive: true },
        { label: "Net Profit (Gross Profit - Refund)",    value: IDR(financials.netProfit),              positive: financials.netProfit > 0, bold: true },
        { label: "Profit Margin",                        value: PCT(ratios.profitMargin),               positive: ratios.profitMargin > 0 },
      ],
    },
    {
      title: "Refund Report", color: "#a855f7", bg: "from-purple-50 to-pink-50", border: "border-purple-200",
      icon: <RotateCcw className="h-5 w-5" />,
      items: [
        { label: "Total Refund (Jumlah Transaksi)",       value: financials.totalRefundCount + " refund", positive: false },
        { label: "Total Nilai Refund",                   value: IDR(financials.totalRefundAmount),       positive: false, bold: true },
        { label: "Refund Ratio",                         value: PCT(ratios.refundRatio),                positive: ratios.refundRatio < 5 },
        { label: "Dampak ke Net Revenue",                value: "-" + IDR(financials.totalRefundAmount), positive: false },
      ],
    },
    {
      title: "Loss Report", color: "#ef4444", bg: "from-red-50 to-rose-50", border: "border-red-200",
      icon: <TrendingDown className="h-5 w-5" />,
      items: [
        { label: "Order Dibatalkan",                      value: orders.dibatalkan + " order",           positive: false },
        { label: "Order Kadaluarsa",                      value: orders.kadaluarsa + " order",           positive: false },
        { label: "Total Refund Dikeluarkan",              value: IDR(financials.totalRefundAmount),      positive: false, bold: true },
        { label: "Cancellation Ratio",                   value: PCT(ratios.cancellationRatio),          positive: ratios.cancellationRatio < 10 },
      ],
    },
  ];

  const handlePrintLaporan = () => {
    const periode = (from || "Semua") + " s/d " + (to || "Sekarang");
    let html = "<!DOCTYPE html><html><head><title>Laporan Keuangan TIC</title><meta charset=\"utf-8\"><style>";
    html += "*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial;padding:24px;color:#333;font-size:11px}";
    html += ".hdr{border-bottom:3px solid #fc970a;padding-bottom:12px;margin-bottom:16px}.hdr h1{color:#fc970a;font-size:18px;font-weight:bold;margin-bottom:4px}.hdr p{font-size:10px;color:#666}";
    html += ".section{margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}";
    html += ".section-title{background:#1a1a2e;color:#fff;padding:10px 14px;font-size:13px;font-weight:bold}";
    html += ".row{display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f0f0f0;font-size:11px}.row:last-child{border-bottom:none}";
    html += ".bold{font-weight:bold}.pos{color:#10b981}.neg{color:#ef4444}";
    html += ".footer{margin-top:16px;font-size:9px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:8px}";
    html += "@media print{body{padding:10px}}</style></head><body>";
    html += "<div class=\"hdr\"><h1>Laporan Keuangan — Transaction Intelligence Center</h1><p>Periode: " + periode + " &bull; Dicetak: " + new Date().toLocaleString("id-ID") + "</p></div>";
    laporanSections.forEach((s) => {
      html += "<div class=\"section\"><div class=\"section-title\">" + s.title + "</div>";
      s.items.forEach((item) => {
        html += "<div class=\"row" + (item.bold ? " bold" : "") + "\"><span>" + item.label + "</span><span class=\"" + (item.positive ? "pos" : "neg") + "\">" + item.value + "</span></div>";
      });
      html += "</div>";
    });
    html += "<div class=\"footer\">Dokumen ini dibuat otomatis oleh Jogjadoelan Transaction Intelligence Center</div>";
    html += "<script>window.onload=function(){setTimeout(function(){window.print();},400);};</" + "script></body></html>";
    const opened = triggerPrint(html);
    if (!opened) toast.error("Tidak bisa membuka dialog print");
    else toast.success("Dialog print laporan dibuka");
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex justify-end">
        <button onClick={handlePrintLaporan}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #fc970a, #e08a00)" }}>
          <FileText className="h-4 w-4" /> Cetak / PDF Laporan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {laporanSections.map((s) => (
          <div key={s.title} className={`rounded-2xl border overflow-hidden shadow-sm ${s.border}`}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + "30" }}>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <h3 className="font-bold text-white">{s.title}</h3>
            </div>
            <div className={`bg-gradient-to-br ${s.bg}`}>
              {s.items.map((item, i) => (
                <div key={i} className={`flex items-center justify-between px-5 py-3.5 ${i < s.items.length - 1 ? "border-b border-white/60" : ""}`}>
                  <span className={`text-sm text-gray-600 ${item.bold ? "font-semibold text-gray-900" : ""}`}>{item.label}</span>
                  <span className={`text-sm font-bold ${item.positive ? "text-emerald-600" : "text-red-600"} ${item.bold ? "text-base" : ""}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">
        <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}>
          <h3 className="font-bold text-white">Ringkasan Eksekutif</h3>
          <p className="text-xs text-gray-400 mt-0.5">Periode: {from || "Semua"} s/d {to || "Sekarang"}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-100">
          {[
            { label: "Gross Revenue", value: IDR(financials.grossRevenue),  color: "#fc970a" },
            { label: "Net Revenue",   value: IDR(financials.netRevenue),    color: "#0ea5e9" },
            { label: "Net Profit",    value: IDR(financials.netProfit),     color: financials.netProfit > 0 ? "#10b981" : "#ef4444" },
            { label: "Profit Margin", value: PCT(ratios.profitMargin),      color: ratios.profitMargin > 20 ? "#10b981" : "#f59e0b" },
          ].map((r) => (
            <div key={r.label} className="px-5 py-4 text-center">
              <p className="text-xs text-gray-400 font-semibold mb-1">{r.label}</p>
              <p className="text-lg font-bold" style={{ color: r.color }}>{r.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  TAB 4: ACTIVITY LOG
// ════════════════════════════════════════════════════════════════
const ALL_ACTIONS = [
  "ORDER_CONFIRM_PAYMENT", "ORDER_REJECT_PAYMENT", "ORDER_SHIP", "ORDER_DELIVERED", "ORDER_CANCEL",
  "PRODUK_CREATE", "PRODUK_UPDATE", "PRODUK_DELETE", "PRODUK_STOK_ADJUST",
  "KOMPLAIN_ACCEPT", "KOMPLAIN_REJECT", "KOMPLAIN_REPLY",
  "REFUND_APPROVE", "REFUND_RECEIVED", "REFUND_TRANSFER", "REFUND_REJECT",
  "TUKAR_APPROVE", "TUKAR_RECEIVED", "TUKAR_SHIP", "TUKAR_REJECT",
  "ULASAN_HIDE", "ULASAN_UNHIDE", "ULASAN_DELETE", "NOTIF_BROADCAST", "USER_ROLE_CHANGE",
  "VALIDASI_PRODUK_KIRIM", "VALIDASI_PRODUK_SETUJU", "VALIDASI_PRODUK_REVISI",
];

const ACTION_COLORS: Record<string, string> = {
  ORDER_CONFIRM_PAYMENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ORDER_REJECT_PAYMENT:  "bg-red-50 text-red-700 border-red-200",
  ORDER_SHIP:            "bg-blue-50 text-blue-700 border-blue-200",
  ORDER_DELIVERED:       "bg-indigo-50 text-indigo-700 border-indigo-200",
  ORDER_CANCEL:          "bg-red-50 text-red-700 border-red-200",
  REFUND_APPROVE:        "bg-purple-50 text-purple-700 border-purple-200",
  REFUND_TRANSFER:       "bg-purple-50 text-purple-700 border-purple-200",
  KOMPLAIN_ACCEPT:       "bg-amber-50 text-amber-700 border-amber-200",
  VALIDASI_PRODUK_KIRIM: "bg-orange-50 text-orange-700 border-orange-200",
  VALIDASI_PRODUK_SETUJU: "bg-emerald-50 text-emerald-700 border-emerald-200",
  VALIDASI_PRODUK_REVISI: "bg-rose-50 text-rose-700 border-rose-200",
};

function getActionColor(a: string) {
  return ACTION_COLORS[a] ?? "bg-orange-50 text-orange-700 border-orange-100";
}

function ActivityTab({ from, to }: { from: string; to: string }) {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await audit.list({ page, limit: LIMIT, action: action || undefined, entity: entity || undefined, from: from || undefined, to: to || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch { toast.error("Gagal memuat activity log"); }
    finally { setLoading(false); }
  }, [page, action, entity, from, to]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- tampilkan skeleton saat reload
  useEffect(() => { load(); }, [load]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ke halaman 1 saat filter berubah
  useEffect(() => { setPage(1); }, [from, to, action, entity]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleExportExcel = async () => {
    if (total === 0) { toast.warning("Tidak ada data untuk diekspor"); return; }
    const tid = toast.loading("Menyiapkan Excel...");
    setExporting(true);
    try {
      const res = await audit.list({ page: 1, limit: 10000, action: action || undefined, entity: entity || undefined, from: from || undefined, to: to || undefined });
      const data = res.items;
      let html = "<!DOCTYPE html><html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\"><head><meta charset=\"utf-8\"><style>";
      html += "table{border-collapse:collapse;width:100%}th{background:#fc970a;color:#fff;border:1px solid #ddd;padding:7px;font-size:11px}td{border:1px solid #ddd;padding:6px;font-size:11px}";
      html += "</style></head><body><h2>Activity Log Report</h2><p>Diekspor: " + new Date().toLocaleString("id-ID") + "</p>";
      html += "<table><thead><tr><th>No</th><th>Waktu</th><th>Admin</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Detail</th></tr></thead><tbody>";
      data.forEach((r, i) => {
        html += "<tr><td>" + (i + 1) + "</td><td>" + new Date(r.createdAt).toLocaleString("id-ID") + "</td><td>" + (r.adminName || "-") + "</td><td>" + (r.action || "-") + "</td><td>" + (r.entity || "-") + "</td><td>" + (r.entityId || "-") + "</td><td>" + (r.meta && Object.keys(r.meta).length > 0 ? JSON.stringify(r.meta) : "-") + "</td></tr>";
      });
      html += "</tbody></table></body></html>";
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      triggerDownload(blob, "activity-log-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + ".xls");
      toast.dismiss(tid);
      toast.success("Excel berhasil diunduh (" + data.length + " entri)");
    } catch (err) {
      console.error("[TIC] Activity Excel error:", err);
      toast.dismiss(tid);
      toast.error("Gagal export");
    } finally { setExporting(false); }
  };

  const handleClearLogs = async () => {
    setShowConfirm(false);
    const tid = toast.loading("Menghapus log...");
    try {
      const res = await audit.clear();
      toast.dismiss(tid);
      toast.success(res.message || "Log berhasil dihapus");
      setPage(1);
      load();
    } catch {
      toast.dismiss(tid);
      toast.error("Gagal menghapus log aktivitas");
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="">Semua Action</option>
              {ALL_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">Entity</label>
            <select value={entity} onChange={(e) => setEntity(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="">Semua Entity</option>
              {["Order", "Produk", "Komplain", "Refund", "Tukar", "Ulasan", "Notifikasi"].map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {(action || entity) && (
            <button onClick={() => { setAction(""); setEntity(""); }} className="text-xs text-red-500 hover:text-red-700 underline mt-4">Reset</button>
          )}
          <div className="flex-1" />
          <button onClick={handleExportExcel} disabled={exporting || total === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <FileSpreadsheet className="h-4 w-4" />{exporting ? "..." : "Export Excel"}
          </button>
          <button onClick={() => setShowConfirm(true)} disabled={total === 0 || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <Trash2 className="h-4 w-4" />Hapus Semua
          </button>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Hapus Semua Log?"
        message="Apakah Anda yakin ingin menghapus SELURUH activity log secara permanen? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus Semua"
        cancelText="Batal"
        onConfirm={handleClearLogs}
        onClose={() => setShowConfirm(false)}
        variant="danger"
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}>
                {["#", "Waktu", "Admin", "Action", "Entity", "ID", "Detail"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                    Memuat data...
                  </div>
                </td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-8 w-8 text-gray-200" />
                    <span className="text-sm">Tidak ada aktivitas</span>
                  </div>
                </td></tr>
              )}
              {items.map((r, idx) => (
                <tr key={r.id} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-gray-400 text-center">{(page - 1) * LIMIT + idx + 1}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{r.adminName}</td>
                  <td className="px-3 py-2.5">
                    <code className={`text-xs border rounded px-1.5 py-0.5 ${getActionColor(r.action)}`}>{r.action}</code>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5">{r.entity}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-400">{r.entityId ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <pre className="text-xs whitespace-pre-wrap font-mono text-gray-500 max-w-xs max-h-20 overflow-auto">
                      {r.meta && Object.keys(r.meta).length > 0 ? JSON.stringify(r.meta, null, 2) : "-"}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 bg-gray-50/50">
          <span className="text-xs text-gray-500"><strong className="text-gray-900">{total}</strong> entri</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-3 text-xs font-medium text-gray-600">{page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}