"use client"
import { logger } from "@/lib/logger";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  Upload,
  ImageIcon,
  Camera,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  MessageCircle,
  ZoomIn,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useNotifikasi } from "@/lib/notifikasi-context";
import {
  getOrder,
  cancelOrder,
  isExpired,
  uploadBuktiBayar,
  type Order,
} from "@/lib/orders-storage";
import { useBankList, useQrisConfig } from "@/lib/use-bank-config";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compressor";

const MAX_FILE_MB = 5;

function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDeadline(iso: string) {
  const d = new Date(iso);
  const jam = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const tgl = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${jam}, ${tgl}`;
}

function PembayaranPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { addNotif } = useNotifikasi();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const expiredTriggeredRef = useRef(false);

  /* Auth + Load order */
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.replace(
        `/login?next=${encodeURIComponent(`/pembayaran/${orderId}`)}`
      );
      return;
    }
    let cancelled = false;
    (async () => {
      const o = await getOrder(user.id, orderId);
      if (cancelled) return;
      setOrder(o);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, user, orderId, router]);

  /* Countdown ticker — update setiap detik */
  useEffect(() => {
    if (!order || order.status !== "menunggu_pembayaran") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [order]);

  /* Reset guard bila order berubah/baru */
  useEffect(() => {
    expiredTriggeredRef.current = false;
  }, [order?.id, order?.status]);

 /* Auto-expire kalau sudah lewat — sekaligus RESTORE STOK */
useEffect(() => {
  if (!order || !user) return;
  if (order.status !== "menunggu_pembayaran") return;
  if (!isExpired(order)) return;
  if (expiredTriggeredRef.current) return;

  const currentOrder = order;
  const currentUser = user;

  let active = true;
  expiredTriggeredRef.current = true;

  async function expireOrder() {
    try {
      await fetch(`/api/order/${currentOrder.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "expire" }),
      });
    } catch (e) {
      logger.error("[auto-expire] expire API failed:", e);
    }

    addNotif({
      title: "Pesanan kadaluarsa",
      body: `Pesanan ${currentOrder.id} dibatalkan otomatis (lewat 1×24 jam).`,
      type: "order",
      link: `/pesanan`,
    });

    if (active) {
      // Reload order data
      const updated = await getOrder(currentUser.id, currentOrder.id);
      if (active && updated) {
        setOrder(updated);
      }
    }
  }

  expireOrder();

  return () => {
    active = false;
  };
}, [now, order, user, addNotif]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light">
        <p className="text-sm text-brand-black/60">Memuat pesanan…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-brand-cream-light">
        <div className="container mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-xl font-black text-brand-black">
            Pesanan tidak ditemukan
          </h1>
          <p className="mt-2 text-sm text-brand-black/60">
            ID <code className="font-mono">{orderId}</code> tidak ada di akun
            Anda.
          </p>
          <Link
            href="/pesanan"
            className="mt-6 inline-block rounded-md bg-brand-orange px-6 py-3 text-sm font-bold text-white"
          >
            Lihat Pesanan Saya
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      {/* Header */}
      <div className="border-b border-brand-cream bg-white">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push("/pesanan")}
            className="rounded-md p-1.5 text-brand-black hover:bg-brand-cream"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-black text-brand-black">
            Pembayaran Pesanan
          </h1>
          <code className="ml-auto rounded bg-brand-cream px-2 py-0.5 font-mono text-[10px] text-brand-black/70">
            {order.id}
          </code>
        </div>
      </div>

      {/* State machine */}
      {order.status === "menunggu_pembayaran" && (
        <PembayaranActiveView
          order={order}
          now={now}
          onUploaded={(updated) => setOrder(updated)}
        />
      )}
      {order.status === "menunggu_konfirmasi" && (
        <PembayaranSuccessView order={order} />
      )}
      {(order.status === "kadaluarsa" || order.status === "dibatalkan") && (
        <PembayaranExpiredView />
      )}
      {(order.status === "diproses" ||
        order.status === "dikirim" ||
        order.status === "selesai") && (
        <PembayaranDoneView order={order} />
      )}
    </div>
  );
}

