"use client";

import { useEffect, useState } from "react";
import { Wrench, Plus, Trash2 } from "lucide-react";
import { getOperasionalAsync, saveOperasionalAsync, OPERASIONAL_DEFAULT, type OperasionalConfig, type LiburItem } from "@/lib/admin-toko-master-helpers";
import { PageHeader, Section, Input, Textarea, Grid, Button, FormActions } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";

export default function OperasionalPage() {
  const [c, setC] = useState<OperasionalConfig>(OPERASIONAL_DEFAULT);
  const [dirty, setDirty] = useState(false);
  const { success: notifySuccess } = useAdminNotification();

  useEffect(() => { getOperasionalAsync().then(setC); }, []);
  const upd = (p: Partial<OperasionalConfig>) => { setC((x) => ({ ...x, ...p })); setDirty(true); };
  const submit = async () => { await saveOperasionalAsync(c); setDirty(false); notifySuccess("Pengaturan Operasional Tersimpan"); };

  const addLibur = () => upd({ libur: [...c.libur, { id: `lib-${Date.now()}`, tanggalMulai: "", tanggalSelesai: "", alasan: "" }] });
  const updLibur = (i: number, p: Partial<LiburItem>) => upd({ libur: c.libur.map((l, idx) => idx === i ? { ...l, ...p } : l) });
  const delLibur = (i: number) => upd({ libur: c.libur.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title="Operasional & Libur" subtitle="Maintenance mode, jadwal libur, batas order" icon={Wrench} variant="orange" />

      <Section title="Maintenance Mode" subtitle="Aktifkan saat toko sedang maintenance" icon={<Wrench className="h-4 w-4" />}>
        <div className="flex items-center justify-between rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3">
          <div><p className="text-xs font-black text-amber-900">Aktifkan mode maintenance</p><p className="text-[10px] text-amber-700">Customer akan melihat halaman maintenance</p></div>
          <button type="button" onClick={() => upd({ maintenanceMode: !c.maintenanceMode })} className={`rounded-full px-4 py-1.5 text-[11px] font-black transition-all ${c.maintenanceMode ? "bg-red-500 text-white shadow" : "bg-gray-300 text-gray-600"}`}>{c.maintenanceMode ? "AKTIF" : "OFF"}</button>
        </div>
        {c.maintenanceMode && <Textarea label="Pesan Maintenance" value={c.maintenancePesan} onChange={(e) => upd({ maintenancePesan: e.target.value })} rows={3} />}
      </Section>

      <Section title="Batas Order" subtitle="Minimum order dan maksimum item di cart" icon={<Wrench className="h-4 w-4" />}>
        <Grid cols={2}>
          <Input label="Min Order (Rp)" type="number" prefix="Rp" value={String(c.minOrder)} onChange={(e) => upd({ minOrder: Number(e.target.value) })} />
          <Input label="Max Item Cart" type="number" value={String(c.maxItemCart)} onChange={(e) => upd({ maxItemCart: Number(e.target.value) })} />
        </Grid>
      </Section>

      <Section title="Pesan Otomatis Saat Tutup" subtitle="Pesan yang muncul saat toko sedang tutup/libur" icon={<Wrench className="h-4 w-4" />}>
        <Textarea value={c.tutupOtomatisPesan} onChange={(e) => upd({ tutupOtomatisPesan: e.target.value })} rows={3} />
      </Section>

      <Section title="Jadwal Libur" subtitle="Tanggal libur toko" badge={c.libur.length} icon={<Wrench className="h-4 w-4" />}>
        {c.libur.length === 0 && <p className="text-center text-xs text-gray-400 py-2">Belum ada jadwal libur</p>}
        {c.libur.map((l, i) => (
          <div key={l.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <Grid cols={2}>
              <Input label="Tanggal Mulai" type="date" value={l.tanggalMulai} onChange={(e) => updLibur(i, { tanggalMulai: e.target.value })} />
              <Input label="Tanggal Selesai" type="date" value={l.tanggalSelesai} onChange={(e) => updLibur(i, { tanggalSelesai: e.target.value })} />
            </Grid>
            <Input label="Alasan" value={l.alasan} onChange={(e) => updLibur(i, { alasan: e.target.value })} placeholder="Cuti bersama, libur nasional..." />
            <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3" />} onClick={() => delLibur(i)}>Hapus</Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addLibur} className="w-full border-2 border-dashed border-gray-200 hover:border-[#FF6B1A] hover:text-[#FF6B1A] py-2.5">Tambah Libur</Button>
      </Section>

      {dirty && <FormActions onSubmit={submit} submitLabel="Simpan Perubahan" onCancel={() => { getOperasionalAsync().then(setC); setDirty(false); }} />}
    </div>
  );
}