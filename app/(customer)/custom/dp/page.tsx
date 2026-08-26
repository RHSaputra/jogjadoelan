"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  MessageCircle,
  QrCode,
  Tag,
  Upload,
  Wallet,
  X,
  AlertCircle,
  Clock,
  ChevronDown,
  Download,
} from "lucide-react";
import { useAuth, type Alamat } from "@/lib/auth-context";
import {
  useCustomOrder,
  type PaymentMetode,
  type PaymentType,
} from "@/lib/custom-order-context";
import { useNotifikasi } from "@/lib/notifikasi-context";
import { APP_CONFIG, type VoucherItem } from "@/lib/constants";
import { useBankList, useQrisConfig } from "@/lib/use-bank-config";
import {
  isAlamatValid,
  getAlamatUtama,
  formatAlamatRingkas,
} from "@/lib/alamat-helpers";
import CheckoutAlamatDialog from "@/components/customer/CheckoutAlamatDialog";
import { compressImage } from "@/lib/image-compressor";
// QRIS_PLACEHOLDER dihapus — QRIS HARUS di-upload admin via /admin/bank.
// Kalau admin belum upload, UI tampilkan empty-state (lihat blok QRIS di bawah).
const DP_MIN = 100_000;

/* === FUNGSI BANTUAN WAKTU === */
function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDeadline(ms: number) {
  const d = new Date(ms);
  const jam = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const tgl = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${jam}, ${tgl}`;
}

/* === VALIDATOR VOUCHER PINTAR === */
function checkVoucherStatusCustom(v: VoucherItem, userProvinsi: string, subtotal: number, now: number) {
  if (v.digunakan) return { valid: false, pesan: "Sudah dipakai" };
  if (v.expired && new Date(v.expired).getTime() < now) return { valid: false, pesan: "Kadaluarsa" };
  
  if (v.berlaku === "ready") return { valid: false, pesan: "Khusus Produk Ready Stock" };
  const txt = `${v.kode ?? ""} ${v.judul ?? ""}`.toLowerCase();
  if (v.berlaku !== "custom" && v.berlaku !== "all") {
    if (txt.includes("ready") || txt.includes("bundle")) return { valid: false, pesan: "Khusus Produk Ready Stock" };
  }
  
  const minBel = Number(v.minBelanja ?? 0) || 0;
  if (subtotal < minBel) return { valid: false, pesan: `Kurang Rp ${(minBel - subtotal).toLocaleString("id-ID")}` };

  let daftarSyarat = v.syaratProvinsi || [];
  if (v.kode === "JOGJAFREE" && daftarSyarat.length === 0) {
    daftarSyarat = ["YOGYAKARTA", "DIY", "DI YOGYAKARTA", "DAERAH ISTIMEWA YOGYAKARTA", "JOGJA"];
  }

  if (daftarSyarat.length > 0) {
    const provInput = (userProvinsi || "").trim().toUpperCase().replace(/\s+/g, "");
    const match = daftarSyarat.some(p => {
        const target = String(p).toUpperCase().replace(/\s+/g, "");
        if (!provInput || !target) return false;
        return provInput.includes(target) || target.includes(provInput);
    });
    
    if (!match) return { valid: false, pesan: "Bukan area pengiriman promo" };
  }
  
  return { valid: true, pesan: "Bisa digunakan" };
}

function computeDiskonCustom(v: VoucherItem | null, sub: number): number {
  if (!v) return 0;
  
  const isOngkir = v.kode === "JOGJAFREE" || v.judul.toLowerCase().includes("ongkir");
  let nominal = Number(v.nominal ?? 0) || 0;
  if (isOngkir && nominal === 0) nominal = APP_CONFIG?.ONGKIR_EKSPEDISI || 20000;

  const persen = Number(v.diskonPersen ?? 0) || 0;
  let raw = 0;
  if (persen > 0) {
    raw = Math.floor((sub * persen) / 100);
    const max = Number(v.maxDiskon ?? 0) || 0;
    if (max > 0) raw = Math.min(raw, max);
  } else {
    raw = nominal;
  }
  return Math.max(0, Math.min(raw, sub));
}

export default function CustomDpPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    alamatList,
  } = useAuth();
  const { currentOrder, payDp, payLunas, setCurrentOrderId, orders, ordersLoading } = useCustomOrder();
  const { addNotif } = useNotifikasi();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [paymentType, setPaymentType] = useState<PaymentType>("dp");
  const [dpAmount, setDpAmount] = useState<number>(DP_MIN);
  const [metode, setMetode] = useState<PaymentMetode>("transfer");
  const REKENING_BANK = useBankList();
  const qrisConfig = useQrisConfig();
    // Default bank = bank pertama dari admin (bukan hardcode "bca").
  // Sinkron otomatis saat REKENING_BANK ter-load / berubah dari admin.
  const [bankId, setBankId] = useState<string>("");
  const activeBankId = REKENING_BANK.some((b) => b.id === bankId)
    ? bankId
    : (REKENING_BANK[0]?.id ?? "");
  const [bukti, setBukti] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /* === COUNTDOWN STATE === */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Waktu expired disimulasikan 24 jam ke depan 
  const [expiredAt] = useState(() => Date.now() + 24 * 60 * 60 * 1000);
  
  const remaining = Math.max(0, expiredAt - now);
  const hh = Math.floor(remaining / 3600000);
  const mm = Math.floor((remaining % 3600000) / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  /* === VOUCHER === */
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [pickedVoucher, setPickedVoucher] = useState<VoucherItem | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/akun/vouchers", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        const raw = (j?.data ?? []) as Array<{
          voucherId: string; kode: string; judul: string;
          nilai: number; jenis: string; minOrder: number | null;
          maxDiscount: number | null; expiredAt: string | null;
        }>;
        setVouchers(raw.map((u) => ({
          id: u.voucherId,
          kode: u.kode,
          judul: u.judul,
          nominal: u.jenis === "nominal" ? u.nilai : 0,
          diskonPersen: u.jenis === "persen" ? u.nilai : undefined,
          maxDiskon: u.maxDiscount ?? undefined,
          minBelanja: u.minOrder ?? 0,
          expired: u.expiredAt ?? new Date(Date.now() + 365 * 86400000).toISOString(),
          digunakan: false,
        })));
      })
      .catch(() => setVouchers([]));
  }, [user]);

  /* Alamat pengiriman: default = alamat utama sampai customer memilih sendiri */
  const [selectedAlamat, setSelectedAlamat] = useState<Alamat | null>(null);
  const selectedAlamatEfektif =
    selectedAlamat ?? (alamatList.length > 0 ? getAlamatUtama(alamatList) : null);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/custom/dp")}`);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

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

  const total = currentOrder?.estimasi?.total ?? 0;

  /* --- BIAYA PACKING dari Settings API --- */
  const [biayaPackingDefault, setBiayaPackingDefault] = useState<number>(10000);
  useEffect(() => {
    fetch("/api/settings?keys=biayaPacking")
      .then(r => r.json())
      .then(j => {
        const val = Number(j?.biayaPacking) || 10000;
        if (val > 0) setBiayaPackingDefault(val);
      })
      .catch(() => {});
  }, []);

  const biayaPacking = (currentOrder?.estimasi?.items?.length ?? 0) > 0 ? biayaPackingDefault : 0;
  const totalWithPacking = total + biayaPacking;

  /* === ONGKIR (dari Biteship API) === */
  // Berat helm standar = 1000g (1 kg) per item.
  // WAJIB identik dengan checkout Ready Stock agar ongkir konsisten
  // untuk alamat/kurir/qty yang sama.
  const HELM_WEIGHT_G = 1000;
  const [ongkir, setOngkir] = useState<number | null>(null);
  const [ongkirLoading, setOngkirLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (!selectedAlamatEfektif?.kodePos) { setOngkir(null); return; }
      // Jumlah helm custom = jumlah item dalam estimasi (tiap item = 1 helm)
      const itemCount = currentOrder?.estimasi?.items?.length ?? 1;
      // Kirim sebagai items array agar payload identik dengan Ready Stock.
      const body = JSON.stringify({
        destinationPostalCode: selectedAlamatEfektif.kodePos,
        items: [{ weight: HELM_WEIGHT_G, quantity: itemCount, value: 500000 }],
      });
      setOngkirLoading(true);
      fetch("/api/ongkir/biaya", { method: "POST", headers: { "Content-Type": "application/json" }, body })
        .then((r) => r.json())
        .then((j) => {
          if (cancelled) return;
          const groups: Array<{ services: Array<{ price: number }> }> = j?.data ?? [];
          const lowest = groups.flatMap((g) => g.services).reduce((min, s) => Math.min(min, s.price), Infinity);
          setOngkir(lowest < Infinity ? lowest : null);
        })
        .catch(() => { if (!cancelled) setOngkir(null); })
        .finally(() => { if (!cancelled) setOngkirLoading(false); });
    });
    return () => { cancelled = true; };
  }, [selectedAlamatEfektif?.kodePos, currentOrder?.estimasi?.items?.length]);

  const totalTagihan = totalWithPacking + (ongkir ?? 0);
  const dpMax = Math.max(DP_MIN, totalTagihan - 1);

  // Clamp nominal DP setiap kali batas berubah
  const [dpClampKey, setDpClampKey] = useState({ paymentType, totalTagihan, dpMax });
  if (
    dpClampKey.paymentType !== paymentType ||
    dpClampKey.totalTagihan !== totalTagihan ||
    dpClampKey.dpMax !== dpMax
  ) {
    setDpClampKey({ paymentType, totalTagihan, dpMax });
    if (paymentType === "dp" && totalTagihan > 0) {
      setDpAmount((prev) => Math.min(Math.max(DP_MIN, prev), dpMax));
    }
  }

  const subBayar = paymentType === "lunas" ? totalTagihan : dpAmount;

  /* === VALIDASI VOUCHER REALTIME === */
  const voucherValid = useMemo(() => {
    if (!pickedVoucher) return null;
    const prov = selectedAlamatEfektif?.provinsi || "";
    const status = checkVoucherStatusCustom(pickedVoucher, prov, subBayar, now);
    if (!status.valid) return null;
    if (computeDiskonCustom(pickedVoucher, subBayar) <= 0) return null;
    return pickedVoucher;
  }, [pickedVoucher, subBayar, selectedAlamatEfektif?.provinsi, now]);

  const diskon = computeDiskonCustom(voucherValid, subBayar);
  const bayarNominal = Math.max(0, subBayar - diskon);
  const sisa = paymentType === "lunas" ? 0 : Math.max(0, totalWithPacking - dpAmount);

    const bank = useMemo(
    () => REKENING_BANK.find((b) => b.id === bankId) ?? REKENING_BANK[0],
    [bankId, REKENING_BANK]
  );

 // Ubah menjadi async function dan gunakan kompresor
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    
    // Tetap batasi ukuran awal agar tidak terlalu berat diproses HP customer
    if (f.size > 5 * 1024 * 1024) return setErr("Foto maksimal 5MB");
    
    try {
      // Kompres gambar menjadi maksimal 800px dengan kualitas 70%
      const compressedBase64 = await compressImage(f, 800, 0.7);
      setBukti(compressedBase64);
      setErr(null);
    } catch {
      setErr("Gagal memproses gambar. Coba gambar lain.");
    }
  }
  
  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  async function handleSubmit() {
    setErr(null);
    if (!currentOrder) return setErr("Tidak ada custom order aktif");
    if (currentOrder.status !== "menunggu_pembayaran")
      return setErr("Status order tidak bisa dibayar");
    if (!bukti) return setErr("Upload bukti pembayaran terlebih dahulu");
    if (paymentType === "dp" && (dpAmount < DP_MIN || dpAmount > dpMax)) {
      return setErr(
        `Nominal DP harus antara Rp ${DP_MIN.toLocaleString("id-ID")} - Rp ${dpMax.toLocaleString("id-ID")}`,
      );
    }
    if (!selectedAlamatEfektif) {
      setErr("Pilih atau tambah alamat pengiriman dulu.");
      return;
    }
    if (!isAlamatValid(selectedAlamatEfektif)) {
      setErr(
        "Alamat yang dipilih belum lengkap. Lengkapi dulu di Akun → Alamat.",
      );
      return;
    }

    setSubmitting(true);
    try {
      if (paymentType === "dp") {
        await payDp(currentOrder.id, {
          amount: bayarNominal,
          ongkir: ongkir ?? 0,
          metode,
          bank: metode === "transfer" ? activeBankId : undefined,
          buktiUrl: bukti,
        });
        addNotif({
          title: "Bukti DP Terkirim",
          body: `DP Rp ${bayarNominal.toLocaleString("id-ID")} untuk ${currentOrder.id} sedang diverifikasi admin`,
          type: "pembayaran",
          link: "/custom/riwayat",
        });
        } else {
        await payLunas(currentOrder.id, {
          ongkir: ongkir ?? undefined,
          metode,
          bank: metode === "transfer" ? activeBankId : undefined,
          buktiUrl: bukti,
        });
        addNotif({
          title: "Bukti Pelunasan Terkirim",
          body: `Pembayaran Lunas Rp ${bayarNominal.toLocaleString("id-ID")} untuk ${currentOrder.id} sedang diverifikasi admin`,
          type: "pembayaran",
          link: "/custom/riwayat",
        });
      }
      router.replace("/custom/riwayat");
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Gagal memproses pembayaran");
      setSubmitting(false);
    }
  }

  if (!mounted || authLoading || ordersLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light">
        <p className="text-sm font-bold text-gray-500">Memuat data pembayaran...</p>
      </div>
    );

  if (
    !currentOrder ||
    currentOrder.status !== "menunggu_pembayaran"
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brand-cream-light px-4 text-center">
        <CreditCard className="h-16 w-16 text-brand-black/30" />
        <h1 className="mt-4 text-xl font-black text-brand-black">
          Pembayaran Tidak Tersedia
        </h1>
        <p className="mt-2 text-sm text-brand-black/60">
          Selesaikan persetujuan estimasi terlebih dahulu
        </p>
        <Link
          href="/custom/estimasi"
          className="mt-4 rounded-md bg-brand-orange px-5 py-2.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark"
        >
          Lihat Estimasi
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-black text-brand-black">
            Bayar Custom Order
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-5">
        {/* Ringkasan estimasi */}
        <section className="rounded-2xl border-2 border-brand-orange bg-orange-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-orange">
            Total Estimasi · {currentOrder.id}
          </p>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-brand-black/70">Estimasi Produk</span>
              <span className="font-bold text-brand-black">Rp {total.toLocaleString("id-ID")}</span>
            </div>
            {biayaPacking > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-brand-black/70">Biaya Packing</span>
                <span className="font-bold text-brand-black">Rp {biayaPacking.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-brand-black/70">Ongkos Kirim</span>
              <span className="font-bold text-brand-black">
                {ongkirLoading ? "Menghitung..." : (ongkir ?? 0) > 0 ? `Rp ${(ongkir ?? 0).toLocaleString("id-ID")}` : "Gratis"}
              </span>
            </div>
            <div className="border-t border-brand-orange/30 pt-1.5 flex justify-between">
              <span className="font-bold text-brand-black">Total Tagihan</span>
              <span className="text-xl font-black text-brand-orange">Rp {totalTagihan.toLocaleString("id-ID")}</span>
            </div>
          </div>
          {diskon > 0 && voucherValid && (
            <p className="mt-2 text-[11px] font-bold text-green-700">
              Hemat Rp {diskon.toLocaleString("id-ID")} via{" "}
              {voucherValid.kode}
            </p>
          )}
        </section>

        {/* === FITUR BARU: COUNTDOWN === */}
        <section className="rounded-2xl border-2 border-brand-orange/30 bg-brand-orange/5 p-4 text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-bold text-brand-black/70">
            <Clock className="h-3.5 w-3.5" /> Batas Waktu Pembayaran
          </p>
          <div className="mt-2 flex items-center justify-center gap-1 text-3xl font-black tabular-nums text-brand-black md:text-4xl">
            <span className="rounded-md bg-brand-black px-3 py-1.5 text-white">
              {pad(hh)}
            </span>
            <span className="text-brand-black/40">:</span>
            <span className="rounded-md bg-brand-black px-3 py-1.5 text-white">
              {pad(mm)}
            </span>
            <span className="text-brand-black/40">:</span>
            <span className="rounded-md bg-brand-black px-3 py-1.5 text-white">
              {pad(ss)}
            </span>
          </div>
          <p className="mt-2 text-xs text-brand-black/70">
            Lakukan Pembayaran Sebelum Pukul{" "}
            <span className="font-bold text-brand-black">
              {formatDeadline(expiredAt)}
            </span>
            !
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-brand-black/50">
            <AlertCircle className="h-3 w-3" />
            Pesanan dibatalkan otomatis jika lewat batas waktu.
          </p>
        </section>

        {/* Pilih DP atau Lunas */}
        <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-brand-black/70">
            Tipe Pembayaran
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentType("dp")}
              className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition ${
                paymentType === "dp"
                  ? "border-brand-orange bg-orange-50 shadow"
                  : "border-brand-cream bg-white hover:border-brand-orange/50"
              }`}
            >
              <Wallet
                className={`h-5 w-5 ${paymentType === "dp" ? "text-brand-orange" : "text-brand-black/40"}`}
              />
              <p className="text-sm font-black text-brand-black">DP (Cicilan)</p>
              <p className="text-[10px] text-brand-black/60">
                Min Rp {DP_MIN.toLocaleString("id-ID")}, sisa setelah selesai
              </p>
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("lunas")}
              className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition ${
                paymentType === "lunas"
                  ? "border-brand-orange bg-orange-50 shadow"
                  : "border-brand-cream bg-white hover:border-brand-orange/50"
              }`}
            >
              <CheckCircle2
                className={`h-5 w-5 ${paymentType === "lunas" ? "text-brand-orange" : "text-brand-black/40"}`}
              />
              <p className="text-sm font-black text-brand-black">Lunas (Full)</p>
              <p className="text-[10px] text-brand-black/60">
                Bayar full di awal, langsung diproses
              </p>
            </button>
          </div>

          {paymentType === "dp" && (
            <div className="mt-4 rounded-xl bg-brand-cream-light p-4">
              <label className="text-xs font-black text-brand-black">
                Nominal DP <span className="text-brand-orange">*</span>
              </label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-bold text-brand-black/60">Rp</span>
                <input
                  type="number"
                  value={dpAmount}
                  onChange={(e) => setDpAmount(Number(e.target.value) || 0)}
                  min={DP_MIN}
                  max={dpMax}
                  step={10000}
                  className="flex-1 rounded-md border-2 border-brand-cream bg-white px-3 py-2 text-base font-black text-brand-black outline-none focus:border-brand-orange"
                />
              </div>
              <input
                type="range"
                min={DP_MIN}
                max={dpMax}
                step={10000}
                value={dpAmount}
                onChange={(e) => setDpAmount(Number(e.target.value))}
                className="mt-3 w-full accent-brand-orange"
              />
              <div className="mt-1 flex justify-between text-[10px] font-bold text-brand-black/60">
                <span>Min Rp {DP_MIN.toLocaleString("id-ID")}</span>
                <span>Max Rp {dpMax.toLocaleString("id-ID")}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-brand-cream pt-2">
                <span className="text-xs text-brand-black/60">
                  Sisa pelunasan setelah produk selesai
                </span>
                <span className="text-sm font-black text-brand-orange">
                  Rp {sisa.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* METODE PEMBAYARAN CUSTOM (TABS & GRID BERIKUT LOGO LEBAR w-20) */}
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
                        <button onClick={() => handleCopy(bank.norek, "norek")} className="hover:bg-brand-cream p-1 rounded transition">
                          {copied === "norek" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-brand-orange" />}
                        </button>
                      </div>
                      <p className="mt-2 text-[10px] text-brand-black/60">
                        a.n. <span className="font-bold text-brand-black">{bank.atasNama || "JOGJADOELAN"}</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <p className="text-[11px] font-bold text-brand-black/60">Nominal {paymentType === "dp" ? "DP" : "Pelunasan"}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-black text-brand-orange">
                          Rp {bayarNominal.toLocaleString("id-ID")}
                        </p>
                        <button onClick={() => handleCopy(String(bayarNominal), "nominal")} className="hover:bg-brand-cream p-1 rounded transition">
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
                      `Masukkan nominal Rp ${bayarNominal.toLocaleString("id-ID")}`,
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
                      `Masukkan nominal Rp ${bayarNominal.toLocaleString("id-ID")}`,
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
                      `Masukkan nominal Rp ${bayarNominal.toLocaleString("id-ID")}`,
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
                      Nominal Bayar
                    </span>
                    <span className="text-base font-black text-brand-orange">
                      Rp {bayarNominal.toLocaleString("id-ID")}
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

        {/* === VOUCHER === */}
        <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-brand-cream pb-2.5">
            <h2 className="flex items-center gap-2 text-sm font-black text-brand-black">
              <Tag className="h-4 w-4 text-brand-orange" />
              Voucher Diskon
            </h2>
            {pickedVoucher && (
              <button
                onClick={() => setPickedVoucher(null)}
                className="flex items-center gap-1 text-xs font-bold text-red-600 hover:underline"
              >
                <X className="h-3 w-3" /> Lepas
              </button>
            )}
          </div>

          <div className="pt-4">
            {pickedVoucher ? (
              <div
                className={`rounded-lg border-2 p-3 ${
                  voucherValid
                    ? "border-brand-orange bg-orange-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-black text-brand-black">
                      {pickedVoucher.judul}
                    </p>
                    <code className="mt-1 inline-block rounded bg-white px-2 py-0.5 text-[11px] font-bold text-brand-orange">
                      {pickedVoucher.kode}
                    </code>
                    <p className="mt-1 text-[11px] text-brand-black/60">
                      Min. bayar Rp{" "}
                      {(
                        Number(pickedVoucher.minBelanja ?? 0) || 0
                      ).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <p className="text-sm font-black text-brand-orange">
                    {pickedVoucher.diskonPersen && pickedVoucher.diskonPersen > 0
                      ? `-${pickedVoucher.diskonPersen}%`
                      : `-Rp ${(Number(pickedVoucher.nominal ?? 0) || 0).toLocaleString("id-ID")}`}
                  </p>
                </div>
                {!voucherValid && (
                  <p className="mt-2 text-[11px] font-bold text-red-600">
                    Ditolak: {checkVoucherStatusCustom(pickedVoucher, selectedAlamatEfektif?.provinsi || "", subBayar, now).pesan}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setVoucherOpen(true)}
                className="flex w-full items-center justify-between rounded-lg border-2 border-dashed border-brand-orange bg-orange-50 px-4 py-3 text-sm font-bold text-brand-orange hover:bg-orange-100"
              >
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Pilih Voucher
                </span>
                <span className="text-xs">
                  {vouchers.filter((v) => !v.digunakan).length} tersedia
                </span>
              </button>
            )}
          </div>

          {/* Ringkasan diskon */}
          {diskon > 0 && voucherValid && (
            <div className="mt-3 space-y-1 border-t border-brand-cream pt-3 text-xs">
              <div className="flex justify-between text-brand-black/70">
                <span>Subtotal Bayar</span>
                <span className="font-bold text-brand-black">
                  Rp {subBayar.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-green-700">
                <span className="flex items-center gap-1">
                   <Tag className="h-3.5 w-3.5" /> Voucher ({voucherValid.kode})
                </span>
                <span className="font-bold">
                  -Rp {diskon.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between border-t border-brand-cream pt-1.5">
                <span className="font-bold text-brand-black">
                  Total Bayar Sekarang
                </span>
                <span className="font-black text-brand-orange">
                  Rp {bayarNominal.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}

          {/* Modal pilih voucher */}
          {voucherOpen && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
              onClick={() => setVoucherOpen(false)}
            >
              <div
                className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-brand-cream p-4">
                  <h3 className="font-black text-brand-black">Pilih Voucher</h3>
                  <button
                    onClick={() => setVoucherOpen(false)}
                    className="rounded-full p-1 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
                  {vouchers.length === 0 ? (
                    <div className="py-12 text-center">
                      <Tag className="mx-auto h-10 w-10 text-brand-black/30" />
                      <p className="mt-2 text-sm font-bold text-brand-black/60">
                        Belum punya voucher
                      </p>
                      <Link
                        href="/promo"
                        className="mt-3 inline-block rounded-md bg-brand-orange px-4 py-2 text-xs font-black text-white"
                      >
                        Klaim di Promo
                      </Link>
                    </div>
                  ) : (
                    vouchers.map((v) => {
                      const status = checkVoucherStatusCustom(v, selectedAlamatEfektif?.provinsi || "", subBayar, now);
                      const isOngkir = v.kode === "JOGJAFREE" || v.judul.toLowerCase().includes("ongkir");
                      const effNominal = (isOngkir && Number(v.nominal ?? 0) === 0) ? (APP_CONFIG?.ONGKIR_EKSPEDISI || 20000) : Number(v.nominal ?? 0);
                      const usable = status.valid && (effNominal > 0 || Number(v.diskonPersen ?? 0) > 0);

                      return (
                        <button
                          key={v.id}
                          disabled={!usable}
                          onClick={() => {
                            setPickedVoucher(v);
                            setVoucherOpen(false);
                          }}
                          className={`flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left transition relative overflow-hidden ${
                            usable
                              ? "border-brand-cream hover:border-brand-orange hover:bg-orange-50"
                              : "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                          }`}
                        >
                          {v.berlaku === 'custom' && (
                            <div className="absolute top-0 right-0 bg-brand-black text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-md z-10">
                              KHUSUS CUSTOM
                            </div>
                          )}
                          {v.syaratProvinsi && v.syaratProvinsi.length > 0 && (
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-md z-10">
                              KHUSUS LOKASI TERTENTU
                            </div>
                          )}

                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-brand-orange text-white">
                            <Tag className="h-5 w-5" />
                          </div>
                          <div className="flex-1 mt-1">
                            <p className="text-sm font-black text-brand-black leading-tight">
                              {v.judul}
                            </p>
                            <p className="text-[11px] text-brand-black/60 mt-0.5">
                              Min. Rp {(Number(v.minBelanja ?? 0) || 0).toLocaleString("id-ID")}
                              {v.expired && ` · s/d ${new Date(v.expired).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                            </p>
                            {!usable && (
                              <p className="mt-1 text-[10px] font-bold text-red-600">
                                Ditolak: {status.pesan}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-black text-brand-orange mt-1">
                            {Number(v.diskonPersen ?? 0) > 0
                              ? `-${v.diskonPersen}%`
                              : `-Rp ${effNominal.toLocaleString("id-ID")}`}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Upload bukti */}
        <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-brand-black/70">
            Upload Bukti Pembayaran <span className="text-brand-orange">*</span>
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
              <span className="text-[10px]">JPG/PNG maks 5MB</span>
              <input type="file" accept="image/*" hidden onChange={handleFile} />
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

        {/* === BANTUAN CARD === */}
        <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-brand-black">
            Butuh Bantuan?
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/chat?customId=${currentOrder.id}`}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-brand-cream bg-white py-2.5 text-[11px] font-black text-brand-black transition hover:border-brand-orange hover:text-brand-orange"
            >
              <MessageCircle className="h-4 w-4" />
              Chat Admin
            </Link>
            <Link
              href={`/komplain/baru?orderId=${currentOrder.id}`}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-brand-cream bg-white py-2.5 text-[11px] font-black text-brand-black transition hover:border-red-500 hover:text-red-600"
            >
              <AlertCircle className="h-4 w-4" />
              Komplain
            </Link>
          </div>
        </section>

        {/* === ACTIONS CARD === */}
        <section className="rounded-2xl border border-brand-cream bg-white p-4 text-center shadow-sm">
          {err && (
            <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-700">
              {err}
            </div>
          )}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting || !bukti}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-orange py-3.5 text-sm font-black text-white shadow transition hover:bg-brand-orange-dark disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4" />
            {submitting
              ? "Mengirim..."
              : `Konfirmasi ${paymentType === "dp" ? "DP" : "Lunas"} Rp ${bayarNominal.toLocaleString("id-ID")}`}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-3 inline-block rounded-full border border-red-200 px-6 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50"
          >
            Batalkan Pembayaran
          </button>
        </section>

      </div>
    </div>
  );
}

/* ======================================================================
   FAQ Row helper (accordion) - Diupdate dgn UI Expand Halus
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