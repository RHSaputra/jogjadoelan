"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Copy, Tag } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { type VoucherItem } from "@/lib/constants";


export default function VoucherSayaPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [list, setList] = useState<VoucherItem[]>([]);
  const [tab, setTab] = useState<"aktif" | "terpakai" | "expired">("aktif");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/akun/voucher")}`);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

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
        setList(raw.map((u) => ({
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
      .catch(() => setList([]));
  }, [user]);

  function handleCopy(kode: string) {
    navigator.clipboard.writeText(kode);
    setCopied(kode);
    setTimeout(() => setCopied(null), 1200);
  }

  const now = useSyncExternalStore(
    () => () => {},
    () => Date.now(),
    () => 0,
  );
  const filtered = useMemo(() => {
    return list.filter((v) => {
      const expiredTime = new Date(v.expired).getTime();
      const isExpired = expiredTime < now;
      if (tab === "aktif") return !v.digunakan && !isExpired;
      if (tab === "terpakai") return v.digunakan;
      if (tab === "expired") return !v.digunakan && isExpired;
      return true;
    });
  }, [list, tab, now]);

  if (!mounted || authLoading) return <div className="min-h-screen bg-brand-cream-light" />;

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link href="/akun" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black text-brand-black">Voucher Saya</h1>
            <p className="text-xs text-brand-black/50">{list.length} voucher</p>
          </div>
          <Link href="/promo" className="rounded-md bg-brand-orange px-3 py-2 text-xs font-black text-white shadow hover:bg-brand-orange-dark">
            Klaim Lagi
          </Link>
        </div>
        <div className="container mx-auto flex gap-1 border-t border-brand-cream px-4 py-2">
          {(["aktif", "terpakai", "expired"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-bold capitalize transition ${
                tab === t ? "bg-brand-orange text-white shadow" : "text-brand-black/60 hover:bg-gray-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-3 px-4 py-5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-brand-cream bg-white py-16 text-center shadow-sm">
            <Tag className="mx-auto h-12 w-12 text-brand-black/30" />
            <p className="mt-3 text-sm font-bold text-brand-black">Belum ada voucher {tab}</p>
            {tab === "aktif" && (
              <Link href="/promo" className="mt-4 inline-block rounded-md bg-brand-orange px-5 py-2.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark">
                Lihat Promo
              </Link>
            )}
          </div>
        ) : (
          filtered.map((v) => {
            const isExpired = new Date(v.expired).getTime() < now;
            const disabled = v.digunakan || isExpired;
            return (
              <div key={v.id} className={`relative overflow-hidden rounded-2xl border border-brand-cream bg-white shadow-sm ${disabled ? "opacity-60" : ""}`}>
                <div className="flex">
                  {/* Kiri - icon */}
                  <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-brand-orange p-3 text-white">
                    <Tag className="h-7 w-7" />
                    <p className="mt-1 text-[9px] font-black uppercase">Voucher</p>
                  </div>
                  {/* Kanan - info */}
                  <div className="flex-1 p-4">
                    <p className="text-sm font-black text-brand-black">{v.judul}</p>
                    <p className="mt-0.5 text-[11px] text-brand-black/50">
                      Min belanja Rp {v.minBelanja.toLocaleString("id-ID")} · s/d {new Date(v.expired).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="rounded bg-brand-cream px-2 py-1 text-xs font-bold text-brand-black">{v.kode}</code>
                      {!disabled && (
                        <button onClick={() => handleCopy(v.kode)} className="flex h-7 w-7 items-center justify-center rounded text-brand-orange hover:bg-orange-50">
                          {copied === v.kode ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}

                    </div>
                    {v.digunakan && <p className="mt-2 text-[10px] font-black uppercase text-green-700">Sudah Digunakan</p>}
                    {!v.digunakan && isExpired && <p className="mt-2 text-[10px] font-black uppercase text-red-600">Kadaluarsa</p>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}