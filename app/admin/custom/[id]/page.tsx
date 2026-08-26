"use client";
import { adminAddReferensi, adminDeleteReferensi } from "@/lib/admin-custom-helpers";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertCircle, AlertTriangle, ArrowLeft, Banknote, Calendar, CalendarRange,
  Camera, CheckCircle2, ClipboardList, Edit3, FileImage, FileText, Layers,
  Palette, Plus, Save, Send, ShieldCheck, Trash2, Truck, Upload,
  Wrench, X, XCircle, ZoomIn,
} from "lucide-react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { SuccessModal } from "@/components/admin/SuccessModal";
import {
  CUSTOM_STATUS_COLOR, CUSTOM_STATUS_LABEL,
  type CustomOrder, type EstimasiItem, type PaymentRecord,
} from "@/lib/custom-order-context";
import {
  adminAddProgressUpdate, adminAppendCatatan, adminDeleteProgressUpdate,
  adminMarkDikirim, adminMarkSelesaiCustom, adminMarkSiapDilunasi,
  adminRejectCustom, adminRejectDp, adminRejectLunas, adminRejectPelunasan,
  adminSetEstimasi, adminToggleLate, adminVerifyDp, adminVerifyLunas, adminVerifyPelunasan,
  formatRp, getCustomActionAvailability, getCustomOrderById, getCustomSisaBayar,
  getCustomTotalPaid,
} from "@/lib/admin-custom-helpers";
import { compressImage } from "@/lib/image-compressor";

type ConfirmKind =
  | "verifyDp" | "verifyLunas" | "verifyPelunasan"
  | "markSiap" | "markDikirim" | "markSelesai" | "toggleLate" | null;

type RejectKind = "order" | "dp" | "lunas" | "pelunasan" | null;

const emptySubscribe = () => () => {};

