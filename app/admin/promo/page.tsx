"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Tag, Edit3, X } from "lucide-react";
import type { PromoItem, PromoTipe } from "@/lib/constants";
import { PROMO_DUMMY } from "@/lib/constants";
import { getAdminPromos, saveAdminPromos } from "@/lib/admin-voucher-helpers";
import { PageHeader, Input, Grid, Select, Button, EmptyState } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";

const TIPE_OPTIONS = [{ v:"ongkir",l:"Gratis Ongkir" },{ v:"diskon",l:"Diskon" },{ v:"cashback",l:"Cashback" },{ v:"voucher",l:"Voucher" }] as const;
const COLOR_OPTIONS = ["from-amber-500 to-orange-600","from-emerald-500 to-green-600","from-blue-500 to-cyan-600","from-violet-500 to-purple-600","from-red-500 to-pink-600","from-[#FF6B1A] to-[#FFD23F]"];

const emptyPromo = (): PromoItem => ({
  id: `p-${Date.now()}`, judul:"", subjudul:"", kode:"", tipe:"diskon", diskonPersen:0, diskonNominal:0, minBelanja:0, maxDiskon:0,
  berlaku:"all", berakhir: new Date(Date.now()+30*86400000).toISOString().slice(0,10), warna:COLOR_OPTIONS[0], syarat:[""],
});

