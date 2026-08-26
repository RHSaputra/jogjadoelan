"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import { getAdminEkspedisi, saveAdminEkspedisi, type StoredEkspedisi } from "@/lib/admin-ekspedisi-helpers";
import { PageHeader, Section, Input, Button, FormActions } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";

const EKSPEDISI_DEFAULT: StoredEkspedisi[] = [
  { id: "jne-reg", nama: "JNE Reguler", trackUrlTemplate: "https://www.jne.co.id/id/tracking/trace?awb={resi}" },
  { id: "jne-yes", nama: "JNE YES", trackUrlTemplate: "https://www.jne.co.id/id/tracking/trace?awb={resi}" },
  { id: "jnt", nama: "J&T Express", trackUrlTemplate: "https://www.jet.co.id/track?awb={resi}" },
  { id: "sicepat", nama: "SiCepat REG", trackUrlTemplate: "https://www.sicepat.com/checkAwb?awb={resi}" },
  { id: "anteraja", nama: "Anteraja", trackUrlTemplate: "https://anteraja.id/tracking?awb={resi}", isApi: true, forReturn: true },
  { id: "gosend", nama: "Gosend Same Day", trackUrlTemplate: "https://www.gojek.com/gosend/" },
  { id: "grab", nama: "Grab Express", trackUrlTemplate: "https://www.grab.com/id/express/" },
];

export default function AdminEkspedisiPage() {
  const [list, setList] = useState<StoredEkspedisi[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success: notifySuccess, error: notifyError } = useAdminNotification();

  useEffect(() => { getAdminEkspedisi().then(stored => setList(stored.length > 0 ? stored : EKSPEDISI_DEFAULT)); }, []);

  const update = (i: number, patch: Partial<StoredEkspedisi>) => { setList(prev => prev.map((e, idx) => idx === i ? { ...e, ...patch } : e)); setDirty(true); };
  const remove = (i: number) => { setList(prev => prev.filter((_, idx) => idx !== i)); setDirty(true); };
  const add = () => { setList(prev => [...prev, { id: `kurir-${Date.now()}`, nama: "", trackUrlTemplate: "https://...?awb={resi}" }]); setDirty(true); };
  const save = async () => {
    setSaving(true); try {
      const clean = list.filter(e => e.nama && e.trackUrlTemplate);
      await saveAdminEkspedisi(clean); setList(clean);
      setDirty(false); notifySuccess("Ekspedisi Tersimpan", "Daftar kurir customer akan langsung update.");
    } catch { notifyError("Gagal Menyimpan"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title="Ekspedisi & Kurir" subtitle={`Pakai {"{resi}"} di URL sebagai placeholder nomor resi`} icon={Truck} variant="orange" actions={<><Button variant="ghost" size="sm" onClick={() => { setList(EKSPEDISI_DEFAULT); setDirty(true); }} className="bg-white/15 text-white hover:bg-white/25">Reset Default</Button><Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={add} className="bg-white text-[#FF6B1A] hover:bg-white/90">Tambah</Button></>} />

      <Section title="Daftar Kurir" subtitle="Nama kurir dan URL tracking" icon={<Truck className="h-4 w-4" />}>
        <div className="space-y-3">
          {list.map((e, i) => (
            <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Nama Kurir" value={e.nama} onChange={(ev) => update(i, { nama: ev.target.value })} placeholder="JNE Reguler" />
                <Input label="URL Tracking" hint={`Pakai {"{resi}"}`} value={e.trackUrlTemplate} onChange={(ev) => update(i, { trackUrlTemplate: ev.target.value })} className="font-mono text-[10px]" />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={!!e.isApi} onChange={(ev) => update(i, { isApi: ev.target.checked })} className="rounded accent-[#FF6B1A]" /> Pakai API
                  </label>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={!!e.forReturn} onChange={(ev) => update(i, { forReturn: ev.target.checked })} className="rounded accent-[#FF6B1A]" /> Untuk Return/Refund
                  </label>
                </div>
                <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3" />} onClick={() => remove(i)}>Hapus</Button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {dirty && <FormActions onSubmit={save} submitLabel="Simpan Perubahan" loading={saving} onCancel={() => { getAdminEkspedisi().then(setList); setDirty(false); }} />}
    </div>
  );
}