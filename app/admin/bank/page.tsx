"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Landmark, QrCode, FileText, Upload, Image as ImageIcon } from "lucide-react";
import { getAdminBanks, saveAdminBanks, getAdminQris, saveAdminQris, getAdminInstruksi, saveAdminInstruksi, type BankInfo, type QrisInfo, type InstruksiPembayaran } from "@/lib/admin-bank-helpers";
import { PageHeader, Section, Input, Textarea, Grid, Button, FormActions } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

const COLORS = ["bg-blue-700","bg-blue-500","bg-sky-700","bg-orange-600","bg-emerald-600","bg-red-600","bg-violet-600","bg-amber-500"];

export default function AdminBankPage() {
  const [list, setList] = useState<BankInfo[]>([]);
  const [qris, setQris] = useState<QrisInfo>({ url: "", merchantName: "" });
  const [instruksi, setInstruksi] = useState<InstruksiPembayaran>({ readyStok: "", customDp: "", pelunasan: "" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { success: notifySuccess, error: notifyError, warning: notifyWarning } = useAdminNotification();

  useEffect(() => { (async () => { setList(await getAdminBanks()); setQris(await getAdminQris()); setInstruksi(await getAdminInstruksi()); })(); }, []);

  const updateBank = (i: number, patch: Partial<BankInfo>) => { setList(prev => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b)); setDirty(true); };
  const removeBank = (i: number) => { setList(prev => prev.filter((_, idx) => idx !== i)); setDirty(true); };
  const addBank = () => { setList(prev => [...prev, { key: `bank-${Date.now()}`, nama: "", noRek: "", anNama: "", color: "bg-blue-700" }]); setDirty(true); };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5*1024*1024) { notifyWarning("File Terlalu Besar", "Maksimal 5MB"); return; }
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/upload/qris", { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) { notifyError("Upload Gagal", data.error); return; }
      const updated = { ...qris, url: data.path, qrPath: data.path };
      setQris(updated); await saveAdminQris(updated);
      notifySuccess("QRIS Berhasil Diupload");
    } catch { notifyError("Gagal Upload QRIS"); }
  };

  const updateInstruksi = (patch: Partial<InstruksiPembayaran>) => { setInstruksi(prev => ({ ...prev, ...patch })); setDirty(true); };

  const saveAll = async () => {
    setSaving(true); try {
      const clean = list.filter(b => b.nama && b.noRek && b.anNama);
      await saveAdminBanks(clean); setList(clean);
      await saveAdminQris(qris);
      await saveAdminInstruksi(instruksi);
      setDirty(false); notifySuccess("Semua Pengaturan Pembayaran Tersimpan!");
    } catch { notifyError("Gagal Menyimpan"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 pb-24">
      <AdminPageHeader
        title="Rekening Bank & QRIS"
        subtitle="Kelola rekening bank tujuan transfer customer, kode QRIS, dan panduan instruksi pembayaran"
        breadcrumbs={[{ label: "System" }, { label: "Bank & QRIS" }]}
        icon={Landmark}
        actions={
          <button
            type="button"
            disabled={saving}
            onClick={saveAll}
            className="rounded-xl bg-[#FF6B1A] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#E04E00] disabled:opacity-50 transition"
          >
            {saving ? "Menyimpan..." : dirty ? "Simpan Perubahan *" : "Simpan Pengaturan"}
          </button>
        }
      />

      <Section title="QRIS & E-Wallet" subtitle="Upload gambar QRIS untuk pembayaran digital" icon={<QrCode className="h-4 w-4" />}>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3">
            <label className="mb-2 block text-[10px] font-black uppercase text-gray-500">Gambar QRIS</label>
            <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center group">
              {qris.url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qris.url} alt="QRIS" className="h-full w-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                    <button onClick={() => fileRef.current?.click()} className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-gray-900"><Upload className="h-3 w-3 inline mr-1" />Ganti</button>
                  </div>
                </>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 text-gray-400 hover:text-[#FF6B1A]"><ImageIcon className="h-8 w-8" /><span className="text-[10px] font-bold">Upload QRIS</span></button>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleQrisUpload} />
            </div>
            {qris.url && <button onClick={() => { setQris(p => ({...p, url:"", qrPath:null})); setDirty(true); }} className="mt-2 text-[10px] font-bold text-red-500 hover:underline">Hapus QRIS</button>}
          </div>
          <div className="w-full md:w-2/3 flex flex-col justify-center">
            <Input label="Nama Merchant / Toko" value={qris.merchantName} onChange={(e) => { setQris(p => ({...p, merchantName: e.target.value})); setDirty(true); }} placeholder="Jogjadoelan QRIS" />
            <p className="mt-3 text-[11px] text-gray-500">Customer scan via M-Banking, GoPay, OVO, Dana, ShopeePay, atau LinkAja.</p>
          </div>
        </div>
      </Section>

      <Section title="Transfer Bank" subtitle="Rekening tujuan transfer customer" icon={<Landmark className="h-4 w-4" />} action={<Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addBank}>Tambah</Button>}>
        <div className="space-y-4">
          {list.map((b, i) => (
            <div key={b.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className={`${b.color} h-2 w-full`} />
              <div className="grid gap-4 p-5 md:grid-cols-4">
                <Input label="Nama Bank" value={b.nama} onChange={(e) => updateBank(i, { nama: e.target.value })} placeholder="Bank BCA" />
                <Input label="Nomor Rekening" value={b.noRek} onChange={(e) => updateBank(i, { noRek: e.target.value })} placeholder="1234567890" />
                <Input label="Atas Nama" value={b.anNama} onChange={(e) => updateBank(i, { anNama: e.target.value })} />
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase text-gray-500">Warna Aksen</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => <button key={c} onClick={() => updateBank(i, { color: c })} className={`h-6 w-6 rounded-md ${c} ${b.color===c ? "ring-2 ring-offset-2 ring-[#FF6B1A]" : "opacity-60 hover:opacity-100"}`} />)}
                  </div>
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3" />} onClick={() => removeBank(i)}>Hapus</Button>
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-xs font-bold text-gray-400 py-4">Belum ada rekening bank.</p>}
        </div>
      </Section>

      <Section title="Instruksi Pembayaran" subtitle="Instruksi yang muncul di halaman checkout customer" icon={<FileText className="h-4 w-4" />}>
        <Grid cols={3}>
          <Textarea label="Instruksi: Ready Stock" hint="Muncul saat beli ready stock" value={instruksi.readyStok} onChange={(e) => updateInstruksi({ readyStok: e.target.value })} rows={4} />
          <Textarea label="Instruksi: Custom (DP)" hint="Muncul saat pesan custom" value={instruksi.customDp} onChange={(e) => updateInstruksi({ customDp: e.target.value })} rows={4} />
          <Textarea label="Instruksi: Pelunasan" hint="Muncul saat pelunasan" value={instruksi.pelunasan} onChange={(e) => updateInstruksi({ pelunasan: e.target.value })} rows={4} />
        </Grid>
      </Section>

      {dirty && <FormActions onSubmit={saveAll} submitLabel="Simpan Semua" loading={saving} onCancel={() => { getAdminBanks().then(setList); getAdminQris().then(setQris); getAdminInstruksi().then(setInstruksi); setDirty(false); }} />}
    </div>
  );
}