"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertCircle, Clock, Hourglass, MessageCircle } from "lucide-react";
import { useCustomOrder } from "@/lib/custom-order-context";
import { useNotifikasi } from "@/lib/notifikasi-context";
import { useAuth } from "@/lib/auth-context";

const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID").format(n);

/** Hitung waktu sejak order disubmit (untuk badge "menunggu N menit") */
function formatTunggu(ms: number): string {
  const menit = Math.floor(ms / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}

export default function EstimasiPage() {
  // Guard tambahan: halaman ini hanya boleh menampilkan estimasi breakdown
  // jika admin sudah menetapkan estimasi (status bukan menunggu estimasi)
  // dan data estimasi valid.
  const router = useRouter();
  const { currentOrder, orders, approveOrder, rejectOrder, setCurrentOrderId, ordersLoading } = useCustomOrder();
  const { addNotif } = useNotifikasi();
  const { isLoading: authLoading } = useAuth();

  const [showModalTolak, setShowModalTolak] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  /* Heartbeat utk update label "menunggu N menit" tiap 30 detik */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Fallback: kalau currentOrder null (mis. dari notifikasi tanpa setCurrentOrderId),
  // lookup dari orders array berdasarkan currentOrderId di context.
  // Resolve order from query param only when currentOrder is not available
  const resolvedOrder =
    currentOrder ??
    (() => {
      if (typeof window === "undefined") return null;
      const q = new URLSearchParams(window.location.search);
      const idFromQuery = q.get("id");
      if (idFromQuery) {
        return orders.find((o) => o.id === idFromQuery) ?? null;
      }
      return null;
    })();

  // Sync currentOrderId via effect (not during render)
  useEffect(() => {
    if (currentOrder) return;
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const idFromQuery = q.get("id");
    if (idFromQuery && orders.some((o) => o.id === idFromQuery)) {
      setCurrentOrderId(idFromQuery);
    }
  }, [orders, currentOrder, setCurrentOrderId]);

  if (ordersLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light">
        <p className="text-sm font-bold text-gray-500">Memuat data estimasi...</p>
      </div>
    );
  }

  if (!resolvedOrder) {
    return (
      <div className="min-h-screen bg-brand-cream-light px-4 py-12 text-center">
        <p className="text-brand-black/60">Belum ada pesanan custom.</p>
        <Link href="/custom" className="mt-3 inline-block rounded-md bg-brand-orange px-5 py-2 text-sm font-bold text-white">
          Buat pesanan custom
        </Link>
      </div>
    );
  }

  const est = resolvedOrder.estimasi;

  /* ==== MODE A: Admin belum set estimasi → tampilkan panel tunggu ==== */
  const adminBelumSet = resolvedOrder.status === "menunggu_estimasi" || !resolvedOrder.quotedByAdminAt;
  const estValid =
    Boolean(
      est?.items &&
        est.items.length > 0 &&
        typeof est?.total === "number" &&
        (est?.total ?? 0) > 0,
    );

  if (!estValid || adminBelumSet) {
    const tunggu = formatTunggu(now - resolvedOrder.createdAt);
  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      {/*
        Karena `estValid` sudah memastikan `estimasi` terdefinisi, bagian ini
        aman untuk memakai `est` secara non-null.
      */}
        <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
          <div className="container mx-auto flex items-center gap-3 px-4 py-3">
            <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="flex-1 text-lg font-black text-brand-black">Estimasi Harga</h1>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl px-4 py-5">
          <p className="mb-3 text-xs text-brand-black/60">
              ID Pesanan <span className="font-bold text-brand-black">{resolvedOrder.id}</span>
          </p>

          <div className="overflow-hidden rounded-2xl border-2 border-brand-cream bg-white shadow-sm">
            <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Hourglass className="h-7 w-7 animate-pulse" />
              </div>
              <h2 className="text-lg font-black text-brand-black">
                Menunggu Admin Set Harga & Estimasi
              </h2>
              <p className="max-w-md text-sm text-brand-black/70">
                Pesanan custom Anda sudah masuk ke admin. Admin akan menentukan
                <strong className="text-brand-black"> harga </strong> dan
                <strong className="text-brand-black"> estimasi pengerjaan </strong>
                sesuai spesifikasi Anda. Biasanya 1–2 jam pada jam kerja.
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200">
                <Clock className="h-3 w-3" /> Dikirim {tunggu}
              </span>
            </div>
          </div>

          <div className="mt-4 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Halaman ini akan otomatis menampilkan rincian harga begitu admin
              selesai membuat estimasi. Anda boleh tutup halaman ini —
              notifikasi akan dikirim ke akun Anda.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              href="/chat"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-brand-cream bg-white py-3.5 text-sm font-black text-brand-black hover:bg-gray-50"
            >
              <MessageCircle className="h-4 w-4" /> Tanya Admin
            </Link>
            <Link
              href="/custom/riwayat"
              className="flex items-center justify-center rounded-xl bg-brand-orange py-3.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark"
            >
              Lihat Riwayat
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sudahSetuju =
            resolvedOrder.status !== "menunggu_persetujuan" && resolvedOrder.status !== "ditolak";
  const sudahDitolak = resolvedOrder.status === "ditolak";

  const handleSetuju = async () => {
    await approveOrder();
    addNotif({
      title: "Estimasi Disetujui",
      body: `Silakan lanjut ke pembayaran DP / Lunas untuk ${resolvedOrder.id}`,
      type: "pembayaran",
      link: "/custom/dp",
    });
    router.push("/custom/dp");
  };

   const handleTolak = () => {
    setShowModalTolak(true);
  };

  const konfirmasiTolak = () => {
    setShowModalTolak(false);
    rejectOrder();
    addNotif({
      title: "Estimasi Ditolak",
      body: `Order ${resolvedOrder.id} ditolak. Silakan negosiasi via chat dengan admin.`,
      type: "info",
      link: "/chat",
    });
    router.push("/chat");
  };

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-black text-brand-black">Estimasi Harga</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-5">
        <p className="mb-3 text-xs text-brand-black/60">
          Lihat kembali detail pesanan Anda · ID{" "}
          <span className="font-bold text-brand-black">{resolvedOrder.id}</span>
        </p>

                <div className="overflow-hidden rounded-2xl border-2 border-brand-cream bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_120px] border-b border-brand-cream bg-brand-cream-light px-5 py-3 text-xs font-black uppercase tracking-wider text-brand-black/60">
            <span>Item</span>
            <span className="text-right">Subtotal</span>
          </div>
          <div className="divide-y divide-brand-cream/60">
            {(est?.items ?? []).map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px] px-5 py-4">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-bold text-brand-black">{item.label}</p>
                  <p className="mt-0.5 text-xs text-brand-black/60">{item.sub}</p>
                  <span
                    className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                      item.hari > 0
                        ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                        : "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {item.hari > 0
                      ? `+${item.hari} hari pengerjaan`
                      : "Tidak menambah waktu"}
                  </span>
                </div>
                <span className="text-right text-sm font-bold text-brand-black">
                  Rp {formatRupiah(item.harga)}
                </span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_120px] bg-orange-50 px-5 py-4">
              <div>
                <p className="text-sm font-black text-brand-black">
                  Total Estimasi
                </p>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-black text-amber-800 ring-1 ring-amber-200">
                  <Clock className="h-3 w-3" />
                  ± {Math.max(5, Math.min(21, ((est?.items ?? []).reduce((s, x) => s + (x.hari ?? 0), 0))))} hari pengerjaan
                </p>
              </div>
              <span className="text-right text-base font-black text-brand-orange">
                Rp {formatRupiah(est?.total ?? 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Estimasi belum termasuk ongkos kirim. Jika keberatan dengan harga, silakan <Link href="/chat" className="font-bold underline">hubungi admin via chat</Link> sebelum klik Tolak.</p>
        </div>

        {sudahDitolak ? (
          <div className="mt-6 rounded-xl bg-red-50 px-4 py-4 text-center text-sm font-bold text-red-700">
            Estimasi ditolak. Hubungi admin untuk negosiasi ulang.
          </div>
        ) : sudahSetuju ? (
          <button onClick={() => router.push("/custom/dp")} className="mt-6 w-full rounded-xl bg-brand-orange py-3.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark">
            Lanjut ke Pembayaran
          </button>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={handleTolak} className="rounded-xl border-2 border-brand-cream bg-white py-3.5 text-sm font-black text-brand-black hover:bg-gray-50">
              Tolak
            </button>
            <button onClick={handleSetuju} className="rounded-xl bg-brand-orange py-3.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark">
              Setujui & Bayar
            </button>
          </div>
        )}
      </div>

      {showModalTolak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-black text-brand-black">Tolak Estimasi?</h3>
            <p className="mt-2 text-sm text-brand-black/70">
              Yakin tolak estimasi harga ini? Anda bisa hubungi admin via chat untuk negosiasi.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowModalTolak(false)}
                className="flex-1 rounded-xl border-2 border-brand-cream bg-white py-2.5 text-sm font-bold text-brand-black hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={konfirmasiTolak}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow hover:bg-red-700"
              >
                Ya, Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}