export default function AdminPromoPage() {
  const [list, setList] = useState<PromoItem[]>([]);
  const [editing, setEditing] = useState<PromoItem | null>(null);
  const { success: notifySuccess } = useAdminNotification();

  useEffect(() => { getAdminPromos().then(stored => setList(stored.length>0 ? stored : PROMO_DUMMY)); }, []);

  const persist = async (next: PromoItem[]) => { await saveAdminPromos(next); setList(next); };
  const handleSave = async (p: PromoItem) => { const exists = list.some(x => x.id===p.id); await persist(exists ? list.map(x => x.id===p.id ? p : x) : [p,...list]); setEditing(null); notifySuccess(exists?"Promo Diperbarui":"Promo Ditambahkan"); };
  const handleDelete = async (id: string) => { if(!confirm("Hapus promo ini?"))return; await persist(list.filter(p=>p.id!==id)); notifySuccess("Promo Dihapus"); };

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title="Promo & Voucher" subtitle="Customer browse & klaim di halaman /promo" icon={Tag} variant="orange" actions={<><Button variant="ghost" size="sm" onClick={() => { if(confirm("Reset ke default?")){persist(PROMO_DUMMY);notifySuccess("Direset ke default");} }} className="bg-white/15 text-white hover:bg-white/25">Reset</Button><Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5"/>} onClick={()=>setEditing(emptyPromo())} className="bg-white text-[#FF6B1A] hover:bg-white/90">Tambah</Button></>} />

      {list.length===0 ? <EmptyState icon={Tag} title="Belum ada promo" description="Tambah promo pertama untuk customer" action={<Button variant="primary" size="md" icon={<Plus className="h-4 w-4"/>} onClick={()=>setEditing(emptyPromo())}>Tambah Promo</Button>} /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map(p => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className={`bg-gradient-to-r ${p.warna} p-4 text-white`}>
                <div className="flex items-start justify-between"><div className="min-w-0"><p className="text-sm font-black">{p.judul||"(Tanpa judul)"}</p><p className="mt-0.5 text-[10px] opacity-90">{p.subjudul}</p></div><span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase">{p.tipe}</span></div>
                <div className="mt-2 inline-block rounded-md bg-white/20 px-2 py-1 font-mono text-[11px] font-black tracking-wider">{p.kode}</div>
              </div>
              <div className="space-y-1 p-3 text-[11px] font-bold text-gray-600">
                {(p.diskonPersen ?? 0) > 0 && <p>Diskon: {p.diskonPersen}%{(p.maxDiskon ?? 0) > 0 ? ` (max Rp ${(p.maxDiskon ?? 0).toLocaleString("id-ID")})` : ""}</p>}
                {(p.diskonNominal ?? 0) > 0 && <p>Potongan: Rp {(p.diskonNominal ?? 0).toLocaleString("id-ID")}</p>}
                {(p.minBelanja ?? 0) > 0 && <p>Min. belanja: Rp {(p.minBelanja ?? 0).toLocaleString("id-ID")}</p>}
                <p>Berlaku: {p.berlaku} Â· Berakhir {new Date(p.berakhir).toLocaleDateString("id-ID")}</p>
              </div>
              <div className="flex border-t border-gray-100">
                <button onClick={()=>setEditing(p)} className="flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-black text-gray-700 hover:bg-gray-50"><Edit3 className="h-3 w-3"/>Edit</button>
                <button onClick={()=>handleDelete(p.id)} className="flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-black text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3"/>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <PromoEditor promo={editing} onSave={handleSave} onCancel={()=>setEditing(null)} />}
    </div>
  );
}

function PromoEditor({ promo, onSave, onCancel }: { promo: PromoItem; onSave: (p: PromoItem) => void; onCancel: () => void }) {
  const [f, setF] = useState<PromoItem>(promo);
  const upd = (patch: Partial<PromoItem>) => setF(p => ({...p,...patch}));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 lg:items-center" onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h3 className="text-sm font-black text-gray-900">{promo.judul?"Edit Promo":"Tambah Promo"}</h3>
          <button onClick={onCancel} className="rounded-full p-1 hover:bg-gray-100"><X className="h-4 w-4"/></button>
        </div>
        <div className="space-y-4 p-5">
          <Grid cols={2}><Input label="Judul" value={f.judul} onChange={e=>upd({judul:e.target.value})}/><Input label="Kode" value={f.kode} onChange={e=>upd({kode:e.target.value.toUpperCase()})} placeholder="JOGJAFREE"/></Grid>
          <Input label="Subjudul" value={f.subjudul} onChange={e=>upd({subjudul:e.target.value})}/>
          <Grid cols={2}>
            <Select label="Tipe" value={f.tipe} onChange={e=>upd({tipe:e.target.value as PromoTipe})} options={TIPE_OPTIONS.map(o=>({value:o.v,label:o.l}))}/>
            <Select label="Berlaku Untuk" value={f.berlaku??"all"} onChange={e=>upd({berlaku:e.target.value as "custom" | "all" | "ready"})} options={[{value:"all",label:"Semua"},{value:"ready",label:"Ready Stock"},{value:"custom",label:"Custom"}]}/>
          </Grid>
          <Grid cols={2}><Input label="Diskon %" type="number" value={String(f.diskonPersen??0)} onChange={e=>upd({diskonPersen:Number(e.target.value)||0})}/><Input label="Diskon Nominal" type="number" value={String(f.diskonNominal??0)} onChange={e=>upd({diskonNominal:Number(e.target.value)||0})} prefix="Rp"/></Grid>
          <Grid cols={2}><Input label="Min Belanja" type="number" value={String(f.minBelanja??0)} onChange={e=>upd({minBelanja:Number(e.target.value)||0})} prefix="Rp"/><Input label="Max Diskon" type="number" value={String(f.maxDiskon??0)} onChange={e=>upd({maxDiskon:Number(e.target.value)||0})} prefix="Rp"/></Grid>
          <Input label="Tanggal Berakhir" type="date" value={f.berakhir.slice(0,10)} onChange={e=>upd({berakhir:new Date(e.target.value).toISOString()})}/>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Warna Card</label>
            <div className="grid grid-cols-3 gap-2">{COLOR_OPTIONS.map(c=><button key={c} onClick={()=>upd({warna:c})} className={`h-10 rounded-lg bg-gradient-to-r ${c} ${f.warna===c?"ring-2 ring-offset-2 ring-[#FF6B1A]":""}`}/>)}</div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Syarat & Ketentuan (satu per baris)</label>
            <textarea value={f.syarat.join("\n")} onChange={e=>upd({syarat:e.target.value.split("\n").filter(Boolean)})} rows={4} className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none focus:ring-4 focus:ring-[#FF6B1A]/10" />
          </div>
        </div>
        <div className="sticky bottom-0 flex gap-2 border-t border-gray-100 bg-white px-5 py-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
          <Button variant="primary" className="flex-1" onClick={()=>onSave(f)} disabled={!f.judul||!f.kode}>Simpan</Button>
        </div>
      </div>
    </div>
  );
}