export default function AdminCustomDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [uploadingRef, setUploadingRef] = useState(false);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [tick, setTick] = useState(0);
  const [order, setOrder] = useState<CustomOrder | null>(null);
  const [biayaPackingDefault, setBiayaPackingDefault] = useState<number>(10000);

  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [rejectKind, setRejectKind] = useState<RejectKind>(null);
  const [alasan, setAlasan] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [showEstimasi, setShowEstimasi] = useState(false);
  const [estItems, setEstItems] = useState<EstimasiItem[]>([]);
  const [estCatatan, setEstCatatan] = useState("");
  const [estTglMulai, setEstTglMulai] = useState("");
  const [estTglSelesai, setEstTglSelesai] = useState("");

  const [showCatatan, setShowCatatan] = useState(false);
  const [catatanDraft, setCatatanDraft] = useState("");

  /* BARU (Batch E): state progress update */
  const [showProgress, setShowProgress] = useState(false);
  const [progressTahap, setProgressTahap] = useState("");
  const [progressDeskripsi, setProgressDeskripsi] = useState("");
  const [progressFoto, setProgressFoto] = useState<string | null>(null);
  const [progressUploading, setProgressUploading] = useState(false);

    async function handleUploadReferensi(files: FileList | null) {
    if (!files || !files.length) return;
    setUploadingRef(true);
    try {
      const paths: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("sub", "custom-ref");
        const r = await fetch("/api/admin/upload", { method: "POST", credentials: "include", body: fd });
        const j = await r.json();
        if (r.ok && j.data?.path) paths.push(j.data.path);
      }
      if (paths.length) {
        const updated = await adminAddReferensi(id, paths);
        if (updated) setOrder(updated);
        setSuccessMsg(`${paths.length} referensi ditambahkan`);
      }
    } finally {
      setUploadingRef(false);
    }
  }
  async function handleDeleteReferensi(path: string) {
    const updated = await adminDeleteReferensi(id, path);
    if (updated) setOrder(updated);
  }

  // Fetch biayaPacking dari settings DB (konsisten dengan front-end customer & API)
  useEffect(() => {
    fetch("/api/settings?keys=biayaPacking")
      .then(r => r.json())
      .then(j => {
        const val = Number(j?.biayaPacking) || 10000;
        if (val > 0) setBiayaPackingDefault(val);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const o = await getCustomOrderById(id);
      if (!cancelled) setOrder(o);
    })();
    return () => { cancelled = true; };
  }, [mounted, id, tick]);
  const action = useMemo(() => (order ? getCustomActionAvailability(order) : null), [order]);

  if (!mounted) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;
  if (!order) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-3 text-sm font-black text-gray-500">Custom order tidak ditemukan</p>
        <button onClick={() => router.push("/admin/custom")} className="mt-4 rounded-full bg-[#fc970a] px-5 py-2 text-xs font-black text-white">Kembali</button>
      </div>
    );
  }

  function refresh() { setTick((t) => t + 1); }

    function openEstimasi() {
    if (!order) return;
    if (order.estimasi?.items?.length) {
      setEstItems(order.estimasi.items);
    } else {
      setEstItems([
        { label: "Jenis Helm + Aksesoris", sub: `${order.jenis} + ${order.aksesoris}`, harga: 0, hari: 7 },
        { label: "Strap", sub: order.strap, harga: 0, hari: 0 },
        { label: "Motif Cover Busa", sub: order.motifBusa, harga: 0, hari: 0 },
        { label: "Bahan Helm", sub: order.bahan, harga: 0, hari: 0 },
        { label: "Kombinasi Warna", sub: `${order.warnaList?.length ?? 1} warna`, harga: 0, hari: 0 },
      ]);
    }
    setEstCatatan(order.quotedCatatan ?? "");
    setEstTglMulai(order.estimasiTanggal?.mulai ?? "");
    setEstTglSelesai(order.estimasiTanggal?.selesai ?? "");
    setShowEstimasi(true);
  }

  async function submitEstimasi() {
    const valid = estItems.filter((it) => it.label.trim());
    if (valid.length === 0) return;
    if (estTglMulai && estTglSelesai && estTglSelesai < estTglMulai) {
      alert("Tanggal selesai tidak boleh lebih awal dari tanggal mulai");
      return;
    }
    const r = await adminSetEstimasi(id, {
      items: valid,
      catatan: estCatatan.trim() || undefined,
      tanggalMulai: estTglMulai || undefined,
      tanggalSelesai: estTglSelesai || undefined,
    });
    if (r) setSuccessMsg("Estimasi dikirim — menunggu persetujuan customer");
    setShowEstimasi(false);
    refresh();
  }

  /* BARU (Batch E): handler progress */
  function openProgress() {
    setProgressTahap("");
    setProgressDeskripsi("");
    setProgressFoto(null);
    setShowProgress(true);
  }

  async function onProgressFile(file: File | null) {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      alert("Format file: PNG / JPG / WEBP saja");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Maksimum 5MB");
      return;
    }
    setProgressUploading(true);
    try {
      const dataUrl = await compressImage(file, 1200, 0.75);
      setProgressFoto(dataUrl);
    } catch {
      alert("Gagal kompres foto");
    } finally {
      setProgressUploading(false);
    }
  }

  async function submitProgress() {
    if (!progressTahap.trim()) return;
      const r = await adminAddProgressUpdate(id, {
      tahap: progressTahap.trim(),
      deskripsi: progressDeskripsi.trim() || undefined,
      fotoUrl: progressFoto ?? undefined,
    });
    if (r) setSuccessMsg("Update progress terkirim ke customer");
    setShowProgress(false);
    refresh();
  }

  async function deleteProgress(updateId: string) {
    if (!confirm("Hapus update progress ini?")) return;
        await adminDeleteProgressUpdate(id, updateId);
    refresh();
  }

  async function doConfirm() {
    if (!confirmKind) return;
    let r: CustomOrder | null = null;
    let msg = "Berhasil";
    switch (confirmKind) {
      case "verifyDp":        r = await adminVerifyDp(id);            msg = "DP disetujui — order masuk produksi"; break;
      case "verifyLunas":     r = await adminVerifyLunas(id);         msg = "Pembayaran lunas disetujui — order masuk produksi"; break;
      case "verifyPelunasan": r = await adminVerifyPelunasan(id);     msg = "Pelunasan disetujui — order selesai"; break;
      case "markSiap":        r = await adminMarkSiapDilunasi(id);    msg = "Produk siap, customer diminta lunasi"; break;
      case "markDikirim":     r = await adminMarkDikirim(id);         msg = "Status diubah ke Dikirim"; break;
      case "markSelesai":     r = await adminMarkSelesaiCustom(id);   msg = "Order ditandai selesai"; break;
      case "toggleLate":      r = await adminToggleLate(id);          msg = order?.isLate ? "Tanda telat dihapus" : "Order ditandai TELAT"; break;
    }
    if (r) setSuccessMsg(msg);
    setConfirmKind(null);
    refresh();
  }

  async function doReject() {
    if (!rejectKind || !alasan.trim()) return;
    let r: CustomOrder | null = null;
    let msg = "Ditolak";
    switch (rejectKind) {
      case "order":     r = await adminRejectCustom(id, alasan.trim());     msg = "Custom order ditolak"; break;
      case "dp":        r = await adminRejectDp(id, alasan.trim());          msg = "DP ditolak — customer harus upload ulang"; break;
      case "lunas":     r = await adminRejectLunas(id, alasan.trim());       msg = "Bukti lunas ditolak — customer harus upload ulang"; break;
      case "pelunasan": r = await adminRejectPelunasan(id, alasan.trim());   msg = "Pelunasan ditolak — customer harus upload ulang"; break;
    }
    if (r) setSuccessMsg(msg);
    setRejectKind(null);
    setAlasan("");
    refresh();
  }

  async function saveCatatan() {
    if (catatanDraft.trim()) {
      await adminAppendCatatan(id, catatanDraft.trim());
      setSuccessMsg("Catatan ditambahkan");
    }
    setCatatanDraft("");
    setShowCatatan(false);
    refresh();
  }

  const total = order.estimasi?.total ?? 0;
  const biayaPacking = (order.estimasi?.items?.length ?? 0) > 0 ? biayaPackingDefault : 0;
  const totalWithPacking = total + biayaPacking;
  const paid = getCustomTotalPaid(order);
  const sisa = getCustomSisaBayar(order);
  const persen = totalWithPacking > 0 ? Math.min(100, Math.round((paid / totalWithPacking) * 100)) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-bold text-gray-900 hover:text-[#FF6B1A]">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${CUSTOM_STATUS_COLOR[order.status]}`}>
            {CUSTOM_STATUS_LABEL[order.status]}
          </span>
          {order.paymentType && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase text-blue-700">
              {order.paymentType === "dp" ? "DP" : "Lunas"}
            </span>
          )}
          {order.isLate && (
            <span className="flex items-center gap-1 animate-pulse rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase text-white shadow">
              <AlertTriangle className="h-3 w-3" /> Telat
            </span>
          )}
        </div>
      </div>

      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-[#FF6B1A] to-orange-600 p-5 text-white shadow-lg sm:p-6">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/70">
          <Wrench className="h-3 w-3" /> Custom Order
        </p>
        <h2 className="mt-1 text-2xl font-black sm:text-3xl">{order.jenis}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/90">
          <span className="font-mono">{order.id}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(order.createdAt).toLocaleString("id-ID")}</span>
          {total > 0 && <span className="font-black">{formatRp(total)}</span>}
        </div>
      </section>

      {/* Action bar */}
      {action && (
        <section className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700">
            <ShieldCheck className="h-4 w-4" /> Aksi Tersedia
          </p>
          <div className="flex flex-wrap gap-2">
            {action.canSetEstimasi && (
              <ActionBtn onClick={openEstimasi} bg="bg-[#FF6B1A] hover:bg-[#E55A0F]" icon={Edit3}>Set Estimasi & Harga</ActionBtn>
            )}
            {action.canVerifyDp && (
              <>
                <ActionBtn onClick={() => setConfirmKind("verifyDp")} bg="bg-emerald-600 hover:bg-emerald-700" icon={CheckCircle2}>Setujui DP</ActionBtn>
                <ActionBtn onClick={() => setRejectKind("dp")} bg="bg-red-600 hover:bg-red-700" icon={XCircle}>Tolak DP</ActionBtn>
              </>
            )}
            {action.canVerifyLunas && (
              <>
                <ActionBtn onClick={() => setConfirmKind("verifyLunas")} bg="bg-emerald-600 hover:bg-emerald-700" icon={CheckCircle2}>Setujui Lunas</ActionBtn>
                <ActionBtn onClick={() => setRejectKind("lunas")} bg="bg-red-600 hover:bg-red-700" icon={XCircle}>Tolak Lunas</ActionBtn>
              </>
            )}
            {action.canVerifyPelunasan && (
              <>
                <ActionBtn onClick={() => setConfirmKind("verifyPelunasan")} bg="bg-emerald-600 hover:bg-emerald-700" icon={CheckCircle2}>Setujui Pelunasan</ActionBtn>
                <ActionBtn onClick={() => setRejectKind("pelunasan")} bg="bg-red-600 hover:bg-red-700" icon={XCircle}>Tolak Pelunasan</ActionBtn>
              </>
            )}
            {action.canMarkSiapDilunasi && (
              <ActionBtn onClick={() => setConfirmKind("markSiap")} bg="bg-amber-500 hover:bg-amber-600" icon={Layers}>Tandai Siap Dilunasi</ActionBtn>
            )}
            {action.canMarkDikirim && (
              <ActionBtn onClick={() => setConfirmKind("markDikirim")} bg="bg-indigo-600 hover:bg-indigo-700" icon={Truck}>Tandai Dikirim</ActionBtn>
            )}
            {action.canMarkSelesai && (
              <ActionBtn onClick={() => setConfirmKind("markSelesai")} bg="bg-green-600 hover:bg-green-700" icon={CheckCircle2}>Tandai Selesai</ActionBtn>
            )}
            {action.canToggleLate && (
              <ActionBtn onClick={() => setConfirmKind("toggleLate")} bg={order.isLate ? "bg-gray-500 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"} icon={AlertTriangle}>
                {order.isLate ? "Hapus Tanda Telat" : "Tandai Telat"}
              </ActionBtn>
            )}
            {action.canReject && (
              <ActionBtn onClick={() => setRejectKind("order")} outline icon={X}>Tolak Order</ActionBtn>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* LEFT */}
        <div className="space-y-5 lg:col-span-2">
          {/* Spesifikasi */}
          <Card icon={Wrench} title="Spesifikasi Helm">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <Field label="Jenis" value={order.jenis} />
              <Field label="Ukuran" value={order.ukuran} />
              <Field label="Finishing" value={order.finishing} />
              <Field label="Strap" value={order.strap} />
              <Field label="Bahan" value={order.bahan} />
              <Field label="Motif Busa" value={order.motifBusa} />
              <Field label="Aksesoris" value={order.aksesoris} />
              <Field label="Jumlah Warna" value={`${order.warnaList?.length ?? 0}`} />
              <Field label="File Referensi" value={`${order.referensiFiles?.length ?? 0} file`} />
            </div>
          </Card>

          {/* Warna */}
          <Card icon={Palette} title="Kombinasi Warna" subtitle={`${order.warnaList?.length ?? 0} warna`}>
            <div className="flex flex-wrap gap-2">
              {(order.warnaList ?? []).map((w, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="h-8 w-8 rounded-md border border-gray-300 shadow-inner" style={{ background: w.hex }} />
                  <div className="text-xs">
                    <p className="font-black text-gray-900">{w.nama ?? "Custom"}</p>
                    <p className="font-mono text-[10px] text-gray-500">{w.hex}</p>
                  </div>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase ${
                    w.sumber === "preset" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-[#FF6B1A]"
                  }`}>{w.sumber}</span>
                </div>
              ))}
            </div>
            {order.warnaCatatan && (
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs">
                <p className="text-[10px] font-bold uppercase text-gray-500">Catatan Warna Customer</p>
                <p className="mt-1 whitespace-pre-line text-gray-700">{order.warnaCatatan}</p>
              </div>
            )}
          </Card>

          {/* Referensi files (admin bisa tambah & hapus) */}
          <Card
            icon={FileImage}
            title="Referensi Desain"
            subtitle={`${order.referensiFiles?.length ?? 0} file`}
          >
            <div className="mb-3 flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#fc970a] px-4 py-2 text-xs font-black text-white hover:bg-[#1A3066]">
                <Upload className="h-3.5 w-3.5" />
                {uploadingRef ? "Mengupload…" : "Tambah Referensi"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploadingRef}
                  onChange={(e) => handleUploadReferensi(e.target.files)}
                />
              </label>
            </div>
            {order.referensiFiles?.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {order.referensiFiles.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {f.dataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.dataUrl}
                        alt={f.name}
                        className="aspect-square w-full cursor-zoom-in object-cover"
                        onClick={() => setPreview(f.dataUrl!)}
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-gray-300">
                        <FileImage className="h-8 w-8" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteReferensi(f.dataUrl ?? "")}
                      className="absolute right-1 top-1 rounded-full bg-red-500/90 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      title="Hapus referensi"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Belum ada referensi desain. Klik tombol di atas untuk menambah.</p>
            )}
          </Card>

          {/* Notes customer */}
          {order.notes && (
            <Card icon={FileText} title="Catatan & Riwayat">
              <pre className="whitespace-pre-wrap break-words font-sans text-xs text-gray-700">{order.notes}</pre>
            </Card>
          )}

                    {/* Estimasi breakdown */}
          {order.estimasi && (
            <Card icon={ClipboardList} title="Breakdown Estimasi" subtitle={`${formatRp(order.estimasi.total)} + ${formatRp(biayaPacking)} packing = ${formatRp(totalWithPacking)}`}>
              <div className="space-y-2">
                {order.estimasi.items.map((it, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                    <div>
                      <p className="font-black text-gray-900">{it.label}</p>
                      <p className="text-[11px] text-gray-500">{it.sub}</p>
                      {it.hari > 0 && <p className="text-[10px] text-amber-700">+{it.hari} hari pengerjaan</p>}
                    </div>
                    <p className="shrink-0 font-black text-gray-900">{formatRp(it.harga)}</p>
                  </div>
                ))}
                <div className="mt-2 space-y-1 rounded-lg bg-gray-50 p-2">
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-600">Subtotal Estimasi</p>
                    <p className="font-black text-gray-900">{formatRp(order.estimasi.total)}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-600">Biaya Packing</p>
                    <p className="font-black text-gray-900">{formatRp(biayaPacking)}</p>
                  </div>
                  <div className="flex items-center justify-between border-t-2 border-gray-200 pt-1">
                    <p className="text-sm font-black text-gray-900">TOTAL</p>
                    <p className="text-base font-black text-[#FF6B1A]">{formatRp(totalWithPacking)}</p>
                  </div>
                </div>
                {order.estimasiTanggal && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
                    <CalendarRange className="h-3.5 w-3.5" />
                    <span>
                      Janji produksi: <b>{new Date(order.estimasiTanggal.mulai + "T00:00:00").toLocaleDateString("id-ID", { day:"numeric", month:"short" })}</b> &mdash;{" "}
                      <b>{new Date(order.estimasiTanggal.selesai + "T00:00:00").toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" })}</b>
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* BARU (Batch E): Progress produksi */}
          {(order.progressUpdates?.length ?? 0) > 0 && (
            <Card icon={Camera} title="Riwayat Progress Produksi" subtitle={`${order.progressUpdates?.length ?? 0} update`}>
              <div className="space-y-3">
                {[...(order.progressUpdates ?? [])].reverse().map((p) => (
                  <div key={p.id} className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                    {p.fotoUrl ? (
                      <button onClick={() => setPreview(p.fotoUrl!)} className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.fotoUrl} alt={p.tahap}
                          className="h-16 w-16 rounded-md object-cover transition hover:opacity-80" />
                      </button>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-gray-200">
                        <Camera className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-black text-gray-900">{p.tahap}</p>
                        <button onClick={() => deleteProgress(p.id)}
                          className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {new Date(p.createdAt).toLocaleString("id-ID", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                      </p>
                      {p.deskripsi && <p className="mt-1 whitespace-pre-line text-gray-700">{p.deskripsi}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          {/* Payment progress */}
          {total > 0 && (
            <Card icon={Banknote} title="Progress Pembayaran">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-black text-gray-900">{formatRp(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Dibayar</span>
                  <span className="font-black text-emerald-600">{formatRp(paid)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-2">
                  <span className="text-gray-500">Sisa</span>
                  <span className={`font-black ${sisa > 0 ? "text-[#FF6B1A]" : "text-emerald-600"}`}>{formatRp(sisa)}</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>Progress bayar</span><span>{persen}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#FF6B1A]" style={{ width: `${persen}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Bukti DP */}
          {order.dpPayment && (
            <PaymentCard title="Bukti DP" rec={order.dpPayment} onPreview={setPreview} />
          )}
          {/* Bukti Lunas */}
          {order.lunasPayment && (
            <PaymentCard title="Bukti Lunas (Full)" rec={order.lunasPayment} onPreview={setPreview} />
          )}
          {/* Bukti Pelunasan */}
          {order.pelunasanPayment && (
            <PaymentCard title="Bukti Pelunasan" rec={order.pelunasanPayment} onPreview={setPreview} />
          )}

                    {/* Catatan admin */}
          <Card icon={Edit3} title="Tambah Catatan Admin">
            <button onClick={() => { setCatatanDraft(""); setShowCatatan(true); }}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-gray-300 py-2 text-[11px] font-black text-gray-600 hover:border-[#FF6B1A] hover:text-[#FF6B1A]">
              <Plus className="h-3 w-3" /> Tambah Catatan Internal
            </button>
            <p className="mt-2 text-[10px] text-gray-500">Catatan akan ditambahkan ke riwayat di panel kiri.</p>
          </Card>

          {/* BARU (Batch E): Upload progress produksi — hanya saat order sedang aktif */}
          {["diproses", "siap_dilunasi", "dikirim"].includes(order.status) && (
            <Card icon={Camera} title="Update Progress Produksi">
              <button onClick={openProgress}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#FF6B1A] py-2 text-[11px] font-black text-white hover:bg-[#E55A0F]">
                <Plus className="h-3 w-3" /> Kirim Update ke Customer
              </button>
              <p className="mt-2 text-[10px] text-gray-500">Foto + tahap produksi langsung tampil di halaman customer & notif terkirim.</p>
            </Card>
          )}
          {/* Customer chat link */}
          <Link href={`/admin/chat?customId=${order.id}`}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[#fc970a] py-2.5 text-[11px] font-black text-white hover:bg-[#e08a00]">
            <Send className="h-3.5 w-3.5" /> Chat Customer
          </Link>
        </div>
      </div>

      {/* MODAL: Confirm sederhana */}
      <ConfirmModal
        open={confirmKind === "verifyDp"}
        title="Setujui Bukti DP?"
        message="Status order akan langsung berubah ke Sedang Diproduksi."
        confirmText="Ya, Setujui"
        onConfirm={doConfirm}
        onClose={() => setConfirmKind(null)}
      />
      <ConfirmModal
        open={confirmKind === "verifyLunas"}
        title="Setujui Pembayaran Lunas?"
        message="Order langsung masuk produksi setelah disetujui."
        confirmText="Ya, Setujui"
        onConfirm={doConfirm}
        onClose={() => setConfirmKind(null)}
      />
      <ConfirmModal
        open={confirmKind === "verifyPelunasan"}
        title="Setujui Bukti Pelunasan?"
        message="Order akan ditandai SELESAI."
        confirmText="Ya, Setujui"
        onConfirm={doConfirm}
        onClose={() => setConfirmKind(null)}
      />
      <ConfirmModal
        open={confirmKind === "markSiap"}
        title="Produk Sudah Siap?"
        message="Customer akan diminta lakukan pelunasan sisa pembayaran."
        confirmText="Ya, Siap Dilunasi"
        onConfirm={doConfirm}
        onClose={() => setConfirmKind(null)}
      />
      <ConfirmModal
        open={confirmKind === "markDikirim"}
        title="Tandai Order Dikirim?"
        message="Status order berubah ke Dikirim."
        confirmText="Ya, Dikirim"
        onConfirm={doConfirm}
        onClose={() => setConfirmKind(null)}
      />
      <ConfirmModal
        open={confirmKind === "markSelesai"}
        title="Selesaikan Order?"
        message="Status order langsung jadi Selesai. Pastikan customer sudah terima."
        confirmText="Ya, Selesaikan"
        onConfirm={doConfirm}
        onClose={() => setConfirmKind(null)}
      />
      <ConfirmModal
        open={confirmKind === "toggleLate"}
        title={order.isLate ? "Hapus Tanda Telat?" : "Tandai Order TELAT?"}
        message={order.isLate ? "Flag telat akan dihapus dari order ini." : "Order akan diberi indikator merah TELAT — customer akan melihat."}
        confirmText={order.isLate ? "Hapus" : "Ya, Tandai Telat"}
        variant={order.isLate ? "warning" : "danger"}
        onConfirm={doConfirm}
        onClose={() => setConfirmKind(null)}
      />

      {/* MODAL: Reject + alasan (semua jenis) */}
      {rejectKind && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-base font-black text-gray-900">
              {rejectKind === "order" ? "Tolak Custom Order"
                : rejectKind === "dp" ? "Tolak Bukti DP"
                : rejectKind === "lunas" ? "Tolak Bukti Lunas"
                : "Tolak Bukti Pelunasan"}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {rejectKind === "order"
                ? "Order ditandai DITOLAK dan customer akan diberitahu."
                : "Bukti dihapus, customer harus upload ulang. Tulis alasan jelas."}
            </p>
            <textarea autoFocus value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={4}
              placeholder="Tulis alasan..."
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

      {/* MODAL: Set Estimasi */}
      {showEstimasi && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-base font-black text-gray-900">Set Estimasi Harga & Hari</p>
              <button onClick={() => setShowEstimasi(false)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-600">Atur harga & estimasi pengerjaan per komponen. Total dihitung otomatis.</p>

            <div className="mt-4 space-y-2">
              {estItems.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <input value={it.label} onChange={(e) => {
                    const next = [...estItems]; next[i] = { ...it, label: e.target.value }; setEstItems(next);
                  }} placeholder="Label" className="col-span-4 rounded border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold outline-none focus:border-[#FF6B1A]" />
                  <input value={it.sub} onChange={(e) => {
                    const next = [...estItems]; next[i] = { ...it, sub: e.target.value }; setEstItems(next);
                  }} placeholder="Detail" className="col-span-3 rounded border border-gray-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-[#FF6B1A]" />
                  <input type="number" value={it.harga || ""} onChange={(e) => {
                    const next = [...estItems]; next[i] = { ...it, harga: Number(e.target.value) || 0 }; setEstItems(next);
                  }} placeholder="Harga" className="col-span-3 rounded border border-gray-200 bg-white px-2 py-1.5 text-right font-mono text-[11px] outline-none focus:border-[#FF6B1A]" />
                  <input type="number" value={it.hari || ""} onChange={(e) => {
                    const next = [...estItems]; next[i] = { ...it, hari: Number(e.target.value) || 0 }; setEstItems(next);
                  }} placeholder="Hari" className="col-span-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-center font-mono text-[11px] outline-none focus:border-[#FF6B1A]" />
                  <button onClick={() => setEstItems(estItems.filter((_, x) => x !== i))}
                    className="col-span-1 flex items-center justify-center rounded text-red-500 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={() => setEstItems([...estItems, { label: "", sub: "", harga: 0, hari: 0 }])}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 py-2 text-[11px] font-black text-gray-500 hover:border-[#FF6B1A] hover:text-[#FF6B1A]">
                <Plus className="h-3 w-3" /> Tambah Komponen
              </button>
            </div>

            {/* Total preview */}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-orange-50 p-3 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-500">Total Harga Produk</p>
                <p className="text-lg font-black text-[#FF6B1A]">
                  {formatRp(estItems.reduce((s, it) => s + (Number(it.harga) || 0), 0))}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-500">Total Hari</p>
                <p className="text-lg font-black text-gray-900">
                  {estItems.reduce((s, it) => s + (Number(it.hari) || 0), 0)} hari
                </p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-gray-400">Ongkos kirim akan dihitung otomatis berdasarkan alamat customer saat pembayaran.</p>

                        <div className="mt-3">
              <label className="text-[11px] font-black uppercase text-gray-500">Catatan (opsional)</label>
              <textarea value={estCatatan} onChange={(e) => setEstCatatan(e.target.value)} rows={2}
                placeholder="Mis: harga sudah termasuk packing kayu..."
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
            </div>

            {/* BARU (Batch E): Tanggal konkret produksi */}
            <div className="mt-3 rounded-lg border-2 border-blue-100 bg-blue-50/50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700">
                <CalendarRange className="h-3.5 w-3.5" /> Janji Tanggal Produksi (Opsional)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold text-gray-600">Mulai Produksi</span>
                  <input
                    type="date"
                    value={estTglMulai}
                    onChange={(e) => setEstTglMulai(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white p-2 text-xs outline-none focus:border-[#FF6B1A]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold text-gray-600">Estimasi Selesai</span>
                  <input
                    type="date"
                    value={estTglSelesai}
                    onChange={(e) => setEstTglSelesai(e.target.value)}
                    min={estTglMulai || undefined}
                    className="w-full rounded-md border border-gray-200 bg-white p-2 text-xs outline-none focus:border-[#FF6B1A]"
                  />
                </label>
              </div>
              <p className="mt-2 text-[10px] text-gray-500">
                Customer akan lihat tanggal konkret ini di halaman estimasi &amp; detail order. Kalau dikosongkan, hanya pakai &quot;± hari pengerjaan&quot; dari komponen di atas.
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowEstimasi(false)}
                className="flex-1 rounded-md border-2 border-gray-200 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={submitEstimasi} disabled={estItems.length === 0}
                className="flex-1 rounded-md bg-[#FF6B1A] py-2.5 text-xs font-black text-white hover:bg-[#E55A0F] disabled:opacity-50">
                <Save className="mr-1 inline h-3 w-3" /> Kirim ke Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah catatan */}
      {showCatatan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-base font-black text-gray-900">Tambah Catatan Admin</p>
            <textarea autoFocus value={catatanDraft} onChange={(e) => setCatatanDraft(e.target.value)} rows={4}
              placeholder="Contoh: Bahan ABS sudah datang, mulai pengecatan..."
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowCatatan(false)}
                className="flex-1 rounded-md border-2 border-gray-200 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={saveCatatan} disabled={!catatanDraft.trim()}
                className="flex-1 rounded-md bg-[#FF6B1A] py-2.5 text-xs font-black text-white hover:bg-[#E55A0F] disabled:opacity-50">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Preview lightbox */}
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

      {/* MODAL: Tambah Update Progress (Batch E) */}
      {showProgress && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <Camera className="h-5 w-5 text-[#FF6B1A]" />
              <p className="text-base font-black text-gray-900">Update Progress Produksi</p>
            </div>
            <p className="text-xs text-gray-600">Customer akan terima notifikasi & lihat foto + deskripsi ini di halaman custom order.</p>

            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-gray-600">Tahap Pengerjaan *</span>
                <input value={progressTahap} onChange={(e) => setProgressTahap(e.target.value)} maxLength={60}
                  placeholder="cth: Pengecatan base coat, Finishing clear"
                  className="w-full rounded-md border border-gray-200 bg-gray-50 p-2.5 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-gray-600">Deskripsi (Opsional)</span>
                <textarea value={progressDeskripsi} onChange={(e) => setProgressDeskripsi(e.target.value)} rows={3} maxLength={300}
                  placeholder="Catatan detail untuk customer..."
                  className="w-full resize-none rounded-md border border-gray-200 bg-gray-50 p-2.5 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
              </label>

              <div>
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-gray-600">Foto Progress (Opsional)</span>
                {progressFoto ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={progressFoto} alt="preview" className="h-40 w-full rounded-lg object-cover" />
                    <button onClick={() => setProgressFoto(null)}
                      className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white shadow hover:bg-red-700">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-[#FF6B1A]">
                    <input type="file" accept="image/png,image/jpeg,image/webp" hidden
                      onChange={(e) => onProgressFile(e.target.files?.[0] ?? null)} />
                    <div className="text-center">
                      <Upload className="mx-auto h-6 w-6 text-gray-400" />
                      <p className="mt-1 text-[10px] font-bold text-gray-500">
                        {progressUploading ? "Mengompres..." : "Klik untuk pilih foto"}
                      </p>
                      <p className="text-[9px] text-gray-400">PNG / JPG / WEBP · maks 5MB</p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowProgress(false)}
                className="flex-1 rounded-md border-2 border-gray-200 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={submitProgress} disabled={!progressTahap.trim() || progressUploading}
                className="flex-1 rounded-md bg-[#FF6B1A] py-2.5 text-xs font-black text-white hover:bg-[#E55A0F] disabled:opacity-50">
                Kirim Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================  SUB COMPONENTS  ==================== */

function Card({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fc970a]/5 text-gray-900">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-black text-gray-900">{title}</p>
          {subtitle && <p className="text-[10px] text-gray-500">{subtitle}</p>}
        </div>
      </div>
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

function ActionBtn({ children, onClick, icon: Icon, bg, outline }: {
  children: React.ReactNode; onClick: () => void; icon: React.ElementType; bg?: string; outline?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black shadow transition ${
        outline
          ? "border-2 border-red-300 bg-white text-red-600 hover:bg-red-50"
          : `${bg ?? "bg-[#fc970a]"} text-white`
      }`}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

function PaymentCard({ title, rec, onPreview }: {
  title: string; rec: PaymentRecord; onPreview: (url: string) => void;
}) {
  return (
    <Card icon={Banknote} title={title} subtitle={new Date(rec.at).toLocaleString("id-ID")}>
      <div className="flex gap-3">
        <button onClick={() => rec.buktiUrl && onPreview(rec.buktiUrl)}
          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50">
          {rec.buktiUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rec.buktiUrl} alt="Bukti" className="h-full w-full object-cover transition group-hover:scale-105" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                <ZoomIn className="h-4 w-4 text-white" />
              </span>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300"><FileImage className="h-6 w-6" /></div>
          )}
        </button>
        <div className="flex-1 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-gray-500">Nominal</span>
            <span className="font-black text-[#FF6B1A]">{formatRp(rec.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-gray-500">Metode</span>
            <span className="font-bold uppercase text-gray-900">{rec.metode}{rec.bank ? ` · ${rec.bank.toUpperCase()}` : ""}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}