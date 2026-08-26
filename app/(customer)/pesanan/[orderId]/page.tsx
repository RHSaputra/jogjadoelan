"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeSyncMany } from "@/lib/sync-events";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Copy,
  Upload,
  Trash2,
  CircleDot,
  ShieldAlert,
  Star,
  Repeat,
  ExternalLink,
  Info,
  AlertTriangle,
  MapPin,
  Phone,
  AlertOctagon,
  MessageCircle, 
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getOrder,
  cancelOrder,
  deleteOrder,
  getOrderTimeline,
  STATUS_LABEL,
  STATUS_COLOR,
  type Order,
} from "@/lib/orders-storage";
import {
  useKomplain,
  KOMPLAIN_STATUS_LABEL,
  KOMPLAIN_AKTIF_STATUS,
} from "@/lib/komplain-context";
import { useNotifikasi } from "@/lib/notifikasi-context";
import { getUlasanByOrder } from "@/lib/ulasan-helpers";
import { sisaWaktuAutoSelesai } from "@/lib/auto-selesai";
import {
  isOrderTerlambat,
  hariTerlambat,
} from "@/lib/order-status-extra";
import { KonfirmasiTerimaModal } from "@/components/customer/KonfirmasiTerimaModal";
import { toast } from "sonner";

/** K9/L2/L6: status komplain yang masih "aktif" — guard cancel/delete order. */
const KOMPLAIN_AKTIF = KOMPLAIN_AKTIF_STATUS;

/* ================================================================ */
/* CONSTANTS                                  */
/* ================================================================ */

const KURIR_TRACK: { match: string; url: (resi: string) => string; brand: string }[] = [
  {
    match: "jne",
    url: (r) => `https://www.jne.co.id/id/tracking/trace/${encodeURIComponent(r)}`,
    brand: "JNE",
  },
  {
    match: "j&t",
    url: (r) => `https://www.jet.co.id/track/${encodeURIComponent(r)}`,
    brand: "J&T",
  },
  {
    match: "jnt",
    url: (r) => `https://www.jet.co.id/track/${encodeURIComponent(r)}`,
    brand: "J&T",
  },
  {
    match: "sicepat",
    url: (r) =>
      `https://www.sicepat.com/checkAwb?awb=${encodeURIComponent(r)}`,
    brand: "SiCepat",
  },
  {
    match: "anteraja",
    url: (r) => `https://anteraja.id/tracking?awb=${encodeURIComponent(r)}`,
    brand: "Anteraja",
  },
  {
    match: "pos",
    url: (r) =>
      `https://www.posindonesia.co.id/id/tracking?reciept=${encodeURIComponent(r)}`,
    brand: "Pos Indonesia",
  },
];

function trackUrlFor(kurir: string | null | undefined, resi: string) {
  if (!kurir || !resi) return null;
  const lk = kurir.toLowerCase();
  const hit = KURIR_TRACK.find((k) => lk.includes(k.match));
  return hit ? { url: hit.url(resi), brand: hit.brand } : null;
}

/* ================================================================ */
/* HELPERS                                    */
/* ================================================================ */

