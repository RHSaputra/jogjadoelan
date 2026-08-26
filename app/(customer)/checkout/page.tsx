"use client"
import { logger } from "@/lib/logger";
;
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Download, ImageIcon, Loader2, MessageCircle,
  Pencil, ShoppingCart, Tag, X, MapPin, Copy, CreditCard, QrCode
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useNotifikasi } from "@/lib/notifikasi-context";
import { useProdukList } from "@/lib/use-produk-list";
import { addOrder, type OrderAlamat } from "@/lib/orders-storage";
import { type VoucherItem, ALAMAT_TOKO } from "@/lib/constants";
import { useBankList, useQrisConfig, type RekeningBank } from "@/lib/use-bank-config";
import CheckoutAlamatDialog from "@/components/customer/CheckoutAlamatDialog";
import type { BiteshipCourierRate } from "@/lib/biteship";

// ------------------------------------------------------------------
// HELPERS (pure)
// ------------------------------------------------------------------
const safeNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const findProduk = (id: string, list: unknown) => {
  const arr = Array.isArray(list)
    ? (list as Array<{ id: string | number; nama: string; harga: number; gambar?: string }>)
    : [];
  return arr.find((p) => String(p.id) === String(id));
};

interface CartLine { id: string; nama: string; harga: number; gambar?: string; qty: number; ukuran?: string; }

function checkVoucherStatus(v: VoucherItem, userProvinsi: string, subtotal: number, now: number) {
  if (v.digunakan) return { valid: false, pesan: "Sudah dipakai" };
  if (v.expired && new Date(v.expired).getTime() < now) return { valid: false, pesan: "Kadaluarsa" };
  if (v.berlaku === "custom") return { valid: false, pesan: "Khusus Custom Helm" };
  const minBel = Number(v.minBelanja ?? 0) || 0;
  if (subtotal < minBel) return { valid: false, pesan: `Kurang Rp ${(minBel - subtotal).toLocaleString("id-ID")}` };
  let daftarSyarat = v.syaratProvinsi || [];
  if (v.kode === "JOGJAFREE" && daftarSyarat.length === 0) {
    daftarSyarat = ["YOGYAKARTA", "DIY", "DI YOGYAKARTA", "DAERAH ISTIMEWA YOGYAKARTA", "JOGJA"];
  }
  if (daftarSyarat.length > 0) {
    const provInput = (userProvinsi || "").trim().toUpperCase().replace(/\s+/g, "");
    const match = daftarSyarat.some(p => {
      const target = p.toUpperCase().replace(/\s+/g, "");
      if (!provInput || !target) return false;
      return provInput.includes(target) || target.includes(provInput);
    });
    if (!match) return { valid: false, pesan: "Bukan area pengiriman promo" };
  }
  return { valid: true, pesan: "Bisa digunakan" };
}
function computeDiskon(v: VoucherItem | null, sub: number): number {
  if (!v) return 0;
  const isOngkir = v.kode === "JOGJAFREE" || v.judul.toLowerCase().includes("ongkir");
  let nominal = Number(v.nominal ?? 0) || 0;
  if (isOngkir && nominal === 0) nominal = 20000;
  const persen = Number(v.diskonPersen ?? 0) || 0;
  let raw = 0;
  if (persen > 0) {
    raw = Math.floor((sub * persen) / 100);
    const max = Number(v.maxDiskon ?? 0) || 0;
    if (max > 0) raw = Math.min(raw, max);
  } else { raw = nominal; }
  return Math.max(0, Math.min(raw, sub));
}

