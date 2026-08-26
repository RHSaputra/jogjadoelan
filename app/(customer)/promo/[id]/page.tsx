"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { use } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Copy,
  Tag,
  Truck,
  Percent,
  Gift,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PROMO_DUMMY, type PromoItem } from "@/lib/constants";
import { toast } from "sonner";

const TIPE_ICON: Record<PromoItem["tipe"], typeof Tag> = {
  ongkir: Truck,
  diskon: Percent,
  cashback: Wallet,
  voucher: Gift,
};

export default function PromoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [sudahKlaim, setSudahKlaim] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const now = useSyncExternalStore(
    () => () => {},
    () => Date.now(),
    () => 0,
  );

  const [promo, setPromo] = useState<PromoItem | null | undefined>(undefined);

  /* Load promo dari API */
  useEffect(() => {
    fetch("/api/promo")
      .then((r) => r.json())
      .then((j: { data?: PromoItem[] }) => {
        const list: PromoItem[] =
          Array.isArray(j?.data) && j.data!.length > 0 ? j.data! : PROMO_DUMMY;
        setPromo(list.find((p) => p.id === id) ?? null);
      })
      .catch(() => setPromo(PROMO_DUMMY.find((p) => p.id === id) ?? null));
  }, [id]);

  /* Cek klaim dari DB */
  useEffect(() => {
    if (!user || !promo?.kode) return;
    fetch("/api/akun/vouchers", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { data?: Array<{ kode: string }> }) => {
        const kodes = new Set((j.data ?? []).map((v) => v.kode));
        setSudahKlaim(kodes.has(promo.kode!));
      })
      .catch(() => {});
  }, [user, promo]);

  if (promo === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brand-cream-light px-4 text-center">
        <div className="text-brand-black/60">Memuat promo...</div>
      </div>
    );
  }

  if (promo === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brand-cream-light px-4 text-center">
        <Tag className="h-16 w-16 text-brand-black/30" />
        <p className="mt-4 text-lg font-black">Promo tidak ditemukan</p>
        <Link
          href="/promo"
          className="mt-4 rounded-md bg-brand-orange px-5 py-2.5 text-sm font-black text-white"
        >
          Lihat Promo Lain
        </Link>
      </div>
    );
  }

  const Icon = TIPE_ICON[promo.tipe];
  const sisa = Math.max(
    0,
    Math.ceil((new Date(promo.berakhir).getTime() - now) / 86400000),
  );

  function handleCopy() {
    if (!promo?.kode) return;
    navigator.clipboard.writeText(promo.kode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleClaim() {
    if (!promo) return;
    if (!isAuthenticated || !user) {
      toast.error("Login dulu untuk klaim voucher");
      router.push(`/login?next=${encodeURIComponent(`/promo/${promo.id}`)}`);
      return;
    }
    if (!promo.kode) {
      toast.info("Promo ini otomatis berlaku di checkout");
      return;
    }
    if (sudahKlaim) {
      toast.info("Voucher sudah diklaim");
      return;
    }

    setClaimLoading(true);
    try {
      const res = await fetch("/api/akun/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kode: promo.kode }),
      });
      const json = await res.json() as { error?: { message?: string } };
      if (!res.ok) {
        const msg = json.error?.message ?? "Gagal klaim voucher";
        if (msg.includes("diklaim")) {
          setSudahKlaim(true);
          toast.info("Voucher sudah pernah diklaim");
        } else {
          toast.error(msg);
        }
        return;
      }
      setSudahKlaim(true);
      toast.success(`Voucher ${promo.kode} berhasil diklaim!`);
    } catch {
      toast.error("Gagal klaim voucher, coba lagi");
    } finally {
      setClaimLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      {/* Hero banner */}
      <div
        className={`relative overflow-hidden rounded-b-3xl bg-gradient-to-br ${promo.warna}`}
      >
        {promo.banner && (
          <Image
            src={promo.banner}
            alt={promo.judul}
            fill
            sizes="100vw"
            priority
            className="object-cover opacity-20 mix-blend-overlay"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        <Link
          href="/promo"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur hover:bg-white/30"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div className="px-5 pb-6 pt-20 text-white">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 shadow">
            <Icon className="h-3.5 w-3.5 text-brand-orange" />
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-black">
              {promo.tipe}
            </span>
          </div>
          <h1 className="font-bebas text-3xl tracking-wider drop-shadow-lg">
            {promo.judul}
          </h1>
          <p className="text-sm text-white/90">{promo.subjudul}</p>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-3 px-4 py-4">
        {/* Nominal box */}
        <section className="rounded-2xl border-2 border-brand-orange bg-orange-50 p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-orange">
            Hemat Sampai
          </p>
          <p className="mt-1 font-bebas text-4xl tracking-wider text-brand-orange">
            {promo.diskonPersen
              ? `${promo.diskonPersen}%`
              : promo.diskonNominal
                ? `Rp ${promo.diskonNominal.toLocaleString("id-ID")}`
                : "FREE ONGKIR"}
          </p>
          {promo.maxDiskon && (
            <p className="mt-1 text-xs text-brand-black/60">
              Maks. potongan Rp {promo.maxDiskon.toLocaleString("id-ID")}
            </p>
          )}
        </section>

        {/* Kode voucher */}
        {promo.kode && (
          <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-brand-black/60">
              Kode Voucher
            </p>
            <div className="mt-2 flex items-center gap-3">
              <code className="flex-1 rounded-md border-2 border-dashed border-brand-orange bg-orange-50 px-4 py-3 text-center text-lg font-black tracking-widest text-brand-orange">
                {promo.kode}
              </code>
              <button
                onClick={handleCopy}
                className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-orange text-white shadow hover:bg-brand-orange-dark"
              >
                {copied ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </section>
        )}

        {/* Syarat & ketentuan */}
        <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-brand-black/60">
            Syarat & Ketentuan
          </p>
          <ul className="mt-3 space-y-2">
            {promo.syarat.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-brand-black/80"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                {s}
              </li>
            ))}
          </ul>
        </section>

        {/* Periode */}
        <section className="flex items-center gap-3 rounded-2xl border border-brand-cream bg-white p-3 shadow-sm">
          <Calendar className="h-5 w-5 text-brand-orange" />
          <div className="flex-1">
            <p className="text-xs font-bold uppercase text-brand-black/60">
              Berlaku Sampai
            </p>
            <p className="text-sm font-black text-brand-black">
              {new Date(promo.berakhir).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black ${
              sisa > 0
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {sisa > 0 ? `${sisa} HARI` : "BERAKHIR"}
          </span>
        </section>

        {/* Tombol klaim */}
        <button
          onClick={handleClaim}
          disabled={sudahKlaim || sisa === 0 || claimLoading}
          className={`mt-2 w-full rounded-xl py-3 text-sm font-black shadow transition ${
            sudahKlaim
              ? "bg-green-100 text-green-700"
              : sisa === 0
                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                : claimLoading
                  ? "cursor-wait bg-brand-orange/60 text-white"
                  : "bg-brand-orange text-white hover:bg-brand-orange-dark"
          }`}
        >
          {sudahKlaim
            ? "✓ Sudah Diklaim — Cek di Voucher Saya"
            : sisa === 0
              ? "Promo Berakhir"
              : claimLoading
                ? "Memproses..."
                : !promo.kode
                  ? "Otomatis Diterapkan di Checkout"
                  : "Klaim Voucher Sekarang"}
        </button>
      </div>
    </div>
  );
}
