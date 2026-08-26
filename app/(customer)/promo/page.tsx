"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Tag,
  Truck,
  Percent,
  Gift,
  Wallet,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { PROMO_DUMMY, type PromoItem } from "@/lib/constants";
import { toast } from "sonner";
import { useNotifikasi } from "@/lib/notifikasi-context";

const TIPE_ICON: Record<PromoItem["tipe"], typeof Tag> = {
  ongkir: Truck,
  diskon: Percent,
  cashback: Wallet,
  voucher: Gift,
};

const TIPE_LABEL: Record<PromoItem["tipe"], string> = {
  ongkir: "GRATIS ONGKIR",
  diskon: "DISKON",
  cashback: "CASHBACK",
  voucher: "VOUCHER",
};

function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function PromoPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { addNotif } = useNotifikasi();
  const [tab, setTab] = useState<"semua" | PromoItem["tipe"]>("semua");
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [PROMO_LIST, setPromoList] = useState<PromoItem[]>(PROMO_DUMMY);

  /* Load promo dari API database */
  useEffect(() => {
    const loadPromos = () =>
      fetch("/api/promo")
        .then((r) => r.json())
        .then((j: { data?: PromoItem[] }) => {
          const data = j?.data;
          setPromoList(Array.isArray(data) && data.length > 0 ? data : PROMO_DUMMY);
        })
        .catch(() => setPromoList(PROMO_DUMMY));
    void loadPromos();
    window.addEventListener("jogjadoelan_promo_changed", loadPromos);
    return () => window.removeEventListener("jogjadoelan_promo_changed", loadPromos);
  }, []);

  /* Load kode voucher yang sudah diklaim dari DB */
  useEffect(() => {
    if (!user) {
      void Promise.resolve().then(() => setClaimed(new Set()));
      return;
    }
    fetch("/api/akun/vouchers", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { data?: Array<{ kode: string }> }) => {
        const kodes = new Set((j.data ?? []).map((v) => v.kode));
        // Map kode → promoId dari PROMO_LIST agar bisa set claimed by promoId
        setClaimed((prev) => {
          const next = new Set(prev);
          for (const p of PROMO_LIST) {
            if (p.kode && kodes.has(p.kode)) next.add(p.id);
          }
          return next;
        });
      })
      .catch(() => {});
  }, [user, PROMO_LIST]);

  const filtered = useMemo(() => {
    if (tab === "semua") return PROMO_LIST;
    return PROMO_LIST.filter((p) => p.tipe === tab);
  }, [tab, PROMO_LIST]);

  async function handleClaim(promo: PromoItem) {
    if (!isAuthenticated || !user) {
      toast.error("Login dulu untuk klaim voucher");
      router.push(`/login?next=${encodeURIComponent("/promo")}`);
      return;
    }
    if (!promo.kode) {
      toast.info("Promo ini otomatis berlaku di checkout");
      return;
    }
    if (claimed.has(promo.id)) {
      toast.info("Voucher sudah pernah diklaim");
      return;
    }

    setClaimLoading(promo.id);
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
          setClaimed((s) => new Set(s).add(promo.id));
          toast.info("Voucher sudah pernah diklaim");
        } else {
          toast.error(msg);
        }
        return;
      }
      setClaimed((s) => new Set(s).add(promo.id));
      toast.success(`Voucher ${promo.kode} berhasil diklaim!`);
      addNotif({
        title: "Voucher Berhasil Diklaim!",
        body: `Voucher ${promo.judul} sudah masuk ke dompetmu. Bisa langsung dipakai saat checkout!`,
        type: "promo",
        link: "/checkout",
      });
    } catch {
      toast.error("Gagal klaim voucher, coba lagi");
    } finally {
      setClaimLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      {/* === HERO BANNER === */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-orange via-brand-rust to-brand-rust-dark px-4 pb-14 pt-6 text-white">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-bebas text-2xl tracking-wider">PROMO & VOUCHER</h1>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Percent className="h-7 w-7 text-amber-200" />
            <div>
              <p className="font-bebas text-3xl tracking-wider">
                HEMAT TIAP HARI
              </p>
              <p className="text-xs text-white/80">
                Klaim voucher & nikmati diskon spesial Jogjadoelan
              </p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* === TAB FILTER === */}
      <div className="sticky top-0 z-20 -mt-6 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto max-w-3xl overflow-x-auto px-4 py-3">
          <div className="flex gap-2">
            {(
              ["semua", "ongkir", "diskon", "cashback", "voucher"] as const
            ).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
                  tab === t
                    ? "bg-brand-orange text-white shadow"
                    : "bg-brand-cream-light text-brand-black/60 hover:bg-brand-cream"
                }`}
              >
                {t === "semua" ? "Semua Promo" : TIPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === GRID PROMO === */}
      <div className="container mx-auto max-w-3xl space-y-4 px-4 py-5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-brand-cream bg-white py-16 text-center shadow-sm">
            <Tag className="mx-auto h-12 w-12 text-brand-black/30" />
            <p className="mt-3 text-sm font-bold text-brand-black">
              Belum ada promo kategori ini
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            const Icon = TIPE_ICON[p.tipe];
            const sisa = daysLeft(p.berakhir);
            const sudahKlaim = claimed.has(p.id);
            const loading = claimLoading === p.id;
            return (
              <article
                key={p.id}
                className="group relative overflow-hidden rounded-2xl border border-brand-cream bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-pop"
              >
                {/* Banner gradient + image */}
                <div
                  className={`relative h-32 bg-gradient-to-br ${p.warna} overflow-hidden`}
                >
                  {p.banner && (
                    <Image
                      src={p.banner}
                      alt={p.judul}
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover opacity-30 mix-blend-overlay"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 shadow">
                    <Icon className="h-3.5 w-3.5 text-brand-orange" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-black">
                      {TIPE_LABEL[p.tipe]}
                    </span>
                  </div>
                  <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-white backdrop-blur">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px] font-bold">
                      {sisa > 0 ? `${sisa} hari lagi` : "Berakhir"}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <p className="font-bebas text-3xl tracking-wider text-white drop-shadow-lg">
                      {p.diskonPersen
                        ? `${p.diskonPersen}% OFF`
                        : p.diskonNominal
                          ? `Rp ${(p.diskonNominal / 1000).toFixed(0)}K`
                          : "FREE"}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4">
                  <h3 className="text-sm font-black text-brand-black">{p.judul}</h3>
                  <p className="mt-0.5 text-xs text-brand-black/60">{p.subjudul}</p>
                  <ul className="mt-3 space-y-1">
                    {p.syarat.slice(0, 2).map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-[11px] text-brand-black/70"
                      >
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-orange" />
                        {s}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center gap-2 border-t border-brand-cream pt-3">
                    {p.kode && (
                      <code className="rounded border border-dashed border-brand-orange bg-orange-50 px-2.5 py-1.5 text-xs font-black text-brand-orange">
                        {p.kode}
                      </code>
                    )}
                    <Link
                      href={`/promo/${p.id}`}
                      className="ml-auto flex items-center gap-1 text-xs font-bold text-brand-black/60 hover:text-brand-orange"
                    >
                      Detail
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => handleClaim(p)}
                      disabled={sudahKlaim || sisa === 0 || loading}
                      className={`rounded-md px-4 py-2 text-xs font-black shadow transition ${
                        sudahKlaim
                          ? "bg-green-100 text-green-700"
                          : sisa === 0
                            ? "cursor-not-allowed bg-gray-200 text-gray-500"
                            : loading
                              ? "cursor-wait bg-brand-orange/60 text-white"
                              : "bg-brand-orange text-white hover:bg-brand-orange-dark"
                      }`}
                    >
                      {sudahKlaim
                        ? "Diklaim"
                        : !p.kode
                          ? "Otomatis"
                          : loading
                            ? "..."
                            : "Klaim"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
