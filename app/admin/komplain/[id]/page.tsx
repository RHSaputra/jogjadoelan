"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertCircle, ArrowLeft, Banknote, CheckCircle2, FileImage, MessageCircle, Package,
  ShieldCheck, Truck, User, X, XCircle, ZoomIn,
} from "lucide-react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { SuccessModal } from "@/components/admin/SuccessModal";
import {
  KOMPLAIN_TINDAKAN_LABEL, resolveKomplainStatusInfo,
  type RefundFormData,
} from "@/lib/komplain-context";
import {
  adminAcceptKomplain, adminApproveForm, adminCompleteRefund, adminCompleteTukar,
  adminRejectForm, adminRejectKomplain,
  adminTandaiBalikanDiterima, formatRp, getKomplainAdminActions, getKomplainById,
} from "@/lib/admin-komplain-helpers";
import { subscribeSyncMany } from "@/lib/sync-events";
import type { AdminKomplain } from "@/lib/admin-komplain-helpers";
import type PusherClient from "pusher-js";
import type { Channel } from "pusher-js";
import { findOrderGlobal } from "@/lib/orders-storage";

const emptySubscribe = () => () => {};

type ConfirmKind = "accept" | "approveForm" | "tandaiBalikan" | null;
type RejectKind = "order" | "form" | null;