// ------------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------------
function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { addNotif } = useNotifikasi();
  const cart = useCart();
  const produkHook = useProdukList();

  useEffect(() => {
    if (!authLoading && !isAuthenticated)
      router.replace(`/login?next=${encodeURIComponent(`/checkout?${params.toString()}`)}`);
  }, [authLoading, isAuthenticated, router, params]);

  const items: CartLine[] = useMemo(() => {
    const raw = params.get("items") || "";
    if (!raw) return [];
    const cartItems = Array.isArray(cart?.items) ? cart.items : [];
    const produkListSafe = Array.isArray(produkHook) ? produkHook : [];
    const out: CartLine[] = [];
    raw.split(",").forEach((tok) => {
      const [id, uk, q] = tok.split(":");
      if (!id) return;
      const ukuran = decodeURIComponent(uk || "") || undefined;
      const qty = Math.max(1, Math.floor(safeNumber(q, 1)));
      const inCart = cartItems.find(
        (it) => String(it.produkId) === String(id) && (it.ukuran ?? "") === (ukuran ?? ""),
      );
      if (inCart) {
        out.push({ id: String(inCart.produkId), nama: inCart.produk?.nama ?? "", harga: safeNumber(inCart.produk?.harga, 0),
          gambar: inCart.produk?.gambar ?? "", qty: Math.max(1, Math.floor(safeNumber(inCart.qty, qty))), ukuran });
        return;
      }
      const p = findProduk(id, produkListSafe);
      if (p) out.push({ id: String(p.id), nama: p.nama, harga: safeNumber(p.harga, 0), gambar: p.gambar, qty, ukuran });
    });
    return out;
  }, [params, cart, produkHook]);

  const mode = params.get("mode") || "cart";

  /* --- ALAMAT --- */
  const alamatFromUser: OrderAlamat | null = useMemo(() => {
    if (!user) return null;
    const a = user.alamatList?.find((x) => x.isUtama) ?? user.alamatList?.[0];
    return a ? { nama: a.penerima || user.username || "", noHp: a.noHp || "", alamat: a.detail || "",
      kota: a.kota || "", kodePos: a.kodePos || "", provinsi: a.provinsi || "DI Yogyakarta" }
      : { nama: user.username || "", noHp: "", alamat: "", kota: "", kodePos: "", provinsi: "DI Yogyakarta" };
  }, [user]);
  const [selectedAlamatFull, setSelectedAlamatFull] = useState<OrderAlamat | null>(null);
  const [selectedAlamatId, setSelectedAlamatId] = useState<string | null>(null);

  const alamat: OrderAlamat = selectedAlamatFull ?? alamatFromUser ?? { nama: "", noHp: "", alamat: "", kota: "", kodePos: "", provinsi: "DI Yogyakarta" };

  /* --- TOTAL & QTY (dideklarasikan lebih awal untuk ongkir) --- */
  const subtotal = items.reduce((s, it) => s + it.harga * it.qty, 0);
  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  /* --- ONGKIR dari Biteship (otomatis dari kode pos alamat) --- */
  const [ongkirResults, setOngkirResults] = useState<Array<{ courier_name: string; courier_code: string; services: BiteshipCourierRate[] }>>([]);
  const [ongkirDb, setOngkirDb] = useState<number | null>(null);
  const [selectedKurir, setSelectedKurir] = useState<string>("");
  const [loadingOngkir, setLoadingOngkir] = useState(false);
  // Berat helm standar = 1000g (1 kg) per item.
  // WAJIB konsisten antara Ready Stock dan Custom Order agar ongkir identik
  // untuk alamat/kurir/qty yang sama.
  const HELM_WEIGHT_G = 1000;

  // Reset pilihan kurir setiap kali alamat (kode pos) berubah
  const [prevKodePos, setPrevKodePos] = useState(alamat.kodePos);
  if (alamat.kodePos !== prevKodePos) {
    setPrevKodePos(alamat.kodePos);
    setSelectedKurir("");
  }

  // Payload items stabil (identitas tidak berubah tiap render) agar efek
  // ongkir hanya berjalan saat isi item benar-benar berubah.
  const ongkirItemsKey = useMemo(
    () => JSON.stringify(items.map((it) => ({ w: HELM_WEIGHT_G, q: it.qty, v: it.harga }))),
    [items],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadOngkir() {
      await Promise.resolve();
      if (cancelled) return;
      const kodePos = (alamat.kodePos ?? "").trim();
      if (!kodePos || kodePos.length < 5 || totalQty === 0) {
        setOngkirResults([]);
        setOngkirDb(null);
        return;
      }
      setLoadingOngkir(true);
      setOngkirResults([]);
      try {
        const payloadItems = JSON.parse(ongkirItemsKey) as Array<{ w: number; q: number; v: number }>;
        // Kirim sebagai items array (bukan convenience weight/quantity) agar
        // Biteship menerima payload identik dengan Custom Order.
        // Total berat = HELM_WEIGHT_G × totalQty gram.
        const r = await fetch("/api/ongkir/biaya", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationPostalCode: kodePos,
            items: payloadItems.map(({ w, q, v }) => ({
              weight: w,
              quantity: q,
              value: v,
            })),
          }),
        });
        const j = await r.json();
        if (cancelled) return;
        const results = (j?.data ?? []) as Array<{ courier_name: string; courier_code: string; services: BiteshipCourierRate[] }>;
        setOngkirResults(results);
        // Auto-pilih ongkir termurah dari API (tanpa hardcoded fallback)
        let minCost = Infinity;
        let cheapestKurir = "";
        for (const group of results) {
          for (const s of group.services) {
            if (s.price < minCost) { minCost = s.price; cheapestKurir = `${group.courier_code}:${s.courier_service_code}`; }
          }
        }
        if (minCost > 0 && minCost < Infinity) {
          setOngkirDb(minCost);
          if (cheapestKurir) setSelectedKurir(cheapestKurir);
        }
      } catch (err) {
        if (cancelled) return;
        logger.error("[checkout] Gagal mengambil ongkir:", err);
        toast.error("Gagal menghitung ongkir", { description: "Coba periksa kembali Kode Pos Anda atau coba lagi nanti." });
        setOngkirDb(null);
        setOngkirResults([]);
      } finally {
        if (!cancelled) setLoadingOngkir(false);
      }
    }
    void loadOngkir();
    return () => {
      cancelled = true;
    };
  }, [alamat.kodePos, totalQty, ongkirItemsKey]);

  const sortedOngkirOptions = useMemo(() => {
    const out: Array<{ label: string; value: string; cost: number; etd: string }> = [];
    for (const group of ongkirResults) {
      for (const s of group.services) {
        out.push({
          label: `${group.courier_name} - ${s.courier_service_name} (${s.description})`,
          value: `${group.courier_code}:${s.courier_service_code}`,
          cost: s.price,
          etd: s.duration ?? "-",
        });
      }
    }
    out.sort((a, b) => a.cost - b.cost);
    return out;
  }, [ongkirResults]);

  const [pengiriman, setPengiriman] = useState<"ambil" | "ekspedisi">("ekspedisi");
  const ongkir = pengiriman === "ekspedisi" ? (ongkirDb ?? 0) : 0;

  /* --- BIAYA PACKING dari Settings API --- */
  const [biayaPackingDefault, setBiayaPackingDefault] = useState<number>(10000);
  useEffect(() => {
    fetch("/api/settings?keys=biayaPacking")
      .then(r => r.json())
      .then(j => {
        const val = safeNumber(j?.biayaPacking, 10000);
        if (val > 0) setBiayaPackingDefault(val);
      })
      .catch(() => {});
  }, []);

  const biayaPacking = totalQty * biayaPackingDefault;

  /* --- BANK dari DB --- */
  const [bayar, setBayar] = useState<"transfer" | "qris">("transfer");
  const REKENING_BANK = useBankList();
  const qrisConfig = useQrisConfig();
  const [bank, setBank] = useState<string>("");

  // Bank efektif: fallback ke bank pertama bila pilihan tidak ada di daftar
  // (admin tambah/hapus bank), menggantikan sinkronisasi via useEffect.
  const effectiveBank = REKENING_BANK.some((b) => b.id === bank)
    ? bank
    : (REKENING_BANK[0]?.id ?? "");

  /* --- VALIDASI METODE PEMBAYARAN --- */
  const noPaymentMethod = useMemo(() => {
    if (bayar === "transfer") return REKENING_BANK.length === 0;
    // QRIS selalu tersedia sebagai opsi (admin bisa aktifkan nanti)
    return false;
  }, [bayar, REKENING_BANK]);

  const [submitting, setSubmitting] = useState(false);

  /* --- VOUCHER --- */
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [pickedVoucher, setPickedVoucher] = useState<VoucherItem | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    fetch("/api/akun/vouchers", { credentials: "include" }).then(r => r.json()).then((j) => {
      const raw = (j?.data ?? []) as Array<{ voucherId: string; kode: string; judul: string; nilai: number; jenis: string; minOrder: number | null; maxDiscount: number | null; expiredAt: string | null }>;
      setVouchers(raw.map(u => ({
        id: u.voucherId, kode: u.kode, judul: u.judul,
        nominal: u.jenis === "nominal" ? u.nilai : 0,
        diskonPersen: u.jenis === "persen" ? u.nilai : undefined,
        maxDiskon: u.maxDiscount ?? undefined, minBelanja: u.minOrder ?? 0,
        expired: u.expiredAt ?? new Date(Date.now() + 365 * 86400000).toISOString(), digunakan: false,
      })));
    }).catch(() => setVouchers([]));
  }, [user]);

  const now = useSyncExternalStore(
    () => () => {},
    () => Date.now(),
    () => 0,
  );
  const voucherValid = useMemo(() => {
    if (!pickedVoucher) return null;
    if (!checkVoucherStatus(pickedVoucher, alamat.provinsi ?? "", subtotal, now).valid) return null;
    return computeDiskon(pickedVoucher, subtotal) > 0 ? pickedVoucher : null;
  }, [pickedVoucher, alamat.provinsi, subtotal, now]);
  const diskon = computeDiskon(voucherValid, subtotal);
  const total = Math.max(0, subtotal + ongkir + biayaPacking - diskon);

  /* --- SUBMIT --- */
  const handleSubmit = async () => {
    if (!user) { router.replace("/login"); return; }
    if (items.length === 0) { toast.error("Tidak ada produk"); return; }
    if (!alamat.nama || !alamat.noHp || !alamat.alamat || !alamat.kota || !alamat.provinsi || !alamat.kodePos) {
      toast.error("Alamat pengiriman belum lengkap", { description: "Silakan pilih atau tambah alamat pengiriman terlebih dahulu." });
      return;
    }
    if (pengiriman === "ekspedisi" && ongkirDb === null) {
      toast.error("Ongkir belum dihitung", { description: "Tunggu ongkir selesai dihitung dari API sebelum checkout." });
      return;
    }
    setSubmitting(true);
    try {
      const sc = await fetch("/api/produk/by-ids", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: items.map(i => i.id) }) });
      if (sc.ok) {
        const sd = await sc.json();
        const pl = (sd?.data ?? sd ?? []) as Array<{ id: string; stok: number; nama: string }>;
        for (const i of items) {
          const p = pl.find(x => String(x.id) === String(i.id));
          if (!p) { toast.error(`${i.nama} tidak tersedia`); setSubmitting(false); return; }
          if (p.stok < i.qty) { toast.error(`${i.nama} hanya tersisa ${p.stok} pcs`); setSubmitting(false); return; }
        }
      }
    } catch { /* lanjut, server validasi */ }
    const payload = {
      items: items.map(i => ({ productId: i.id, ukuran: i.ukuran || "", qty: i.qty })),
      alamat, pengiriman, pembayaran: bayar === "transfer" ? { metode: "transfer" as const, bank: effectiveBank || undefined } : { metode: "qris" as const },
      ongkir, biayaPacking, voucher: voucherValid ? { id: voucherValid.id, kode: voucherValid.kode, judul: voucherValid.judul, nominal: diskon } : null,
    };
    try {
      const result = await addOrder(user.id, payload);
      if (mode === "cart") await fetch("/api/cart", { method: "DELETE", credentials: "include" }).catch(() => {});
      addNotif({ title: "Pesanan dibuat", body: `Pesanan ${result.id} menunggu pembayaran`, type: "order", link: `/pembayaran/${result.id}` });
      setSubmitting(false);
      router.replace(`/pembayaran/${result.id}`);
    } catch (e) {
      setSubmitting(false);
      toast.error("Gagal", { description: e instanceof Error ? e.message : "Coba ulangi" });
    }
  };

  if (authLoading || !isAuthenticated) return <div className="min-h-screen bg-brand-cream-light" />;
  if (items.length === 0) return (
    <div className="min-h-screen bg-brand-cream-light"><div className="container mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-black">Tidak ada produk</h1><p className="mt-2 text-sm text-brand-black/60">Pilih produk di keranjang.</p>
      <Link href="/keranjang" className="mt-6 inline-block rounded-md bg-brand-orange px-6 py-3 text-sm font-bold text-white">Ke Keranjang</Link>
    </div></div>
  );

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      <div className="border-b border-brand-cream bg-white"><div className="container mx-auto flex items-center gap-3 px-4 py-3">
        <button onClick={() => router.back()} className="rounded-md p-1.5 text-brand-black hover:bg-brand-cream"><ArrowLeft className="h-5 w-5" /></button>
        <ShoppingCart className="h-5 w-5 text-brand-black" /><h1 className="text-lg font-black">{mode === "buy" ? "Beli Sekarang" : "Checkout"}</h1>
        <span className="ml-auto rounded-full bg-brand-cream px-2.5 py-0.5 text-xs font-bold">{totalQty} barang</span>
      </div></div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-4">

        {/* PRODUK */}
        <section className="rounded-xl border border-brand-cream bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h2 className="text-sm font-black">Produk Dipesan ({items.length})</h2>
            {mode === "cart" && <Link href="/keranjang" className="flex items-center gap-1 text-xs font-bold text-brand-orange hover:underline"><Pencil className="h-3 w-3" /> Edit Keranjang</Link>}
          </div>
          <ul className="divide-y">
            {items.map((it) => (
              <li key={`${it.id}-${it.ukuran ?? ""}`} className="flex items-center gap-3 px-4 py-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-brand-cream/40">
                  {isStr(it.gambar) ? <Image src={it.gambar} alt={it.nama} fill className="object-cover" sizes="56px" /> : <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-5 w-5 text-brand-black/30" /></div>}
                </div>
                <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-bold">{it.nama}</p><div className="mt-0.5 flex items-center gap-2 text-[11px] text-brand-black/60">{it.ukuran && <span className="rounded bg-brand-cream px-1.5 py-0.5 font-semibold">{it.ukuran}</span>}<span>Rp {it.harga.toLocaleString("id-ID")} x {it.qty}</span></div></div>
                <div className="text-right"><p className="text-sm font-black text-brand-orange">Rp {(it.harga * it.qty).toLocaleString("id-ID")}</p></div>
              </li>
            ))}
          </ul>
        </section>

        {/* ALAMAT */}
        <section className="rounded-xl border border-brand-cream bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-2.5 bg-gray-50/50">
            <h2 className="text-sm font-black flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-orange" />Alamat Pengiriman</h2>
            <CheckoutAlamatDialog selectedId={selectedAlamatId} onPick={(a) => { setSelectedAlamatId(a.id); setSelectedAlamatFull({ nama: a.penerima, noHp: a.noHp, alamat: a.detail ? `${a.detail}${a.kecamatan ? `, Kec. ${a.kecamatan}` : ""}` : a.kecamatan, kota: a.kota, kodePos: a.kodePos, provinsi: a.provinsi }); toast.success("Alamat berhasil dipilih"); }} />
          </div>
          <div className="p-4">
            <div>
              <p className="text-sm font-bold">{alamat.nama || "(Nama belum diisi)"} {!selectedAlamatId && <span className="ml-2 rounded-sm bg-brand-cream px-1.5 py-0.5 text-[10px] font-black uppercase text-brand-black/60">Utama</span>}</p>
              <p className="text-xs font-bold text-brand-black/60 mt-0.5">{alamat.noHp || "(No HP belum diisi)"}</p>
              <p className="mt-2 text-xs text-brand-black/70">{alamat.alamat || "(Alamat lengkap belum diisi)"}, {alamat.kota || "-"}, {alamat.provinsi || "-"} {alamat.kodePos || "-"}</p>
            </div>
          </div>
        </section>

        {/* PENGIRIMAN */}
        <section className="rounded-xl border border-brand-cream bg-white shadow-sm">
          <div className="border-b px-4 py-2.5"><h2 className="text-sm font-black">Metode Pengiriman</h2></div>
          <div className="space-y-3 p-4">
            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 ${pengiriman === "ekspedisi" ? "border-brand-orange bg-brand-orange/5" : "border-brand-cream"}`}>
              <input type="radio" name="pengiriman" checked={pengiriman === "ekspedisi"} onChange={() => setPengiriman("ekspedisi")} className="mt-1 h-4 w-4 accent-brand-orange" />
              <div className="flex-1"><p className="text-sm font-bold">Kirim Ekspedisi (JNE/J&T/POS/AnterAja)</p><p className="text-xs text-brand-black/60">Ongkir dihitung otomatis via Biteship</p></div>
            </label>

            {pengiriman === "ekspedisi" && (
              <div className="space-y-3 ml-7">
                {/* Info asal ongkir: dari kode pos alamat */}
                <div className="rounded-md border border-brand-cream bg-brand-cream-light/40 p-2.5">
                  <p className="text-[11px] font-bold text-brand-black/60">Ongkir dihitung dari alamat pengiriman</p>
                  <p className="mt-0.5 text-[11px] text-brand-black/80">
                    Tujuan: <span className="font-bold">{alamat.kota || "(kota belum diisi)"}</span>, Kode Pos <span className="font-bold">{alamat.kodePos || "(belum diisi)"}</span>
                  </p>
                </div>

                {/* Loading / Hasil Ongkir */}
                {(!alamat.kodePos || alamat.kodePos.trim().length < 5) ? (
                  <p className="text-xs text-amber-600">Lengkapi Kode Pos di alamat pengiriman untuk menghitung ongkir otomatis.</p>
                ) : (
                  <div>
                    {loadingOngkir && <div className="flex items-center gap-2 text-sm text-brand-black/50"><Loader2 className="h-4 w-4 animate-spin" />Menghitung ongkir...</div>}
                    {!loadingOngkir && sortedOngkirOptions.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-brand-black/60 mb-2">Pilih Kurir & Layanan</p>
                        <div className="space-y-2">
                          {sortedOngkirOptions.map((opt) => (
                            <label key={opt.value} onClick={() => { setOngkirDb(opt.cost); setSelectedKurir(opt.value); }} className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 ${selectedKurir === opt.value ? "border-brand-orange bg-brand-orange/5" : "border-brand-cream hover:border-brand-orange/40"}`}>
                              <div>
                                <p className="text-sm font-bold">{opt.label}</p>
                                <p className="text-[10px] text-brand-black/50">Estimasi {opt.etd} hari</p>
                              </div>
                              <span className="text-sm font-black text-brand-orange">Rp {opt.cost.toLocaleString("id-ID")}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {!loadingOngkir && sortedOngkirOptions.length === 0 && (
                      <p className="text-xs text-red-500">Ongkir tidak tersedia untuk kode pos ini. Coba periksa kembali Kode Pos Anda.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 ${pengiriman === "ambil" ? "border-brand-orange bg-brand-orange/5" : "border-brand-cream"}`}>
              <input type="radio" name="pengiriman" checked={pengiriman === "ambil"} onChange={() => setPengiriman("ambil")} className="mt-1 h-4 w-4 accent-brand-orange" />
              <div className="flex-1"><p className="text-sm font-bold">Ambil di Toko</p><p className="text-xs text-brand-black/60">{ALAMAT_TOKO}</p></div>
              <span className="text-sm font-black text-emerald-600">Gratis</span>
            </label>
          </div>
        </section>

        {/* PEMBAYARAN */}
        <section className="rounded-xl border border-brand-cream bg-white shadow-sm overflow-hidden">
          <div className="border-b px-4 py-3 bg-white"><h2 className="text-sm font-black uppercase tracking-wider">Metode Pembayaran</h2></div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setBayar("transfer")} className={`flex items-center gap-2 rounded-xl border-2 p-3 transition ${bayar === "transfer" ? "border-brand-orange text-brand-orange bg-white shadow-sm" : "border-brand-cream text-brand-black/60"}`}><CreditCard className="h-5 w-5" /><span className="text-sm font-black">Transfer Bank</span></button>
              <button onClick={() => setBayar("qris")} className={`flex items-center gap-2 rounded-xl border-2 p-3 transition ${bayar === "qris" ? "border-brand-orange text-brand-orange bg-white shadow-sm" : "border-brand-cream text-brand-black/60"}`}><QrCode className="h-5 w-5" /><span className="text-sm font-black">QRIS</span></button>
            </div>
            {bayar === "transfer" && REKENING_BANK.length === 0 && (
              <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-center">
                <p className="text-sm font-bold text-amber-800">Metode pembayaran belum tersedia</p>
                <p className="mt-1 text-xs text-amber-700">Silakan hubungi admin untuk mengatur metode pembayaran.</p>
              </div>
            )}
            {bayar === "transfer" && REKENING_BANK.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {REKENING_BANK.map((b: RekeningBank) => {
                    const isSelected = effectiveBank === b.id;
                    const bankName = (b.nama || "").toUpperCase().replace("BANK ", "");
                    let bgClass = "bg-blue-600";
                    if (bankName.includes("MANDIRI")) bgClass = "bg-blue-800";
                    else if (bankName.includes("BNI")) bgClass = "bg-orange-500";
                    else if (bankName.includes("BRI")) bgClass = "bg-blue-700";
                    return (
                      <button key={b.id} onClick={() => setBank(b.id)} className={`flex w-full flex-col items-center justify-center rounded-xl border-2 p-2 ${isSelected ? "border-brand-orange shadow-sm" : "border-brand-cream hover:border-brand-orange/40"}`}>
                        <div className={`flex h-8 w-full max-w-[80px] items-center justify-center rounded-md ${bgClass}`}><span className="text-[10px] font-black text-white">{bankName}</span></div>
                        <span className="mt-2 text-[10px] font-bold">{bankName}</span>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const active: RekeningBank | undefined = REKENING_BANK.find((b) => b.id === effectiveBank) || REKENING_BANK[0];
                  if (!active) return null;
                  return (
                    <div className="rounded-xl bg-[#FAF9F5] border border-brand-cream">
                      <div className="p-4 border-b"><p className="text-[10px] font-black uppercase text-brand-black/40">NO REKENING {(active.nama || "").toUpperCase().replace("BANK ", "")}</p>
                        <div className="mt-1 flex items-center justify-between"><p className="font-mono text-xl font-black">{active.norek ?? ""}</p><button onClick={() => { navigator.clipboard.writeText(active.norek ?? ""); toast.success("Tersalin"); }} className="hover:bg-brand-cream p-1 rounded"><Copy className="h-4 w-4 text-brand-orange" /></button></div>
                        <p className="mt-2 text-[10px] text-brand-black/60">a.n. <span className="font-bold">{active.atasNama ?? ""}</span></p>
                      </div>
                      <div className="flex items-center justify-between p-4"><p className="text-[11px] font-bold text-brand-black/60">Nominal Transfer</p><div className="flex items-center gap-2"><p className="text-base font-black text-brand-orange">Rp {total.toLocaleString("id-ID")}</p><button onClick={() => { navigator.clipboard.writeText(total.toString()); toast.success("Tersalin"); }} className="hover:bg-brand-cream p-1 rounded"><Copy className="h-4 w-4 text-brand-orange" /></button></div></div>
                    </div>
                  );
                })()}
              </>
            )}
            {bayar === "qris" && (
              <div className="overflow-hidden rounded-xl border border-brand-cream bg-white shadow-sm">
                <div className="bg-brand-orange px-4 py-3 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">QRIS</p>
                  <p className="mt-0.5 text-lg font-black">{qrisConfig.merchantName || "Jogjadoelan"}</p>
                  <p className="text-[11px] font-semibold opacity-80">QRIS {qrisConfig.merchantName || "Jogjadoelan QRIS"}</p>
                </div>
                <div className="flex flex-col items-center gap-3 p-4 bg-[#FAF9F5]">
                  <div className="relative flex h-52 w-52 items-center justify-center rounded-xl border-2 border-brand-cream bg-white">
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
                    <a
                      href={qrisConfig.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md border-2 border-brand-cream bg-white px-4 py-2 text-xs font-bold text-brand-black hover:border-brand-orange"
                    >
                      <Download className="h-3.5 w-3.5" /> Simpan QR Code
                    </a>
                  )}
                  <p className="text-center text-xs text-brand-black/60">
                    Scan QR di atas via aplikasi e-wallet (Gopay, OVO, Dana) atau m-banking Anda.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* VOUCHER */}
        <section className="rounded-xl border border-brand-cream bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h2 className="flex items-center gap-2 text-sm font-black"><Tag className="h-4 w-4 text-brand-orange" />Voucher Diskon</h2>
            {pickedVoucher && <button onClick={() => setPickedVoucher(null)} className="flex items-center gap-1 text-xs font-bold text-red-600"><X className="h-3 w-3" />Lepas</button>}
          </div>
          <div className="p-4">
            {pickedVoucher ? (
              <div className={`rounded-lg border-2 p-3 ${voucherValid ? "border-brand-orange bg-orange-50" : "border-red-300 bg-red-50"}`}>
                <p className="text-sm font-black">{pickedVoucher.judul}</p>
                <code className="mt-1 inline-block rounded bg-white px-2 py-0.5 text-[11px] font-bold text-brand-orange">{pickedVoucher.kode}</code>
                <p className="mt-1 text-[11px] text-brand-black/60">Min. Rp {(Number(pickedVoucher.minBelanja ?? 0) || 0).toLocaleString("id-ID")}</p>
                {!voucherValid && <p className="mt-2 text-[11px] font-bold text-red-600">Tidak valid</p>}
              </div>
            ) : (
              <button onClick={() => setVoucherOpen(true)} className="flex w-full items-center justify-between rounded-lg border-2 border-dashed border-brand-orange bg-orange-50 px-4 py-3 text-sm font-bold text-brand-orange"><Tag className="h-4 w-4" />Pilih Voucher <span className="text-xs">{vouchers.filter(v => !v.digunakan).length} tersedia</span></button>
            )}
          </div>
          {voucherOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setVoucherOpen(false)}>
              <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b p-4"><h3 className="font-black">Pilih Voucher</h3><button onClick={() => setVoucherOpen(false)} className="rounded-full p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
                <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
                  {vouchers.length === 0 ? <div className="py-12 text-center"><Tag className="mx-auto h-10 w-10 text-brand-black/30" /><p className="mt-2 text-sm font-bold text-brand-black/60">Belum punya voucher</p><Link href="/promo" className="mt-3 inline-block rounded-md bg-brand-orange px-4 py-2 text-xs font-black text-white">Klaim di Promo</Link></div>
                    : vouchers.map(v => {
                      const status = checkVoucherStatus(v, alamat.provinsi ?? "", subtotal, now);
                      const isOngkir = v.kode === "JOGJAFREE" || v.judul.toLowerCase().includes("ongkir");
                      const effNominal = (isOngkir && Number(v.nominal ?? 0) === 0) ? 20000 : Number(v.nominal ?? 0);
                      const usable = status.valid && (effNominal > 0 || Number(v.diskonPersen ?? 0) > 0);
                      return (
                        <button key={v.id} disabled={!usable} onClick={() => { setPickedVoucher(v); setVoucherOpen(false); }} className={`flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left ${usable ? "border-brand-cream hover:border-brand-orange hover:bg-orange-50" : "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"}`}>
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-brand-orange text-white"><Tag className="h-5 w-5" /></div>
                          <div className="flex-1"><p className="text-sm font-black">{v.judul}</p><p className="text-[11px] text-brand-black/60 mt-0.5">Min. Rp {(Number(v.minBelanja ?? 0) || 0).toLocaleString("id-ID")}{v.expired && ` · s/d ${new Date(v.expired).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}</p>{!usable && <p className="mt-1 text-[10px] font-bold text-red-600">Ditolak: {status.pesan}</p>}</div>
                          <p className="text-sm font-black text-brand-orange">{Number(v.diskonPersen ?? 0) > 0 ? `-${v.diskonPersen}%` : `-Rp ${effNominal.toLocaleString("id-ID")}`}</p>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RINGKASAN */}
        <section className="rounded-xl border border-brand-cream bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black">Ringkasan Pembayaran</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-brand-black/70">Subtotal ({totalQty} barang)</dt><dd className="font-bold">Rp {subtotal.toLocaleString("id-ID")}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-black/70">Ongkir</dt><dd className="font-bold">{ongkir === 0 ? "Gratis" : `Rp ${ongkir.toLocaleString("id-ID")}`}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-black/70">Biaya Packing</dt><dd className="font-bold">Rp {biayaPacking.toLocaleString("id-ID")}</dd></div>
            {diskon > 0 && voucherValid && <div className="flex justify-between"><dt className="flex items-center gap-1 text-green-700"><Tag className="h-3.5 w-3.5" />Voucher ({voucherValid.kode})</dt><dd className="font-bold text-green-700">-Rp {diskon.toLocaleString("id-ID")}</dd></div>}
          </dl>
          <div className="mt-3 flex items-end justify-between border-t pt-3"><span className="text-sm font-bold">Total</span><span className="text-xl font-black text-brand-orange">Rp {total.toLocaleString("id-ID")}</span></div>
          <div className="mt-4 flex items-center gap-3 border-t pt-4">
            <button onClick={() => router.push("/chat")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 border-brand-cream text-brand-black hover:border-brand-orange"><MessageCircle className="h-5 w-5" /></button>
            {noPaymentMethod && (
              <p className="w-full rounded-md bg-amber-50 p-2 text-center text-xs font-bold text-amber-700">
                Metode pembayaran belum tersedia. Silakan hubungi admin.
              </p>
            )}
            <button onClick={handleSubmit} disabled={submitting || noPaymentMethod} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-brand-orange px-6 py-3 text-sm font-black text-white shadow-md hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Buat Pesanan</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<div className="min-h-screen bg-brand-cream-light" />}><CheckoutInner /></Suspense>;
}