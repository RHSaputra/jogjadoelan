"use client";

import { logger } from "@/lib/logger";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowRight, CheckCircle2, ClipboardCheck, FileImage, Inbox,
  MessageCircle, Search, ShieldCheck, Wrench, XCircle, ZoomIn, Clock
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
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

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

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allCustom, setAllCustom] = useState<Awaited<ReturnType<typeof listCustomOrdersForAdmin>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const orders = await listOrdersForAdmin({ q });
      if (!cancelled) {
        setAllOrders(orders);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mounted, q, tick]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const custom = await listCustomOrdersForAdmin({ q });
      if (!cancelled) setAllCustom(custom);
    })();
    return () => { cancelled = true; };
  }, [mounted, q, tick]);

  const queueReguler = useMemo(() =>
    allOrders.filter((o) => o.status === "menunggu_konfirmasi"), [allOrders]);

  const dpList = useMemo(() => allCustom.filter((o) => o.status === "menunggu_verifikasi_dp"), [allCustom]);
  const lunasList = useMemo(() => allCustom.filter((o) => o.status === "menunggu_verifikasi_lunas"), [allCustom]);
  const pelunasanList = useMemo(() => allCustom.filter((o) => o.status === "menunggu_verifikasi_pelunasan"), [allCustom]);

  const total = queueReguler.length + dpList.length + lunasList.length + pelunasanList.length;
  const counts = {
    reguler: queueReguler.length,
    custom_dp: dpList.length,
    custom_lunas: lunasList.length,
    custom_pelunasan: pelunasanList.length,
  };

  async function doVerify() {
    if (!confirmId) return;
    let msg = "Berhasil diverifikasi";
    try {
      if (tab === "reguler") {
        await adminConfirmPayment(confirmId);
        msg = "Bukti reguler disetujui, pesanan masuk antrian pengemasan";
      } else if (tab === "custom_dp") {
        await adminVerifyDp(confirmId);
        msg = "DP custom disetujui, pesanan masuk produksi";
      } else if (tab === "custom_lunas") {
        await adminVerifyLunas(confirmId);
        msg = "Pembayaran lunas custom disetujui";
      } else if (tab === "custom_pelunasan") {
        await adminVerifyPelunasan(confirmId);
        msg = "Pelunasan custom disetujui, pesanan selesai";
      }
      setSuccessMsg(msg);
      setConfirmId(null);
      setTick((t) => t + 1);
    } catch (err) {
      logger.error(err);
      alert("Gagal memverifikasi: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  async function doReject() {
    if (!rejectId || !alasan.trim()) return;
    let msg = "Bukti ditolak";
    try {
      if (tab === "reguler") {
        await adminRejectPayment(rejectId, alasan.trim());
        msg = "Bukti reguler ditolak";
      } else if (tab === "custom_dp") {
        await adminRejectDp(rejectId, alasan.trim());
        msg = "DP custom ditolak";
      } else if (tab === "custom_lunas") {
        await adminRejectLunas(rejectId, alasan.trim());
        msg = "Lunas custom ditolak";
      } else if (tab === "custom_pelunasan") {
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

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 w-1/3 rounded-xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-200" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Validasi Pembayaran"
        subtitle="Verifikasi bukti transfer bank & QRIS dari customer sebelum pesanan diproses atau dikirim"
        breadcrumbs={[{ label: "Sales" }, { label: "Validasi Pembayaran" }]}
      />

      {/* KPI Stats */}
      <section className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        <AdminStatCard
          label="Antrian Reguler"
          value={counts.reguler}
          subtitle="Pesanan katalog ready-stock"
          icon={ClipboardCheck}
          color={counts.reguler > 0 ? "amber" : "slate"}
          alert={counts.reguler > 0}
          onClick={() => setTab("reguler")}
        />
        <AdminStatCard
          label="Custom (DP)"
          value={counts.custom_dp}
          subtitle="Uang muka order custom"
          icon={Wrench}
          color={counts.custom_dp > 0 ? "orange" : "slate"}
          alert={counts.custom_dp > 0}
          onClick={() => setTab("custom_dp")}
        />
        <AdminStatCard
          label="Custom (Lunas Full)"
          value={counts.custom_lunas}
          subtitle="Pembayaran penuh di awal"
          icon={ShieldCheck}
          color={counts.custom_lunas > 0 ? "emerald" : "slate"}
          alert={counts.custom_lunas > 0}
          onClick={() => setTab("custom_lunas")}
        />
        <AdminStatCard
          label="Custom (Pelunasan)"
          value={counts.custom_pelunasan}
          subtitle="Pelunasan sebelum kirim"
          icon={Wrench}
          color={counts.custom_pelunasan > 0 ? "purple" : "slate"}
          alert={counts.custom_pelunasan > 0}
          onClick={() => setTab("custom_pelunasan")}
        />
      </section>

      {/* Search & Tabs Toolbar */}
      <AdminCard bodyClassName="p-4 sm:p-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari berdasarkan ID order atau nama customer..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FF6B1A] focus:bg-white focus:ring-3 focus:ring-orange-500/10"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          {TABS.map((t) => {
            const active = tab === t.key;
            const n = counts[t.key];
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? "bg-[#FF6B1A] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    active
                      ? "bg-white/20 text-white"
                      : n > 0
                      ? "bg-amber-500 text-white"
                      : "bg-white text-slate-600"
                  }`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </AdminCard>

      {/* Queue Lists */}
      {tab === "reguler" && (
        <QueueGrid empty={queueReguler.length === 0}>
          {queueReguler.map((o) => (
            <RegulerCard
              key={o.id}
              order={o}
              onPreview={setPreview}
              onVerify={() => setConfirmId(o.id)}
              onReject={() => { setRejectId(o.id); setAlasan(""); }}
            />
          ))}
        </QueueGrid>
      )}

      {tab === "custom_dp" && (
        <QueueGrid empty={dpList.length === 0}>
          {dpList.map((o) => (
            <CustomCard
              key={o.id}
              order={o}
              rec={o.dpPayment}
              kind="DP (Uang Muka)"
              onPreview={setPreview}
              onVerify={() => setConfirmId(o.id)}
              onReject={() => { setRejectId(o.id); setAlasan(""); }}
            />
          ))}
        </QueueGrid>
      )}

      {tab === "custom_lunas" && (
        <QueueGrid empty={lunasList.length === 0}>
          {lunasList.map((o) => (
            <CustomCard
              key={o.id}
              order={o}
              rec={o.lunasPayment}
              kind="Lunas (Full di Awal)"
              onPreview={setPreview}
              onVerify={() => setConfirmId(o.id)}
              onReject={() => { setRejectId(o.id); setAlasan(""); }}
            />
          ))}
        </QueueGrid>
      )}

      {tab === "custom_pelunasan" && (
        <QueueGrid empty={pelunasanList.length === 0}>
          {pelunasanList.map((o) => (
            <CustomCard
              key={o.id}
              order={o}
              rec={o.pelunasanPayment}
              kind="Pelunasan Akhir"
              onPreview={setPreview}
              onVerify={() => setConfirmId(o.id)}
              onReject={() => { setRejectId(o.id); setAlasan(""); }}
            />
          ))}
        </QueueGrid>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        open={!!confirmId}
        title="Konfirmasi Bukti Pembayaran?"
        message={
          tab === "reguler"
            ? "Status pesanan akan diubah ke VERIFIKASI (DIPROSES) dan masuk antrian pengemasan."
            : tab === "custom_pelunasan"
            ? "Status pesanan custom akan ditandai SELESAI dan siap dikirim."
            : "Pesanan custom akan disetujui dan masuk tahap PRODUKSI."
        }
        confirmText="Ya, Setujui Pembayaran"
        onConfirm={doVerify}
        onClose={() => setConfirmId(null)}
      />

      {/* Rejection Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Tolak Bukti Pembayaran</h3>
            <p className="mt-1 text-xs text-slate-500">
              Customer akan menerima notifikasi dan diminta mengunggah ulang bukti yang valid. Berikan alasan yang jelas.
            </p>

            <textarea
              autoFocus
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={4}
              placeholder="Contoh: Gambar buram/tidak terbaca, nominal transfer kurang, atau rekening pengirim tidak cocok..."
              className="mt-3.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 outline-none transition focus:border-rose-500 focus:bg-white"
            />

            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => { setRejectId(null); setAlasan(""); }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={doReject}
                disabled={!alasan.trim()}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-xs"
              >
                Tolak Bukti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview */}
      {preview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Bukti Transfer"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <SuccessModal
        open={!!successMsg}
        title={successMsg ?? "Berhasil"}
        onClose={() => setSuccessMsg(null)}
      />
    </div>
  );
}

/* ==================== SUB COMPONENTS ==================== */

function QueueGrid({ empty, children }: { empty: boolean; children: React.ReactNode }) {
  if (empty) {
    return (
      <AdminEmptyState
        icon={Inbox}
        title="Antrian Pembayaran Bersih"
        description="Tidak ada bukti transfer atau pembayaran yang menunggu verifikasi di kategori ini."
      />
    );
  }
  return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</section>;
}

function RegulerCard({
  order,
  onPreview,
  onVerify,
  onReject,
}: {
  order: Order;
  onPreview: (url: string) => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  const buktiUrl = order.buktiBayar ?? "";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between">
      <div>
        <button
          type="button"
          onClick={() => buktiUrl && onPreview(buktiUrl)}
          className="group relative block h-44 w-full overflow-hidden bg-slate-100 border-b border-slate-100 cursor-zoom-in"
        >
          {buktiUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buktiUrl}
                alt="Bukti Bayar"
                className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition group-hover:bg-slate-900/40 group-hover:opacity-100">
                <ZoomIn className="h-6 w-6 text-white drop-shadow-md" />
              </span>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <FileImage className="h-10 w-10 text-slate-300 mb-1" />
              <span className="text-[11px] font-semibold">Bukti belum diunggah</span>
            </div>
          )}
          <span className="absolute left-2.5 top-2.5 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-xs">
            Reguler
          </span>
        </button>

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] font-bold text-[#FF6B1A]">#{order.id}</p>
              <p className="font-bold text-slate-900 text-sm">{order.alamat?.nama ?? "Customer"}</p>
              <p className="text-[11px] text-slate-400">{order.alamat?.noHp ?? "-"}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Tagihan</span>
              <p className="text-base font-black text-slate-900">
                Rp {order.total.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <Clock className="h-3 w-3" />
            <span>{new Date(order.createdAt).toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 rounded-xl border border-rose-200 bg-rose-50/70 py-2 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 transition flex items-center justify-center gap-1"
          >
            <XCircle className="h-3.5 w-3.5" /> Tolak
          </button>
          <button
            type="button"
            onClick={onVerify}
            className="flex-1 rounded-xl bg-emerald-600 py-2 px-3 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Setujui
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
          {order.userId ? (
            <Link
              href={`/admin/chat?userId=${order.userId}`}
              className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-[#FF6B1A] transition"
            >
              <MessageCircle className="h-3 w-3" /> Chat Customer
            </Link>
          ) : (
            <span className="text-slate-400">—</span>
          )}
          <Link
            href={`/admin/penjualan/${order.id}`}
            className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-[#FF6B1A] transition"
          >
            Detail Pesanan <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CustomCard({
  order,
  rec,
  kind,
  onPreview,
  onVerify,
  onReject,
}: {
  order: CustomOrder;
  rec?: PaymentRecord;
  kind: string;
  onPreview: (url: string) => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between">
      <div>
        <button
          type="button"
          onClick={() => rec?.buktiUrl && onPreview(rec.buktiUrl)}
          className="group relative block h-44 w-full overflow-hidden bg-slate-100 border-b border-slate-100 cursor-zoom-in"
        >
          {rec?.buktiUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rec.buktiUrl}
                alt="Bukti Custom"
                className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition group-hover:bg-slate-900/40 group-hover:opacity-100">
                <ZoomIn className="h-6 w-6 text-white drop-shadow-md" />
              </span>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <FileImage className="h-10 w-10 text-slate-300 mb-1" />
              <span className="text-[11px] font-semibold">Bukti belum diunggah</span>
            </div>
          )}
          <span className="absolute left-2.5 top-2.5 rounded-full bg-[#FF6B1A] px-2 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-xs">
            Custom · {kind}
          </span>
        </button>

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] font-bold text-[#FF6B1A]">#{order.id}</p>
              <p className="font-bold text-slate-900 text-sm">{order.jenis}</p>
              <p className="text-[11px] text-slate-500">{CUSTOM_STATUS_LABEL[order.status]}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400">Nominal Transfer</span>
              <p className="text-base font-black text-slate-900">
                {formatRp(rec?.amount ?? 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <Clock className="h-3 w-3" />
            <span>
              {rec
                ? `${new Date(rec.at).toLocaleString("id-ID")} · ${rec.metode.toUpperCase()}${
                    rec.bank ? ` · ${rec.bank.toUpperCase()}` : ""
                  }`
                : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 rounded-xl border border-rose-200 bg-rose-50/70 py-2 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 transition flex items-center justify-center gap-1"
          >
            <XCircle className="h-3.5 w-3.5" /> Tolak
          </button>
          <button
            type="button"
            onClick={onVerify}
            className="flex-1 rounded-xl bg-emerald-600 py-2 px-3 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Setujui
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
          {order.userId ? (
            <Link
              href={`/admin/chat?userId=${order.userId}`}
              className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-[#FF6B1A] transition"
            >
              <MessageCircle className="h-3 w-3" /> Chat Customer
            </Link>
          ) : (
            <span className="text-slate-400">—</span>
          )}
          <Link
            href={`/admin/custom/${order.id}`}
            className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-[#FF6B1A] transition"
          >
            Detail Custom <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}