function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTanggalSingkat(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function formatRangeTanggal(from?: string | null, to?: string | null) {
  if (!from || !to) return "";
  const f = formatTanggalSingkat(from);
  const t = formatTanggalSingkat(to);
  return `${f} "“ ${t}`;
}

function formatDurasi(ms: number) {
  if (ms <= 0) return "Habis";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} mnt`;
  return `${m} menit`;
}

/* 3—24 jam = 72 jam */
const KOMPLAIN_WINDOW_MS = 72 * 60 * 60 * 1000;

function diterimaAt(order: Order): string | null {
  return order.konfirmasiDiterimaAt ?? order.deliveredAt ?? null;
}

function isKomplainWindowOpen(order: Order, now: number): boolean {
  const recv = diterimaAt(order);
  if (!recv) return false;
  return now - new Date(recv).getTime() < KOMPLAIN_WINDOW_MS;
}

function sisaWindowKomplainMs(order: Order, now: number): number {
  const recv = diterimaAt(order);
  if (!recv) return 0;
  return KOMPLAIN_WINDOW_MS - (now - new Date(recv).getTime());
}

/* ================================================================ */
/* TRACKING STEPS                             */
/* ================================================================ */

const TRACKING_STEPS = [
  { key: "diproses", label: "Diproses Toko", icon: Package },
  { key: "diserahkan", label: "Diserahkan ke Kurir", icon: Truck },
  { key: "perjalanan", label: "Dalam Perjalanan", icon: Truck },
  { key: "ofd", label: "Out for Delivery", icon: Truck },
  { key: "diterima", label: "Diterima", icon: CheckCircle2 },
] as const;

function trackingProgress(order: Order): number {
  /* 0..4 → step index aktif */
  if (order.status === "selesai" || order.konfirmasiDiterimaAt) return 4;
  if (order.deliveredAt) return 4;
  if (order.status === "dikirim") {
    /* derive berdasarkan estimasiTiba bila ada */
    const ship = order.ekspedisi?.shippedAt
      ? new Date(order.ekspedisi.shippedAt).getTime()
      : null;
    const to = order.estimasiTiba?.to
      ? new Date(order.estimasiTiba.to).getTime()
      : null;
    const now = Date.now();
    if (ship && to && to > ship) {
      const ratio = (now - ship) / (to - ship);
      if (ratio >= 0.95) return 3; // OFD
      if (ratio >= 0.5) return 2; // Perjalanan jauh
    }
    return 1; // Diserahkan ke kurir baru
  }
  if (order.status === "diproses") return 0;
  return 0;
}

/* ================================================================ */
/* PAGE                                     */
/* ================================================================ */

export default function PesananDetailPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { byOrderId } = useKomplain();
  const { notifyOrder } = useNotifikasi();

  const handleChat = () => {
    router.push(`/chat?orderId=${params.orderId}`);
  };

  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState<null | "cancel" | "delete" | "ubah_batal">(null);
  const [terimaModalOpen, setTerimaModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [copyId, setCopyId] = useState(false);
  const liveRef = useRef<HTMLDivElement | null>(null);

  /* Auth gate */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(
        "/login?next=" + encodeURIComponent(`/pesanan/${params.orderId}`),
      );
    }
  }, [authLoading, isAuthenticated, router, params.orderId]);

  const [ulasanState, setUlasanState] = useState<{ id: string; rating: number; komentar: string } | null>(null);

  /* Load */
  const reload = async () => {
    if (!user) return;
    const [o, u] = await Promise.all([
      getOrder(user.id, params.orderId),
      getUlasanByOrder(user.id, params.orderId),
    ]);
    setOrder(o);
    setUlasanState(u ? { id: u.id, rating: u.rating, komentar: u.komentar } : null);
    setLoaded(true);
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    void Promise.all([
      getOrder(user.id, params.orderId),
      getUlasanByOrder(user.id, params.orderId),
    ]).then(([o, u]) => {
      if (!active) return;
      setOrder(o);
      setUlasanState(u ? { id: u.id, rating: u.rating, komentar: u.komentar } : null);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [user, params.orderId]);

    useEffect(() => {
    // Dengar event admin: konfirmasi bayar, input resi, tandai dikirim,
    // force selesai, cancel, plus komplain/refund/tukar yg ngubah order.
    return subscribeSyncMany(
      ["order", "notif", "komplain", "refund", "tukar"],
      reload,
    );
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user, params.orderId]);

  /* Heartbeat */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (authLoading || !isAuthenticated || !loaded)
    return <div className="min-h-screen bg-brand-cream-light" />;

  if (!order) {
    return (
      <NotFoundView orderId={params.orderId} onBack={() => router.push("/pesanan")} />
    );
  }

  /* Derived */
  const komplainList = byOrderId(order.id);
  
  /* LOGIKA GARANSI DINAMIS JOGJADOELAN */
  const adaKomplainBerhasil = komplainList.some((k) => {
  const status = String(k.status);
  return status === "berhasil" || status === "selesai";
});
  const adaKomplainAktif = komplainList.some((k) => {
    const status = String(k.status);
    return !["berhasil", "selesai", "ditolak", "dibatalkan"].includes(status);
  });
  /* --------------------------------- */

  const ulasan = ulasanState;
  const trackInfo =
    order.ekspedisi?.kurir && order.ekspedisi?.resi
      ? trackUrlFor(order.ekspedisi.kurir, order.ekspedisi.resi)
      : null;
  const trackIdx = trackingProgress(order);
  const windowOpen = isKomplainWindowOpen(order, now);
  const sisaKomplain = sisaWindowKomplainMs(order, now);
  const autoSelesai = sisaWaktuAutoSelesai(order);
  const terlambat = isOrderTerlambat(order, now);
  const hariTl = terlambat ? hariTerlambat(order, now) : 0;

  const totalQty = order.items.reduce((s, i) => s + i.qty, 0);

  /* ============== ACTIONS ============== */

  async function doCancel() {
    if (!user) return;
    const aktif = komplainList.filter((k) => KOMPLAIN_AKTIF.includes(k.status));
    if (aktif.length > 0) {
      toast.error("Pesanan tidak dapat dibatalkan", {
        description: `Masih ada ${aktif.length} komplain aktif. Selesaikan atau batalkan komplain terlebih dahulu.`,
      });
      setConfirm(null);
      return;
    }
    setBusy(true);
    await cancelOrder(user.id, order!.id);
    await reload();
    setBusy(false);
    setConfirm(null);
    if (liveRef.current) liveRef.current.textContent = "Pesanan dibatalkan";
  }

  async function doDelete() {
    if (!user) return;
    const aktif = komplainList.filter((k) => KOMPLAIN_AKTIF.includes(k.status));
    if (aktif.length > 0) {
      toast.error("Pesanan tidak dapat dihapus", {
        description: `Masih ada ${aktif.length} komplain aktif. Tutup komplain terlebih dahulu agar tidak ada data refund atau tukar yang menggantung.`,
      });
      setConfirm(null);
      return;
    }
    setBusy(true);
    try {
      await deleteOrder(user.id, order!.id);
    } catch { /* non-critical */ }
    setBusy(false);
    setConfirm(null);
    router.push("/pesanan");
  }

  async function doUbahPesanan() {
    if (!user) return;
    const aktif = komplainList.filter((k) => KOMPLAIN_AKTIF.includes(k.status));
    if (aktif.length > 0) {
      toast.error("Pesanan tidak dapat diubah karena ada komplain aktif.");
      setConfirm(null);
      return;
    }
    setBusy(true);
    await cancelOrder(user.id, order!.id);
    try {
      await deleteOrder(user.id, order!.id);
    } catch { /* non-critical */ }
    setBusy(false);
    setConfirm(null);
    toast.success("Pesanan lama dihapus. Silakan buat pesanan baru.");
    router.push("/belanja");
  }

  function handleTerimaDone() {
    notifyOrder(
      order!.id,
      "Pesanan Selesai",
      `Pesanan ${order!.id} ditandai selesai. Garansi 3—24 jam aktif.`,
    );
    setTerimaModalOpen(false);
    reload();
    if (liveRef.current) liveRef.current.textContent = "Pesanan ditandai diterima";
  }

  function copyOrderId() {
    navigator.clipboard.writeText(order!.id);
    setCopyId(true);
    setTimeout(() => setCopyId(false), 1500);
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-32">
      {/* a11y live */}
      <div ref={liveRef} className="sr-only" aria-live="polite" />

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push("/pesanan")}
            className="rounded-md p-1.5 text-brand-black hover:bg-brand-cream"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-base font-black text-brand-black">
              Detail Pesanan
            </h1>
            <button
              onClick={copyOrderId}
              className="flex items-center gap-1 text-[11px] font-mono text-brand-black/60 hover:text-brand-orange"
            >
              <code>{order.id}</code>
              <Copy className="h-3 w-3" />
              {copyId && (
                <span className="text-[10px] font-bold text-emerald-600">
                  Tersalin
                </span>
              )}
            </button>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-black ${STATUS_COLOR[order.status]}`}
            >
              {STATUS_LABEL[order.status]}
            </span>
            {terlambat && (
              <span className="flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800">
                <AlertOctagon className="h-3 w-3" /> TERLAMBAT {hariTl}h
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-3 px-4 py-4">
        {/* Banner TERLAMBAT */}
        {terlambat && (
          <TerlambatBanner order={order} hari={hariTl} />
        )}

        {/* Status Banner */}
        <StatusBanner order={order} now={now} />

        {/* Custom estimasi (kalau order custom) */}
        {order.customMeta && <CustomEstimasiCard order={order} />}

        {/* Tracking 5-step */}
        {(order.status === "diproses" ||
          order.status === "dikirim" ||
          order.status === "selesai") && (
          <TrackingStepper activeIdx={trackIdx} order={order} />
        )}

        {/* Resi block */}
        {order.pengiriman === "ekspedisi" && order.ekspedisi?.resi && (
          <ResiBlock order={order} trackInfo={trackInfo} />
        )}

        {/* Auto selesai countdown */}
        {autoSelesai.aktif &&
          !komplainList.some((k) => KOMPLAIN_AKTIF.includes(k.status)) && (
            <AutoSelesaiCard sisaMs={autoSelesai.sisaMs} />
          )}
        {autoSelesai.aktif &&
          komplainList.some((k) => KOMPLAIN_AKTIF.includes(k.status)) && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  Auto-selesai 24 jam <strong>dijeda</strong> karena ada komplain
                  aktif. Pesanan tidak akan otomatis diselesaikan sampai komplain
                  ditutup.
                </span>
              </div>
            </section>
          )}

       {/* Garansi 3—24 jam */}
        {(order.status === "dikirim" || order.status === "selesai") && (
          <GaransiCard
            windowOpen={windowOpen}
            sisaMs={sisaKomplain}
            ada={komplainList.length > 0}
            adaKomplainBerhasil={adaKomplainBerhasil}
          />
        )}

        {/* Komplain terkait */}
        {komplainList.length > 0 && (
          <KomplainTerkaitCard komplains={komplainList} orderId={order.id} />
        )}

        {/* Items */}
        <ItemsCard order={order} />

        {/* Alamat */}
        <AlamatCard order={order} />

        {/* Ringkasan biaya */}
        <RingkasanCard order={order} totalQty={totalQty} />

        {/* Timeline */}
        <TimelineCard order={order} />

        {/* Bantuan Card dengan Logika Garansi Dinamis */}
        <BantuanCard 
          order={order} 
          handleChat={handleChat} 
          windowOpen={windowOpen} 
          adaKomplainBerhasil={adaKomplainBerhasil}
          adaKomplainAktif={adaKomplainAktif}
        />
      </div>

      {/* Floating Action Bar Lengkap */}
      <ActionBar
        order={order}
        windowOpen={windowOpen}
        ulasanAda={!!ulasan}
        onAskCancel={() => setConfirm("cancel")}
        onAskDelete={() => setConfirm("delete")}
        onAskTerima={() => setTerimaModalOpen(true)}
      />

      {/* Modal Konfirmasi Terpadu */}
      {confirm === "ubah_batal" ? (
        <UbahBatalModal busy={busy} onClose={() => setConfirm(null)} onCancelOrder={doCancel} onUbahOrder={doUbahPesanan} />
      ) : confirm ? (
        <ConfirmModal kind={confirm} busy={busy} onClose={() => setConfirm(null)} onConfirm={confirm === "cancel" ? doCancel : doDelete} />
      ) : null}

      <KonfirmasiTerimaModal
        open={terimaModalOpen}
        order={order}
        userId={user?.id ?? ""}
        onDone={handleTerimaDone}
      />
    </div>
  );
}