/* ======================================================================
   1) ACTIVE VIEW — HANYA MEMUNCULKAN SATU METODE YANG DIPILIH SAAT CHECKOUT
   ====================================================================== */
function PembayaranActiveView({
  order,
  now,
  onUploaded,
}: {
  order: Order;
  now: number;
  onUploaded: (o: Order) => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { addNotif } = useNotifikasi();

  const [showCancelModal, setShowCancelModal] = useState(false);

  const remaining = Math.max(0, new Date(order.expiredAt).getTime() - now);
  const hh = Math.floor(remaining / 3600000);
  const mm = Math.floor((remaining % 3600000) / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  const [copied, setCopied] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showExistingPreviewModal, setShowExistingPreviewModal] = useState(false);
  const [showQrisZoom, setShowQrisZoom] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingProofUrl = order.buktiBayar ?? null;
  const hasExistingProof = Boolean(existingProofUrl);
  const existingProofIsPdf = existingProofUrl?.toLowerCase().endsWith(".pdf") ?? false;

  /* Reactive bank list — auto-refresh saat admin ubah */
  const BANKS = useBankList();
  const qrisConfig = useQrisConfig();

  /* Ambil data dari checkout */
  const metodeBayar = order.pembayaran.metode || "transfer";
  
  const selectedBankKey = order.pembayaran.bank || BANKS[0]?.id || "";

const bank = useMemo(
  () => BANKS.find((b) => b.id === selectedBankKey) ?? BANKS[0],
  [selectedBankKey, BANKS]
);

  const copyRek = async () => {
    if (!bank) return;
    try {
      await navigator.clipboard.writeText(bank.norek);
      setCopied(true);
      toast.success("Nomor rekening berhasil disalin");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Salin nomor rekening:", bank.norek);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Berhasil disalin");
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type) && file.type !== "application/pdf") {
      toast.error("Format file tidak didukung", {
        description: "Gunakan file PNG, JPG, atau PDF.",
      });
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`Ukuran file melebihi batas ${MAX_FILE_MB}MB`, {
        description: "Silakan upload file dengan ukuran lebih kecil.",
      });
      return;
    }
    
    if (file.type.startsWith("image/")) {
      try {
        const compressedBase64 = await compressImage(file, 800, 0.7);
        setPreviewUrl(compressedBase64);
      } catch {
        toast.error("Gagal memproses gambar.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(file);
    }
  };

  const handleKirim = async () => {
    if (!user || !previewUrl) return;
    setShowSubmitConfirm(false);
    setSubmitting(true);

    // Konversi data URL ke File untuk upload ke server
    let uploadFile: File;
    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      const ext = previewUrl.startsWith("data:application/pdf") ? "pdf" : "png";
      uploadFile = new File([blob], `bukti.${ext}`, { type: blob.type });
    } catch {
      toast.error("Gagal memproses file bukti");
      setSubmitting(false);
      return;
    }

    try {
      const updated = await uploadBuktiBayar(order.id, uploadFile, {
        pengirimNama: user.username,
        pengirimBank: metodeBayar === "transfer" ? bank?.nama : undefined,
      });
      addNotif({
        title: "Bukti pembayaran terkirim",
        body: `Pesanan ${order.id} sedang menunggu konfirmasi admin.`,
        type: "pembayaran",
        link: `/pembayaran/${order.id}`,
      });
      onUploaded(updated);
      setShowSuccessModal(true);
      setPreviewUrl(null);
    } catch (e) {
      toast.error("Gagal mengunggah bukti pembayaran", {
        description: e instanceof Error ? e.message : "Coba ulangi.",
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-4">
      {/* Title nominal */}
      <div className="rounded-xl border border-brand-cream bg-white p-4 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-black/60">
          Menunggu Pembayaran
        </p>
        <p className="mt-1 text-3xl font-black text-brand-orange">
          {formatRp(order.total)}
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-brand-black/60">
          {metodeBayar === "transfer" ? `Transfer Bank ${bank?.nama ?? ""}` : "QRIS"}
        </p>
      </div>

      {/* Rincian Pembayaran */}
      <div className="rounded-xl border border-brand-cream bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-black/60">
          Rincian Pembayaran
        </p>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-brand-black/70">Subtotal</dt>
            <dd className="font-bold text-brand-black">
              {formatRp(order.subtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-black/70">Ongkir</dt>
            <dd className="font-bold text-brand-black">
              {order.ongkir === 0 ? "Gratis" : formatRp(order.ongkir)}
            </dd>
          </div>
          {(order.diskon ?? 0) > 0 && order.voucher && (
            <div className="flex justify-between text-green-700">
              <dt className="flex items-center gap-1">
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-black">
                  {order.voucher.kode}
                </span>
                Voucher
              </dt>
              <dd className="font-bold">-{formatRp(order.diskon!)}</dd>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-brand-cream pt-2">
            <dt className="font-bold text-brand-black">Total Bayar</dt>
            <dd className="font-black text-brand-orange">
              {formatRp(order.total)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Countdown */}
      <div className="rounded-xl border-2 border-brand-orange/30 bg-brand-orange/5 p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-xs font-bold text-brand-black/70">
          <Clock className="h-3.5 w-3.5" /> Batas Waktu Pembayaran
        </p>
        <div className="mt-2 flex items-center justify-center gap-1 text-3xl font-black tabular-nums text-brand-black md:text-4xl">
          <span className="rounded-md bg-brand-black px-3 py-1.5 text-white">{pad(hh)}</span>
          <span className="text-brand-black/40">:</span>
          <span className="rounded-md bg-brand-black px-3 py-1.5 text-white">{pad(mm)}</span>
          <span className="text-brand-black/40">:</span>
          <span className="rounded-md bg-brand-black px-3 py-1.5 text-white">{pad(ss)}</span>
        </div>
        <p className="mt-2 text-xs text-brand-black/70">
          Lakukan Pembayaran Sebelum Pukul{" "}
          <span className="font-bold text-brand-black">{formatDeadline(order.expiredAt)}</span>!
        </p>
      </div>

      {/* METODE PEMBAYARAN: Hanya memunculkan salah satu card terpilih */}
      <section className="rounded-xl border border-brand-cream bg-white shadow-sm overflow-hidden">
        <div className="border-b border-brand-cream px-4 py-3 bg-white">
          <h2 className="text-sm font-black text-brand-black uppercase tracking-wider">
            Detail Informasi Pembayaran
          </h2>
        </div>
        <div className="p-4 bg-white">
          
          {/* METODE TRANSFER BANK */}
          {metodeBayar === "transfer" && bank && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border-2 border-brand-orange bg-orange-50/40 p-3.5">
                {(() => {
                  const bankName = bank.nama.toUpperCase().replace("BANK ", "");
                  let bgClass = "bg-blue-600";
                  if (bankName.includes("MANDIRI")) bgClass = "bg-blue-800";
                  else if (bankName.includes("BNI")) bgClass = "bg-orange-500";
                  else if (bankName.includes("BRI")) bgClass = "bg-blue-700";

                  return (
                    <div className={`flex h-8 w-20 shrink-0 items-center justify-center rounded-md ${bgClass}`}>
                      <span className="text-[10px] font-black text-white">{bankName}</span>
                    </div>
                  );
                })()}
                <div>
                  <p className="text-sm font-black text-brand-black">Transfer Bank {bank.nama}</p>
                  <p className="text-[11px] font-medium text-brand-black/60">Metode: Kirim via ATM / m-Banking</p>
                </div>
              </div>

              {/* Kotak Rekening Detail */}
              <div className="rounded-xl bg-[#FAF9F5] border border-brand-cream">
                <div className="p-4 border-b border-brand-cream/60">
                  <p className="text-[10px] font-black uppercase tracking-wider text-brand-black/40">
                    NO REKENING TUJUAN
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="font-mono text-xl font-black tracking-wider text-brand-black">
                      {bank.norek}
                    </p>
                    <button onClick={copyRek} className="hover:bg-brand-cream p-1 rounded transition">
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-brand-orange" />}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-brand-black/60">
                    Atas Nama: <span className="font-bold text-brand-black">{bank.atasNama || "JOGJADOELAN"}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between p-4">
                  <p className="text-[11px] font-bold text-brand-black/60">Nominal Transfer</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-black text-brand-orange">{formatRp(order.total)}</p>
                    <button onClick={() => handleCopyText(order.total.toString())} className="hover:bg-brand-cream p-1 rounded transition">
                      <Copy className="h-4 w-4 text-brand-orange" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ACCORDION CARA BAYAR */}
              <div className="space-y-2 pt-2">
                <FaqRow
                  title={`Cara Bayar via Mobile Banking ${bank.nama}`}
                  steps={[
                    `Buka aplikasi m-banking ${bank.nama}`,
                    "Pilih menu Transfer → Antar Rekening",
                    `Masukkan no. rekening ${bank.norek}`,
                    `Masukkan nominal ${formatRp(order.total)}`,
                    "Periksa & konfirmasi → masukkan PIN/OTP",
                    "Simpan bukti transfer untuk diunggah di bawah",
                  ]}
                />
                <FaqRow
                  title={`Cara Bayar via ATM ${bank.nama}`}
                  steps={[
                    "Masukkan kartu ATM & PIN",
                    "Pilih Transaksi Lain → Transfer → Antar Rekening Bank",
                    `Masukkan no. rekening ${bank.norek}`,
                    `Masukkan nominal ${formatRp(order.total)}`,
                    "Konfirmasi → simpan struk sebagai bukti",
                  ]}
                />
              </div>
            </div>
          )}

          {/* METODE QRIS */}
          {metodeBayar === "qris" && (
            <div className="overflow-hidden rounded-xl border border-brand-cream bg-white shadow-sm">
                <div className="bg-brand-orange px-4 py-3 text-white">
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">QRIS</p>
                <p className="mt-0.5 text-lg font-black">{qrisConfig.merchantName || "Jogjadoelan"}</p>
                <p className="text-[11px] font-semibold opacity-80">QRIS {qrisConfig.merchantName || "Jogjadoelan QRIS"}</p>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 bg-[#FAF9F5]">
                <div
                  className="relative flex h-52 w-52 items-center justify-center rounded-xl border-2 border-brand-cream bg-white cursor-zoom-in hover:border-brand-orange transition-colors"
                  onClick={() => qrisConfig.url && setShowQrisZoom(true)}
                >
                  {qrisConfig.url ? (
                    <Image
                      src={qrisConfig.url}
                      alt="QRIS Code"
                      width={180}
                      height={180}
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-3 text-center">
                      <p className="text-[11px] font-black text-brand-black/60">
                        QRIS belum tersedia
                      </p>
                      <p className="text-[10px] text-brand-black/40">
                        Admin belum upload QR. Sementara pakai Transfer Bank.
                      </p>
                    </div>
                  )}
                </div>
                {qrisConfig.url && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowQrisZoom(true)}
                      className="flex items-center gap-2 rounded-md border-2 border-brand-cream bg-white px-4 py-2 text-xs font-bold text-brand-black hover:border-brand-orange"
                    >
                      <ZoomIn className="h-3.5 w-3.5" /> Perbesar
                    </button>
                    <a
                      href={qrisConfig.url}
                      download={`qris-${qrisConfig.merchantName || 'jogjadoelan'}.webp`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md border-2 border-brand-cream bg-white px-4 py-2 text-xs font-bold text-brand-black hover:border-brand-orange"
                    >
                      <Download className="h-3.5 w-3.5" /> Simpan
                    </a>
                  </div>
                )}
                <p className="text-center text-xs text-brand-black/60">
                  Scan QR di atas via aplikasi e-wallet (Gopay, OVO, Dana) or m-banking Anda.
                </p>
              </div>

              {/* Zoom QRIS Modal */}
              <Dialog open={showQrisZoom} onOpenChange={setShowQrisZoom}>
                <DialogContent className="max-w-md bg-white p-2">
                  <DialogTitle className="sr-only">
                    Zoom QRIS {qrisConfig.merchantName}
                  </DialogTitle>
                  <div className="flex flex-col items-center gap-4 p-4">
                    <p className="text-sm font-black text-brand-black">{qrisConfig.merchantName || 'Jogjadoelan QRIS'}</p>
                    <div className="relative h-80 w-80 overflow-hidden rounded-xl border-2 border-brand-cream">
                      <Image
                        src={qrisConfig.url || ''}
                        alt="QRIS Code"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={qrisConfig.url}
                        download={`qris-${qrisConfig.merchantName || 'jogjadoelan'}.webp`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-full bg-brand-orange px-6 py-2.5 text-sm font-black text-white"
                      >
                        <Download className="h-4 w-4" /> Simpan Gambar
                      </a>
                      <DialogClose className="flex items-center gap-2 rounded-full border-2 border-brand-cream bg-white px-6 py-2.5 text-sm font-black text-brand-black">
                        Tutup
                      </DialogClose>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

        </div>
      </section>

      {/* === UPLOAD BUKTI CARD === */}
      <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black text-brand-black">Unggah Bukti Pembayaran</h3>
        <p className="mt-1 text-xs text-brand-black/60">Format: PNG / JPG / PDF · Maks {MAX_FILE_MB}MB</p>

        {hasExistingProof && !previewUrl && (
          <div className="mt-3 rounded-2xl border border-brand-cream bg-brand-cream-light p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-brand-black/60">
                  Bukti Pembayaran Terunggah
                </p>
                <p className="mt-1 text-sm text-brand-black/70">
                  Bukti yang sudah Anda unggah bisa ditinjau ulang sebelum mengirim bukti baru.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExistingPreviewModal(true)}
                className="rounded-full bg-brand-orange/10 px-3 py-2 text-xs font-black text-brand-orange hover:bg-brand-orange/20"
              >
                Lihat Bukti
              </button>
            </div>
            <div className="mt-3 rounded-xl border border-brand-cream bg-white p-3 text-[11px] text-brand-black/70">
              {existingProofIsPdf ? "File PDF" : "Gambar"} bukti pembayaran telah tersedia.
            </div>
          </div>
        )}

        {previewUrl ? (
          <div className="mt-3 relative h-56 w-full overflow-hidden rounded-md border border-brand-cream bg-brand-cream-light">
            {previewUrl.startsWith("data:application/pdf") ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-brand-black/60">
                <ImageIcon className="h-10 w-10" />
                <span className="text-xs font-bold">File PDF terpilih</span>
              </div>
            ) : (
              <Image src={previewUrl} alt="Bukti" fill className="object-contain" />
            )}
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-brand-orange bg-brand-orange/5 py-6 text-sm font-bold text-brand-orange hover:bg-brand-orange/10"
          >
            <Upload className="h-4 w-4" /> Pilih File Bukti
          </button>
        )}
      </div>

      {/* === BANTUAN CARD === */}
      <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-black text-brand-black">Butuh Bantuan?</h3>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/chat?orderId=${order.id}`}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-brand-cream bg-white py-2.5 text-[11px] font-black text-brand-black transition hover:border-brand-orange hover:text-brand-orange"
          >
            <MessageCircle className="h-4 w-4" /> Chat Admin
          </Link>
          <Link
            href={`/komplain/baru?orderId=${order.id}`}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-brand-cream bg-white py-2.5 text-[11px] font-black text-brand-black transition hover:border-red-500 hover:text-red-600"
          >
            <AlertCircle className="h-4 w-4" /> Komplain
          </Link>
        </div>
      </section>

      {/* === ACTIONS CARD === */}
      <section className="rounded-2xl border border-brand-cream bg-white p-4 text-center shadow-sm">
        <button
          onClick={() => setShowSubmitConfirm(true)}
          disabled={submitting || !previewUrl}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-orange py-3.5 text-sm font-black text-white shadow transition hover:bg-brand-orange-dark disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4" />
          {submitting ? "Mengirim…" : `Konfirmasi Pembayaran ${formatRp(order.total)}`}
        </button>

        <button
          onClick={() => setShowCancelModal(true)}
          className="mt-3 inline-block rounded-full border border-red-200 px-6 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50"
        >
          Batalkan Pembayaran
        </button>
      </section>

      {/* === MODAL CONFIRM CANCEL === */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-black text-brand-black">Batalkan Pembayaran?</h3>
            <p className="mt-2 text-sm text-brand-black/70">Apakah Anda yakin ingin membatalkan pesanan ini?</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-xl border-2 border-brand-cream bg-white py-2.5 text-sm font-bold text-brand-black"
              >
                Kembali
              </button>
              <button
                onClick={async () => {
                  if (!user) return;
                  const canceled = await cancelOrder(user.id, order.id);
                  if (canceled) {
                    toast.success("Pesanan berhasil dibatalkan");
                    router.push(`/pesanan/${order.id}`);
                  }
                }}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow hover:bg-red-700"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-black text-brand-black">Konfirmasi Pengiriman Bukti</h3>
            <p className="mt-2 text-sm text-brand-black/70">
              Apakah Anda yakin data bukti pembayaran sudah benar? Setelah dikirim, bukti akan masuk ke admin untuk diverifikasi.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 rounded-xl border-2 border-brand-cream bg-white py-2.5 text-sm font-bold text-brand-black"
              >
                Batal
              </button>
              <button
                onClick={handleKirim}
                disabled={submitting}
                className="flex-1 rounded-xl bg-brand-orange py-2.5 text-sm font-bold text-white shadow hover:bg-brand-orange-dark disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Mengirim…" : "Ya, Kirim Bukti"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-black text-brand-black">Bukti Berhasil Dikirim</h3>
            </div>
            <p className="mt-2 text-sm text-brand-black/70">
              Bukti pembayaran telah berhasil dikirim. Silakan tunggu konfirmasi admin.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="mt-5 w-full rounded-xl bg-brand-orange py-2.5 text-sm font-bold text-white shadow hover:bg-brand-orange-dark"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {showExistingPreviewModal && existingProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-brand-black">Preview Bukti Pembayaran</h3>
                <p className="mt-1 text-sm text-brand-black/70">Tinjau bukti yang sudah Anda unggah sebelumnya.</p>
              </div>
              <button
                onClick={() => setShowExistingPreviewModal(false)}
                className="rounded-full bg-brand-cream p-2 text-brand-black/70 hover:bg-brand-cream/90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              {existingProofIsPdf ? (
                <div className="space-y-4 rounded-xl border border-brand-cream bg-brand-cream-light p-4">
                  <p className="text-sm font-black text-brand-black">Bukti berupa PDF</p>
                  <p className="text-sm text-brand-black/70">Silakan unduh atau buka di tab baru jika ingin melihat detail.</p>
                  <a
                    href={existingProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-brand-orange px-4 py-2 text-sm font-black text-white shadow hover:bg-brand-orange-dark"
                  >
                    Buka Bukti PDF
                  </a>
                </div>
              ) : (
                <div className="relative h-96 overflow-hidden rounded-2xl border border-brand-cream bg-brand-cream-light">
                  <Image src={existingProofUrl} alt="Bukti Pembayaran" fill className="object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal upload trigger */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setShowUploadModal(false)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-center text-sm font-black text-brand-black">Pilih Tindakan</h4>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-brand-cream p-4 text-center hover:border-brand-orange">
                <Camera className="h-8 w-8 text-brand-orange" />
                <span className="text-xs font-bold text-brand-black">Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => { onPickFile(e.target.files?.[0] ?? null); setShowUploadModal(false); }}
                />
              </label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-brand-cream p-4 text-center hover:border-brand-orange">
                <Upload className="h-8 w-8 text-brand-orange" />
                <span className="text-xs font-bold text-brand-black">Galeri</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => { onPickFile(e.target.files?.[0] ?? null); setShowUploadModal(false); }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FaqRow({ title, steps }: { title: string; steps: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-brand-cream bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-gray-50/50"
      >
        <span className="text-xs font-black text-brand-black">{title}</span>
        <ChevronDown className={`h-4 w-4 text-brand-black/40 transition-transform duration-200 ${open ? "rotate-180 text-brand-orange" : ""}`} />
      </button>
      {open && (
        <ol className="list-decimal space-y-1.5 border-t border-brand-cream/60 bg-gray-50/30 px-8 py-3 text-[11px] font-medium leading-relaxed text-brand-black/70">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PembayaranSuccessView({ order }: { order: Order }) {
  const existingProofUrl = order.buktiBayar ?? null;
  const existingProofIsPdf = existingProofUrl?.toLowerCase().endsWith(".pdf") ?? false;

  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <Clock className="mx-auto h-7 w-7 text-amber-600" />
        <h2 className="mt-3 text-lg font-black text-brand-black">Menunggu Konfirmasi Admin</h2>
        <p className="mt-2 text-sm text-brand-black/70">Bukti pembayaran telah diterima. Tunggu verifikasi admin 1×24 jam.</p>
      </div>
      {existingProofUrl && (
        <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <p className="text-sm font-black text-brand-black">Preview Bukti Pembayaran</p>
          {existingProofIsPdf ? (
            <div className="mt-3 rounded-xl border border-brand-cream bg-brand-cream-light p-4 text-sm text-brand-black/70">
              Bukti berupa file PDF.
              <a
                href={existingProofUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-1 inline-flex rounded-full bg-brand-orange px-3 py-1 text-xs font-black text-white"
              >
                Buka Bukti
              </a>
            </div>
          ) : (
            <div className="mt-3 relative h-72 overflow-hidden rounded-2xl border border-brand-cream bg-brand-cream-light">
              <Image src={existingProofUrl} alt="Bukti Pembayaran" fill className="object-contain" />
            </div>
          )}
        </div>
      )}
      <Link href="/pesanan" className="block rounded-md bg-brand-orange py-3 text-center text-sm font-bold text-white">
        Lihat Pesanan Saya
      </Link>
    </div>
  );
}

function PembayaranExpiredView() {
  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <X className="mx-auto h-7 w-7 text-red-600" />
        <h2 className="mt-3 text-lg font-black text-brand-black font-bebas tracking-wide">Pesanan Kadaluarsa / Batal</h2>
      </div>
      <Link href="/produk" className="block rounded-md bg-brand-orange py-3 text-center text-sm font-bold text-white">
        Belanja Lagi
      </Link>
    </div>
  );
}

export default PembayaranPage;

function PembayaranDoneView({ order }: { order: Order }) {
  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-7 w-7 text-green-600" />
        <h2 className="mt-3 text-lg font-black text-brand-black">Pembayaran Dikonfirmasi</h2>
      </div>
      <Link href={`/pesanan/${order.id}`} className="block rounded-md bg-brand-orange py-3 text-center text-sm font-bold text-white">
        Lihat Detail Pesanan
      </Link>
    </div>
  );
}

