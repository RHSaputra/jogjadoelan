"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  Package,
  QrCode,
  Upload,
  Wallet,
  X,
  MessageCircle,
  ChevronDown,
  Download,
} from "lucide-react";
import { useAuth, type Alamat } from "@/lib/auth-context";
import {
  useCustomOrder,
  type PaymentMetode,
} from "@/lib/custom-order-context";
import { useNotifikasi } from "@/lib/notifikasi-context";
import { useBankList, useQrisConfig } from "@/lib/use-bank-config";
import { isAlamatValid, getAlamatUtama, formatAlamatRingkas } from "@/lib/alamat-helpers";
import CheckoutAlamatDialog from "@/components/customer/CheckoutAlamatDialog";

export default function PelunasanDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params.id as string;
  const { isAuthenticated, isLoading: authLoading, alamatList } = useAuth();
  const { getOrderById, payPelunasan } = useCustomOrder();
  const { addNotif } = useNotifikasi();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [metode, setMetode] = useState<PaymentMetode>("transfer");
  const REKENING_BANK = useBankList();
  const qrisConfig = useQrisConfig();

  // FIX C-2: bankId state dinamis dengan fallback
  const [bankId, setBankId] = useState<string>("");
  const activeBankId = REKENING_BANK.some((b) => b.id === bankId)
    ? bankId
    : (REKENING_BANK[0]?.id ?? "");

  const [bukti, setBukti] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* Alamat pengiriman: default = alamat utama sampai customer memilih sendiri */
  const [selectedAlamat, setSelectedAlamat] = useState<Alamat | null>(null);
  const selectedAlamatEfektif =
    selectedAlamat ?? (alamatList.length > 0 ? getAlamatUtama(alamatList) : null);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(`/pelunasan/${orderId}`)}`);
    }
  }, [mounted, authLoading, isAuthenticated, router, orderId]);

  if (!mounted || authLoading) {
    return <div className="min-h-screen bg-brand-cream-light" />;
  }

  const order = getOrderById(orderId);

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brand-cream-light px-4 text-center">
        <Package className="h-16 w-16 text-brand-black/30" />
        <h1 className="mt-4 text-xl font-black text-brand-black">
          Order Tidak Ditemukan
        </h1>
        <p className="mt-2 text-sm text-brand-black/60">
          Custom order dengan ID {orderId} tidak ada
        </p>
        <Link
          href="/custom/riwayat"
          className="mt-4 rounded-md bg-brand-orange px-5 py-2.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark"
        >
          Kembali ke Riwayat
        </Link>
      </div>
    );
  }

  if (order.status !== "siap_dilunasi") {
    const msg =
      order.status === "menunggu_verifikasi_pelunasan"
        ? "Bukti pelunasan kamu sedang diverifikasi admin"
        : order.status === "selesai"
          ? "Order ini sudah selesai"
          : "Order ini belum siap dilunasi";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brand-cream-light px-4 text-center">
        <Wallet className="h-16 w-16 text-brand-black/30" />
        <h1 className="mt-4 text-xl font-black text-brand-black">
          Pelunasan Tidak Tersedia
        </h1>
        <p className="mt-2 text-sm text-brand-black/60">{msg}</p>
        <Link
          href="/custom/riwayat"
          className="mt-4 rounded-md bg-brand-orange px-5 py-2.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark"
        >
          Lihat Riwayat
        </Link>
      </div>
    );
  }

  const total = order.estimasi?.total ?? 0;
  const dpPaid = order.dpPayment?.amount ?? 0;
  const sisa = Math.max(0, total - dpPaid);
  const bank = REKENING_BANK.find((b) => b.id === activeBankId) ?? REKENING_BANK[0];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return setErr("Foto maksimal 2MB");
    const r = new FileReader();
    r.onloadend = () => {
      setBukti(r.result as string);
      setErr(null);
    };
    r.readAsDataURL(f);
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    
    if (!bukti) return setErr("Upload bukti pelunasan terlebih dahulu");
    
    if (!selectedAlamatEfektif) {
      setErr("Pilih atau tambah alamat pengiriman dulu.");
      return;
    }
    if (!isAlamatValid(selectedAlamatEfektif)) {
      setErr("Alamat yang dipilih belum lengkap. Lengkapi dulu di Akun → Alamat.");
      return;
    }

    setSubmitting(true);
    try {
        await payPelunasan(orderId, {
        metode,
        bank: metode === "transfer" ? activeBankId : undefined,
        buktiUrl: bukti,
      });
      addNotif({
        title: "Bukti Pelunasan Terkirim",
        body: `Pelunasan Rp ${sisa.toLocaleString("id-ID")} untuk ${orderId} sedang diverifikasi admin`,
        type: "pembayaran",
        link: "/custom/riwayat",
      });
      router.replace("/custom/riwayat");
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Gagal memproses pelunasan");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-black text-brand-black">
            Pelunasan {order.id}
          </h1>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="container mx-auto max-w-2xl space-y-4 px-4 py-5"
      >
        {/* Ringkasan */}
        <section className="rounded-2xl border-2 border-brand-orange bg-orange-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-orange">
            Sisa Pelunasan · {order.id}
          </p>
          <p className="mt-1 text-2xl font-black text-brand-black">
            Rp {sisa.toLocaleString("id-ID")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-brand-orange/30 pt-3 text-xs">
            <div>
              <span className="text-brand-black/60">Total Estimasi:</span>{" "}
              <strong className="text-brand-black">
                Rp {total.toLocaleString("id-ID")}
              </strong>
            </div>
            <div>
              <span className="text-brand-black/60">DP Sudah Dibayar:</span>{" "}
              <strong className="text-brand-black">
                Rp {dpPaid.toLocaleString("id-ID")}
              </strong>
            </div>
          </div>
        </section>

        {/* METODE PEMBAYARAN CUSTOM UI */}
        <section className="rounded-2xl border border-brand-cream bg-white shadow-sm overflow-hidden">
          <div className="border-b border-brand-cream px-4 py-3 bg-white">
            <h2 className="text-sm font-black text-brand-black uppercase tracking-wider">
              Metode Pembayaran
            </h2>
          </div>
          <div className="p-4 bg-white">
            
            {/* TABS TRANSFER vs QRIS */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setMetode("transfer")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all ${
                  metode === "transfer"
                    ? "border-brand-orange text-brand-orange bg-white shadow-sm"
                    : "border-brand-cream text-brand-black/60 bg-white hover:border-brand-orange/50"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-black">Transfer Bank</span>
              </button>
              <button
                type="button"
                onClick={() => setMetode("qris")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all ${
                  metode === "qris"
                    ? "border-brand-orange text-brand-orange bg-white shadow-sm"
                    : "border-brand-cream text-brand-black/60 bg-white hover:border-brand-orange/50"
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span className="text-sm font-black">QRIS</span>
              </button>
            </div>

            {/* KONTEN JIKA TRANSFER BANK DIPILIH */}
            {metode === "transfer" && (
              <>
                {/* GRID 4 BANK LOGOS (LEBAR w-20) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {REKENING_BANK.map((b) => {
                    const isSelected = activeBankId === b.id;
                    const bankName = b.nama.toUpperCase().replace("BANK ", "");
                    let bgClass = "bg-blue-600";
                    if (bankName.includes("MANDIRI")) bgClass = "bg-blue-800";
                    else if (bankName.includes("BNI")) bgClass = "bg-orange-500";
                    else if (bankName.includes("BRI")) bgClass = "bg-blue-700";

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBankId(b.id)}
                        className={`flex w-full flex-col items-center justify-center rounded-xl border-2 p-2 transition-all ${
                          isSelected
                            ? "border-brand-orange bg-white shadow-sm"
                            : "border-brand-cream bg-white hover:border-brand-orange/40"
                        }`}
                      >
                        <div className={`flex h-8 w-full max-w-[80px] items-center justify-center rounded-md ${bgClass}`}>
                          <span className="text-[10px] font-black text-white">{bankName}</span>
                        </div>
                        <span className="mt-2 text-[10px] font-bold text-brand-black">{bankName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* KOTAK DETAIL NOMOR REKENING */}
                {bank && (
                  <div className="rounded-xl bg-[#FAF9F5] border border-brand-cream">
                    <div className="p-4 border-b border-brand-cream/60">
                      <p className="text-[10px] font-black uppercase tracking-wider text-brand-black/40">
                        NO REKENING {bank.nama.toUpperCase().replace("BANK ", "")}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="font-mono text-xl font-black text-brand-black">
                          {bank.norek}
                        </p>
                        <button type="button" onClick={() => handleCopy(bank.norek, "norek")} className="hover:bg-brand-cream p-1 rounded transition">
                          {copied === "norek" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-brand-orange" />}
                        </button>
                      </div>
                      <p className="mt-2 text-[10px] text-brand-black/60">
                        a.n. <span className="font-bold text-brand-black">{bank.atasNama || "JOGJADOELAN"}</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <p className="text-[11px] font-bold text-brand-black/60">Nominal Pelunasan</p>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-black text-brand-orange">
                          Rp {sisa.toLocaleString("id-ID")}
                        </p>
                        <button type="button" onClick={() => handleCopy(String(sisa), "nominal")} className="hover:bg-brand-cream p-1 rounded transition">
                          {copied === "nominal" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-brand-orange" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ACCORDION PANDUAN CARA BAYAR */}
                <div className="mt-4 space-y-2">
                  <FaqRow
                    title={`Cara Bayar via Mobile Banking ${bank?.nama ?? ""}`}
                    steps={[
                      `Buka aplikasi m-banking ${bank?.nama ?? ""}`,
                      "Pilih menu Transfer → Antar Rekening",
                      `Masukkan no. rekening ${bank?.norek ?? ""}`,
                      `Masukkan nominal Rp ${sisa.toLocaleString("id-ID")}`,
                      "Periksa & konfirmasi → masukkan PIN/OTP",
                      "Simpan bukti transfer untuk diunggah di bawah",
                    ]}
                  />
                  <FaqRow
                    title={`Cara Bayar via ATM ${bank?.nama ?? ""}`}
                    steps={[
                      "Masukkan kartu ATM & PIN",
                      "Pilih Transaksi Lain → Transfer → Antar Rekening Bank",
                      `Masukkan no. rekening ${bank?.norek ?? ""}`,
                      `Masukkan nominal Rp ${sisa.toLocaleString("id-ID")}`,
                      "Konfirmasi → simpan struk sebagai bukti",
                    ]}
                  />
                  <FaqRow
                    title="Cara Bayar via Antar Bank"
                    steps={[
                      "Buka aplikasi m-banking bank Anda",
                      "Pilih menu Transfer → Antar Bank",
                      `Pilih bank tujuan: ${bank?.nama ?? ""}`,
                      `Masukkan no. rekening ${bank?.norek ?? ""}`,
                      `Masukkan nominal Rp ${sisa.toLocaleString("id-ID")}`,
                      "Konfirmasi → simpan bukti transfer",
                    ]}
                  />
                </div>
              </>
            )}

            {/* KONTEN JIKA QRIS DIPILIH */}
            {metode === "qris" && (
              <div className="overflow-hidden rounded-xl border border-brand-cream bg-white shadow-sm">
                <div className="bg-brand-orange px-4 py-3 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                    QRIS
                  </p>
                  <p className="mt-0.5 text-lg font-black">JOGJADOELAN YOGYAKARTA</p>
                  <p className="text-[11px] font-semibold opacity-80">
                    NMID: {qrisConfig.merchantName || "Jogjadoelan QRIS"}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3 p-4 bg-[#FAF9F5]">
                  <div className="relative flex h-52 w-52 items-center justify-center rounded-xl border-2 border-brand-cream bg-white p-2">
                    {/* FIX C-3: conditional rendering untuk QRIS */}
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
                          Admin belum upload QR. Sementara pakai metode Transfer Bank.
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Hanya tampilkan tombol download jika URL QRIS ada */}
                  {qrisConfig.url && (
                    <a
                      href={qrisConfig.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md border-2 border-brand-cream bg-white px-4 py-2 text-xs font-bold text-brand-black hover:border-brand-orange"
                    >
                      <Download className="h-3.5 w-3.5" /> Simpan QR Code
                    </a>
                  )}
                  <div className="mt-2 flex w-full items-center justify-between rounded-md bg-white border border-brand-cream px-3 py-2">
                    <span className="text-xs font-bold text-brand-black/60">
                      Nominal Pelunasan
                    </span>
                    <span className="text-base font-black text-brand-orange">
                      Rp {sisa.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-center text-xs text-brand-black/60">
                    Scan QR di atas via aplikasi e-wallet (Gopay, OVO, Dana) atau m-banking Anda.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Upload bukti */}
        <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-brand-black/70">
            Upload Bukti Pelunasan{" "}
            <span className="text-brand-orange">*</span>
          </p>
          {bukti ? (
            <div className="relative mt-3 overflow-hidden rounded-md bg-brand-cream">
              <Image
                src={bukti}
                alt="Bukti"
                width={400}
                height={400}
                className="w-full object-contain"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setBukti("")}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-brand-cream bg-brand-cream-light py-10 text-xs text-brand-black/60 hover:border-brand-orange">
              <Upload className="h-8 w-8" />
              <span className="font-bold">Klik untuk upload screenshot</span>
              <span className="text-[10px]">JPG/PNG maks 2MB</span>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleFile}
              />
            </label>
          )}
        </section>

        {/* Alamat pengiriman */}
        <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-wider text-brand-black/70">
              Kirim ke Alamat <span className="text-brand-orange">*</span>
            </p>
            <div className="flex items-center gap-2">
              <CheckoutAlamatDialog
                selectedId={selectedAlamatEfektif?.id ?? null}
                onPick={(a) => setSelectedAlamat(a)}
              />
              <Link
                href="/akun/alamat"
                className="text-[11px] font-bold text-brand-orange hover:underline"
              >
                Kelola
              </Link>
            </div>
          </div>

          {selectedAlamatEfektif ? (
            <div className="mt-3 rounded-md bg-brand-cream-light p-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedAlamatEfektif.label && (
                  <span className="rounded bg-brand-cream px-2 py-0.5 text-[10px] font-bold text-brand-black">
                    {selectedAlamatEfektif.label}
                  </span>
                )}
                {selectedAlamatEfektif.isUtama && (
                  <span className="rounded bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">
                    UTAMA
                  </span>
                )}
              </div>
              <p className="mt-1.5 font-black text-brand-black">
                {selectedAlamatEfektif.penerima} · {selectedAlamatEfektif.noHp}
              </p>
              <p className="mt-1 text-brand-black/70">
                {formatAlamatRingkas(selectedAlamatEfektif)}
              </p>
              {!isAlamatValid(selectedAlamatEfektif) && (
                <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                  ⚠️ Alamat ini belum lengkap. Lengkapi di Akun → Alamat sebelum
                  lanjut bayar.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-md border-2 border-dashed border-brand-cream bg-brand-cream-light/60 p-4 text-center">
              <p className="text-xs font-semibold text-brand-black/60">
                Belum ada alamat tersimpan. Klik{" "}
                <span className="font-black text-brand-orange">
                  Tambah / Ganti Alamat
                </span>{" "}
                di atas untuk menambah alamat pengiriman.
              </p>
            </div>
          )}
        </section>

        {err && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {err}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || !bukti}
          className="w-full rounded-xl bg-brand-orange py-3.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark disabled:opacity-60"
        >
          {submitting
            ? "Mengirim..."
            : `Konfirmasi Pelunasan Rp ${sisa.toLocaleString("id-ID")}`}
        </button>

        {/* Bantuan → Live Chat dengan auto-attach context custom order */}
        <Link
          href={`/chat?customId=${orderId}`}
          className="mt-1 flex items-center justify-center gap-2 rounded-xl border-2 border-brand-orange bg-white py-3 text-sm font-black text-brand-orange shadow-sm hover:bg-orange-50"
        >
          <MessageCircle className="h-4 w-4" />
          Butuh Bantuan? Chat Admin
        </Link>
        <p className="text-center text-[11px] text-brand-black/50">
          Ringkasan pesanan otomatis dikirim ke admin
        </p>
      </form>
    </div>
  );
}

/* ======================================================================
   FAQ Row helper (accordion)
   ====================================================================== */
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