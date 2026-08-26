"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Camera, Video, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getOrder } from "@/lib/orders-storage";
import { useNotifikasi } from "@/lib/notifikasi-context";
import {
  useKomplain,
  JENIS_KOMPLAIN,
  type KomplainJenis,
  type KomplainTindakan,
  type KomplainFile,
} from "@/lib/komplain-context";

/* Standar 5MB Jogjadoelan */
const MAX_FILE_MB = 5;

/* K6: 3 opsi tindakan dengan label deskriptif */
const TINDAKAN_OPSI: {
  id: KomplainTindakan;
  judul: string;
  deskripsi: string;
}[] = [
  {
    id: "refund",
    judul: "Refund",
    deskripsi: "Uang dikembalikan",
  },
  {
    id: "tukar",
    judul: "Tukar",
    deskripsi: "Ganti unit/varian",
  },
  {
    id: "komplain_saja",
    judul: "Komplain Saja",
    deskripsi: "Lapor tanpa refund/tukar",
  },
];

/** Validasi nilai query `tindakan` agar aman untuk state. */
function parseTindakan(v: string | null): KomplainTindakan {
  if (v === "tukar" || v === "komplain_saja") return v;
  return "refund";
}

function KomplainBaruInner() {
  const router = useRouter();
  const sp = useSearchParams();
  /* Mendukung pre-fill dari ?orderId=X (mis. tombol "Ajukan Komplain Baru"
     pada halaman refund/tukar ditolak) — tidak perlu logika tambahan. */
  const orderId = sp.get("orderId") ?? "";
  const tindakanParam = sp.get("tindakan");
  const { user } = useAuth();
    const { add } = useKomplain();
  const { addNotif } = useNotifikasi();

  const [jenis, setJenis] = useState<KomplainJenis | "">("");
  const [deskripsi, setDeskripsi] = useState("");
  /* FIX: hormati ?tindakan=refund|tukar|komplain_saja dari pesanan */
  const [tindakan, setTindakan] = useState<KomplainTindakan>(() =>
    parseTindakan(tindakanParam),
  );
  const [files, setFiles] = useState<KomplainFile[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [order, setOrder] = useState<Awaited<ReturnType<typeof getOrder>>>(null);

useEffect(() => {
  if (!user?.id || !orderId) {
    void Promise.resolve().then(() => setOrder(null));
    return;
  }

  let active = true;

  getOrder(user.id, orderId).then((o) => {
    if (active) {
      setOrder(o);
    }
  });

  return () => {
    active = false;
  };
}, [user?.id, orderId]);

useEffect(() => {
  if (!orderId) {
    toast.error("Order tidak ditemukan.");
    router.replace("/pesanan");
  }
}, [orderId, router]);

/* Sinkronkan state ketika query berubah (mis. user balik & ganti tindakan) */
const [prevTindakanParam, setPrevTindakanParam] = useState(tindakanParam);
if (tindakanParam !== prevTindakanParam) {
  setPrevTindakanParam(tindakanParam);
  setTindakan(parseTindakan(tindakanParam));
}

  function readFiles(list: FileList, type: "image" | "video") {
    const arr = Array.from(list);
    arr.forEach((f) => {
      /* Validasi Master 5MB */
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`File "${f.name}" melebihi batas maksimal ${MAX_FILE_MB}MB.`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setFiles((prev) => [...prev, { url: reader.result as string, type, name: f.name }]);
        }
      };
      reader.readAsDataURL(f);
    });
  }

  function pickPhoto() {
    setPickerOpen(false);
    fileInputRef.current?.click();
  }
  function pickVideo() {
    setPickerOpen(false);
    videoInputRef.current?.click();
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

    async function handleSubmit() {
    if (submitting) return;

    if (!jenis) {
      return toast.error("Pilih jenis komplain.");
    }

    if (deskripsi.trim().length < 10) {
      return toast.error("Deskripsi minimal 10 karakter.");
    }

    if (files.length === 0) {
      return toast.error("Lampirkan minimal 1 foto/video bukti.");
    }

    setSubmitting(true);

    try {
      const jenisLabel =
        JENIS_KOMPLAIN.find((j) => j.id === jenis)?.label ?? jenis;

      const k = await add({
        orderId,
        jenis: jenis as KomplainJenis,
        jenisLabel,
        deskripsi: deskripsi.trim(),
        tindakan,
        files,
      });

      addNotif({
        title: "Komplain Terkirim",
        body: `Keluhan untuk pesanan ${orderId} telah masuk. Silakan pantau status pengajuannya ya!`,
        type: "komplain",
        link:
          tindakan === "refund"
            ? `/refund/${k.id}`
            : tindakan === "tukar"
              ? `/tukar/${k.id}`
              : `/komplain/${k.id}`,
      });

      toast.success("Komplain terkirim! Menunggu peninjauan admin.");
      router.push(`/komplain/${k.id}`);
    } catch (e) {
      toast.error("Gagal mengajukan komplain", {
        description: e instanceof Error ? e.message : "Coba ulangi.",
      });
    } finally {
      setSubmitting(false);
    }
  }
  
  return (
    <div className="min-h-screen bg-brand-cream-light pb-20">
      {/* Header Signature Style - DILEBARKAN (max-w-2xl) */}
      <div className="sticky top-0 z-30 border-b border-brand-cream bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
          <button 
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-brand-cream-light transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-brand-black" />
          </button>
          <h1 className="text-base font-black text-brand-black">Ajukan Komplain</h1>
          <span className="ml-auto text-[10px] font-mono font-bold text-brand-black/30 uppercase tracking-widest">Baru</span>
        </div>
      </div>

      {/* Kontainer Utama - DILEBARKAN (max-w-2xl) */}
      <div className="container mx-auto max-w-2xl px-4 pt-4">
        {/* Konten Asli Tetap Utuh, hanya diatur styling agar sesuai tema */}
        <div className="mb-3">
          <h1 className="text-xl font-black text-brand-black">Komplain</h1>
          <p className="text-xs font-bold text-brand-black/60">
            Kode Pesanan: <span className="font-mono text-brand-orange">{orderId}</span>
          </p>
        </div>

        {order && (
          <Card className="mb-4 p-4 rounded-2xl border-brand-cream shadow-sm">
            <div className="flex gap-4">
              {order.items[0]?.gambar ? (
                <Image
                  src={order.items[0].gambar}
                  alt={order.items[0].nama}
                  width={56}
                  height={56}
                  className="h-16 w-16 rounded-xl border-2 border-brand-cream object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-brand-cream-light" />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-black text-brand-black">{order.items[0]?.nama}</div>
                <div className="text-[11px] font-bold text-brand-black/50">
                  {order.items[0]?.ukuran} · x{order.items[0]?.qty}
                </div>
                <div className="mt-1 text-sm font-black text-brand-orange">
                  Rp {order.total.toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="space-y-5 p-5 rounded-2xl border-brand-cream shadow-sm">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-brand-black/40">Detail Masalah</h2>

          <div className="space-y-2">
            <Label className="text-xs font-black text-brand-black">Jenis Komplain *</Label>
            <Select value={jenis} onValueChange={(v) => setJenis(v as KomplainJenis)}>
              <SelectTrigger className="h-12 w-full rounded-xl border-2 border-brand-cream bg-brand-cream-light/20 px-4 text-sm font-bold text-brand-black outline-none transition focus:border-brand-orange focus:ring-0">
                <SelectValue placeholder="Pilih jenis komplain" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-brand-cream shadow-lg">
                {JENIS_KOMPLAIN.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black text-brand-black">Deskripsi Masalah *</Label>
            <Textarea
              placeholder="Ceritakan masalah Anda secara detail..."
              rows={4}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="min-h-[120px] w-full rounded-xl border-2 border-brand-cream bg-white p-4 text-sm font-medium text-brand-black placeholder:text-brand-black/30 focus:border-brand-orange focus:outline-none focus:ring-0 transition"
            />
            <div className="text-right text-[11px] font-bold text-brand-black/30 uppercase tracking-widest">
              {deskripsi.length} karakter
            </div>
          </div>

          {/* K6: 3 opsi tindakan */}
          <div className="space-y-2">
            <Label className="text-xs font-black text-brand-black">Pilih Tindakan *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TINDAKAN_OPSI.map((opt) => {
                const active = tindakan === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTindakan(opt.id)}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition ${
                      active
                        ? "border-brand-orange bg-orange-50 shadow-sm"
                        : "border-brand-cream bg-white hover:border-brand-orange/40"
                    }`}
                  >
                    <div className={`text-[12px] font-black leading-tight ${active ? "text-brand-orange" : "text-brand-black"}`}>{opt.judul}</div>
                    <div className="mt-1 text-[9px] font-bold leading-tight text-brand-black/40 uppercase">
                      {opt.deskripsi}
                    </div>
                  </button>
                );
              })}
            </div>
            {tindakan === "komplain_saja" && (
              <p className="mt-2 rounded-md bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-800 italic">
                Pilihan ini cocok untuk laporan kualitas, masukan, atau keluhan
                tanpa permintaan refund/tukar barang.
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-xs font-black text-brand-black">Bukti Foto / Video *</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-xl border-2 border-brand-orange bg-brand-cream-light shadow-sm"
                >
                  {f.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt={f.name ?? ""} className="h-full w-full object-cover" />
                  ) : (
                    <video src={f.url} className="h-full w-full object-cover" muted />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                    {f.type === "image" ? "Foto" : "Video"}
                  </span>
                </div>
              ))}
              {files.length < 5 && (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-brand-cream bg-brand-cream-light/30 text-brand-black/40 hover:border-brand-orange hover:bg-orange-50 hover:text-brand-orange transition"
                >
                  <Plus className="h-6 w-6" />
                </button>
              )}
            </div>
            <p className="text-[10px] font-bold text-brand-black/40 italic">
              Maks {MAX_FILE_MB}MB per file. Format JPG/PNG untuk foto, MP4/MOV untuk video.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => e.target.files && readFiles(e.target.files, "image")}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              hidden
              onChange={(e) => e.target.files && readFiles(e.target.files, "video")}
            />
          </div>
        </Card>

        <Card className="mt-3 rounded-2xl border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
          <strong>Catatan:</strong>{" "}
          {tindakan === "refund"
            ? "Setelah dikirim, Anda akan langsung diarahkan ke form pengisian data rekening refund."
            : tindakan === "tukar"
              ? "Setelah dikirim, Anda akan langsung diarahkan ke form pemilihan varian tukar."
              : "Setelah dikirim, laporan akan muncul di Tukar Saya untuk dipantau."}
        </Card>

        {/* C5 FIX: Submit pindah dari sticky bottom → Card normal */}
        <Card className="mt-3 mb-6 p-3 rounded-2xl border-brand-cream shadow-sm bg-white">
          <Button
            className="w-full rounded-full bg-brand-orange py-6 text-sm font-black text-white hover:bg-brand-orange-dark transition-all shadow-lg uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Mengirim..." : "Kirim Komplain"}
          </Button>
        </Card>
      </div>

      {/* === MODAL PILIH JENIS BUKTI (foto/video) === */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-xs rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle className="text-center font-black text-brand-black">Pilih Jenis Bukti</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={pickPhoto}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-brand-cream p-5 hover:border-brand-orange transition"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-brand-orange">
                <Camera className="h-6 w-6" />
              </div>
              <span className="text-sm font-black text-brand-black">Foto</span>
            </button>
            <button
              onClick={pickVideo}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-brand-cream p-5 hover:border-brand-orange transition"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-purple-100 text-purple-600">
                <Video className="h-6 w-6" />
              </div>
              <span className="text-sm font-black text-brand-black">Video</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function KomplainBaruPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream-light" />}>
      <KomplainBaruInner />
    </Suspense>
  );
}
