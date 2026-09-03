"use client";

import { useEffect, useState } from "react";
import { Store, MapPin, Clock } from "lucide-react";
import { PageHeader, Section, Input, Textarea, Grid, FormActions } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";
import { TokoSubnav } from "@/components/admin/TokoSubnav";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { isValidNoHp } from "@/lib/phone-utils";

export default function CabangPage() {
  const [data, setData] = useState({ headerText:"", namaToko:"", alamat:"", mapsUrl:"", jamSeninJumat:"", jamSabtu:"", jamMinggu:"", noHp:"" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success: notifySuccess, error: notifyError } = useAdminNotification();

  useEffect(() => {
    Promise.all([fetch("/api/settings?keys=operasional").then(r=>r.json()), fetch("/api/settings?keys=header_text").then(r=>r.json())])
      .then(([opJson, htJson]) => {
        const op = opJson?.data?.operasional;
        const headerText = htJson?.data?.header_text as string|null;
        if (op) setData(prev => ({ ...prev, ...op }));
        if (headerText) setData(prev => ({ ...prev, headerText }));
      }).catch(()=>{});
  }, []);

  const handleChange = (field: string, val: string) => { setData(prev=>({...prev, [field]:val})); setDirty(true); };

  const save = async () => {
    if (data.noHp && !isValidNoHp(data.noHp)) {
      notifyError("Nomor Kontak tidak valid", "Harus diawali 08, berisi angka, dan memiliki panjang 10-13 digit");
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/admin/settings", { method:"PUT", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({key:"operasional", value:data}) });
      if (data.headerText) await fetch("/api/admin/settings", { method:"PUT", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({key:"header_text", value:data.headerText}) });
      setDirty(false); notifySuccess("Info Toko Tersimpan");
    } catch { notifyError("Gagal Menyimpan"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 pb-20">
      <TokoSubnav />

      <AdminPageHeader
        title="Cabang & Lokasi Toko"
        subtitle="Kelola alamat toko fisik, tautan Google Maps, jam operasional, dan pengumuman header"
        breadcrumbs={[{ label: "Toko" }, { label: "Cabang & Lokasi" }]}
        icon={MapPin}
      />

      <Section title="Teks Top Header Web" subtitle="Teks yang muncul di bagian paling atas browser" icon={<Store className="h-4 w-4" />}>
        <Textarea value={data.headerText} onChange={(e)=>handleChange("headerText", e.target.value)} rows={2} placeholder="Toko Helm Jadul Yogyakarta..." />
      </Section>

      <Grid cols={2}>
        <Section title="Detail Alamat" subtitle="Nama toko, alamat, dan Google Maps" icon={<MapPin className="h-4 w-4" />}>
          <Input label="Nama Toko" value={data.namaToko} onChange={(e)=>handleChange("namaToko", e.target.value)} />
          <Textarea label="Alamat Lengkap" value={data.alamat} onChange={(e)=>handleChange("alamat", e.target.value)} rows={3} />
          <Input label="Google Maps Embed URL" value={data.mapsUrl} onChange={(e)=>handleChange("mapsUrl", e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." hint="Google Maps → Bagikan → Sematan peta → Salin URL src" className="font-mono text-[10px]" />
        </Section>

        <Section title="Jam Buka & Kontak" subtitle="Jam operasional dan nomor kontak" icon={<Clock className="h-4 w-4" />}>
          <Grid cols={3}>
            <Input label="Senin - Jumat" value={data.jamSeninJumat} onChange={(e)=>handleChange("jamSeninJumat", e.target.value)} />
            <Input label="Sabtu" value={data.jamSabtu} onChange={(e)=>handleChange("jamSabtu", e.target.value)} />
            <Input label="Minggu" value={data.jamMinggu} onChange={(e)=>handleChange("jamMinggu", e.target.value)} />
          </Grid>
          <Input label="Nomor Kontak / WA" value={data.noHp} onChange={(e)=>{
            const val = e.target.value.replace(/\D/g, "").slice(0, 13);
            handleChange("noHp", val);
          }} />
        </Section>
      </Grid>

      {dirty && <FormActions onSubmit={save} submitLabel="Simpan Semua" loading={saving} />}
    </div>
  );
}