/* ================================================================ */
/* SUB COMPONENTS                               */
/* ================================================================ */

function NotFoundView({
  orderId,
  onBack,
}: {
  orderId: string;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-cream-light px-6 text-center">
      <Package className="h-16 w-16 text-brand-black/30" />
      <h1 className="mt-3 text-lg font-black text-brand-black">
        Pesanan tidak ditemukan
      </h1>
      <p className="mt-1 text-xs text-brand-black/60">
        ID <code className="font-mono">{orderId}</code> mungkin salah ketik atau
        sudah dihapus.
      </p>
      <button
        onClick={onBack}
        className="mt-5 rounded-md bg-brand-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-orange-dark"
      >
        ← Kembali ke Daftar Pesanan
      </button>
    </div>
  );
}

function TerlambatBanner({ order, hari }: { order: Order; hari: number }) {
  const isProses = order.status === "diproses";
  const judul = isProses
    ? "Pesanan Terlambat Diproses"
    : "Paket Terlambat Sampai";
   const body = isProses
    ? `Estimasi proses sudah lewat ${hari} hari. Anda bisa ajukan komplain bila admin tidak ada update.`
    : `Estimasi tiba sudah lewat ${hari} hari. Bila paket hilang/tidak sampai, ajukan komplain agar dapat direfund.`;

  return (
    <section className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-rose-100 p-4">
      <div className="flex items-start gap-3">
        <AlertOctagon className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-700" />
        <div className="flex-1">
          <h3 className="text-sm font-black text-rose-900">{judul}</h3>
          <p className="mt-1 text-xs text-rose-900/80">{body}</p>
          <Link
            href={`/komplain/baru?orderId=${encodeURIComponent(order.id)}&tindakan=refund`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-rose-700"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Ajukan Komplain Sekarang
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatusBanner({ order, now }: { order: Order; now: number }) {
  const s = order.status;
  const tone =
    s === "selesai"
      ? "from-emerald-50 to-emerald-100 border-emerald-200"
      : s === "dibatalkan" || s === "kadaluarsa"
        ? "from-rose-50 to-rose-100 border-rose-200"
        : s === "menunggu_pembayaran"
          ? "from-amber-50 to-amber-100 border-amber-200"
          : s === "dikirim"
            ? "from-violet-50 to-violet-100 border-violet-200"
            : "from-orange-50 to-amber-50 border-orange-200";

  const title = STATUS_LABEL[s];
  let body = "";
  let countdown: number | null = null;

  switch (s) {
    case "menunggu_pembayaran":
      body = "Bayar sebelum tenggat agar pesanan tidak otomatis dibatalkan.";
      if (order.expiredAt)
        countdown = new Date(order.expiredAt).getTime() - now;
      break;
    case "menunggu_konfirmasi":
      body = "Bukti bayar sedang diverifikasi admin (≤ 24 jam kerja).";
      break;
    case "diproses":
      body = "Pesanan sedang disiapkan & dikemas oleh tim kami.";
      break;
    case "dikirim":
      body = order.ekspedisi?.kurir
        ? `Paket sudah diserahkan ke ${order.ekspedisi.kurir}.`
        : "Paket dalam perjalanan.";
      break;
    case "selesai":
      body = "Pesanan sudah selesai. Terima kasih sudah belanja!";
      break;
    case "dibatalkan":
      body = "Pesanan dibatalkan. Bisa pesan ulang kapan saja.";
      break;
    case "kadaluarsa":
      body = "Pesanan kadaluarsa karena tidak dibayar tepat waktu.";
      break;
  }

  return (
    <section
      className={`rounded-2xl border bg-gradient-to-br p-4 ${tone}`}
    >
      <h2 className="text-sm font-black text-brand-black">{title}</h2>
      <p className="mt-1 text-xs text-brand-black/70">{body}</p>
      {countdown !== null && countdown > 0 && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white/70 px-2 py-1 text-[11px] font-bold text-amber-800">
          <Clock className="h-3 w-3" />
          Sisa waktu: {formatDurasi(countdown)}
        </div>
      )}
    </section>
  );
}

function CustomEstimasiCard({ order }: { order: Order }) {
  const m = order.customMeta!;
  const formatRp = (n: number) => new Intl.NumberFormat("id-ID").format(n);
  const breakdown = (m.estimasiBreakdown ?? []) as Array<{
    label: string;
    sub?: string;
    hari?: number;
    harga: number;
  }>;
  return (
    <section className="rounded-2xl border-2 border-brand-orange/20 bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-black text-brand-black">
          Pesanan Custom Helm
        </h3>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        {m.jenis && (
          <div>
            <dt className="text-[10px] font-bold uppercase text-brand-black/50">
              Jenis
            </dt>
            <dd className="font-bold text-brand-black">{m.jenis}</dd>
          </div>
        )}
        {m.ukuran && (
          <div>
            <dt className="text-[10px] font-bold uppercase text-brand-black/50">
              Ukuran
            </dt>
            <dd className="font-bold text-brand-black">{m.ukuran}</dd>
          </div>
        )}
        {m.estimasiHari && (
          <div>
            <dt className="text-[10px] font-bold uppercase text-brand-black/50">
              Estimasi Pengerjaan
            </dt>
            <dd className="font-bold text-brand-black">
              ± {m.estimasiHari} hari
            </dd>
          </div>
        )}
        {m.customOrderId && (
          <div>
            <dt className="text-[10px] font-bold uppercase text-brand-black/50">
              ID Custom
            </dt>
            <dd className="font-mono text-[11px] font-bold text-brand-black">
              {m.customOrderId}
            </dd>
          </div>
        )}
      </dl>

      {breakdown.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-brand-orange/20 bg-white">
          <p className="border-b border-brand-orange/10 bg-orange-50/60 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-brand-orange">
            Rincian Estimasi &amp; Pengerjaan
          </p>
          <ul className="divide-y divide-brand-cream/60">
            {breakdown.map((it, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-brand-black">
                    {it.label}
                  </p>
                  {it.sub && (
                    <p className="mt-0.5 truncate text-[11px] text-brand-black/60">
                      {it.sub}
                    </p>
                  )}
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                      (it.hari ?? 0) > 0
                        ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                        : "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200"
                    }`}
                  >
                    <Clock className="h-2.5 w-2.5" />
                    {(it.hari ?? 0) > 0
                      ? `+${it.hari} hari`
                      : "0 hari"}
                  </span>
                </div>
                <span className="whitespace-nowrap text-[12px] font-bold text-brand-black">
                  Rp {formatRp(it.harga)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/custom/riwayat"
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:underline"
      >
        Buka riwayat custom <ExternalLink className="h-3 w-3" />
      </Link>
    </section>
  );
}

function TrackingStepper({
  activeIdx,
  order,
}: {
  activeIdx: number;
  order: Order;
}) {
  return (
    <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-black text-brand-black">
        Status Pengiriman
      </h3>

      <div className="relative">
        <div className="absolute left-4 right-4 top-3.5 h-1 rounded-full bg-brand-cream" />
        <div
          className="absolute left-4 top-3.5 h-1 rounded-full bg-brand-orange transition-all"
          style={{
            width: `calc(${(activeIdx / (TRACKING_STEPS.length - 1)) * 100}% - ${activeIdx === 0 ? 0 : 0}px)`,
            maxWidth: "calc(100% - 2rem)",
          }}
        />

        <div className="relative grid grid-cols-5 gap-1">
          {TRACKING_STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <div
                key={s.key}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                    done
                      ? "border-brand-orange bg-brand-orange text-white"
                      : active
                        ? "border-brand-orange bg-white text-brand-orange ring-4 ring-brand-orange/20"
                        : "border-brand-cream bg-white text-brand-black/30"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span
                  className={`mt-1.5 text-[9px] font-bold leading-tight ${
                    done || active
                      ? "text-brand-black"
                      : "text-brand-black/40"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {order.estimasiTiba && (
        <div className="mt-4 flex items-center justify-between rounded-md bg-brand-cream/40 px-3 py-2 text-xs">
          <span className="font-bold text-brand-black/60">Estimasi Tiba</span>
          <span className="font-black text-brand-orange">
            {formatRangeTanggal(order.estimasiTiba.from, order.estimasiTiba.to)}
          </span>
        </div>
      )}
    </section>
  );
}

function ResiBlock({
  order,
  trackInfo,
}: {
  order: Order;
  trackInfo: { url: string; brand: string } | null;
}) {
  const [copied, setCopied] = useState(false);
  function copyResi() {
    navigator.clipboard.writeText(order.ekspedisi!.resi!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <section className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Truck className="h-4 w-4 text-violet-700" />
        <h3 className="text-sm font-black text-violet-900">Info Pengiriman</h3>
      </div>
      <div className="grid gap-2 text-xs">
        <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
          <span className="font-bold text-brand-black/60">Kurir</span>
          <span className="font-black text-brand-black">
            {order.ekspedisi?.kurir ?? ""}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
          <span className="font-bold text-brand-black/60">No. Resi</span>
          <button
            onClick={copyResi}
            className="flex items-center gap-1.5 font-mono font-black text-brand-black hover:text-brand-orange"
          >
            {order.ekspedisi?.resi}
            <Copy className="h-3 w-3" />
            {copied && (
              <span className="text-[10px] font-bold text-emerald-600">
                Tersalin
              </span>
            )}
          </button>
        </div>
        {trackInfo && (
          <a
            href={trackInfo.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-md bg-violet-700 px-4 py-2.5 text-xs font-black text-white hover:bg-violet-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Lacak di Situs {trackInfo.brand}
          </a>
        )}
      </div>
    </section>
  );
}

function AutoSelesaiCard({ sisaMs }: { sisaMs: number }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
        <div className="flex-1">
          <h3 className="text-sm font-black text-amber-900">
            Auto-Selesai dalam {formatDurasi(sisaMs)}
          </h3>
          <p className="mt-1 text-xs text-amber-900/80">
            Kalau tidak ada konfirmasi atau komplain, pesanan otomatis ditandai
            selesai. Tap &quot;Pesanan Diterima&quot; bila barang sudah sampai.
          </p>
        </div>
      </div>
    </section>
  );
}
function GaransiCard({
  windowOpen,
  sisaMs,
  ada,
  adaKomplainBerhasil,
}: {
  windowOpen: boolean;
  sisaMs: number;
  ada: boolean;
  adaKomplainBerhasil?: boolean;
}) {
  // Timer hanya aktif jika jendela waktu masih ada DAN belum ada komplain yang sukses
  const isAktif = windowOpen && !adaKomplainBerhasil;

  return (
    <section
      className={`rounded-2xl border p-4 ${
        isAktif
          ? "border-emerald-200 bg-emerald-50"
          : "border-brand-cream bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <Info
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
            isAktif ? "text-emerald-700" : "text-brand-black/50"
          }`}
        />
        <div className="flex-1">
          <h3 className="text-sm font-black text-brand-black">
            Garansi 3 x 24 Jam
          </h3>
          {isAktif ? (
            <p className="mt-1 text-xs text-brand-black/70">
              Masa garansi aktif —{" "}
              <strong className="text-emerald-700">
                sisa {formatDurasi(sisaMs)}
              </strong>
              . Bisa ajukan komplain, refund, atau tukar bila barang tidak
              sesuai.
            </p>
          ) : (
            <p className="mt-1 text-xs text-brand-black/70">
              {adaKomplainBerhasil
                ? "Klaim garansi pesanan ini telah berhasil diselesaikan."
                : ada
                ? "Sudah ada komplain di pesanan ini — cek riwayat di bawah."
                : "Masa garansi 3 x 24 jam sudah lewat."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function KomplainTerkaitCard({
  komplains,
  orderId,
}: {
  komplains: ReturnType<ReturnType<typeof useKomplain>["byOrderId"]>;
  orderId: string;
}) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-black text-amber-900">
          <ShieldAlert className="h-4 w-4" />
          Komplain Terkait ({komplains.length})
        </h3>
        <Link
          href={`/tukar?orderId=${encodeURIComponent(orderId)}`}
          className="text-[11px] font-bold text-amber-700 hover:underline"
        >
          Lihat Semua
        </Link>
      </div>
      <ul className="space-y-1.5">
        {komplains.slice(0, 3).map((k) => (
          <li key={k.id}>
            <Link
              href={`/komplain/${k.id}`}
              className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-xs hover:bg-amber-100"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-brand-black">
                  {k.jenisLabel}
                </p>
                <p className="text-[10px] text-brand-black/50">{k.id}</p>
              </div>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-900">
                {KOMPLAIN_STATUS_LABEL[k.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemsCard({ order }: { order: Order }) {
  return (
    <section className="rounded-2xl border border-brand-cream bg-white shadow-sm">
      <div className="border-b border-brand-cream px-4 py-3">
        <h3 className="text-sm font-black text-brand-black">
          Daftar Barang ({order.items.length})
        </h3>
      </div>
      <ul className="divide-y divide-brand-cream">
        {order.items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-brand-cream/40">
              {it.gambar ? (
                <Image
                  src={it.gambar}
                  alt={it.nama}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-brand-black/30">
                  <Package className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-bold text-brand-black">
                {it.nama}
              </p>
              {it.ukuran && (
                <p className="text-[11px] text-brand-black/60">
                  Ukuran {it.ukuran}
                </p>
              )}
              <p className="text-[11px] text-brand-black/60">
                {it.qty} — {formatRp(it.harga)}
              </p>
            </div>
            <p className="flex-shrink-0 text-sm font-black text-brand-orange">
              {formatRp(it.qty * it.harga)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AlamatCard({ order }: { order: Order }) {
  if (order.pengiriman === "ambil") {
    return (
      <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-brand-black">
          <MapPin className="h-4 w-4 text-brand-orange" />
          Ambil di Toko
        </h3>
        <p className="text-xs text-brand-black/70">
          Toko Jogjadoelan, Jalan Imogiri Siluk Jetis, Miri, Sriharjo, Kec. Imogiri, Kab. Bantul, DIY 55782
        </p>
        <p className="mt-1 text-[11px] text-brand-black/50">
          Sebutkan ID pesanan saat ambil di kasir.
        </p>
      </section>
    );
  }
  if (!order.alamat) return null;
  return (
    <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-brand-black">
        <MapPin className="h-4 w-4 text-brand-orange" />
        Alamat Pengiriman
      </h3>
      <p className="text-sm font-bold text-brand-black break-all">
        {order.alamat.nama}
      </p>
      <p className="mt-0.5 text-[11px] text-brand-black/60">
        <Phone className="inline h-3 w-3" /> {order.alamat.noHp}
      </p>
      <p className="mt-1 text-xs text-brand-black/70 break-all">
        {order.alamat.alamat}
{order.alamat.kecamatan ? `, ${order.alamat.kecamatan}` : ""}
, {order.alamat.kota}
{order.alamat.provinsi ? `, ${order.alamat.provinsi}` : ""} {order.alamat.kodePos}
      </p>
      {order.alamat.detail && (
  <p className="mt-2 rounded-md bg-brand-cream/40 px-3 py-2 text-[11px] italic text-brand-black/70">
    {order.alamat.detail}
  </p>
)}
    </section>
  );
}

function RingkasanCard({
  order,
  totalQty,
}: {
  order: Order;
  totalQty: number;
}) {
  return (
    <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-black text-brand-black">
        Ringkasan Biaya
      </h3>
      <dl className="space-y-1.5 text-xs">
        <Row
          label={`Subtotal (${totalQty} brg)`}
          value={formatRp(order.subtotal ?? 0)}
        />
        {order.diskon > 0 && (
          <Row
            label="Diskon"
            value={"- " + formatRp(order.diskon)}
            tone="text-emerald-600"
          />
        )}
        <Row label="Ongkir" value={formatRp(order.ongkir ?? 0)} />
        {(order.biayaPacking ?? 0) > 0 && (
  <Row label="Biaya Packing" value={formatRp(order.biayaPacking ?? 0)} />
)}
      </dl>
      <div className="mt-3 flex items-center justify-between border-t-2 border-dashed border-brand-cream pt-3">
        <span className="text-sm font-black text-brand-black">Total Bayar</span>
        <span className="text-lg font-black text-brand-orange">
          {formatRp(order.total)}
        </span>
      </div>
      {order.transferInfo && (
  <p className="mt-2 text-[11px] text-brand-black/50">
    Pembayaran: {order.pembayaran.metode === "qris" ? "QRIS" : "Bank Transfer"}
    {order.pembayaran.bank ? ` · ${order.pembayaran.bank}` : ""}
  </p>
)}
    </section>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-brand-black/60">{label}</dt>
      <dd className={`font-bold ${tone ?? "text-brand-black"}`}>{value}</dd>
    </div>
  );
}

function TimelineCard({ order }: { order: Order }) {
  const tl = getOrderTimeline(order);
  if (tl.length === 0) return null;
  return (
    <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-black text-brand-black">
        Riwayat Pesanan
      </h3>
      <ol className="space-y-3">
        {tl.map((e, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <CircleDot className="h-3.5 w-3.5 text-brand-orange" />
              {i < tl.length - 1 && (
                <div className="my-1 w-px flex-1 bg-brand-cream" />
              )}
            </div>
            <div className="flex-1 pb-1">
              <p className="text-xs font-bold text-brand-black">{e.label}</p>
              {e.sub && (
                <p className="text-[10px] text-brand-black/50">{e.sub}</p>
              )}
              <p className="text-[10px] text-brand-black/40">
                {formatTanggal(e.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ================================================================ */
/* ACTION CARDS (BANTUAN & ACTION BAR)                              */
/* ================================================================ */

function BantuanCard({ 
  order, 
  handleChat, 
  windowOpen,
  adaKomplainBerhasil,
  adaKomplainAktif
}: { 
  order: Order; 
  handleChat: () => void; 
  windowOpen: boolean; 
  adaKomplainBerhasil: boolean;
  adaKomplainAktif: boolean;
}) {
  const canKomplain = (order.status !== "selesai" || windowOpen) && !adaKomplainBerhasil && !adaKomplainAktif;

  return (
    <div className="mt-4 rounded-xl border border-brand-cream bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-black text-brand-black">
        Butuh Bantuan?
      </h3>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleChat}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-brand-cream bg-white px-4 py-2.5 text-sm font-bold text-brand-black transition hover:border-brand-orange hover:text-brand-orange"
        >
          <MessageCircle className="h-4 w-4" />
          Chat Admin
        </button>

        {/* LOGIKA OPSI 2 DINAMIS JOGJADOELAN */}
        {adaKomplainBerhasil ? (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-green-200 bg-green-50 px-4 py-2.5 text-[11px] font-bold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Garansi Telah Selesai
          </div>
        ) : adaKomplainAktif ? (
          <Link
            href={`/tukar`}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:border-blue-500 hover:text-blue-800"
          >
            <ShieldAlert className="h-4 w-4" />
            Lacak Komplain Aktif
          </Link>
        ) : canKomplain ? (
          <Link
            href={`/komplain/baru?orderId=${order.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-brand-cream bg-white px-4 py-2.5 text-sm font-bold text-brand-black transition hover:border-red-500 hover:text-red-600"
          >
            <AlertCircle className="h-4 w-4" />
            {order.status === "selesai" ? "Klaim Garansi" : "Komplain"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ActionBar({
  order,
  windowOpen,
  ulasanAda,
  onAskCancel,
  onAskDelete,
  onAskTerima,
}: {
  order: Order;
  windowOpen: boolean;
  ulasanAda: boolean;
  onAskCancel: () => void;
  onAskDelete: () => void;
  onAskTerima: () => void;
}) {
  const s = order.status;

  /* PRIORITY 1: Aksi Utama */
  let primary: React.ReactNode = null;
  if (s === "menunggu_pembayaran") {
    primary = (
      <Link href={`/pembayaran/${order.id}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-orange py-3.5 text-sm font-black text-white shadow-md shadow-brand-orange/20 transition-all hover:-translate-y-0.5 hover:bg-orange-600">
        <Upload className="h-4 w-4" /> Bayar Sekarang
      </Link>
    );
  } else if (s === "dikirim" && order.deliveredAt) {
    primary = (
      <button onClick={onAskTerima} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 py-3.5 text-sm font-black text-white shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-600">
        <CheckCircle2 className="h-4 w-4" /> Pesanan Diterima
      </button>
    );
  } else if (s === "selesai" && !ulasanAda) {
    primary = (
      <Link href={`/ulasan/${order.id}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-yellow-400 py-3.5 text-sm font-black text-brand-black shadow-md shadow-yellow-400/20 transition-all hover:-translate-y-0.5 hover:bg-yellow-500">
        <Star className="h-4 w-4 fill-brand-black" /> Beri Ulasan
      </Link>
    );
  } else if (s === "selesai") {
    primary = (
      <Link href="/belanja" className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-orange py-3.5 text-sm font-black text-white shadow-md shadow-brand-orange/20 transition-all hover:-translate-y-0.5 hover:bg-orange-600">
        <Package className="h-4 w-4" /> Beli Lagi
      </Link>
    );
  } else if (s === "kadaluarsa" || s === "dibatalkan") {
    primary = (
      <Link href="/belanja" className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-orange py-3.5 text-sm font-black text-white shadow-md shadow-brand-orange/20 transition-all hover:-translate-y-0.5 hover:bg-orange-600">
        <Repeat className="h-4 w-4" /> Pesan Ulang
      </Link>
    );
  }

  /* PRIORITY 2: Aksi Sekunder */
  const secondary: React.ReactNode[] = [];

  if (s === "selesai") {
    // Tombol Garansi sudah DIHILANGKAN dari sini karena sudah tercover rapi di BantuanCard.
    // Hanya menyisakan fitur Edit Ulasan
    if (ulasanAda) {
      secondary.push(
        <Link key="ulasan-edit" href={`/ulasan/${order.id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-50/50 px-3 py-3 text-[11px] font-bold text-yellow-700 transition-all hover:-translate-y-0.5 hover:bg-yellow-400 hover:text-brand-black">
          <Star className="h-3.5 w-3.5" /> Edit Ulasan
        </Link>
      );
    }
  }

  /* PRIORITY 3: Destructive */
  const dangerous: React.ReactNode[] = [];
  
  if (s === "menunggu_pembayaran") {
    dangerous.push(
      <button key="cancel" onClick={onAskCancel} className="flex items-center justify-center gap-1 rounded-full border border-rose-200 bg-white px-4 py-2 text-[11px] font-bold text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700">
        Batalkan Pesanan
      </button>
    );
  }
  if (s === "dibatalkan" || s === "kadaluarsa" || (s === "selesai" && !windowOpen)) {
    dangerous.push(
      <button key="delete" onClick={onAskDelete} className="flex items-center justify-center gap-1 rounded-full border border-rose-200 bg-white px-4 py-2 text-[11px] font-bold text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700">
        <Trash2 className="h-3.5 w-3.5" /> Hapus Riwayat
      </button>
    );
  }

  return (
    <div className="container mx-auto mt-4 max-w-2xl px-4">
      <div className="space-y-4 rounded-[24px] border border-white/60 bg-white/70 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-xl">
        
        <div className="flex w-full">
          {primary ?? (
            <Link href="/pesanan" className="flex flex-1 items-center justify-center gap-2 rounded-full border border-brand-cream bg-white py-3.5 text-sm font-bold text-brand-black transition-colors hover:border-brand-orange hover:text-brand-orange">
              Kembali ke Daftar Pesanan
            </Link>
          )}
        </div>

        {secondary.length > 0 && (
          <div className="flex w-full gap-2 pt-1">
            {secondary}
          </div>
        )}

        {dangerous.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-brand-cream/50">
            {dangerous}
          </div>
        )}

      </div>
    </div>
  );
}

/* ================================================================ */
/* MODALS                                     */
/* ================================================================ */

function ConfirmModal({
  kind,
  busy,
  onClose,
  onConfirm,
}: {
  kind: "cancel" | "delete";
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const cfg = {
    cancel: {
      icon: AlertTriangle,
      iconTone: "text-rose-600",
      title: "Batalkan Pesanan?",
      body: "Pesanan tidak dapat dilanjutkan setelah dibatalkan. Yakin?",
      btn: "Ya, Batalkan",
      btnTone: "bg-rose-600 hover:bg-rose-700",
    },
    delete: {
      icon: Trash2,
      iconTone: "text-rose-600",
      title: "Hapus dari Riwayat?",
      body: "Pesanan ini akan dihapus dari daftar pesanan Anda (riwayat lokal). Yakin?",
      btn: "Hapus",
      btnTone: "bg-rose-600 hover:bg-rose-700",
    },
  }[kind];
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-cream">
            <Icon className={`h-6 w-6 ${cfg.iconTone}`} />
          </div>
          <h2 className="mt-3 text-base font-black text-brand-black">
            {cfg.title}
          </h2>
          <p className="mt-1 text-xs text-brand-black/70">{cfg.body}</p>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            disabled={busy}
            onClick={onClose}
            className="flex-1 rounded-md border-2 border-brand-cream bg-white py-2.5 text-sm font-bold text-brand-black hover:bg-brand-cream disabled:opacity-50"
          >
            Tidak
          </button>
          <button
            disabled={busy}
            onClick={onConfirm}
            className={`flex-1 rounded-md py-2.5 text-sm font-black text-white shadow disabled:opacity-50 ${cfg.btnTone}`}
          >
           {busy ? "Memproses..." : cfg.btn}
          </button>
        </div>
      </div>
    </div>
  );
}

function UbahBatalModal({
  busy,
  onClose,
  onCancelOrder,
  onUbahOrder,
}: {
  busy: boolean;
  onClose: () => void;
  onCancelOrder: () => void;
  onUbahOrder: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="mt-3 text-base font-black text-brand-black">Ubah atau Batal Pesanan?</h2>
          <p className="mt-1 text-xs text-brand-black/70">
            <strong>Ubah Pesanan</strong> akan mengembalikan stok, menghapus pesanan ini, dan mengarahkan Anda ke halaman belanja.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button disabled={busy} onClick={onUbahOrder} className="w-full rounded-md bg-brand-orange py-2.5 text-sm font-black text-white shadow hover:bg-orange-600 disabled:opacity-50">
            {busy ? "Memproses..." : "Ubah Pesanan"}
          </button>
          <button disabled={busy} onClick={onCancelOrder} className="w-full rounded-md border-2 border-brand-cream bg-white py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
            Batalkan Pesanan Saja
          </button>
          <button disabled={busy} onClick={onClose} className="w-full rounded-md py-2 text-xs font-bold text-brand-black/60 hover:text-brand-black disabled:opacity-50">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}