"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  Truck,
  Wallet,
  Upload,
  Copy,
  X,
  XCircle,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { getOrder, formatTanggalJamID } from "@/lib/orders-storage";
import { useKomplain } from "@/lib/komplain-context";
import {
  REFUND_STATUS_COLOR,
  REFUND_STATUS_LABEL,
  cancelRefund,
  customerKirimBalik,
  customerKonfirmasiRefundDiterima,
  getRefundByKomplain,
  type Refund,
} from "@/lib/refund-helpers";
import { toast } from "sonner";
import { subscribeSync } from "@/lib/sync-events";

const NON_CANCELABLE = new Set([
  "diterima_admin",
  "ditransfer",
  "transfer_dikirim",
  "selesai",
  "ditolak",
  "dibatalkan",
]);

const MAX_FILE_MB = 5;

export default function RefundSuksesPage() {
  const { komplainId } = useParams<{ komplainId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { get: getKomplain, patch: patchKomplain, addSystemLog, hydrated } = useKomplain();

  const k = useMemo(() => getKomplain(komplainId), [getKomplain, komplainId]);
  const [refund, setRefund] = useState<Refund | null | undefined>(undefined);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [alasanBatal, setAlasanBatal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      void Promise.resolve().then(() => setRefund(null));
      return;
    }

    let active = true;

    async function loadRefund() {
      const data = await getRefundByKomplain(komplainId);

      if (active) {
        setRefund(data);
      }
    }

    void loadRefund();

    const unsub = subscribeSync("refund", () => {
      void loadRefund();
    });

    return () => {
      active = false;
      unsub();
    };
  }, [user?.id, komplainId]);

  const [order, setOrder] = useState<Awaited<ReturnType<typeof getOrder>>>(null);
  useEffect(() => {
    if (!refund || !user?.id) {
      void Promise.resolve().then(() => setOrder(null));
      return;
    }
    let c = false;
    (async () => { const o = await getOrder(user.id, refund.orderId); if (!c) setOrder(o); })();
    return () => { c = true; };
  }, [refund, user?.id]);

  useEffect(() => {
    if (refund && refund.status === "ditolak") {
      router.replace(`/refund/${komplainId}/ditolak`);
    }
  }, [refund, komplainId, router]);

  const [resi, setResi] = useState("");
  const [bukti, setBukti] = useState<string | null>(null);
  const [kurir, setKurir] = useState("Anteraja");
  const [kurirCustom, setKurirCustom] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  function readBukti(f: File) {
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File melebihi batas maksimal ${MAX_FILE_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setBukti(reader.result);
    };
    reader.readAsDataURL(f);
  }

  async function handleSubmitResi() {
    if (!user?.id || !refund) return;
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
        fd.append("sub", "refund");
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
      const _ok = await customerKirimBalik(refund.id, resi.trim(), buktiPath, chosenKurir);
      if (!_ok) {
        toast.error("Gagal menyimpan resi. Pastikan data pengajuan masih aktif.");
        return;
      }
      addSystemLog(
        komplainId,
        `Customer mengirim balik barang lama. No. Resi ${chosenKurir}: ${resi.trim()}.`
      );
      toast.success("Resi pengiriman tersimpan", {
        description: "Admin akan memverifikasi setelah barang diterima.",
      });
      setResi("");
      setBukti(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan resi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleKonfirmasi() {
    if (!user?.id || !refund) return;
    setSubmitting(true);
    try {
      await customerKonfirmasiRefundDiterima(refund.id);
      toast.success("Refund dana berhasil dikonfirmasi");
      await patchKomplain(komplainId, { status: "berhasil" });
      addSystemLog(
        komplainId,
        "Customer mengonfirmasi transfer dana refund diterima. Komplain selesai."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal konfirmasi");
    } finally {
      setSubmitting(false);
    }
  }

  async function executeCancel() {
    if (!user?.id || !refund || !alasanBatal.trim()) return;
    setSubmitting(true);
    try {
      const result = await cancelRefund(refund.id, alasanBatal.trim());
      if (!result) {
        toast.error("Pengajuan tidak dapat dibatalkan");
        return;
      }
      patchKomplain(komplainId, { status: "dibatalkan" });
      addSystemLog(
        komplainId,
        `Customer membatalkan pengajuan refund. Alasan: ${alasanBatal.trim()}`
      );
      setShowCancelModal(false);
      setAlasanBatal("");
      router.push(`/tukar`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membatalkan pengajuan");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated || refund === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-zinc-500">
        Memuat data...
      </div>
    );
  }
  if (!k || !refund) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-zinc-500">
        Pengajuan refund tidak ditemukan.
      </div>
    );
  }

  if (refund.status === "ditolak") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-zinc-500">
        Mengarahkan ke halaman penolakan...
      </div>
    );
  }

  const showCancel = !NON_CANCELABLE.has(refund.status);

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
          <h1 className="text-base font-black text-brand-black">Status Refund Dana</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* Header status */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-brand-black/40">
                Kode Refund
              </div>
              <div className="font-mono text-sm font-black text-brand-orange">{refund.id}</div>
            </div>
            <Badge
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${REFUND_STATUS_COLOR[refund.status as keyof typeof REFUND_STATUS_COLOR]}`}
            >
              {REFUND_STATUS_LABEL[refund.status as keyof typeof REFUND_STATUS_LABEL]}
            </Badge>
          </div>
        </Card>

        {/* BANNER STATUS */}
        {refund.status === "menunggu_review_admin" && (
          <Card className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <Clock className="h-8 w-8 flex-shrink-0 text-amber-600" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-amber-900">
                  Menunggu Tinjauan Admin
                </h2>
                <p className="mt-2 text-xs font-medium leading-relaxed text-amber-900/80">
                  Admin sedang memverifikasi identitas & menetapkan nominal refund. Estimasi 1x24 jam hari kerja.
                </p>
              </div>
            </div>
          </Card>
        )}

        {refund.status === "menunggu_pengiriman_balik" && (
          <Card className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
            <Truck className="mb-2 h-8 w-8 text-amber-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-amber-900">
              Kirim Balik Barang Lama
            </h2>
                        <p className="mt-2 text-xs font-medium leading-relaxed text-amber-900/80">
              Silakan bungkus rapi barang lama & kirim balik melalui kurir{" "}
              <strong>{refund.kurir || "yang ditentukan"}</strong>, lalu input nomor resi di bawah.
            </p>
          </Card>
        )}

        {refund.status === "dikirim_balik" && (
          <Card className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-blue-900">
              Barang Dalam Perjalanan
            </h2>
            <p className="mt-2 text-xs font-medium text-blue-800">
              Nomor resi Anda telah tercatat. Tunggu pihak admin menerima barang retur.
            </p>
          </Card>
        )}

        {refund.status === "diterima_admin" && (
          <Card className="rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <CheckCircle2 className="mb-2 h-8 w-8 text-cyan-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-cyan-900">
              Barang Diterima Admin
            </h2>
            <p className="mt-2 text-xs font-medium text-cyan-800">
              Barang retur sudah aman sampai. Admin sedang memproses pencairan dana refund.
            </p>
          </Card>
        )}

        {(refund.status === "transfer_dikirim" ||
          (refund.status as string) === "ditransfer") && (
          <Card className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 shadow-sm">
            <Wallet className="mb-2 h-8 w-8 text-violet-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-violet-900">
              Refund Telah Ditransfer
            </h2>
            <p className="mt-2 text-xs font-medium text-violet-800">
              Admin sudah mengirimkan dana. Cek mutasi & pastikan nominal sesuai sebelum konfirmasi.
            </p>
          </Card>
        )}

        {refund.status === "selesai" && (
          <Card className="rounded-2xl border-2 border-green-200 bg-green-50 p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-600" />
            <h2 className="text-base font-black uppercase tracking-widest text-green-900">
              Refund Selesai
            </h2>
            <p className="mt-2 text-xs font-medium text-green-800">
              Dana refund pengembalian transaksi telah berhasil diselesaikan.
            </p>
          </Card>
        )}

        {/* DATA REKENING */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm space-y-2">
          <div className="text-[11px] font-black uppercase tracking-widest text-brand-black/40 mb-2">
            Rekening Tujuan Pengembalian
          </div>
          <div className="space-y-1">
            <Row
              label="Pemilik"
              value={refund.atasNama}
            />
            <Row
              label="Bank / Dompet"
              value={refund.namaBank}
            />
            <Row
              label="No. Rekening"
              value={refund.noRek}
              copyable
            />
          </div>
        </Card>

        {/* NOMINAL INFO */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <div className="space-y-1">
            <Row
              label="Total Transaksi Asli"
              value={`Rp ${(order?.total || 0).toLocaleString("id-ID")}`}
              muted
            />
            <Row
              label="Nominal Refund Disetujui"
              value={
                (refund.nominalRefund || 0) > 0
                  ? `Rp ${refund.nominalRefund.toLocaleString("id-ID")}`
                  : "Menunggu keputusan admin"
              }
              highlight={(refund.nominalRefund || 0) > 0}
            />
          </div>
        </Card>

        {/* FORM INPUT RESI BALIK */}
        {refund.status === "menunggu_pengiriman_balik" && (
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
              <Label className="text-xs font-black text-brand-black">
                Nomor Resi
              </Label>
              <Input
                placeholder="Contoh: AT998877112"
                value={resi}
                onChange={(e) => setResi(e.target.value.toUpperCase())}
                className="mt-2 h-12 w-full rounded-xl border-2 border-brand-cream px-4 text-sm font-bold focus:border-brand-orange transition"
              />
            </div>
            <div>
              <Label className="text-xs font-black text-brand-black">Foto Bukti Pengiriman</Label>
              {bukti ? (
                <div className="relative mt-2 inline-block">
                  <Image
                    src={bukti}
                    alt=""
                    width={128}
                    height={128}
                    className="h-32 w-32 rounded-xl border-2 border-brand-cream object-cover shadow-sm"
                  />
                  <button
                    onClick={() => setBukti(null)}
                    className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-black text-white shadow"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-cream bg-brand-cream-light/30 text-xs font-bold text-brand-black/40 hover:border-brand-orange hover:bg-orange-50 hover:text-brand-orange transition"
                >
                  <Upload className="h-6 w-6" />
                  Upload Foto Resi
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && readBukti(e.target.files[0])}
              />
            </div>
            <Button
              onClick={handleSubmitResi}
              disabled={submitting}
              className="mt-2 w-full rounded-full bg-brand-orange hover:bg-brand-orange-dark h-12 text-xs font-black uppercase shadow-md transition-all"
            >
              {submitting ? "Mengirim..." : "Submit Resi"}
            </Button>
          </Card>
        )}

        {/* RETURN SHIPPING DETAILS */}
        {refund.noResi && (
          <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-black/40">
              <Truck className="h-4 w-4 text-brand-orange" />
              Detail Resi Retur
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Kurir" value={refund.kurir} />
              <Row label="Nomor Resi" value={refund.noResi} copyable />
              <Row
                label="Dikirim"
                value={formatTanggalJamID(refund.buktiKirimAt)}
              />
            </div>
            {refund.buktiKirimPath && (
              <div className="mt-4 pt-4 border-t border-brand-cream/50">
                <Image
                  src={refund.buktiKirimPath}
                  alt=""
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-xl border-2 border-brand-cream object-cover shadow-sm"
                />
              </div>
            )}
          </Card>
        )}

        {/* ADMIN TRANSFER PROOF */}
        {refund.adminTransferProofPath && (
          <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-700">
              <Wallet className="h-4 w-4" />
              Bukti Transfer Admin
            </div>
            <div className="mt-3">
              <Image
                src={refund.adminTransferProofPath}
                alt=""
                width={0}
                height={0}
                sizes="(max-width: 768px) 100vw, 672px"
                className="h-40 w-full rounded-xl border-2 border-brand-cream object-contain shadow-sm"
              />
            </div>
          </Card>
        )}

        {/* CTA ACTIONS */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/chat?komplainId=${komplainId}`}>
              <Button
                variant="outline"
                className="w-full rounded-full border-2 border-brand-black h-12 text-[11px] font-black uppercase"
              >
                Chat Admin
              </Button>
            </Link>
            {refund.status === "transfer_dikirim" ||
            (refund.status as string) === "ditransfer" ? (
              <Button
                onClick={handleKonfirmasi}
                disabled={submitting}
                className="w-full rounded-full bg-green-600 hover:bg-green-700 h-12 text-[11px] font-black text-white uppercase tracking-widest disabled:opacity-50"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> {submitting ? "Memproses..." : "Terima Dana"}
              </Button>
            ) : refund.status === "selesai" ? (
              <Link href="/tukar">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-2 border-brand-black h-12 text-[11px] font-black uppercase"
                >
                  Selesai
                </Button>
              </Link>
            ) : showCancel ? (
              <Button
                onClick={() => setShowCancelModal(true)}
                disabled={submitting}
                variant="outline"
                className="w-full rounded-full border-2 border-red-200 text-red-600 hover:bg-red-50 h-12 text-[11px] font-black uppercase"
              >
                Batalkan
              </Button>
            ) : (
              <div />
            )}
          </div>
        </Card>
      </div>

      {/* MODAL BATAL CUSTOMER */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm rounded-2xl border-brand-cream bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-sm font-black text-red-700 uppercase tracking-wider flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Batalkan Pengajuan
            </h3>
            <p className="text-xs font-medium text-brand-black/60 leading-relaxed">
              Apakah Anda yakin ingin membatalkan pengajuan refund dana transaksi ini?
            </p>
            <div className="mt-4">
              <Label className="text-xs font-bold text-brand-black">
                Alasan Pembatalan <span className="text-brand-orange">*</span>
              </Label>
              <textarea
                value={alasanBatal}
                onChange={(e) => setAlasanBatal(e.target.value)}
                placeholder="Tuliskan alasan pembatalan pengajuan refund..."
                className="mt-1.5 w-full rounded-xl border-2 border-brand-cream p-3 text-xs font-bold focus:border-red-500 focus:outline-none transition"
                rows={3}
                required
              />
            </div>
            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full h-11 text-[11px] font-black uppercase"
                onClick={() => {
                  setShowCancelModal(false);
                  setAlasanBatal("");
                }}
              >
                Kembali
              </Button>
              <Button
                disabled={!alasanBatal.trim() || submitting}
                className="flex-1 rounded-full bg-red-600 hover:bg-red-700 text-white h-11 text-[11px] font-black uppercase shadow-md disabled:opacity-40"
                onClick={executeCancel}
              >
                {submitting ? "..." : "Ya, Batalkan"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  copyable,
  muted,
  highlight,
}: {
  label: string;
  value?: string | number | null;
  copyable?: boolean;
  muted?: boolean;
  highlight?: boolean;
}) {
  const display =
    value === undefined || value === null || value === "" ? "-" : String(value);

  function handleCopy() {
    if (!copyable || display === "-") return;
    navigator.clipboard?.writeText(display);
    toast.success("Disalin");
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-black/50">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span
          className={
            highlight
              ? "text-sm font-black text-emerald-700"
              : muted
              ? "text-xs font-bold text-brand-black/60"
              : "text-sm font-black text-brand-black"
          }
        >
          {display}
        </span>
        {copyable && display !== "-" && (
          <button
            type="button"
            onClick={handleCopy}
            className="grid h-7 w-7 place-items-center rounded-full bg-brand-cream-light hover:bg-brand-cream transition"
            aria-label={`Salin ${label}`}
          >
            <Copy className="h-3.5 w-3.5 text-brand-black/60" />
          </button>
        )}
      </span>
    </div>
  );
}



