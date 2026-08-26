"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Repeat, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useKomplain } from "@/lib/komplain-context";
import { getOrder } from "@/lib/orders-storage";
import { createTukar, getTukarByKomplain, type AlamatTujuan } from "@/lib/tukar-helpers";
import { toast } from "sonner";
import { subscribeSync } from "@/lib/sync-events";

const UKURAN_OPTIONS = ["S", "M", "L", "XL", "XXL"];

type TukarItemSource = {
  productId?: string | number;
  id?: string | number;
  nama?: string;
  productNama?: string | null;
  name?: string | null;
  gambar?: string | null;
  image?: string | null;
  productGambar?: string | null;
  ukuran?: string | null;
  size?: string | null;
  warna?: string | null;
  color?: string | null;
};

export default function TukarFormPage() {
  const { komplainId } = useParams<{ komplainId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { get, patch, hydrated, addSystemLog } = useKomplain();

  const k = useMemo(() => get(komplainId), [get, komplainId]);
  const [order, setOrder] = useState<Awaited<ReturnType<typeof getOrder>>>(null);
  useEffect(() => {
    if (!k || !user?.id) {
      void Promise.resolve().then(() => setOrder(null));
      return;
    }
    let c = false;
    (async () => { const o = await getOrder(user.id, k.orderId); if (!c) setOrder(o); })();
    return () => { c = true; };
  }, [k, user?.id]);

  /* Ambil item pertama dari order sebagai default target tukar */
  const firstItem = useMemo<TukarItemSource | null>(() => {
    const items = order?.items as TukarItemSource[] | undefined;
    return items && items.length > 0 ? items[0] : null;
  }, [order]);

  const [ukuranBaru, setUkuranBaru] = useState("");
  const [warnaBaru, setWarnaBaru] = useState("");
  const [notes, setNotes] = useState("");

  /* Alamat tujuan: default dari order kalau ada */
  const ordAlamat = (order?.alamat ?? {}) as Partial<AlamatTujuan>;
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kota, setKota] = useState("");
  const [kodePos, setKodePos] = useState("");
  const [syncedAddrKey, setSyncedAddrKey] = useState<string | null>(null);
  const addrKey = hydrated
    ? `${ordAlamat.nama ?? ""}|${ordAlamat.hp ?? ""}|${ordAlamat.alamat ?? ""}|${ordAlamat.kota ?? ""}|${ordAlamat.kodePos ?? ""}`
    : null;
  if (addrKey !== syncedAddrKey) {
    setSyncedAddrKey(addrKey);
    setNama(ordAlamat.nama ?? "");
    setHp(ordAlamat.hp ?? "");
    setAlamat(ordAlamat.alamat ?? "");
    setKota(ordAlamat.kota ?? "");
    setKodePos(ordAlamat.kodePos ?? "");
  }

  const [submitting, setSubmitting] = useState(false);

  /* Kalau tukar sudah ada, redirect ke sukses */
  useEffect(() => {
    if (!user?.id || !hydrated) return;

    let active = true;

    async function checkExisting() {
      const existing = await getTukarByKomplain(komplainId);

      if (active && existing) {
        router.replace(`/tukar/${komplainId}/sukses`);
      }
    }

    void checkExisting();

    const unsub = subscribeSync("tukar", () => {
      void checkExisting();
    });

    return () => {
      active = false;
      unsub();
    };
  }, [user?.id, komplainId, hydrated, router]);

  if (!hydrated) return <div className="min-h-screen bg-brand-cream-light" />;
  if (!k) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-zinc-500">
        <Link href="/tukar" className="mb-4 inline-flex items-center text-sm text-zinc-600">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Link>
        <p>Komplain tidak ditemukan.</p>
      </div>
    );
  }
  if (k.tindakan !== "tukar") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-zinc-500">
        Komplain ini bukan tindakan tukar.
      </div>
    );
  }
  if (k.status !== "disetujui") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-zinc-500">
        <Link href={`/komplain/${komplainId}`} className="mb-4 inline-flex items-center text-sm text-zinc-600">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Link>
        <p>Formulir hanya bisa diisi setelah komplain disetujui admin.</p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!user?.id || !k || !firstItem) {
      toast.error("Data produk tidak lengkap");
      return;
    }
    if (!ukuranBaru.trim()) {
      toast.error("Ukuran baru wajib dipilih");
      return;
    }
    if (!nama.trim() || !hp.trim() || !alamat.trim() || !kota.trim() || !kodePos.trim()) {
      toast.error("Alamat tujuan harus lengkap");
      return;
    }
    setSubmitting(true);
    try {
    await createTukar({
  komplainId,
  productId: String(firstItem.productId ?? firstItem.id ?? ""),
  productNama: String(firstItem.nama ?? firstItem.productNama ?? firstItem.name ?? "Produk"),
  productGambar: firstItem.gambar ?? firstItem.image ?? firstItem.productGambar ?? null,
  ukuranLama: firstItem.ukuran ?? firstItem.size ?? undefined,
  ukuranBaru: ukuranBaru.trim(),
  warnaLama: firstItem.warna ?? firstItem.color ?? undefined,
  warnaBaru: warnaBaru.trim() || undefined,
  notes: notes.trim() || undefined,
  alamatTujuan: {
    nama: nama.trim(),
    hp: hp.trim(),
    alamat: alamat.trim(),
    kota: kota.trim(),
    kodePos: kodePos.trim(),
  },
});
      patch(komplainId, {
        status: "menunggu_review_admin",
        tukarForm: {
          nama: nama.trim(),
          noResi: "",
          buktiResiUrl: "",
          submittedAt: new Date().toISOString(),
        },
      });
      addSystemLog(
        komplainId,
        `Customer mengirim formulir tukar. Ukuran baru: ${ukuranBaru.trim()}${warnaBaru ? ` / Warna: ${warnaBaru.trim()}` : ""}.`
      );
      toast.success("Formulir tukar terkirim");
      router.replace(`/tukar/${komplainId}/sukses`);
    } catch {
      toast.error("Gagal menyimpan formulir");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      <div className="sticky top-0 z-30 border-b border-brand-cream bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
          <Link href={`/komplain/${komplainId}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-brand-cream-light transition-colors">
            <ChevronLeft className="h-5 w-5 text-brand-black" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-brand-black">Formulir Tukar Barang</h1>
            <p className="text-[10px] font-bold text-brand-black/40 uppercase tracking-widest">{komplainId}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 pt-4">
        <Card className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-amber-600" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-900">Detail Tukar / Redesain</h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Pilih varian pengganti & isi alamat tujuan pengiriman barang baru. Admin akan memverifikasi stok sebelum approve.
              </p>
            </div>
          </div>
        </Card>

        {/* Produk target */}
        {firstItem && (
          <Card className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-widest text-brand-black/40 mb-3">Produk Asli</div>
            <div className="flex gap-3">
              {(firstItem.gambar ?? firstItem.image ?? firstItem.productGambar) ? (
                <Image
                  src={firstItem.gambar ?? firstItem.image ?? firstItem.productGambar ?? ""}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-xl border-2 border-brand-cream object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-brand-cream-light" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-brand-black truncate">
                  {firstItem.nama ?? firstItem.productNama ?? firstItem.name ?? "Produk"}
                </div>
                <div className="mt-1 text-[11px] font-bold text-brand-black/60">
                  {firstItem.ukuran && <span>Ukuran: {firstItem.ukuran} </span>}
                  {firstItem.warna && <span>· Warna: {firstItem.warna}</span>}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Varian baru */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm space-y-4">
          <div className="text-[11px] font-black uppercase tracking-widest text-brand-black/40">Varian Pengganti</div>

          <div>
            <Label className="text-xs font-black text-brand-black">
              Ukuran Baru <span className="text-brand-orange">*</span>
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {UKURAN_OPTIONS.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setUkuranBaru(sz)}
                  className={`h-10 min-w-[3rem] rounded-xl border-2 px-4 text-xs font-black transition ${
                    ukuranBaru === sz
                      ? "border-brand-orange bg-brand-orange text-white"
                      : "border-brand-cream bg-white text-brand-black hover:border-brand-orange"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-black text-brand-black">Warna Baru (opsional)</Label>
            <Input
              value={warnaBaru}
              onChange={(e) => setWarnaBaru(e.target.value)}
              placeholder="Contoh: Hitam, Coklat tua, dll."
              className="mt-2 h-12 w-full rounded-xl border-2 border-brand-cream px-4 text-sm font-bold focus:border-brand-orange transition"
            />
          </div>

          <div>
            <Label className="text-xs font-black text-brand-black">Catatan Tambahan (opsional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Misal: minta perbaikan strap, redesain logo, dll."
              className="mt-2 w-full rounded-xl border-2 border-brand-cream px-4 py-3 text-sm font-medium focus:border-brand-orange focus:outline-none transition resize-none"
            />
          </div>
        </Card>

        {/* Alamat tujuan */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm space-y-4">
          <div className="text-[11px] font-black uppercase tracking-widest text-brand-black/40">Alamat Tujuan Pengiriman Pengganti</div>

          <div>
            <Label className="text-xs font-black text-brand-black">Nama Penerima <span className="text-brand-orange">*</span></Label>
            <Input value={nama} onChange={(e) => setNama(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border-2 border-brand-cream px-4 text-sm font-bold focus:border-brand-orange transition" />
          </div>
          <div>
            <Label className="text-xs font-black text-brand-black">No. HP <span className="text-brand-orange">*</span></Label>
            <Input value={hp} onChange={(e) => setHp(e.target.value.replace(/\D/g, ""))} inputMode="tel"
              className="mt-2 h-12 w-full rounded-xl border-2 border-brand-cream px-4 text-sm font-bold focus:border-brand-orange transition" />
          </div>
          <div>
            <Label className="text-xs font-black text-brand-black">Alamat Lengkap <span className="text-brand-orange">*</span></Label>
            <textarea value={alamat} onChange={(e) => setAlamat(e.target.value)} rows={2}
              className="mt-2 w-full rounded-xl border-2 border-brand-cream px-4 py-3 text-sm font-bold focus:border-brand-orange focus:outline-none transition resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-black text-brand-black">Kota <span className="text-brand-orange">*</span></Label>
              <Input value={kota} onChange={(e) => setKota(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border-2 border-brand-cream px-4 text-sm font-bold focus:border-brand-orange transition" />
            </div>
            <div>
              <Label className="text-xs font-black text-brand-black">Kode Pos <span className="text-brand-orange">*</span></Label>
              <Input value={kodePos} onChange={(e) => setKodePos(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={5}
                className="mt-2 h-12 w-full rounded-xl border-2 border-brand-cream px-4 text-sm font-bold focus:border-brand-orange transition" />
            </div>
          </div>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-full bg-brand-orange hover:bg-brand-orange-dark h-12 text-xs font-black uppercase tracking-widest shadow-md transition-all disabled:opacity-50"
        >
          <Repeat className="mr-2 h-4 w-4" />
          {submitting ? "Mengirim..." : "Kirim Formulir Tukar"}
        </Button>
      </div>
    </div>
  );
}