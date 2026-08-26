"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BarChart3, TrendingUp, Package, DollarSign, ShoppingBag, Calendar, FileSpreadsheet, FileText } from "lucide-react";
import { getAllOrdersGlobal } from "@/lib/orders-storage";
import { getEffectiveProducts, type EffectiveProduct } from "@/lib/admin-produk-helpers";

type Period = "7d" | "30d" | "90d" | "all";

const PERIOD_LABEL: Record<Period, string> = { "7d": "7 Hari", "30d": "30 Hari", "90d": "90 Hari", "all": "Semua" };
const STATUS_COLOR: Record<string, string> = {
  menunggu_pembayaran: "bg-gray-400", menunggu_konfirmasi: "bg-amber-500",
  diverifikasi: "bg-blue-500", dikemas: "bg-indigo-500", dikirim: "bg-purple-500",
  selesai: "bg-emerald-500", dibatalkan: "bg-red-500",
};
const STATUS_LABEL: Record<string, string> = {
  menunggu_pembayaran: "Menunggu Bayar", menunggu_konfirmasi: "Verifikasi",
  diverifikasi: "Diverifikasi", dikemas: "Dikemas", dikirim: "Dikirim",
  selesai: "Selesai", dibatalkan: "Batal",
};

const emptySubscribe = () => () => {};