export default function AdminKomplainDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [tick, setTick] = useState(0);
  const [k, setK] = useState<AdminKomplain | null>(null);
  const [, setCustomerTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [rejectKind, setRejectKind] = useState<RejectKind>(null);
  const [alasan, setAlasan] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  /* form refund */
  const [showRefund, setShowRefund] = useState(false);
  const [refundBukti, setRefundBukti] = useState<string>("");

  /* form tukar */
  const [showTukar, setShowTukar] = useState(false);
  const [tukarResi, setTukarResi] = useState("");
  const [tukarKurir, setTukarKurir] = useState("");
  const [tukarFrom, setTukarFrom] = useState("");
  const [tukarTo, setTukarTo] = useState("");
  const [tukarBukti, setTukarBukti] = useState<string>("");

  /* approve refund form & set nominal */
  const [showApproveRefund, setShowApproveRefund] = useState(false);
  const [approveNominal, setApproveNominal] = useState("");
  const [approveCatatan, setApproveCatatan] = useState("");

  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (k?.orderId) {
      findOrderGlobal(k.orderId).then((ord) => {
        if (ord) setOrderTotal(ord.total);
      });
    }
  }, [k?.orderId]);
  
  // ✅ Async data fetching
  useEffect(() => {
    if (!mounted) return;
    let active = true;
    getKomplainById(id).then((d) => {
      if (active) setK(d);
    });
    return () => { active = false; };
  }, [mounted, id, tick]);

  useEffect(() => {
    if (!id || !mounted) return;
    const onSync = () => {
      setTick((t) => t + 1);
    };
    return subscribeSyncMany(["komplain", "tukar", "refund"], onSync);
  }, [id, mounted]);

  // Subscribe to real-time complaint chat updates via Pusher
  useEffect(() => {
    if (!id || !mounted) return;
    let active = true;
    let pusherClient: PusherClient | null = null;
    let channel: Channel | null = null;

    (async () => {
      try {
        const Pusher = (await import("pusher-js")).default;
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "f3e9ef9647495d6eb53f";
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";
        pusherClient = new Pusher(key, { cluster, authEndpoint: "/api/pusher/auth" });
        channel = pusherClient.subscribe(`private-komplain-${id}`);

        channel.bind("message", () => {
          if (!active) return;
          // Refresh details to load new messages and update states
          setTick((t) => t + 1);
        });

        channel.bind("status-change", () => {
          if (!active) return;
          setTick((t) => t + 1);
        });

        channel.bind("typing", (data: { fromRole?: string; isTyping?: boolean }) => {
          if (!active) return;
          if (data.fromRole === "USER") {
            setCustomerTyping(Boolean(data.isTyping));
          }
        });
      } catch (e) {
        console.error("Pusher connection failed in admin komplain", e);
      }
    })();

    return () => {
      active = false;
      try {
        if (channel) channel.unbind_all();
        if (pusherClient) {
          pusherClient.unsubscribe(`private-komplain-${id}`);
          pusherClient.disconnect();
        }
      } catch {}
    };
  }, [id, mounted]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [k?.chat?.length]);

  if (!mounted) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;
  if (!k) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-3 text-sm font-black text-gray-500">Komplain tidak ditemukan</p>
        <button onClick={() => router.push("/admin/komplain")} className="mt-4 rounded-full bg-[#fc970a] px-5 py-2 text-xs font-black text-white">
          Kembali
        </button>
      </div>
    );
  }

  const actions = getKomplainAdminActions(k);

  function refresh() { setTick((t) => t + 1); }

  async function readFileAsDataUrl(f: File): Promise<string> {
    return new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(f);
    });
  }

  // ✅ Async handlers
  async function doConfirm() {
    if (!confirmKind || !k) return;
    let msg = "Berhasil";
    try {
      if (confirmKind === "accept") {
        await adminAcceptKomplain(id);
        msg = "Komplain disetujui";
      } else if (confirmKind === "approveForm") {
        if (k.tindakan === "tukar") {
          const { adminApproveTukar } = await import("@/lib/tukar-helpers");
          await adminApproveTukar(k.tukar.id);
        } else {
          await adminApproveForm(id);
        }
        msg = "Formulir disetujui";
      } else if (confirmKind === "tandaiBalikan") {
        if (k.tindakan === "refund") {
          const { adminReceivedRefund } = await import("@/lib/refund-helpers");
          await adminReceivedRefund(k.refund.id);
        } else if (k.tindakan === "tukar") {
          const { adminReceivedTukar } = await import("@/lib/tukar-helpers");
          await adminReceivedTukar(k.tukar.id);
        } else {
          await adminTandaiBalikanDiterima(id);
        }
        msg = "Barang balikan diterima";
      }
      setSuccessMsg(msg);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyelesaikan aksi");
    } finally {
      setConfirmKind(null);
    }
  }

  async function doReject() {
    if (!rejectKind || !alasan.trim() || !k) return;
    let msg = "Ditolak";
    try {
      if (rejectKind === "order") {
        await adminRejectKomplain(id, alasan.trim());
        msg = "Komplain ditolak";
      } else if (rejectKind === "form") {
        if (k.tindakan === "refund") {
          const { adminRejectRefund } = await import("@/lib/refund-helpers");
          await adminRejectRefund(k.refund.id, alasan.trim());
        } else if (k.tindakan === "tukar") {
          const { adminRejectTukar } = await import("@/lib/tukar-helpers");
          await adminRejectTukar(k.tukar.id, alasan.trim());
        } else {
          await adminRejectForm(id, alasan.trim());
        }
        msg = "Formulir ditolak";
      }
      setSuccessMsg(msg);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menolak");
    } finally {
      setRejectKind(null);
      setAlasan("");
    }
  }

  async function handleUploadBukti(e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await readFileAsDataUrl(f);
    setter(url);
  }

  async function uploadImage(dataUrl: string, sub: "refund" | "tukar"): Promise<string> {
    if (!dataUrl.startsWith("data:")) return dataUrl;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", blob, "image.png");
      fd.append("sub", sub);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.data?.path) {
        throw new Error(json.error || "Gagal mengunggah gambar");
      }
      return json.data.path;
    } catch (err) {
      console.error("Error uploading image:", err);
      throw new Error(err instanceof Error ? err.message : "Gagal mengunggah gambar");
    }
  }

  async function submitRefund() {
    if (!k?.refund?.id || !refundBukti) {
      alert("Bukti transfer wajib diunggah.");
      return;
    }
    try {
      const buktiPath = await uploadImage(refundBukti, "refund");
      await adminCompleteRefund(k.refund.id, { adminTransferProofPath: buktiPath });
      setSuccessMsg("Refund berhasil diproses");
      setShowRefund(false);
      setRefundBukti("");
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal memproses refund");
    }
  }

  async function submitApproveRefund() {
    const n = Number(approveNominal);
    if (!n || !k?.refund?.id) {
      alert("Nominal refund tidak valid atau data refund tidak ditemukan");
      return;
    }
    try {
      const { adminApproveRefund } = await import("@/lib/refund-helpers");
      await adminApproveRefund(k.refund.id, n, approveCatatan.trim());
      setSuccessMsg("Formulir refund disetujui & nominal ditetapkan.");
      setShowApproveRefund(false);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyetujui refund");
    }
  }

  async function submitTukar() {
    if (!tukarResi.trim() || !tukarKurir.trim() || !tukarFrom || !tukarTo || !tukarBukti) return;
    try {
      const buktiPath = await uploadImage(tukarBukti, "tukar");
      await adminCompleteTukar(id, {
        noResiBalikan: tukarResi.trim(),
        kurir: tukarKurir.trim(),
        estimasiFrom: tukarFrom,
        estimasiTo: tukarTo,
        buktiUrl: buktiPath,
      });
      setSuccessMsg("Pengiriman barang pengganti tercatat");
      setShowTukar(false);
      setTukarResi(""); setTukarKurir(""); setTukarFrom(""); setTukarTo(""); setTukarBukti("");
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal mencatat pengiriman");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-bold text-gray-900 hover:text-[#FF6B1A]">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <div className="flex items-center gap-2">
          {(() => {
            const info = resolveKomplainStatusInfo(k);
            return (
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${info.color}`}>
                {info.label}
              </span>
            );
          })()}
          <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase text-[#FF6B1A]">
            {KOMPLAIN_TINDAKAN_LABEL[k.tindakan]}
          </span>
        </div>
      </div>

      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 p-5 text-white shadow-lg sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{k.jenisLabel}</p>
        <h2 className="mt-1 text-xl font-black sm:text-2xl">{k.id}</h2>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-white/90">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{k.userName}</span>
            <span className="font-mono">Order: {k.orderId}</span>
            <span>{new Date(k.createdAt).toLocaleString("id-ID")}</span>
          </div>
          <Link href={`/admin/chat?userId=${k.userId}`}
            className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 font-black uppercase text-white hover:bg-white/35 transition">
            <MessageCircle className="h-3.5 w-3.5" /> Chat Customer
          </Link>
        </div>
      </section>

      {/* Packing Fee Reminder for Admin (Tukar flow) */}
      {k.tindakan === "tukar" && !["berhasil", "ditolak", "dibatalkan"].includes(k.status) && (
        <section className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50/60 to-amber-50/40 p-5 shadow-sm flex items-start gap-3.5 text-xs text-orange-950 animate-fadeIn font-sans">
          <div className="p-2 bg-orange-100 rounded-xl shrink-0 text-orange-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="font-extrabold text-[11px] uppercase tracking-wider text-orange-800">Pengingat Admin: Biaya Packing Penukaran</p>
            <p className="leading-relaxed text-orange-900/90">
              Khusus untuk alur penukaran barang (Tukar/Redesain), customer dikenakan <strong>biaya packing tambahan</strong> di luar ongkir kirim balik. 
              Pastikan Anda mengonfirmasi biaya packing ini kepada customer melalui chat. Customer dapat membayar langsung (transfer) atau via <strong>COD (bayar di tempat)</strong> saat barang pengganti dikirimkan.
            </p>
          </div>
        </section>
      )}

      {/* Action bar */}
      {actions && (
        <section className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700">
            <ShieldCheck className="h-4 w-4" /> Aksi Tersedia
          </p>
          <div className="flex flex-wrap gap-2">
            {actions.canAccept && (
              <ActionBtn onClick={() => setConfirmKind("accept")} bg="bg-emerald-600 hover:bg-emerald-700" icon={CheckCircle2}>
                Setujui Komplain
              </ActionBtn>
            )}
            {actions.canApproveForm && (
              <>
                <ActionBtn 
                  onClick={() => {
                    if (k.tindakan === "refund") {
                      setShowApproveRefund(true);
                      setApproveNominal("");
                      setApproveCatatan("");
                    } else {
                      setConfirmKind("approveForm");
                    }
                  }} 
                  bg="bg-emerald-600 hover:bg-emerald-700" 
                  icon={CheckCircle2}
                >
                  Approve Formulir
                </ActionBtn>
                <ActionBtn onClick={() => { setRejectKind("form"); setAlasan(""); }} bg="bg-amber-600 hover:bg-amber-700" icon={XCircle}>
                  Tolak Formulir
                </ActionBtn>
              </>
            )}
            {actions.canTandaiBalikan && (
              <ActionBtn onClick={() => setConfirmKind("tandaiBalikan")} bg="bg-indigo-600 hover:bg-indigo-700" icon={Package}>
                Barang Balikan Diterima
              </ActionBtn>
            )}
            {actions.canCompleteRefund && (
              <ActionBtn onClick={() => setShowRefund(true)} bg="bg-[#FF6B1A] hover:bg-[#E55A0F]" icon={Banknote}>
                Proses Refund Dana
              </ActionBtn>
            )}
            {actions.canCompleteTukar && (
              <ActionBtn onClick={() => setShowTukar(true)} bg="bg-[#FF6B1A] hover:bg-[#E55A0F]" icon={Truck}>
                Kirim Barang Pengganti
              </ActionBtn>
            )}
            {actions.canReject && (
              <ActionBtn onClick={() => { setRejectKind("order"); setAlasan(""); }} outline icon={X}>
                Tolak Komplain
              </ActionBtn>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* LEFT */}
        <div className="space-y-5 lg:col-span-2">
          {/* Deskripsi & lampiran customer */}
          <Card title="Deskripsi Komplain Customer">
            <p className="whitespace-pre-wrap text-xs text-gray-700">{k.deskripsi}</p>
            {k.files.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {k.files.map((f, i) => (
                  <button key={i} onClick={() => f.url && setPreview(f.url)}
                    className="group relative aspect-square overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50">
                    {f.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.url} alt={f.name ?? ""} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] font-black text-gray-500">VIDEO</div>
                    )}
                    {f.type === "image" && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                        <ZoomIn className="h-4 w-4 text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Form refund/tukar dari customer */}
          {k.refundForm && (
            <Card title="Formulir Refund (Customer)">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Field label="Nama" value={(k.refundForm as RefundFormData & { atasNama?: string }).atasNama ?? k.refundForm.nama} />
                <Field label="Bank" value={(k.refundForm as RefundFormData & { namaBank?: string }).namaBank ?? k.refundForm.bank} />
                <Field label="No Rekening" value={(k.refundForm as RefundFormData & { noRek?: string }).noRek ?? k.refundForm.norek} />
                <Field label="No Resi Balik" value={k.refundForm.noResi} />
              </div>
              {k.refundForm.buktiResiUrl && (
                <button onClick={() => setPreview(k.refundForm!.buktiResiUrl)}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#FF6B1A] hover:underline">
                  <FileImage className="h-3 w-3" /> Lihat Bukti Resi
                </button>
              )}
            </Card>
          )}
          {k.tukarForm && (
            <Card title="Formulir Tukar (Customer)">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Field label="Nama" value={k.tukarForm.nama} />
                <Field label="Bank" value={k.tukarForm.bank ?? "—"} />
                <Field label="No Rekening" value={k.tukarForm.norek ?? "—"} />
                <Field label="No Resi Balik" value={k.tukarForm.noResi} />
              </div>
              {k.tukarForm.buktiResiUrl && (
                <button onClick={() => setPreview(k.tukarForm!.buktiResiUrl)}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#FF6B1A] hover:underline">
                  <FileImage className="h-3 w-3" /> Lihat Bukti Resi
                </button>
              )}
            </Card>
          )}

          {/* Informasi Retur Barang (Customer) */}
          {((k.refund && k.refund.noResi) || (k.tukar && k.tukar.noResiBalik)) && (
            <Card title="Informasi Retur Barang (Customer)">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Field
                  label="Ekspedisi / Kurir"
                  value={k.tindakan === "refund" ? k.refund.kurir : k.tukar.kurirBalik}
                />
                <Field
                  label="Nomor Resi"
                  value={k.tindakan === "refund" ? k.refund.noResi : k.tukar.noResiBalik}
                />
                <Field
                  label="Tanggal Pengiriman"
                  value={
                    k.tindakan === "refund"
                      ? k.refund.buktiKirimAt
                        ? new Date(k.refund.buktiKirimAt).toLocaleString("id-ID")
                        : "—"
                      : k.tukar.buktiKirimBalikAt
                      ? new Date(k.tukar.buktiKirimBalikAt).toLocaleString("id-ID")
                      : "—"
                  }
                />
              </div>
              {((k.tindakan === "refund" && k.refund.buktiKirimPath) ||
                (k.tindakan === "tukar" && k.tukar.buktiKirimBalikPath)) && (
                <button
                  onClick={() =>
                    setPreview(
                      k.tindakan === "refund"
                        ? k.refund.buktiKirimPath
                        : k.tukar.buktiKirimBalikPath
                    )
                  }
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#FF6B1A] hover:underline"
                >
                  <FileImage className="h-3 w-3" /> Lihat Bukti Resi / Pengiriman
                </button>
              )}
            </Card>
          )}

          {/* Hasil admin */}
          {k.refundResult && (
            <Card title="Hasil Refund">
              <div className="space-y-2 text-xs">
                <Row label="Nominal" value={formatRp(k.refundResult.nominal)} />
                <Row label="Alasan" value={k.refundResult.alasanRefund} />
                <Row label="Tanggal Transfer" value={new Date(k.refundResult.transferredAt).toLocaleString("id-ID")} />
                <button onClick={() => setPreview(k.refundResult!.buktiTransferUrl)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF6B1A] hover:underline">
                  <FileImage className="h-3 w-3" /> Lihat Bukti Transfer
                </button>
              </div>
            </Card>
          )}
          {k.tukarResult && (
            <Card title="Hasil Tukar (Pengiriman Pengganti)">
              <div className="space-y-2 text-xs">
                <Row label="No Resi" value={k.tukarResult.noResiBalikan} />
                <Row label="Kurir" value={k.tukarResult.kurir} />
                <Row label="Estimasi Tiba" value={`${k.tukarResult.estimasiTiba.from} – ${k.tukarResult.estimasiTiba.to}`} />
                <Row label="Tanggal Kirim" value={new Date(k.tukarResult.shippedAt).toLocaleString("id-ID")} />
                <button onClick={() => setPreview(k.tukarResult!.buktiUrl)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF6B1A] hover:underline">
                  <FileImage className="h-3 w-3" /> Lihat Bukti Pengiriman
                </button>
              </div>
            </Card>
          )}

          {/* Penolakan */}
          {k.penolakan && (
            <Card title="Penolakan Admin">
              <p className="text-xs text-gray-700">{k.penolakan.alasan}</p>
              <p className="mt-1 text-[10px] text-gray-500">{new Date(k.penolakan.at).toLocaleString("id-ID")}</p>
            </Card>
          )}
        </div>

        {/* RIGHT — Chat thread replacement */}
        <div className="flex flex-col gap-4">
          <Card title="Ruang Diskusi & Negosiasi">
            <p className="text-sm text-gray-600 mb-4">Seluruh komunikasi dengan customer kini dipusatkan di Global Chat. Semua log sistem juga akan tercatat di sana.</p>
            <Link
              href={`/admin/chat?userId=${k.userId}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B1A] px-4 py-3 text-sm font-black text-white hover:bg-[#E55A0F] uppercase transition"
            >
              <MessageCircle className="h-4 w-4" /> Buka Ruang Diskusi
            </Link>
          </Card>
        </div>
      </div>

      {/* MODAL: Confirm */}
      <ConfirmModal
        open={confirmKind === "accept"}
        title="Setujui Komplain?"
        message={k.tindakan === "komplain_saja"
          ? "Komplain langsung ditandai BERHASIL (tidak ada action lanjutan)."
          : k.tindakan === "refund"
            ? "Customer akan diminta isi formulir refund (data rekening + resi balikan)."
            : "Customer akan diminta isi formulir tukar (data resi balikan)."}
        confirmText="Ya, Setujui"
        onConfirm={doConfirm}
        onClose={() => setConfirmKind(null)}
      />
      <ConfirmModal
        open={confirmKind === "approveForm"}
        title="Approve Formulir Customer?"
        message="Status akan jadi MENUNGGU BALIKAN — customer akan diminta kirim barang balik."
        confirmText="Ya, Approve"
        onConfirm={doConfirm}
        onClose={() => setConfirmKind(null)}
      />
      <ConfirmModal
        open={confirmKind === "tandaiBalikan"}
        title="Tandai Barang Balikan Diterima?"
        message="Status berubah ke DIPROSES — Anda bisa lanjut proses refund/kirim pengganti."
        confirmText="Ya, Diterima"
        onConfirm={doConfirm}
        onClose={() => setConfirmKind(null)}
      />

      {/* MODAL: Reject */}
      {rejectKind && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-base font-black text-gray-900">
              {rejectKind === "order" ? "Tolak Komplain" : "Tolak Formulir Customer"}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {rejectKind === "order"
                ? "Status komplain jadi DITOLAK. Customer akan diberitahu lewat chat."
                : "Customer akan diminta isi ulang formulir dengan data yang benar."}
            </p>
            <textarea autoFocus value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={4}
              placeholder="Tulis alasan jelas..."
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setRejectKind(null); setAlasan(""); }}
                className="flex-1 rounded-md border-2 border-gray-200 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={doReject} disabled={!alasan.trim()}
                className="flex-1 rounded-md bg-red-600 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50">
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Complete Refund */}
      {showRefund && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm font-sans">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <p className="text-base font-black text-gray-900">Proses Refund Dana</p>
            <p className="text-xs text-gray-500 mt-1">Selesaikan proses refund dengan mentransfer dana sesuai nominal di bawah ke rekening customer, lalu unggah bukti transfer.</p>

            {/* Informasi Nominal Refund & Rekening Penerima */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50/40 p-4 font-sans">
              <div className="flex items-center justify-between border-b border-amber-100/70 pb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800">Nominal Transfer</span>
                <span className="text-lg font-black text-amber-600 tracking-tight">{formatRp(k.refund?.nominalRefund ?? 0)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-white/60 border border-amber-100/40 p-2.5 shadow-sm">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Bank</span>
                  <span className="mt-0.5 block font-black text-gray-800">{k.refund?.namaBank || "—"}</span>
                </div>
                <div className="rounded-xl bg-white/60 border border-amber-100/40 p-2.5 shadow-sm">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Penerima</span>
                  <span className="mt-0.5 block font-black text-gray-800 truncate" title={k.refund?.atasNama}>{k.refund?.atasNama || "—"}</span>
                </div>
                <div className="col-span-2 rounded-xl bg-white/80 border border-amber-100/60 p-3 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Nomor Rekening</span>
                    <span className="mt-1 block font-mono text-sm font-black text-gray-900 tracking-wider select-all">{k.refund?.noRek || "—"}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (k.refund?.noRek) {
                        navigator.clipboard.writeText(k.refund.noRek);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    className="rounded-lg bg-amber-100 hover:bg-amber-200 px-3 py-1.5 text-[10px] font-black text-amber-700 transition shrink-0"
                  >
                    {copied ? "Tersalin!" : "Salin"}
                  </button>
                </div>
              </div>
              {k.refund?.catatanAdmin && (
                <div className="mt-3 rounded-xl border border-amber-100/30 bg-amber-50/20 p-2.5 text-[11px] text-amber-800 italic leading-relaxed">
                  <span className="not-italic font-bold text-[9px] uppercase tracking-wide text-amber-700/80 block mb-0.5">Catatan Persetujuan:</span>
                  &quot;{k.refund.catatanAdmin}&quot;
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <FormField label="Bukti Transfer">
                <input type="file" accept="image/*" onChange={(e) => handleUploadBukti(e, setRefundBukti)}
                  className="w-full text-[11px] file:mr-2 file:rounded file:border-0 file:bg-[#fc970a] file:px-3 file:py-1.5 file:text-[11px] file:font-black file:text-white" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {refundBukti && <img src={refundBukti} alt="" className="mt-2 max-h-32 rounded border border-gray-200" />}
              </FormField>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowRefund(false)} className="flex-1 rounded-md border-2 border-gray-200 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={submitRefund}
                disabled={!refundBukti}
                className="flex-1 rounded-md bg-[#FF6B1A] py-2.5 text-xs font-black text-white hover:bg-[#E55A0F] disabled:opacity-50">
                Selesaikan Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Complete Tukar */}
      {showTukar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <p className="text-base font-black text-gray-900">Kirim Barang Pengganti</p>
            <div className="mt-3 space-y-3">
              <FormField label="No Resi">
                <input value={tukarResi} onChange={(e) => setTukarResi(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
              </FormField>
              <FormField label="Kurir">
                <input value={tukarKurir} onChange={(e) => setTukarKurir(e.target.value)}
                  placeholder="JNE / J&T / SiCepat / ..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Estimasi Dari">
                  <input type="date" value={tukarFrom} onChange={(e) => setTukarFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
                </FormField>
                <FormField label="Estimasi Sampai">
                  <input type="date" value={tukarTo} onChange={(e) => setTukarTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
                </FormField>
              </div>
              <FormField label="Bukti Pengiriman">
                <input type="file" accept="image/*" onChange={(e) => handleUploadBukti(e, setTukarBukti)}
                  className="w-full text-[11px] file:mr-2 file:rounded file:border-0 file:bg-[#fc970a] file:px-3 file:py-1.5 file:text-[11px] file:font-black file:text-white" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {tukarBukti && <img src={tukarBukti} alt="" className="mt-2 max-h-32 rounded border border-gray-200" />}
              </FormField>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowTukar(false)} className="flex-1 rounded-md border-2 border-gray-200 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={submitTukar}
                disabled={!tukarResi.trim() || !tukarKurir.trim() || !tukarFrom || !tukarTo || !tukarBukti}
                className="flex-1 rounded-md bg-[#FF6B1A] py-2.5 text-xs font-black text-white hover:bg-[#E55A0F] disabled:opacity-50">
                Catat Pengiriman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Approve Refund Form & Set Nominal */}
      {showApproveRefund && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
            <p className="text-base font-black text-gray-900">Approve Formulir &amp; Tentukan Nominal</p>
            <p className="mt-1 text-xs text-gray-600">
              Setujui data rekening customer, tentukan nominal refund, dan minta customer kirim barang kembali.
            </p>
            <div className="mt-4 space-y-3">
              {orderTotal !== null && (
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5 flex justify-between items-center text-xs">
                  <span className="text-gray-500">Total Pesanan Asli:</span>
                  <span className="font-bold text-gray-900">{formatRp(orderTotal)}</span>
                </div>
              )}

              <FormField label="Nominal Refund (Rp)">
                <input 
                  type="number" 
                  value={approveNominal} 
                  onChange={(e) => setApproveNominal(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" 
                  placeholder="Contoh: 150000"
                />
              </FormField>

              {orderTotal !== null && Number(approveNominal) > orderTotal && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-850 animate-fadeIn">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-[11px] text-amber-900">Peringatan Nominal Refund</p>
                    <p className="mt-0.5 text-[10px] text-amber-700 leading-normal">
                      Nominal refund (<strong>{formatRp(Number(approveNominal))}</strong>) melebihi total pesanan asli customer (<strong>{formatRp(orderTotal)}</strong>).
                    </p>
                  </div>
                </div>
              )}

              <FormField label="Catatan Admin (Opsional)">
                <textarea 
                  value={approveCatatan} 
                  onChange={(e) => setApproveCatatan(e.target.value)} 
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" 
                  placeholder="Tulis instruksi atau catatan ke customer..."
                />
              </FormField>
            </div>
            <div className="mt-5 flex gap-2">
              <button 
                onClick={() => setShowApproveRefund(false)} 
                className="flex-1 rounded-md border-2 border-gray-200 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50"
              >
                Batal
              </button>
              <button 
                onClick={submitApproveRefund}
                disabled={!approveNominal}
                className="flex-1 rounded-md bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve &amp; Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <SuccessModal open={!!successMsg} title={successMsg ?? "Berhasil"} onClose={() => setSuccessMsg(null)} />
    </div>
  );
}

/* ====================  SUB COMPONENTS  ==================== */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs font-black text-gray-900">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 truncate font-black text-gray-900">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-900">{value}</span>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ActionBtn({ children, onClick, icon: Icon, bg, outline }: {
  children: React.ReactNode; onClick: () => void; icon: React.ElementType; bg?: string; outline?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black shadow transition ${
        outline
          ? "border-2 border-red-300 bg-white text-red-600 hover:bg-red-50"
          : `${bg ?? "bg-[#fc970a]"} text-white`
      }`}>
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}