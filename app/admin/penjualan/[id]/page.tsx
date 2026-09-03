"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertCircle, ArrowLeft, Banknote, Calendar, CheckCircle2, ClipboardList,
  Edit3, ExternalLink, FileText, MapPin, Maximize2, Package, Phone, Save, Send,
  ShieldCheck, ShoppingBag, Truck, User, Wrench, X, XCircle,
} from "lucide-react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { SuccessModal } from "@/components/admin/SuccessModal";
import {
  EKSPEDISI_LIST, STATUS_COLOR, STATUS_LABEL,
  formatTanggalJamID, formatRangeTanggalID,
  getEkspedisiByName, getOrderTimeline,
  type Order,
} from "@/lib/orders-storage";
import {
  adminCancelOrder, adminConfirmPayment, adminEditCatatan, adminEditResi,
  adminForceSelesai, adminInputResi, adminMarkDelivered, adminRejectPayment,
  getActionAvailability, getAdminOrder,
} from "@/lib/admin-orders-helpers";

type ActionKind = "confirm" | "reject" | "cancel" | "delivered" | "forceSelesai" | null;

interface CustomWarna {
  hex?: string;
  nama?: string;
}

const emptySubscribe = () => () => {};

export default function AdminPenjualanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id;

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [tick, setTick] = useState(0);
  const [order, setOrder] = useState<Order | null>(null);

  const [actionKind, setActionKind] = useState<ActionKind>(null);
  const [alasan, setAlasan] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewBukti, setPreviewBukti] = useState(false);

  const [showResiForm, setShowResiForm] = useState(false);
  const [resiKurir, setResiKurir] = useState(EKSPEDISI_LIST[0].nama);
  const [resiNo, setResiNo] = useState("");

  const [editCatatan, setEditCatatan] = useState(false);
  const [catatanDraft, setCatatanDraft] = useState("");

  useEffect(() => {
    if (!mounted) return;
    void (async () => {
      const o = await getAdminOrder(orderId);
      setOrder(o);
      setCatatanDraft(o?.catatanAdmin ?? "");
      if (o?.ekspedisi?.kurir) setResiKurir(o.ekspedisi.kurir);
      if (o?.ekspedisi?.resi) setResiNo(o.ekspedisi.resi);
    })();
  }, [mounted, orderId, tick]);

  const action = useMemo(() => (order ? getActionAvailability(order) : null), [order]);

  if (!mounted) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;
  if (!order) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-3 text-sm font-black text-gray-500">Pesanan tidak ditemukan</p>
        <button onClick={() => router.push("/admin/penjualan")} className="mt-4 rounded-full bg-[#fc970a] px-5 py-2 text-xs font-black text-white">Kembali</button>
      </div>
    );
  }

  const isCustom = order.jenisOrder === "custom" || !!order.customMeta;
  const tl = getOrderTimeline(order);
  const ekspOpt = getEkspedisiByName(order.ekspedisi?.kurir);

  function refresh() { setTick((t) => t + 1); }

  async function doConfirm() {
    if (actionKind === "confirm") {
      const r = await adminConfirmPayment(orderId);
      if (r) setSuccessMsg("Pembayaran dikonfirmasi");
    } else if (actionKind === "reject") {
      if (!alasan.trim()) return;
      const r = await adminRejectPayment(orderId, alasan.trim());
      if (r) setSuccessMsg("Bukti ditolak, customer harus upload ulang");
    } else if (actionKind === "cancel") {
      if (!alasan.trim()) return;
      const r = await adminCancelOrder(orderId, alasan.trim());
      if (r) setSuccessMsg("Pesanan dibatalkan, stok dikembalikan");
    } else if (actionKind === "delivered") {
      const r = await adminMarkDelivered(orderId);
      if (r) setSuccessMsg("Ditandai sampai. Auto-selesai 3x24 jam jika tidak ada komplain");
    } else if (actionKind === "forceSelesai") {
      const r = await adminForceSelesai(orderId);
      if (r) setSuccessMsg("Pesanan diselesaikan");
    }
    setActionKind(null);
    setAlasan("");
    refresh();
  }

  async function submitResi() {
    if (!resiNo.trim()) return;
    if (action?.canInputResi) {
      const r = await adminInputResi(orderId, { kurir: resiKurir, resi: resiNo.trim() });
      if (r) setSuccessMsg("Resi disimpan & status diubah ke Dikirim");
    } else if (action?.canEditResi) {
      const r = await adminEditResi(orderId, { kurir: resiKurir, resi: resiNo.trim() });
      if (r) setSuccessMsg("Resi diperbarui");
    }
    setShowResiForm(false);
    refresh();
  }

  function saveCatatan() {
    adminEditCatatan(orderId, catatanDraft.trim());
    setEditCatatan(false);
    setSuccessMsg("Catatan admin disimpan");
    refresh();
  }

  return (
    <div className="space-y-5">
      {/* Header navigasi */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#FF6B1A] transition">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Pesanan
        </button>
        <div className="flex items-center gap-2">
          {isCustom && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-bold text-[#FF6B1A]">
              <Wrench className="h-3.5 w-3.5" /> Custom Order
            </span>
          )}
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {/* Hero Overview Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ID Pesanan</span>
            <h2 className="mt-0.5 text-2xl font-bold text-slate-900 sm:text-3xl font-mono">{order.id}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" />{formatTanggalJamID(order.createdAt)}</span>
              <span className="flex items-center gap-1.5"><User className="h-4 w-4 text-slate-400" />{order.alamat?.nama ?? "-"}</span>
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" />{order.alamat?.noHp ?? "-"}</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3 text-right">
            <p className="text-[11px] font-semibold text-slate-500">Total Transaksi</p>
            <p className="text-xl font-bold text-slate-900">Rp {order.total.toLocaleString("id-ID")}</p>
          </div>
        </div>
      </section>

      {/* Aksi cepat (kontekstual) */}
      {action && (action.canConfirm || action.canReject || action.canInputResi || action.canMarkDelivered || action.canForceSelesai || action.canCancel) && (
        <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-xs">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <ShieldCheck className="h-4 w-4 text-[#FF6B1A]" /> Aksi Operasional Tersedia
          </p>
          <div className="flex flex-wrap gap-2.5">
            {action.canConfirm && (
              <button onClick={() => setActionKind("confirm")}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition">
                <CheckCircle2 className="h-4 w-4" /> Setujui Bukti Bayar
              </button>
            )}
            {action.canInputResi && (
              <button onClick={() => setShowResiForm(true)}
                className="flex items-center gap-2 rounded-xl bg-[#FF6B1A] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#E04E00] transition">
                <Truck className="h-4 w-4" /> Input Resi & Kirim
              </button>
            )}
            {action.canMarkDelivered && (
              <button onClick={() => setActionKind("delivered")}
                className="flex items-center gap-2 rounded-xl bg-white border border-slate-300 text-slate-800 px-4 py-2 text-xs font-bold shadow-xs hover:bg-slate-50 transition">
                <Package className="h-4 w-4" /> Tandai Sampai
              </button>
            )}
            {action.canForceSelesai && (
              <button onClick={() => setActionKind("forceSelesai")}
                className="flex items-center gap-2 rounded-xl bg-white border border-slate-300 text-slate-800 px-4 py-2 text-xs font-bold shadow-xs hover:bg-slate-50 transition">
                <CheckCircle2 className="h-4 w-4" /> Selesaikan Sekarang
              </button>
            )}
            {action.canReject && (
              <button onClick={() => setActionKind("reject")}
                className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition">
                <XCircle className="h-4 w-4" /> Tolak Bukti
              </button>
            )}
            {action.canCancel && (
              <button onClick={() => setActionKind("cancel")}
                className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition">
                <X className="h-4 w-4" /> Batalkan Pesanan
              </button>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* LEFT — main */}
        <div className="space-y-5 lg:col-span-2">
          {/* Bukti bayar */}
          {(order.buktiBayar || order.buktiBayarAt) && (
            <Card icon={FileText} title="Bukti Pembayaran" subtitle={order.buktiBayarAt ? `Diunggah ${formatTanggalJamID(order.buktiBayarAt)}` : undefined}>
              {order.buktiBayar ? (
                <div className="flex flex-wrap items-start gap-4">
                  <button onClick={() => setPreviewBukti(true)} className="group relative h-40 w-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={order.buktiBayar} alt="Bukti" className="h-full w-full object-cover transition group-hover:scale-105" />
                    <span className="absolute bottom-2 right-2 rounded-lg bg-black/60 p-1.5 text-white shadow-xs backdrop-blur-xs">
                      <Maximize2 className="h-3.5 w-3.5" />
                    </span>
                  </button>
                  <div className="flex-1 min-w-[200px] space-y-1.5 text-xs">
                    <Field label="Metode" value={order.pembayaran?.metode?.toUpperCase() ?? "-"} />
                    {order.pembayaran?.bank && <Field label="Bank Tujuan" value={order.pembayaran.bank.toUpperCase()} />}
                    <Field label="Nominal" value={`Rp ${order.total.toLocaleString("id-ID")}`} />
                    {order.transferInfo?.validatedAt && (
                      <Field label="Diverifikasi" value={formatTanggalJamID(order.transferInfo.validatedAt)} />
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Belum ada gambar bukti.</p>
              )}
            </Card>
          )}

          {/* Items */}
          <Card icon={ShoppingBag} title="Item Pesanan" subtitle={`${order.items.length} item`}>
            <div className="space-y-2">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="h-14 w-14 overflow-hidden rounded-md bg-white">
                    {it.gambar
                      ? <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.gambar} alt={it.nama} className="h-full w-full object-cover" />
                      </>
                      : <div className="flex h-full w-full items-center justify-center text-gray-300"><Package className="h-5 w-5" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-black text-gray-900">{it.nama}</p>
                    <p className="text-[11px] text-gray-500">Ukuran {it.ukuran} · {it.qty}x</p>
                    {it.deskripsi && <p className="line-clamp-1 text-[10px] text-gray-400">{it.deskripsi}</p>}
                  </div>
                  <p className="text-xs font-black text-gray-900">Rp {it.subtotal.toLocaleString("id-ID")}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1 border-t border-dashed border-gray-200 pt-3 text-xs">
              <Row label="Subtotal" value={`Rp ${order.subtotal.toLocaleString("id-ID")}`} />
              {order.diskon > 0 && <Row label="Diskon" value={`- Rp ${order.diskon.toLocaleString("id-ID")}`} valueClass="text-red-600" />}
              {order.ongkir > 0 && <Row label="Ongkir" value={`Rp ${order.ongkir.toLocaleString("id-ID")}`} />}
              {order.biayaPacking ? <Row label="Packing" value={`Rp ${order.biayaPacking.toLocaleString("id-ID")}`} /> : null}
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                <p className="text-sm font-black text-gray-900">Total</p>
                <p className="text-base font-black text-[#FF6B1A]">Rp {order.total.toLocaleString("id-ID")}</p>
              </div>
            </div>

            {order.voucher && (
              <div className="mt-3 rounded-lg bg-orange-50 p-2 text-[11px]">
                <span className="font-black text-[#FF6B1A]">Voucher:</span> {order.voucher.kode} · {order.voucher.judul}
              </div>
            )}
          </Card>

          {/* Custom meta */}
          {isCustom && order.customMeta && (
            <Card icon={Wrench} title="Detail Custom Order" subtitle={order.customMeta.customOrderId ?? undefined}>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {order.customMeta.jenis && <Field label="Jenis" value={order.customMeta.jenis} />}
                {order.customMeta.ukuran && <Field label="Ukuran" value={order.customMeta.ukuran} />}
                {order.customMeta.finishing && <Field label="Finishing" value={order.customMeta.finishing} />}
                {order.customMeta.strap && <Field label="Strap" value={order.customMeta.strap} />}
                {order.customMeta.bahan && <Field label="Bahan" value={order.customMeta.bahan} />}
                {order.customMeta.motifBusa && <Field label="Motif Busa" value={order.customMeta.motifBusa} />}
                {order.customMeta.aksesoris && <Field label="Aksesoris" value={order.customMeta.aksesoris} />}
                {order.customMeta.estimasiHari && <Field label="Estimasi" value={`${order.customMeta.estimasiHari} hari`} />}
              </div>
              {order.customMeta.warnaList?.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Warna</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {order.customMeta.warnaList.map((w: CustomWarna, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px]">
                        <span className="h-4 w-4 rounded-full border" style={{ background: w.hex }} />
                        {w.nama ?? w.hex}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {order.customMeta.notes && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Catatan Customer</p>
                  <p className="mt-1 whitespace-pre-line">{order.customMeta.notes}</p>
                </div>
              )}
              {order.customMeta.customOrderId && (
                <Link href={`/admin/chat?customId=${order.customMeta.customOrderId}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B1A] hover:underline">
                  Buka Chat Custom <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </Card>
          )}

          {/* Resi */}
          {(order.status === "diproses" || order.status === "dikirim" || order.deliveredAt) && (
            <Card icon={Truck} title="Pengiriman" subtitle={order.ekspedisi?.shippedAt ? `Dikirim ${formatTanggalJamID(order.ekspedisi.shippedAt)}` : undefined}>
              {order.ekspedisi?.resi ? (
                <div className="space-y-2 text-xs">
                  <Field label="Kurir" value={order.ekspedisi.kurir ?? "-"} />
                  <Field label="No Resi" value={order.ekspedisi.resi} mono />
                  {order.estimasiTiba && <Field label="Estimasi Tiba" value={formatRangeTanggalID(order.estimasiTiba)} />}
                  {order.deliveredAt && <Field label="Tiba" value={formatTanggalJamID(order.deliveredAt)} />}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {ekspOpt?.trackUrl && (
                      <a href={ekspOpt.trackUrl(order.ekspedisi.resi)} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B1A] hover:underline">
                        Lacak Resi <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {action?.canEditResi && (
                      <button onClick={() => setShowResiForm(true)} className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">
                        <Edit3 className="h-3 w-3" /> Edit Resi
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Nomor resi pengiriman belum diinput.</p>
              )}
            </Card>
          )}

          {/* Timeline */}
          <Card icon={ClipboardList} title="Timeline">
            <div className="relative space-y-3 pl-6">
              <div className="absolute bottom-1 left-2 top-1 w-px bg-gray-200" />
              {tl.map((t, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[18px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#FF6B1A] shadow" />
                  <p className="text-xs font-black text-gray-900">{t.label}</p>
                  {t.sub && <p className="text-[11px] text-gray-600">{t.sub}</p>}
                  <p className="text-[10px] text-gray-400">{formatTanggalJamID(t.at)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT — sidebar */}
        <div className="space-y-5">
          <Card icon={User} title="Data Pembeli">
            <div className="space-y-1.5 text-xs">
              <Field label="Nama" value={order.alamat?.nama ?? "-"} />
              <Field label="No HP" value={order.alamat?.noHp ?? "-"} mono />
              <Field label="User ID" value={order.userId} mono />
            </div>
            <Link href={`/admin/chat?userId=${order.userId}`}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-[#fc970a] py-2 text-[11px] font-black text-white hover:bg-[#e08a00]">
              <Send className="h-3.5 w-3.5" /> Chat Customer
            </Link>
          </Card>

          <Card icon={MapPin} title="Alamat Pengiriman">
            <div className="space-y-1 text-xs">
              <p className="font-black text-gray-900">{order.alamat?.nama}</p>
              <p className="text-gray-700">{order.alamat?.alamat}</p>
              {order.alamat?.detail && <p className="text-gray-500">{order.alamat.detail}</p>}
              <p className="text-gray-700">
                {[order.alamat?.kecamatan, order.alamat?.kota, order.alamat?.provinsi].filter(Boolean).join(", ")}
                {order.alamat?.kodePos ? ` ${order.alamat.kodePos}` : ""}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">Pengiriman: <span className="font-bold uppercase text-gray-900">{order.pengiriman}</span></p>
            </div>
          </Card>

                    <Card icon={Banknote} title="Info Pembayaran">
            <div className="space-y-1.5 text-xs">
              <Field label="Metode" value={order.pembayaran?.metode?.toUpperCase() ?? "-"} />
              {order.pembayaran?.bank && <Field label="Bank" value={order.pembayaran.bank.toUpperCase()} />}
              {order.transferInfo?.tujuan && (
                <>
                  <Field label="Rekening" value={order.transferInfo.tujuan.norek} mono />
                  <Field label="A/N" value={order.transferInfo.tujuan.an ?? "-"} />
                </>
              )}
              <Field label="Total" value={`Rp ${order.total.toLocaleString("id-ID")}`} highlight />
              <Field label="Expired" value={formatTanggalJamID(order.expiredAt)} />
            </div>
          </Card>

          <Card icon={Edit3} title="Catatan Admin">
            {editCatatan ? (
              <>
                <textarea value={catatanDraft} onChange={(e) => setCatatanDraft(e.target.value)} rows={4}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white"
                  placeholder="Catatan internal..." />
                <div className="mt-2 flex gap-2">
                  <button onClick={saveCatatan} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#FF6B1A] py-2 text-[11px] font-black text-white">
                    <Save className="h-3 w-3" /> Simpan
                  </button>
                  <button onClick={() => { setEditCatatan(false); setCatatanDraft(order.catatanAdmin ?? ""); }}
                    className="rounded-full border-2 border-gray-200 px-3 py-2 text-[11px] font-black text-gray-600 hover:bg-gray-50">
                    Batal
                  </button>
                </div>
              </>
            ) : (
              <>
                {order.catatanAdmin
                  ? <p className="whitespace-pre-line text-xs text-gray-700">{order.catatanAdmin}</p>
                  : <p className="text-xs italic text-gray-400">Belum ada catatan</p>}
                {action?.canEditCatatan && (
                  <button onClick={() => setEditCatatan(true)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">
                    <Edit3 className="h-3 w-3" /> {order.catatanAdmin ? "Edit" : "Tambah"} Catatan
                  </button>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* MODAL: Konfirmasi sederhana */}
      <ConfirmModal
        open={actionKind === "confirm"}
        title="Setujui Bukti Pembayaran?"
        message="Status order akan berubah ke Diproses dan customer akan menerima notifikasi."
        confirmText="Ya, Setujui"
        onConfirm={doConfirm}
        onClose={() => setActionKind(null)}
      />
      <ConfirmModal
        open={actionKind === "delivered"}
        title="Tandai Paket Sudah Sampai?"
        message="Auto-selesai akan berjalan 3x24 jam jika tidak ada komplain dari customer."
        confirmText="Ya, Sudah Sampai"
        onConfirm={doConfirm}
        onClose={() => setActionKind(null)}
      />
      <ConfirmModal
        open={actionKind === "forceSelesai"}
        title="Selesaikan Pesanan Sekarang?"
        message="Status langsung jadi Selesai tanpa menunggu 3x24 jam. Pastikan customer sudah konfirmasi."
        confirmText="Ya, Selesaikan"
        onConfirm={doConfirm}
        onClose={() => setActionKind(null)}
      />

      {/* MODAL: Reject / Cancel + alasan */}
      {(actionKind === "reject" || actionKind === "cancel") && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-base font-black text-gray-900">
              {actionKind === "reject" ? "Tolak Bukti Pembayaran" : "Batalkan Pesanan"}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {actionKind === "reject"
                ? "Customer akan diminta upload bukti ulang. Tulis alasan jelas."
                : "Stok produk akan dikembalikan otomatis. Tulis alasan pembatalan."}
            </p>
            <textarea autoFocus value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={4}
              placeholder="Contoh: Bukti tidak jelas, nominal tidak sesuai..."
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setActionKind(null); setAlasan(""); }}
                className="flex-1 rounded-md border-2 border-gray-200 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={doConfirm} disabled={!alasan.trim()}
                className="flex-1 rounded-md bg-red-600 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50">
                {actionKind === "reject" ? "Tolak" : "Batalkan Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Resi */}
      {showResiForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-base font-black text-gray-900">
              {action?.canInputResi ? "Input Resi & Kirim" : "Edit Resi Pengiriman"}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {action?.canInputResi ? "Status akan berubah ke Dikirim setelah disimpan." : "Perbarui kurir atau nomor resi."}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase text-gray-500">Kurir</label>
                <select value={resiKurir} onChange={(e) => setResiKurir(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs outline-none focus:border-[#FF6B1A]">
                  {EKSPEDISI_LIST.map((e) => <option key={e.id} value={e.nama}>{e.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-gray-500">No Resi</label>
                <input value={resiNo} onChange={(e) => setResiNo(e.target.value)}
                  placeholder="Contoh: JNE1234567890"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowResiForm(false)}
                className="flex-1 rounded-md border-2 border-gray-200 py-2.5 text-xs font-black text-gray-900 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={submitResi} disabled={!resiNo.trim()}
                className="flex-1 rounded-md bg-[#FF6B1A] py-2.5 text-xs font-black text-white hover:bg-[#E55A0F] disabled:opacity-50">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Preview bukti */}
      {previewBukti && order.buktiBayar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewBukti(false)}>
          <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={order.buktiBayar} alt="Bukti" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <SuccessModal open={!!successMsg} title={successMsg ?? "Berhasil"} onClose={() => setSuccessMsg(null)} />
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

function Field({ label, value, mono, highlight }: {
  label: string; value: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-gray-100 pb-1.5 last:border-b-0 last:pb-0">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-right ${mono ? "font-mono" : ""} ${highlight ? "text-sm font-black text-[#FF6B1A]" : "font-bold text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-gray-600">{label}</p>
      <p className={`font-bold text-gray-900 ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}