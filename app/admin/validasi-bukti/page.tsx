"use client"
import { logger } from "@/lib/logger";
;

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowRight, CheckCircle2, ClipboardCheck, FileImage, Inbox,
  MessageCircle, Search, ShieldCheck, Wrench, XCircle, ZoomIn,
} from "lucide-react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { SuccessModal } from "@/components/admin/SuccessModal";
import {
  adminConfirmPayment,
  adminRejectPayment,
  listOrdersForAdmin,
} from "@/lib/admin-orders-helpers";
import type { Order } from "@/lib/orders-storage";
import {
  CUSTOM_STATUS_LABEL, type CustomOrder, type PaymentRecord,
} from "@/lib/custom-order-context";
import {
  adminRejectDp, adminRejectLunas, adminRejectPelunasan,
  adminVerifyDp, adminVerifyLunas, adminVerifyPelunasan,
  formatRp, listCustomOrdersForAdmin,
} from "@/lib/admin-custom-helpers";

type TabKey = "reguler" | "custom_dp" | "custom_lunas" | "custom_pelunasan";

const emptySubscribe = () => () => {};

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "reguler",          label: "Reguler",         icon: ClipboardCheck },
  { key: "custom_dp",        label: "Custom DP",       icon: Wrench },
  { key: "custom_lunas",     label: "Custom Lunas",    icon: Wrench },
  { key: "custom_pelunasan", label: "Custom Pelunasan", icon: Wrench },
];

