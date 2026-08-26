"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, HelpCircle, MessageCircle, ArrowLeft, X } from "lucide-react";
import { getFaqListAsync, type FaqItem } from "@/lib/admin-toko-master-helpers";

export default function BantuanPage() {
  const router = useRouter();
  const [list, setList] = useState<FaqItem[]>([]);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const all = await getFaqListAsync();
      if (!cancelled) setList(all.filter((f) => f.aktif).sort((a, b) => a.urutan - b.urutan));
    }
    void load();
    // Live sync: event listener + polling
    const sync = () => void load();
    window.addEventListener("jogjadoelan_faq_changed", sync);
    const t = window.setInterval(() => { if (!cancelled) void load(); }, 30000);
    return () => {
      cancelled = true;
      window.removeEventListener("jogjadoelan_faq_changed", sync);
      window.clearInterval(t);
    };
  }, []);

  const kategoris = ["All", ...Array.from(new Set(list.map((f) => f.kategori)))];
  const filtered = list
    .filter((f) => filter === "All" || f.kategori === filter)
    .filter((f) => !q || f.pertanyaan.toLowerCase().includes(q.toLowerCase()) || f.jawaban.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      {/* HEADER NAV */}
      <div className="sticky top-0 z-30 border-b border-brand-cream bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-brand-cream transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-brand-black" />
          </button>
          <h1 className="text-base font-black text-brand-black">Pusat Bantuan</h1>
        </div>
      </div>

      {/* HERO HEADER */}
      <div className="border-b border-brand-cream bg-white px-4 py-10 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-orange/10 sm:h-12 sm:w-12">
              <HelpCircle className="h-5 w-5 text-brand-orange sm:h-6 sm:w-6" />
            </div>
            <h1 className="text-3xl font-black text-brand-black sm:text-4xl">
              Ada yang bisa kami <span className="text-brand-orange">bantu?</span>
            </h1>
          </div>
          <p className="mt-2 text-sm font-medium text-brand-black/60">
            Pertanyaan yang paling sering ditanyakan pelanggan Jogjadoelan
          </p>

          {/* SEARCH BAR */}
          <div className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-full border-2 border-brand-cream bg-brand-cream-light px-2 py-1.5 transition-colors focus-within:border-brand-orange">
            <Search className="ml-3 h-5 w-5 flex-shrink-0 text-brand-black/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari pertanyaan..."
              className="flex-1 bg-transparent px-2 py-2 text-sm font-bold text-brand-black placeholder:text-brand-black/40 focus:outline-none"
            />
            {q && (
              <button onClick={() => setQ("")} className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-black/10 text-brand-black/60 hover:bg-brand-black/20">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* CHIPS KATEGORI */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {kategoris.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full border-2 px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
                filter === k
                  ? "border-brand-orange bg-brand-orange text-white shadow-sm"
                  : "border-brand-cream bg-white text-brand-black hover:border-brand-orange hover:text-brand-orange"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* LIST / EMPTY STATE */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-brand-cream bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-cream-light">
              <HelpCircle className="h-6 w-6 text-brand-black/40" />
            </div>
            <p className="text-sm font-black uppercase text-brand-black">
              {q ? "Pencarian Tidak Ditemukan" : "Belum ada FAQ"}
            </p>
            <p className="mt-1 text-xs font-bold text-brand-black/60">
              {q ? "Coba gunakan kata kunci lain." : "Admin belum nambahin pertanyaan"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((f, i) => {
              const isOpen = open === f.id;
              return (
                <div
                  key={f.id}
                  className={`overflow-hidden rounded-2xl border-2 bg-white transition-all ${
                    isOpen ? "border-brand-orange shadow-sm" : "border-brand-cream hover:border-brand-orange/50"
                  }`}
                >
                  <button onClick={() => setOpen(isOpen ? null : f.id)} className="flex w-full items-start gap-4 p-4 text-left">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg font-black transition-colors ${isOpen ? "bg-brand-orange text-white" : "bg-brand-cream-light text-brand-black/60"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="mb-1.5 inline-block rounded bg-brand-cream-light px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-black/60">
                        {f.kategori}
                      </span>
                      <p className="text-sm font-black leading-snug text-brand-black">{f.pertanyaan}</p>
                    </div>
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all ${isOpen ? "rotate-180 text-brand-orange" : "text-brand-black/40"}`}>
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </button>
                  
                  {/* EXPANDED CONTENT */}
                  {isOpen && (
                    <div className="border-t border-brand-cream bg-[#FAF9F5] px-5 py-4 sm:pl-[68px]">
                      <div className="space-y-2 text-xs font-medium leading-relaxed text-brand-black/80">
                        {f.jawaban.split("\n").filter((p) => p.trim()).map((p, idx) => (
                          <p key={idx}>{p}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CTA BANTUAN LANJUT - ORANGE & LIVE CHAT */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-brand-cream bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange/10">
            <MessageCircle className="h-6 w-6 text-brand-orange" />
          </div>
          <h3 className="text-lg font-black uppercase text-brand-black">
            Butuh Bantuan Langsung?
          </h3>
          <p className="mt-1 text-xs font-medium text-brand-black/60">
            Tim admin kami siap membalas pesan Anda di jam operasional toko melalui Live Chat.
          </p>
          {/* FIXED: Menggunakan Next.js Link ke /chat dengan parameter context agar muncul referensi card di chat */}
          <Link
            href="/chat?context=pusat_bantuan"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-orange px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md transition hover:bg-brand-orange-dark"
          >
            <MessageCircle className="h-4 w-4" fill="currentColor" />
            Chat Admin
          </Link>
        </div>
      </div>
    </div>
  );
}