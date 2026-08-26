"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  CheckCircle2,
  Truck,
  Upload,
  Copy,
  X,
  AlertCircle,
  Clock,
  MessageCircle,
  Paintbrush,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { formatTanggalJamID } from "@/lib/orders-storage";
import { useKomplain } from "@/lib/komplain-context";
import {
  TUKAR_STATUS_COLOR,
  TUKAR_STATUS_LABEL,
  cancelTukar,
  customerKirimBalikTukar,
  customerKonfirmasiVarianDiterima,
  getTukarByKomplain,
  type Tukar,
} from "@/lib/tukar-helpers";
import { toast } from "sonner";
import { subscribeSync } from "@/lib/sync-events";

const NON_CANCELABLE = new Set([
  "diterima_admin",
  "varian_baru_dikirim",
  "selesai",
  "ditolak",
  "dibatalkan",
]);

export default function TukarSuksesPage() {
  const { komplainId } = useParams<{ komplainId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { get: getKomplain, patch: patchKomplain, addSystemLog } = useKomplain();
  const [submitting, setSubmitting] = useState(false);

  const k = useMemo(() => getKomplain(komplainId), [getKomplain, komplainId]);
  const [tukar, setTukar] = useState<Tukar | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      void Promise.resolve().then(() => setTukar(null));
      return;
    }

    let active = true;

    async function loadTukar() {
      const data = await getTukarByKomplain(komplainId);

      if (active) {
        setTukar(data);
      }
    }

    void loadTukar();

    const unsub = subscribeSync("tukar", () => {
      void loadTukar();
    });

    return () => {
      active = false;
      unsub();
    };
  }, [user?.id, komplainId, tick]);

  const [resi, setResi] = useState("");
  const [bukti, setBukti] = useState<string | null>(null);
  const [kurir, setKurir] = useState("Anteraja");
  const [kurirCustom, setKurirCustom] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  function readBukti(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      toast.error(`File melebihi batas maksimal 5MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setBukti(reader.result);
    };
    reader.readAsDataURL(f);
  }

  async function handleSubmitResi() {
    if (!user?.id || !tukar) return;
    const chosenKurir = kurir === "Lainnya" ? kurirCustom.trim() : kurir;
    if (!chosenKurir) {
      toast.error("Nama ekspedisi wajib diisi");
      return;
    }
    if (!resi.trim() || !bukti) {
      toast.error("Data pengiriman belum lengkap");
      return;
    }
    setSubmitting(true);
    try {
      let buktiPath = bukti;
      if (bukti.startsWith("data:")) {
        const blob = await (await fetch(bukti)).blob();
        const fd = new FormData();
        fd.append("file", blob, "resi.png");
        fd.append("sub", "tukar");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson.data?.path) {
          throw new Error(uploadJson.error || "Gagal mengunggah foto resi");
        }
        buktiPath = uploadJson.data.path;
      }
      await customerKirimBalikTukar(tukar.id, resi.trim(), buktiPath, chosenKurir);
      addSystemLog(komplainId, `Customer mengirim balik barang lama. No. Resi ${chosenKurir}: ${resi.trim()}.`);
      toast.success("Resi pengiriman tersimpan", {
        description: "Admin akan memverifikasi setelah barang diterima.",
      });
      setResi("");
      setBukti(null);
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan resi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleKonfirmasi() {
    if (!user?.id || !tukar) return;
    setSubmitting(true);
    try {
      await customerKonfirmasiVarianDiterima(tukar.id);
      toast.success("Produk pengganti berhasil dikonfirmasi");
      patchKomplain(komplainId, { status: "berhasil" });
      addSystemLog(komplainId, "Customer mengonfirmasi barang pengganti/hasil perbaikan telah diterima. Komplain selesai.");
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal konfirmasi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!user?.id || !tukar) return;
    const reason = prompt("Alasan pembatalan:");
    if (!reason) return;
    setSubmitting(true);
    try {
      const result = await cancelTukar(tukar.id, reason.trim());
      if (!result) {
        toast.error("Pengajuan tidak dapat dibatalkan");
        return;
      }
      patchKomplain(komplainId, { status: "dibatalkan" });
      addSystemLog(komplainId, `Customer membatalkan pengajuan. Alasan: ${reason}`);
      router.push(`/tukar`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membatalkan pengajuan");
    } finally {
      setSubmitting(false);
    }
  }

  if (!k || !tukar) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-zinc-500">
        <Link href={`/komplain/${komplainId}`} className="mb-4 inline-flex items-center text-sm text-zinc-600">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Link>
        <p>Memuat data tukar&quot;|</p>
      </div>
    );
  }

  if (tukar.status === "ditolak") {
    router.replace(`/tukar/${komplainId}/ditolak`);
    return null;
  }

  const showCancel = !NON_CANCELABLE.has(tukar.status);

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      <div className="sticky top-0 z-30 border-b border-brand-cream bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
          <Link
            href={`/komplain/${komplainId}`}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-brand-cream-light transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-brand-black" />
          </Link>
          <h1 className="text-base font-black text-brand-black">Status Tukar / Redesain</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* Header status */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-brand-black/40">Kode Tukar</div>
              <div className="font-mono text-sm font-black text-brand-orange">{tukar.id}</div>
            </div>
            <Badge className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${TUKAR_STATUS_COLOR[tukar.status as keyof typeof TUKAR_STATUS_COLOR]}`}>
              {TUKAR_STATUS_LABEL[tukar.status as keyof typeof TUKAR_STATUS_LABEL]}
            </Badge>
          </div>
        </Card>

        {/* === BANNER PER STATUS === */}
        {tukar.status === "menunggu_review_admin" && (
          <Card className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <Clock className="h-8 w-8 flex-shrink-0 text-amber-600" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-amber-900">
                  Menunggu Keputusan Admin
                </h2>
                <p className="mt-2 text-xs font-medium leading-relaxed text-amber-900/80">
                  Admin memverifikasi stok ATAU menghitung estimasi biaya Redesain. Keputusan akan segera diberikan.
                </p>
              </div>
            </div>
          </Card>
        )}

        {tukar.status === "menunggu_pengiriman_balik" && (
          <Card className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
            <Truck className="mb-2 h-8 w-8 text-amber-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-amber-900">Kirim Balik Barang Lama</h2>
            <p className="mt-2 text-xs font-medium leading-relaxed text-amber-900/80">
              Pengajuan disetujui! Silakan bungkus rapi & kirim via Anteraja, lalu input resi + foto bukti.
            </p>
            {/* Tampil Catatan & Estimasi Biaya jika ada */}
            {tukar.adminCatatan && (
              <div className="mt-3 rounded-xl bg-white/60 p-3 text-xs font-bold text-amber-900 border border-amber-200">
                Catatan Admin: <span className="font-medium">{tukar.adminCatatan}</span>
              </div>
            )}
          </Card>
        )}

        {tukar.status === "dikirim_balik" && (
          <Card className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-blue-900">Barang Lama Dalam Perjalanan</h2>
            <p className="mt-2 text-xs font-medium text-blue-800">
              Resi tercatat. Tunggu admin menerima barang dan melakukan proses (Ambil Stok / Redesain).
            </p>
          </Card>
        )}

        {tukar.status === "diterima_admin" && (
          <Card className="rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <CheckCircle2 className="mb-2 h-8 w-8 text-cyan-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-cyan-900">Diproses Admin</h2>
            <p className="mt-2 text-xs font-medium text-cyan-800">
              Barang lama telah diterima. Admin sedang menyiapkan stok pengganti / melakukan pengerjaan perbaikan desain pesanan Anda.
            </p>
          </Card>
        )}

        {tukar.status === "varian_baru_dikirim" && (
          <Card className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 shadow-sm">
            <Truck className="mb-2 h-8 w-8 text-violet-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-violet-900">Produk Hasil Tukar Dikirim</h2>
            <p className="mt-2 text-xs font-medium text-violet-800">
              Cek resi ekspedisi. Harap konfirmasi jika barang sudah sampai dengan aman.
            </p>
          </Card>
        )}

        {tukar.status === "selesai" && (
          <Card className="rounded-2xl border-2 border-green-200 bg-green-50 p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-600" />
            <h2 className="text-base font-black uppercase tracking-widest text-green-900">Tukar Selesai</h2>
            <p className="mt-2 text-xs font-medium text-green-800">
              Proses pertukaran / redesain telah tuntas.
            </p>
          </Card>
        )}

        {/* === DETAIL VARIAN === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-black/40">
            <Paintbrush className="h-4 w-4 text-brand-orange" />
            Detail Permintaan
          </div>
          <div className="flex gap-4">
            {tukar.productGambar ? (
              <Image src={tukar.productGambar} alt="" width={64} height={64} className="h-16 w-16 rounded-xl border-2 border-brand-cream object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-brand-cream-light" />
            )}
            <div className="flex-1 text-sm">
              <div className="font-black text-brand-black">{tukar.productNama}</div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center justify-between border-b border-brand-cream/50 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-black/40">Lama</span>
                  <span className="font-bold text-brand-black">{tukar.ukuranLama ?? "-"} {tukar.warnaLama ? ` · ${tukar.warnaLama}` : ""}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-black/40">Baru</span>
                  <span className="font-black text-brand-orange">{tukar.ukuranBaru} {tukar.warnaBaru ? ` · ${tukar.warnaBaru}` : ""}</span>
                </div>
              </div>
            </div>
          </div>
          {tukar.notes && (
            <div className="mt-4 rounded-xl bg-brand-cream-light/30 border border-brand-cream p-3 text-xs text-brand-black/70">
              <strong className="block mb-1 text-[10px] uppercase tracking-widest text-brand-orange">Request Tambahan:</strong> 
              <span className="whitespace-pre-wrap leading-relaxed">{tukar.notes}</span>
            </div>
          )}
        </Card>

        {/* === FORM INPUT RESI BALIK === */}
        {tukar.status === "menunggu_pengiriman_balik" && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/40 p-4 text-xs text-orange-950 flex gap-2.5 items-start">
              <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-[11px] uppercase tracking-wider text-orange-850">Penting: Biaya Packing Tambahan</p>
                <p className="mt-1 leading-relaxed text-orange-900/90">
                  Untuk penukaran barang, Anda akan dikenakan <strong>biaya packing tambahan</strong> (di luar ongkir pengiriman balik). 
                  Biaya ini dapat diselesaikan langsung melalui <strong>transfer / chat admin</strong>, atau dibayarkan secara <strong>COD (bayar di tempat)</strong> saat barang pengganti sampai di alamat Anda.
                </p>
              </div>
            </div>

            <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm space-y-4">
              <div className="text-[11px] font-black uppercase tracking-widest text-brand-black/40">
                Input Resi Pengiriman Balik
              </div>

            <div>
              <Label className="text-xs font-black text-brand-black">Pilih Ekspedisi / Kurir</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Anteraja", "J&T", "JNE", "SiCepat", "Pos Indonesia", "Lainnya"].map((c) => {
                  const active = kurir === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setKurir(c);
                        if (c !== "Lainnya") setKurirCustom("");
                      }}
                      className={`h-10 px-4 rounded-xl border-2 text-xs font-black transition ${
                        active
                          ? "border-brand-orange bg-brand-orange text-white"
                          : "border-brand-cream bg-white text-brand-black hover:border-brand-orange"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {kurir === "Lainnya" && (
                <Input
                  placeholder="Tulis nama ekspedisi lain..."
                  value={kurirCustom}
                  onChange={(e) => setKurirCustom(e.target.value)}
                  className="mt-3 h-12 w-full rounded-xl border-2 border-brand-cream px-4 text-sm font-bold focus:border-brand-orange transition"
                />
              )}
            </div>

            <div>
              <Label htmlFor="resi" className="text-xs font-black text-brand-black">Nomor Resi</Label>
              <Input
                id="resi"
                placeholder="Contoh: AT123456789"
                value={resi}
                onChange={(e) => setResi(e.target.value.toUpperCase())}
                className="mt-2 h-12 w-full rounded-xl border-2 border-brand-cream px-4 text-sm font-bold focus:border-brand-orange focus:ring-0 transition"
              />
            </div>

            <div>
              <Label className="text-xs font-black text-brand-black">Foto Bukti Pengiriman</Label>
              {bukti ? (
                <div className="relative mt-2 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bukti} alt="" className="h-32 w-32 rounded-xl border-2 border-brand-cream object-cover shadow-sm" />
                  <button onClick={() => setBukti(null)} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-black text-white shadow"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-cream bg-brand-cream-light/30 text-xs font-bold text-brand-black/40 hover:border-brand-orange hover:bg-orange-50 hover:text-brand-orange transition"><Upload className="h-6 w-6" />Upload Foto Bukti</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && readBukti(e.target.files[0])} />
            </div>

            <Button onClick={handleSubmitResi} disabled={submitting} className="mt-2 w-full rounded-full bg-brand-orange hover:bg-brand-orange-dark h-12 text-xs font-black uppercase tracking-widest shadow-md transition-all">
              {submitting ? "Mengirim..." : "Submit Resi"}
            </Button>
          </Card>
          </div>
        )}

        {/* === DETAIL RESI RETUR === */}
        {tukar.noResiBalik && (
          <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-black/40">
              <Truck className="h-4 w-4 text-brand-orange" />
              Detail Resi Retur Anda
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Kurir" value={tukar.kurirBalik} />
              <Row label="Nomor Resi" value={tukar.noResiBalik} copyable />
              <Row label="Dikirim" value={formatTanggalJamID(tukar.buktiKirimBalikAt)} />
            </div>
            {tukar.buktiKirimBalikPath && (
              <div className="mt-4 pt-4 border-t border-brand-cream/50">
                <Image
                  src={tukar.buktiKirimBalikPath}
                  alt=""
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-xl border-2 border-brand-cream object-cover shadow-sm"
                />
              </div>
            )}
          </Card>
        )}

        {/* === RESI ADMIN KIRIM BALIK === */}
        {tukar.adminNoResiKirim && (
          <Card className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-violet-800">
              <Truck className="h-4 w-4" />
              Pengiriman Produk Hasil
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Kurir" value={tukar.adminKurirKirim ?? "Anteraja"} />
              <Row label="No. Resi" value={tukar.adminNoResiKirim} copyable />
            </div>
            {tukar.adminCatatan && (
              <p className="mt-4 rounded-xl bg-white p-3 text-xs text-brand-black/70 shadow-sm border border-violet-100 italic">
                {tukar.adminCatatan}
              </p>
            )}
          </Card>
        )}



        {/* === C5 FIX CTA === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/chat?komplainId=${komplainId}`}>
              <Button variant="outline" className="w-full rounded-full border-2 border-brand-black bg-white h-12 text-[11px] font-black text-brand-black hover:bg-brand-black hover:text-white uppercase tracking-widest">
                <MessageCircle className="mr-2 h-4 w-4" /> Chat
              </Button>
            </Link>
            {tukar.status === "varian_baru_dikirim" ? (
              <Button onClick={handleKonfirmasi} disabled={submitting} className="w-full rounded-full bg-green-600 hover:bg-green-700 h-12 text-[11px] font-black text-white shadow-md uppercase tracking-widest disabled:opacity-50">
                <CheckCircle2 className="mr-2 h-4 w-4" /> {submitting ? "Memproses..." : "Terima"}
              </Button>
            ) : tukar.status === "selesai" ? (
              <Link href="/tukar">
                <Button variant="outline" className="w-full rounded-full border-2 border-brand-black bg-white h-12 text-[11px] font-black text-brand-black hover:bg-brand-black hover:text-white uppercase tracking-widest">
                  Selesai
                </Button>
              </Link>
            ) : showCancel ? (
              <Button onClick={handleCancel} disabled={submitting} variant="outline" className="w-full rounded-full border-2 border-red-200 bg-white h-12 text-[11px] font-black text-red-600 hover:bg-red-50 uppercase tracking-widest disabled:opacity-50">
                Batalkan
              </Button>
            ) : (
              <div />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  copyable,
}: {
  label: string;
  value?: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-brand-cream/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
      <span className="text-[11px] font-bold text-brand-black/60 uppercase">{label}</span>
      <span className="flex items-center gap-2 font-black text-brand-black">
        {value ?? "-"}
        {copyable && value && (
          <button onClick={() => navigator.clipboard.writeText(value)} className="text-brand-black/30 hover:text-brand-orange transition-colors" title="Salin">
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}