export default function AdminLaporanPage() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [period, setPeriod] = useState<Period>("30d");

  const [data, setData] = useState<{
    omzet: number; omzetSelesai: number; totalOrders: number; avgOrder: number;
    statusCount: Record<string, number>;
    topProduk: { nama: string; qty: number; omzet: number }[];
    daily: { date: string; val: number }[]; maxDaily: number;
    lowStock: EffectiveProduct[];
  } | null>(null);

  useEffect(() => {
    if (!mounted) return;
    void (async () => {
      const all = await getAllOrdersGlobal();
      const now = Date.now();
      const cutoff = period === "all" ? 0 : now - ({ "7d": 7, "30d": 30, "90d": 90 } as Record<string, number>)[period] * 86400000;
      const orders = all.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
      const paid = orders.filter((o) => ["diverifikasi", "dikemas", "dikirim", "selesai"].includes(o.status));

      const omzet = paid.reduce((s, o) => s + o.total, 0);
      const omzetSelesai = orders.filter((o) => o.status === "selesai").reduce((s, o) => s + o.total, 0);
      const totalOrders = orders.length;
      const avgOrder = paid.length > 0 ? Math.round(omzet / paid.length) : 0;

      const statusCount: Record<string, number> = {};
      orders.forEach((o) => { statusCount[o.status] = (statusCount[o.status] ?? 0) + 1; });

      const productMap = new Map<string, { nama: string; qty: number; omzet: number }>();
      paid.forEach((o) => {
        o.items?.forEach((it) => {
          const key = String(it.productId ?? it.nama ?? "unknown");
          const cur = productMap.get(key) ?? { nama: it.nama ?? key, qty: 0, omzet: 0 };
          cur.qty += it.qty ?? 0;
          cur.omzet += (it.harga ?? 0) * (it.qty ?? 0);
          productMap.set(key, cur);
        });
      });
      const topProduk = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

      const days = period === "all" ? 30 : ({ "7d": 7, "30d": 30, "90d": 90 } as Record<string, number>)[period];
      const dailyMap = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        dailyMap.set(d.toISOString().slice(0, 10), 0);
      }
      paid.forEach((o) => {
        const key = new Date(o.createdAt).toISOString().slice(0, 10);
        if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + o.total);
      });
      const daily = Array.from(dailyMap.entries()).map(([date, val]) => ({ date, val }));
      const maxDaily = Math.max(...daily.map((d) => d.val), 1);

      const products = await getEffectiveProducts();
      const lowStock = products.filter((p) => (p.stok ?? 99) < 5);

      setData({ omzet, omzetSelesai, totalOrders, avgOrder, statusCount, topProduk, daily, maxDaily, lowStock });
    })();
  }, [mounted, period]);

  if (!mounted || !data) return <div className="p-6 text-sm text-gray-500">Memuat laporan...</div>;

  const handleExportExcel = () => {
    if (!data) return;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Laporan Performa</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; margin-bottom: 20px; font-family: sans-serif; }
        th { background-color: #fc970a; color: white; font-weight: bold; border: 1px solid #ddd; padding: 8px; }
        td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        .title { font-size: 16px; font-weight: bold; color: #fc970a; }
        .kpi-val { font-size: 14px; font-weight: bold; }
      </style>
      </head>
      <body>
        <div class="title">Laporan Performa Toko Jogjadoelan</div>
        <p>Periode: ${PERIOD_LABEL[period]}</p>
        
        <table>
          <thead>
            <tr>
              <th colspan="2">Key Performance Indicators</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Omzet</b></td>
              <td class="kpi-val">Rp ${data.omzet.toLocaleString("id-ID")}</td>
            </tr>
            <tr>
              <td><b>Selesai</b></td>
              <td class="kpi-val">Rp ${data.omzetSelesai.toLocaleString("id-ID")}</td>
            </tr>
            <tr>
              <td><b>Total Order</b></td>
              <td class="kpi-val">${data.totalOrders}</td>
            </tr>
            <tr>
              <td><b>Avg Order</b></td>
              <td class="kpi-val">Rp ${data.avgOrder.toLocaleString("id-ID")}</td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th colspan="2">Sebaran Status Order</th>
            </tr>
            <tr>
              <th>Status Order</th>
              <th>Jumlah Order</th>
            </tr>
          </thead>
          <tbody>
    `;

    Object.entries(STATUS_LABEL).forEach(([k, label]) => {
      html += `
        <tr>
          <td>${label}</td>
          <td>${data.statusCount[k] ?? 0}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th colspan="4">Top 5 Produk Terlaris</th>
            </tr>
            <tr>
              <th>Peringkat</th>
              <th>Nama Produk</th>
              <th>Jumlah Terjual</th>
              <th>Total Omzet</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.topProduk.forEach((p, i) => {
      html += `
        <tr>
          <td>${i + 1}</td>
          <td>${p.nama}</td>
          <td>${p.qty} Unit</td>
          <td>Rp ${p.omzet.toLocaleString("id-ID")}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
    `;

    if (data.lowStock.length > 0) {
      html += `
        <table>
          <thead>
            <tr>
              <th colspan="2">Stok Kritis</th>
            </tr>
            <tr>
              <th>Nama Produk</th>
              <th>Sisa Stok</th>
            </tr>
          </thead>
          <tbody>
      `;
      data.lowStock.forEach(p => {
        html += `
          <tr>
            <td>${p.nama}</td>
            <td>${p.stok ?? 0}</td>
          </tr>
        `;
      });
      html += `
          </tbody>
        </table>
      `;
    }

    html += `
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-performa-${period}-${Date.now()}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!data) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let statusRows = "";
    Object.entries(STATUS_LABEL).forEach(([k, label]) => {
      const cnt = data.statusCount[k] ?? 0;
      const pct = data.totalOrders > 0 ? (cnt / data.totalOrders) * 100 : 0;
      statusRows += "<tr>";
      statusRows += "<td>" + label + "</td>";
      statusRows += "<td>" + cnt + " (" + pct.toFixed(0) + "%)</td>";
      statusRows += "</tr>";
    });

    let topProdukRows = "";
    data.topProduk.forEach((p, i) => {
      topProdukRows += "<tr>";
      topProdukRows += "<td>" + (i + 1) + "</td>";
      topProdukRows += "<td>" + p.nama + "</td>";
      topProdukRows += "<td>" + p.qty + " Unit</td>";
      topProdukRows += "<td>Rp " + p.omzet.toLocaleString("id-ID") + "</td>";
      topProdukRows += "</tr>";
    });

    let lowStockRows = "";
    if (data.lowStock.length > 0) {
      lowStockRows += "<div class='section-title'>Stok Kritis</div>";
      lowStockRows += "<table><thead><tr><th>Nama Produk</th><th>Sisa Stok</th></tr></thead><tbody>";
      data.lowStock.forEach((p) => {
        lowStockRows += "<tr>";
        lowStockRows += "<td>" + p.nama + "</td>";
        lowStockRows += "<td><span class='low-stock-badge'>" + (p.stok ?? 0) + " Sisa</span></td>";
        lowStockRows += "</tr>";
      });
      lowStockRows += "</tbody></table>";
    }

    const reportPeriod = PERIOD_LABEL[period];
    const omzetStr = "Rp " + data.omzet.toLocaleString("id-ID");
    const omzetSelesaiStr = "Rp " + data.omzetSelesai.toLocaleString("id-ID");
    const totalOrdersVal = data.totalOrders;
    const avgOrderStr = "Rp " + data.avgOrder.toLocaleString("id-ID");

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Performa Toko</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 5px; color: #fc970a; font-weight: bold; }
            .period { font-size: 12px; color: #666; margin-bottom: 25px; }
            .grid-kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .kpi-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; background: #fff; }
            .kpi-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6b7280; }
            .kpi-value { font-size: 18px; font-weight: bold; color: #111827; margin-top: 5px; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #4b5563; border-bottom: 2px solid #fc970a; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f9fafb; font-weight: bold; }
            .low-stock-badge { background-color: #fef2f2; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Laporan Performa Toko Jogjadoelan</h1>
          <div class="period">Periode: ${reportPeriod}</div>

          <div class="grid-kpi">
            <div class="kpi-card">
              <div class="kpi-label">Omzet</div>
              <div class="kpi-value">${omzetStr}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Selesai</div>
              <div class="kpi-value">${omzetSelesaiStr}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Order</div>
              <div class="kpi-value">${totalOrdersVal}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Avg Order</div>
              <div class="kpi-value">${avgOrderStr}</div>
            </div>
          </div>

          <div class="section-title">Sebaran Status Order</div>
          <table>
            <thead>
              <tr>
                <th>Status Order</th>
                <th>Jumlah Order</th>
              </tr>
            </thead>
            <tbody>
              ${statusRows}
            </tbody>
          </table>

          <div class="section-title">Top 5 Produk Terlaris</div>
          <table>
            <thead>
              <tr>
                <th>Peringkat</th>
                <th>Nama Produk</th>
                <th>Jumlah Terjual</th>
                <th>Total Omzet</th>
              </tr>
            </thead>
            <tbody>
              ${topProdukRows}
            </tbody>
          </table>

          ${lowStockRows}

          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#fc970a] p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <div><p className="text-sm font-black">Laporan & Analytics</p><p className="text-[10px] opacity-80">Performa toko periode {PERIOD_LABEL[period]}</p></div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 rounded-full bg-white/10 p-1">
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1 text-[10px] font-black transition ${period === p ? "bg-[#FF6B1A] text-white" : "text-white/70 hover:text-white"}`}>
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-600 px-3.5 py-1.5 text-[10px] font-black text-white shadow transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 rounded-full bg-red-600/90 hover:bg-red-600 px-3.5 py-1.5 text-[10px] font-black text-white shadow transition"
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Omzet" value={`Rp ${data.omzet.toLocaleString("id-ID")}`} icon={DollarSign} bg="bg-emerald-500" />
        <KPI label="Selesai" value={`Rp ${data.omzetSelesai.toLocaleString("id-ID")}`} icon={TrendingUp} bg="bg-blue-500" />
        <KPI label="Total Order" value={data.totalOrders} icon={ShoppingBag} bg="bg-[#FF6B1A]" />
        <KPI label="Avg Order" value={`Rp ${data.avgOrder.toLocaleString("id-ID")}`} icon={Package} bg="bg-violet-500" />
      </div>

      {/* Chart omzet harian */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Omzet Harian</p>
          <Calendar className="h-4 w-4 text-gray-400" />
        </div>
        <div className="flex h-40 items-end gap-1">
          {data.daily.map((d) => (
            <div key={d.date} className="group relative flex-1">
              <div className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-[#fc970a] px-2 py-0.5 text-[9px] font-black text-white group-hover:block whitespace-nowrap">
                {d.val > 0 ? `Rp ${(d.val / 1000).toFixed(0)}k` : "0"}
              </div>
              <div className="w-full rounded-t bg-gradient-to-t from-[#FF6B1A] to-[#FFD23F] transition hover:opacity-80"
                style={{ height: `${(d.val / data.maxDaily) * 100}%`, minHeight: d.val > 0 ? "4px" : "1px" }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[9px] font-bold text-gray-400">
          <span>{new Date(data.daily[0]?.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
          <span>{new Date(data.daily[data.daily.length - 1]?.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
        </div>
      </div>

      {/* Status breakdown + Top produk */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-gray-500">Sebaran Status Order</p>
          <div className="space-y-2">
            {Object.entries(STATUS_LABEL).map(([k, label]) => {
              const cnt = data.statusCount[k] ?? 0;
              const pct = data.totalOrders > 0 ? (cnt / data.totalOrders) * 100 : 0;
              return (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-[10px] font-black">
                    <span className="text-gray-900">{label}</span>
                    <span className="text-gray-500">{cnt} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full ${STATUS_COLOR[k]} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {data.totalOrders === 0 && <p className="py-6 text-center text-xs text-gray-400">Belum ada order di periode ini</p>}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-gray-500">Top 5 Produk Terlaris</p>
          {data.topProduk.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400">Belum ada data penjualan</p>
          ) : (
            <div className="space-y-2">
              {data.topProduk.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#FFD23F] text-xs font-black text-white">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-gray-900">{p.nama}</p>
                    <p className="text-[10px] font-bold text-gray-500">{p.qty} unit terjual</p>
                  </div>
                  <p className="text-xs font-black text-emerald-600">Rp {(p.omzet / 1000).toFixed(0)}k</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stok kritis */}
      {data.lowStock.length > 0 && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-red-700">Stok Kritis ({data.lowStock.length})</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.lowStock.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
                <Package className="h-4 w-4 text-red-500" />
                <p className="min-w-0 flex-1 truncate text-xs font-black text-gray-900">{p.nama}</p>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">{p.stok ?? 0} sisa</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, icon: Icon, bg }: { label: string; value: string | number; icon: typeof DollarSign; bg: string }) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} text-white shadow`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-[10px] font-black uppercase text-gray-500">{label}</p>
      <p className="text-base font-black text-gray-900">{value}</p>
    </div>
  );
}