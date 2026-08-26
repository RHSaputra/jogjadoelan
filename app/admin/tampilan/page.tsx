"use client";

import { useState } from "react";
import { Palette, Plus, Trash2 } from "lucide-react";
import { FileUploadField } from "@/components/admin/FileUploadField";
import { getTampilanConfig, saveTampilanConfig, TAMPILAN_DEFAULT, type TampilanConfig } from "@/lib/admin-toko-helpers";
import { PageHeader, Section, Input, Grid, Button, FormActions } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";

const COLORS = ["from-amber-500 to-orange-600","from-emerald-500 to-green-600","from-blue-500 to-cyan-600","from-violet-500 to-purple-600","from-red-500 to-pink-600","from-[#FF6B1A] to-[#FFD23F]"];

export default function AdminTampilanPage() {
  const [c, setC] = useState<TampilanConfig>(TAMPILAN_DEFAULT);
  const [dirty, setDirty] = useState(false);
  const { success: notifySuccess } = useAdminNotification();

  const upd = (patch: Partial<TampilanConfig>) => { setC((p) => ({ ...p, ...patch })); setDirty(true); };
  const save = () => { saveTampilanConfig(c); setDirty(false); notifySuccess("Tampilan Tersimpan"); };

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title="Edit Tampilan Toko" subtitle="Hero banner, warna brand, banner promo" icon={Palette} variant="orange" />

      <Section title="Hero Banner (Halaman Utama)" subtitle="Atur tampilan hero section di homepage customer" icon={<Palette className="h-4 w-4" />}>
        <Input label="Judul Hero" value={c.heroTitle} onChange={(e)=>upd({heroTitle:e.target.value})} />
        <Input label="Subjudul" value={c.heroSubtitle} onChange={(e)=>upd({heroSubtitle:e.target.value})} />
        <FileUploadField label="Gambar Banner Hero" hint="Pilih gambar dari galeri/file lokal" value={c.heroBannerUrl??""} onChange={(v)=>upd({heroBannerUrl:v})} aspect="landscape" />
        <Grid cols={2}>
          <Input label="Teks Tombol CTA" value={c.heroCtaText} onChange={(e)=>upd({heroCtaText:e.target.value})} />
          <Input label="Link CTA" value={c.heroCtaLink} onChange={(e)=>upd({heroCtaLink:e.target.value})} placeholder="/belanja" />
        </Grid>
      </Section>

      <Section title="Warna Brand" subtitle="Warna utama dan aksen toko" icon={<Palette className="h-4 w-4" />}>
        <Grid cols={2}>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Primary</label>
            <div className="flex gap-2"><input type="color" value={c.primaryColor} onChange={(e)=>upd({primaryColor:e.target.value})} className="h-10 w-12 rounded border-2 border-gray-200" /><input value={c.primaryColor} onChange={(e)=>upd({primaryColor:e.target.value})} className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none focus:ring-4 focus:ring-[#FF6B1A]/10" /></div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Accent</label>
            <div className="flex gap-2"><input type="color" value={c.accentColor} onChange={(e)=>upd({accentColor:e.target.value})} className="h-10 w-12 rounded border-2 border-gray-200" /><input value={c.accentColor} onChange={(e)=>upd({accentColor:e.target.value})} className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none focus:ring-4 focus:ring-[#FF6B1A]/10" /></div>
          </div>
        </Grid>
      </Section>

      <Section title="Banner Promo Atas" subtitle="Banner promo yang muncul di halaman utama" icon={<Palette className="h-4 w-4" />}>
        <div className="space-y-3">
          {c.bannerPromo.map((b, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <Input label="Judul" value={b.judul} onChange={(e)=>upd({bannerPromo:c.bannerPromo.map((x,idx)=>idx===i?{...x,judul:e.target.value}:x)})} />
              <Input label="Link" value={b.link??""} onChange={(e)=>upd({bannerPromo:c.bannerPromo.map((x,idx)=>idx===i?{...x,link:e.target.value}:x)})} placeholder="/promo" />
              <div className="mt-2"><label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Warna Gradient</label><div className="flex flex-wrap gap-2">{COLORS.map(cl=><button key={cl} onClick={()=>upd({bannerPromo:c.bannerPromo.map((x,idx)=>idx===i?{...x,warna:cl}:x)})} className={`h-8 w-14 rounded bg-gradient-to-r ${cl} ${b.warna===cl?"ring-2 ring-offset-2 ring-[#FF6B1A]":""}`}/>)}</div></div>
              <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3"/>} onClick={()=>upd({bannerPromo:c.bannerPromo.filter((_,idx)=>idx!==i)})} className="mt-2">Hapus</Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5"/>} onClick={()=>upd({bannerPromo:[...c.bannerPromo,{judul:"",warna:COLORS[0]}]})} className="w-full border-2 border-dashed border-gray-200 hover:border-[#FF6B1A] hover:text-[#FF6B1A] py-2.5">Tambah Banner</Button>
        </div>
      </Section>

      {dirty && <FormActions onSubmit={save} submitLabel="Simpan Tampilan" onCancel={()=>{setC(getTampilanConfig());setDirty(false);}} />}
    </div>
  );
}