export default function AdminValidasiBuktiPage() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<TabKey>("reguler");
  const [q, setQ] = useState("");

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [alasan, setAlasan] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // State untuk regular orders
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  // State untuk custom orders
  const [allCustom, setAllCustom] = useState<Awaited<ReturnType<typeof listCustomOrdersForAdmin>>>([]);

  // Effect untuk mengambil regular orders (async)
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const orders = await listOrdersForAdmin({ q });
      if (!cancelled) setAllOrders(orders);
    })();
    return () => { cancelled = true; };
  }, [mounted, q, tick]);

  // Effect untuk mengambil custom orders (async)
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const list = await listCustomOrdersForAdmin({ q });
      if (!cancelled) setAllCustom(list);
    })();
    return () => { cancelled = true; };
  }, [mounted, q, tick]);

  // Filter berdasarkan status untuk regular orders
  const queueReguler = useMemo(() => 
    allOrders.filter((o) => o.status === "menunggu_konfirmasi"), [allOrders]);

  // Filter untuk custom orders
  const dpList = useMemo(() => allCustom.filter((o) => o.status === "menunggu_verifikasi_dp"), [allCustom]);
  const lunasList = useMemo(() => allCustom.filter((o) => o.status === "menunggu_verifikasi_lunas"), [allCustom]);
  const pelunasanList = useMemo(() => allCustom.filter((o) => o.status === "menunggu_verifikasi_pelunasan"), [allCustom]);

  // Hitung total antrian untuk badge
  const total = queueReguler.length + dpList.length + lunasList.length + pelunasanList.length;
  const counts = {
    reguler: queueReguler.length,
    custom_dp: dpList.length,
    custom_lunas: lunasList.length,
    custom_pelunasan: pelunasanList.length,
  };

  // Handler verify (async)
  async function doVerify() {
    if (!confirmId) return;
    let msg = "Berhasil diverifikasi";
    try {
      if (tab === "reguler") { 
        await adminConfirmPayment(confirmId); 
        msg = "Bukti reguler disetujui"; 
      }
      else if (tab === "custom_dp") { 
        await adminVerifyDp(confirmId); 
        msg = "DP custom disetujui"; 
      }
      else if (tab === "custom_lunas") { 
        await adminVerifyLunas(confirmId); 
        msg = "Lunas custom disetujui"; 
      }
      else if (tab === "custom_pelunasan") { 
        await adminVerifyPelunasan(confirmId); 
        msg = "Pelunasan custom disetujui"; 
      }
      setSuccessMsg(msg);
      setConfirmId(null);
      setTick((t) => t + 1);
    } catch (err) {
      logger.error(err);
      alert("Gagal memverifikasi: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  // Handler reject (async)
  async function doReject() {
    if (!rejectId || !alasan.trim()) return;
    let msg = "Bukti ditolak";
    try {
      if (tab === "reguler") { 
        await adminRejectPayment(rejectId, alasan.trim()); 
        msg = "Bukti reguler ditolak"; 
      }
      else if (tab === "custom_dp") { 
        await adminRejectDp(rejectId, alasan.trim()); 
        msg = "DP custom ditolak"; 
      }
      else if (tab === "custom_lunas") { 
        await adminRejectLunas(rejectId, alasan.trim()); 
        msg = "Lunas custom ditolak"; 
      }
      else if (tab === "custom_pelunasan") { 
        await adminRejectPelunasan(rejectId, alasan.trim()); 
        msg = "Pelunasan custom ditolak"; 
      }
      setSuccessMsg(msg);
      setRejectId(null);
      setAlasan("");
      setTick((t) => t + 1);
    } catch (err) {
      logger.error(err);
      alert("Gagal menolak: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  if (!mounted) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-orange-500 p-5 text-gray-900 shadow-lg ring-1 ring-orange-500/30 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-900">
              <ShieldCheck className="h-3.5 w-3.5" /> Antrian Verifikasi Bukti Bayar
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Validasi Pembayaran</h1>
            <p className="mt-1 text-xs text-gray-800">Verifikasi cepat semua bukti transfer/QRIS dari customer.</p>
          </div>
          <div className="rounded-2xl bg-white/50 px-5 py-3 text-center backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-900">Total Antrian</p>
            <p className="text-3xl font-black text-gray-900">{total}</p>
          </div>
        </div>
      </section>

      {/* Toolbar + tabs */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari ID order, nama customer..."
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            const n = counts[t.key];
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  active ? "bg-[#FF6B1A] text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                <t.icon className="h-3 w-3" /> {t.label}
                <span className={`rounded-full px-1.5 text-[9px] ${
                  active ? "bg-white/20 text-white"
                  : n > 0 ? "bg-red-500 text-white animate-pulse"
                  : "bg-white text-gray-600"
                }`}>{n}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Queues */}
      {tab === "reguler" && (
        <QueueGrid empty={queueReguler.length === 0}>
          {queueReguler.map((o) => (
            <RegulerCard key={o.id} order={o}
              onPreview={setPreview}
              onVerify={() => setConfirmId(o.id)}
              onReject={() => { setRejectId(o.id); setAlasan(""); }} />
          ))}
        </QueueGrid>
      )}
      {tab === "custom_dp" && (
        <QueueGrid empty={dpList.length === 0}>
          {dpList.map((o) => (
            <CustomCard key={o.id} order={o} rec={o.dpPayment} kind="DP"
              onPreview={setPreview}
              onVerify={() => setConfirmId(o.id)}
              onReject={() => { setRejectId(o.id); setAlasan(""); }} />
          ))}
        </QueueGrid>
      )}
      {tab === "custom_lunas" && (
        <QueueGrid empty={lunasList.length === 0}>
          {lunasList.map((o) => (
            <CustomCard key={o.id} order={o} rec={o.lunasPayment} kind="Lunas (Full)"
              onPreview={setPreview}
              onVerify={() => setConfirmId(o.id)}
              onReject={() => { setRejectId(o.id); setAlasan(""); }} />
          ))}
        </QueueGrid>
      )}
      {tab === "custom_pelunasan" && (
        <QueueGrid empty={pelunasanList.length === 0}>
          {pelunasanList.map((o) => (
            <CustomCard key={o.id} order={o} rec={o.pelunasanPayment} kind="Pelunasan"
              onPreview={setPreview}
              onVerify={() => setConfirmId(o.id)}
              onReject={() => { setRejectId(o.id); setAlasan(""); }} />
          ))}
        </QueueGrid>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        open={!!confirmId}
        title="Setujui Bukti Pembayaran?"
        message={tab === "reguler"
          ? "Status order akan diubah ke DIVERIFIKASI dan masuk antrian pengemasan."
          : tab === "custom_pelunasan"
            ? "Order custom akan ditandai SELESAI."
            : "Order custom akan masuk produksi (DIPROSES)."}
        confirmText="Ya, Setujui"
        onConfirm={doVerify}
        onClose={() => setConfirmId(null)}
      />

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-base font-black text-gray-900">Tolak Bukti Pembayaran</p>
            <p className="mt-1 text-xs text-gray-600">Customer akan diminta upload ulang. Tulis alasan jelas.</p>
            <textarea autoFocus value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={4}
              placeholder="Contoh: Foto buram, nominal tidak sesuai..."
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setRejectId(null); setAlasan(""); }}
                className="flex-1 rounded-md border-2 border-gray-200 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={doReject} disabled={!alasan.trim()}
                className="flex-1 rounded-md bg-red-600 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50">
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Image */}
      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <SuccessModal open={!!successMsg} title={successMsg ?? "Berhasil"} onClose={() => setSuccessMsg(null)} />
    </div>
  );
}

/* ==================== SUB COMPONENTS ==================== */

function QueueGrid({ empty, children }: { empty: boolean; children: React.ReactNode }) {
  if (empty) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
        <Inbox className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-3 text-sm font-black text-gray-500">Tidak ada antrian</p>
        <p className="text-xs text-gray-400">Semua bukti pembayaran di tab ini sudah diverifikasi.</p>
      </div>
    );
  }
  return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</section>;
}

function RegulerCard({ order, onPreview, onVerify, onReject }: {
  order: Order; onPreview:(url: string) => void; onVerify: () => void; onReject: () => void;
}) {
  const buktiUrl = order.buktiBayar ?? "";
  return (
    <article className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-sm">
      <button onClick={() => buktiUrl && onPreview(buktiUrl)}
        className="group relative block h-40 w-full overflow-hidden bg-gray-50">
        {buktiUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={buktiUrl} alt="Bukti" className="h-full w-full object-contain transition group-hover:scale-105" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              <ZoomIn className="h-6 w-6 text-white" />
            </span>
          </>
        ) : <div className="flex h-full items-center justify-center text-gray-300"><FileImage className="h-10 w-10" /></div>}
        <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">Reguler</span>
      </button>
      <div className="space-y-2 p-4 text-xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] text-gray-500">{order.id}</p>
            <p className="font-black text-gray-900">{order.alamat?.nama ?? "—"}</p>
          </div>
          <p className="text-right">
            <span className="text-[9px] uppercase text-gray-400">Total</span><br />
            <span className="font-black text-[#FF6B1A]">Rp {order.total.toLocaleString("id-ID")}</span>
          </p>
        </div>
        <p className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleString("id-ID")}</p>
        <div className="flex gap-2 pt-1">
          <button onClick={onReject} className="flex-1 rounded-md bg-red-50 px-3 py-2 text-[11px] font-black text-red-600 hover:bg-red-100">
            <XCircle className="mr-1 inline h-3 w-3" /> Tolak
          </button>
          <button onClick={onVerify} className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-700">
            <CheckCircle2 className="mr-1 inline h-3 w-3" /> Setujui
          </button>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
          {order.userId ? (
            <Link href={`/admin/chat?userId=${order.userId}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:underline">
              <MessageCircle className="h-3 w-3" /> Chat Customer
            </Link>
          ) : (
            <span className="text-[10px] text-gray-400 font-bold">—</span>
          )}
          <Link href={`/admin/penjualan/${order.id}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-900 hover:text-[#FF6B1A]">
            Buka Detail <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CustomCard({ order, rec, kind, onPreview, onVerify, onReject }: {
  order: CustomOrder; rec?: PaymentRecord; kind: string;
  onPreview: (url: string) => void; onVerify: () => void; onReject: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border-2 border-orange-200 bg-white shadow-sm">
      <button onClick={() => rec?.buktiUrl && onPreview(rec.buktiUrl)}
        className="group relative block h-40 w-full overflow-hidden bg-gray-50">
        {rec?.buktiUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rec.buktiUrl} alt="Bukti" className="h-full w-full object-contain transition group-hover:scale-105" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              <ZoomIn className="h-6 w-6 text-white" />
            </span>
          </>
        ) : <div className="flex h-full items-center justify-center text-gray-300"><FileImage className="h-10 w-10" /></div>}
        <span className="absolute left-2 top-2 rounded bg-[#FF6B1A] px-2 py-0.5 text-[9px] font-black uppercase text-white">
          Custom · {kind}
        </span>
      </button>
      <div className="space-y-2 p-4 text-xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] text-gray-500">{order.id}</p>
            <p className="font-black text-gray-900">{order.jenis}</p>
            <p className="text-[10px] text-gray-500">{CUSTOM_STATUS_LABEL[order.status]}</p>
          </div>
          <p className="text-right">
            <span className="text-[9px] uppercase text-gray-400">Nominal</span><br />
            <span className="font-black text-[#FF6B1A]">{formatRp(rec?.amount ?? 0)}</span>
          </p>
        </div>
        <p className="text-[10px] text-gray-500">
          {rec ? `${new Date(rec.at).toLocaleString("id-ID")} · ${rec.metode.toUpperCase()}${rec.bank ? ` · ${rec.bank.toUpperCase()}` : ""}` : "—"}
        </p>
        <div className="flex gap-2 pt-1">
          <button onClick={onReject} className="flex-1 rounded-md bg-red-50 px-3 py-2 text-[11px] font-black text-red-600 hover:bg-red-100">
            <XCircle className="mr-1 inline h-3 w-3" /> Tolak
          </button>
          <button onClick={onVerify} className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-700">
            <CheckCircle2 className="mr-1 inline h-3 w-3" /> Setujui
          </button>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
          {order.userId ? (
            <Link href={`/admin/chat?userId=${order.userId}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:underline">
              <MessageCircle className="h-3 w-3" /> Chat Customer
            </Link>
          ) : (
            <span className="text-[10px] text-gray-400 font-bold">—</span>
          )}
          <Link href={`/admin/custom/${order.id}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-900 hover:text-[#FF6B1A]">
            Buka Detail Custom <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}