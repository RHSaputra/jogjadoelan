"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, ShoppingBag, Star, Trash2, Video, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { getUlasans, deleteUlasan, UlasanFile } from "@/lib/ulasan-helpers";
import { Card } from "@/components/ui/card";

interface UlasanData {
  id: string;
  orderId: string;
  productId: string;
  productNama: string;
  productGambar?: string | null;
  rating: number;
  komentar: string;
  balasanAdmin?: string;
  files?: UlasanFile[];
  createdAt: string;
}

export default function UlasanSayaPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [list, setList] = useState<UlasanData[]>([]);
  const [filter, setFilter] = useState<"semua" | 5 | 4 | 3 | 2 | 1>("semua");

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/akun/ulasan")}`);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const data = await getUlasans(user.id);
      if (cancelled) return;
      // Map UlasanDTO -> UlasanData shape used by this page
      const mapped: UlasanData[] = data.map((u) => ({
        id: u.id,
        orderId: u.orderId,
        productId: u.produkId,
        productNama: u.produkNama ?? "",
        productGambar: u.produkGambar ?? null,
        rating: u.rating,
        komentar: u.komentar,
        balasanAdmin: u.balasan ?? undefined,
        files: (u.foto ?? []).map((f) => ({ url: f.url, type: f.type, name: f.name })),
        createdAt: u.createdAt,
      }));
      setList(mapped);
    })();
    return () => { cancelled = true; };
  }, [user]);

  async function handleHapus(ulasanId: string) {
    if (!user) return;
    try {
      await deleteUlasan(ulasanId);
      setList((prev) => prev.filter((u) => u.id !== ulasanId));
      toast.success("Ulasan berhasil dihapus", {
        description: "Review telah dihapus dari daftar ulasanmu.",
      });
    } catch (e) {
      toast.error("Gagal menghapus ulasan", {
        description: e instanceof Error ? e.message : "Coba lagi.",
      });
    }
  }

  const filtered = useMemo(() => {
    let l = list;
    if (filter !== "semua") l = l.filter((u) => u.rating === filter);
    return [...l].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [list, filter]);

  const stats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    list.forEach((u) => {
      if (u.rating >= 1 && u.rating <= 5) counts[u.rating - 1]++;
    });
    const avg = list.length
      ? list.reduce((sum, u) => sum + u.rating, 0) / list.length
      : 0;
    return { counts, avg, total: list.length };
  }, [list]);

  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-20">
     {/* Header Normal */}
      <div className="relative border-b border-brand-krem bg-brand-cream-light pb-4 pt-6">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4">
          {/* Tombol Back dibuat diam (animasi geser dihapus) */}
          <Link
            href="/akun"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-brand-krem transition-colors hover:border-brand-orange hover:text-brand-orange"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-brand-black">
            Ulasan Saya
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-5">
        {/* Card Statistik Rating */}
        {list.length > 0 && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 overflow-hidden rounded-[20px] border border-brand-cream bg-white p-5 shadow-sm duration-500">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-black/40">Statistik Ulasan</h3>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Rata-rata */}
              <div className="flex flex-col items-center justify-center rounded-2xl bg-brand-cream/30 py-4 sm:w-1/3 border border-brand-cream">
                <div className="text-4xl font-black text-brand-orange drop-shadow-sm">
                  {stats.avg.toFixed(1)}
                </div>
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <Star
                      key={r}
                      className={`h-3.5 w-3.5 ${
                        r <= Math.round(stats.avg)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] font-bold text-brand-black/40">
                  {stats.total} TOTAL
                </p>
              </div>

              {/* Progress Bars */}
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((r) => {
                  const c = stats.counts[r - 1];
                  const pct = stats.total ? (c / stats.total) * 100 : 0;
                  return (
                    <div key={r} className="flex items-center gap-3 text-[11px]">
                      <div className="flex w-6 items-center justify-end gap-1 font-bold text-brand-black/70">
                        {r} <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-cream">
                        <div
                          className="h-full rounded-full bg-yellow-400 transition-all duration-1000"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-5 font-medium text-brand-black/50 text-right">{c}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Filter Pills */}
        {list.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(["semua", 5, 4, 3, 2, 1] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold transition-all duration-300 ${
                  filter === f
                    ? "bg-brand-orange text-white shadow-md shadow-brand-orange/20 border border-brand-orange"
                    : "bg-white text-brand-black/60 hover:bg-brand-cream/50 border border-brand-cream shadow-sm"
                }`}
              >
                {f === "semua" ? (
                  "Semua"
                ) : (
                  <>
                    Bintang {f}
                    <Star className={`h-3 w-3 ${filter === f ? "fill-white" : "fill-yellow-400 text-yellow-400"}`} />
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {/* List Ulasan / Empty State */}
        {filtered.length === 0 ? (
          <div className="animate-in fade-in zoom-in-95 flex flex-col items-center justify-center rounded-[24px] bg-white border border-brand-cream px-6 py-12 text-center shadow-sm duration-500">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-cream/50">
              <Star className="h-8 w-8 text-brand-orange/40" />
            </div>
            <h2 className="text-base font-black text-brand-black">
              {list.length === 0 ? "Belum Ada Ulasan" : "Ulasan Tidak Ditemukan"}
            </h2>
            <p className="mt-1.5 text-xs text-brand-black/50 max-w-[220px]">
              {list.length === 0 
                ? "Bagikan pengalamanmu berbelanja untuk membantu pembeli lain." 
                : "Tidak ada ulasan dengan rating bintang tersebut."}
            </p>
            {list.length === 0 && (
              <Link
                href="/pesanan"
                className="mt-6 flex h-10 items-center gap-2 rounded-full bg-brand-orange px-6 text-xs font-bold text-white transition-transform hover:scale-105 active:scale-95 shadow-md shadow-brand-orange/20"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Mulai Belanja
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((u, index) => (
              <Card
                key={u.id}
                className="animate-in fade-in slide-in-from-bottom-4 group overflow-hidden rounded-[20px] border border-brand-cream bg-white shadow-sm transition-all hover:border-brand-orange/50 hover:shadow-md duration-300 flex flex-col"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Area Atas (Bisa diklik menuju detail pesanan) */}
                <Link href={`/pesanan/${u.orderId}`} className="flex-1 cursor-pointer p-4 pb-3">
                  {/* Header Produk Ringkas */}
                  <div className="mb-3 flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-brand-cream border border-brand-cream/50 shadow-sm">
                      {u.productGambar ? (
                        <Image
                          src={u.productGambar}
                          alt="Produk"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-brand-cream-light" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-brand-black transition-colors group-hover:text-brand-orange">
                        {u.productNama || "Produk tidak ditemukan"}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-brand-black/40">
                        <span>ID: {u.orderId.substring(0, 8)}...</span>
                        <div className="h-1 w-1 rounded-full bg-brand-krem" />
                        <span className="flex items-center gap-0.5 text-brand-black/50 group-hover:text-brand-orange">
                          Lihat Pesanan <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating & Tanggal */}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <Star
                          key={r}
                          className={`h-3.5 w-3.5 ${
                            r <= u.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-gray-200 text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-brand-black/40">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Teks Ulasan */}
                  <p className="line-clamp-3 text-xs leading-relaxed text-brand-black/80">
                    &quot;{u.komentar}&quot;
                  </p>

                 {/* Media Ulasan */}
                  {u.files && u.files.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {u.files.map((file, i) => (
                        <div
                          key={i}
                          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-brand-cream"
                        >
                          {file.type === "image" ? (
                            <Image src={file.url} alt="Media" width={48} height={48} className="h-full w-full object-cover" />
                          ) : (
                            <div className="relative h-full w-full">
                              <video src={file.url} className="h-full w-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Video className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* KOTAK BALASAN ADMIN JOGJADOELAN */}
                  {u.balasanAdmin && (
                    <div className="mt-3 rounded-xl border border-brand-orange/20 bg-orange-50/50 p-3">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-brand-orange">
                        Balasan Admin:
                      </p>
                      <p className="text-[11px] font-medium italic leading-relaxed text-brand-black/80">
                        &quot;{u.balasanAdmin}&quot;
                      </p>
                    </div>
                  )}
                  
                </Link>

                {/* Area Bawah (Action Buttons) */}
                <div className="flex items-center gap-2 bg-brand-cream/10 p-3 pt-2 border-t border-brand-cream">
                  <Link
                    href={`/ulasan/${u.orderId}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white border border-brand-cream py-2 text-[11px] font-bold text-brand-black/70 transition-all hover:border-brand-orange hover:text-brand-orange hover:bg-brand-orange/5 shadow-sm"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleHapus(u.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white border border-red-100 py-2 text-[11px] font-bold text-red-600 transition-all hover:border-red-500 hover:bg-red-50 shadow-sm"
                  >
                    <Trash2 className="h-3 w-3" />
                    Hapus
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}