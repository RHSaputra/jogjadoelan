"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Plus, Trash2, X, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { getFaqListAsync, saveFaqListAsync, type FaqItem } from "@/lib/admin-toko-master-helpers";
import { PageHeader, Section, Input, Select, Textarea, Button, EmptyState } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";
import { TokoSubnav } from "@/components/admin/TokoSubnav";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { HelpCircle } from "lucide-react";

const KATEGORI_OPTS = ["Umum", "Pemesanan", "Pengiriman", "Pembayaran", "Garansi", "Custom Helm", "Refund & Tukar"];

export default function FaqPage() {
  const [list, setList] = useState<FaqItem[]>([]);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [filter, setFilter] = useState("");
  const { success: notifySuccess } = useAdminNotification();

  useEffect(() => { getFaqListAsync().then(setList); }, []);

  const persist = (next: FaqItem[]) => {
    setList(next); void saveFaqListAsync(next);
    notifySuccess("FAQ Tersimpan");
  };

  const openNew = () => setEditing({ id: `faq-${Date.now()}`, kategori: KATEGORI_OPTS[0], pertanyaan: "", jawaban: "", urutan: list.length, aktif: true });

  const saveEdit = () => {
    if (!editing || !editing.pertanyaan.trim()) return;
    const exists = list.find((f) => f.id === editing.id);
    const next = exists ? list.map((f) => f.id === editing.id ? editing : f) : [...list, editing];
    persist(next); setEditing(null);
  };

  const del = (id: string) => { if (confirm("Hapus FAQ ini?")) persist(list.filter((f) => f.id !== id)); };
  const toggle = (id: string) => persist(list.map((f) => f.id === id ? { ...f, aktif: !f.aktif } : f));
  const move = (id: string, dir: -1 | 1) => { const i = list.findIndex((f) => f.id === id); const j = i + dir; if (j < 0 || j >= list.length) return; const arr = [...list]; [arr[i], arr[j]] = [arr[j], arr[i]]; persist(arr.map((f, idx) => ({ ...f, urutan: idx }))); };

  const filtered = list.filter((f) => !filter || f.pertanyaan.toLowerCase().includes(filter.toLowerCase()) || f.kategori.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6 pb-20">
      <TokoSubnav />

      <AdminPageHeader
        title="Tanya Jawab (FAQ)"
        subtitle="Kelola daftar pertanyaan yang sering ditanyakan pembeli beserta jawabannya"
        breadcrumbs={[{ label: "Toko" }, { label: "FAQ" }]}
        icon={HelpCircle}
        actions={
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF6B1A] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#E04E00] transition"
          >
            <Plus className="h-4 w-4" /> Tambah FAQ
          </button>
        }
      />

      <Section title="Daftar FAQ" subtitle="Kelola pertanyaan yang sering ditanyakan customer" badge={filtered.length} icon={<AlertCircle className="h-4 w-4" />}>
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Cari pertanyaan atau kategori..." className="mb-0" />
        {filtered.length === 0 ? <EmptyState title={list.length === 0 ? "Belum ada FAQ" : "Tidak ada hasil filter"} /> : (
          <div className="space-y-2">
            {filtered.map((f, i) => (
              <div key={f.id} className={`rounded-xl border-2 bg-white p-3 shadow-sm ${f.aktif ? "border-gray-200" : "border-red-200 bg-red-50/30"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => move(f.id, -1)} disabled={i === 0} className="text-gray-400 disabled:opacity-30"><ChevronUp className="h-3 w-3"/></button>
                    <button onClick={() => move(f.id, 1)} disabled={i === filtered.length - 1} className="text-gray-400 disabled:opacity-30"><ChevronDown className="h-3 w-3"/></button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#fc970a] px-2 py-0.5 text-[9px] font-black text-white">{f.kategori}</span><p className="text-xs font-black text-gray-900">{f.pertanyaan}</p></div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-gray-600">{f.jawaban}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => toggle(f.id)} className="rounded-lg bg-gray-100 p-1.5">{f.aktif ? <Eye className="h-3 w-3"/> : <EyeOff className="h-3 w-3 text-red-600"/>}</button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(f)}>Edit</Button>
                    <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3"/>} onClick={() => del(f.id)}>Hapus</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setEditing(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-black text-gray-900">{list.find(x => x.id === editing.id) ? "Edit" : "Tambah"} FAQ</h3>
              <button onClick={() => setEditing(null)} className="rounded-full p-1 hover:bg-gray-100"><X className="h-4 w-4 text-gray-400"/></button>
            </div>
            <div className="space-y-4 p-5 max-h-[70vh] overflow-y-auto">
              <Select label="Kategori" value={editing.kategori} onChange={(e) => setEditing({...editing, kategori: e.target.value})} options={KATEGORI_OPTS.map(k => ({value:k, label:k}))} />
              <Input label="Pertanyaan" value={editing.pertanyaan} onChange={(e) => setEditing({...editing, pertanyaan: e.target.value})} />
              <Textarea label="Jawaban" value={editing.jawaban} onChange={(e) => setEditing({...editing, jawaban: e.target.value})} rows={5} />
              <label className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs font-black text-gray-900 cursor-pointer">
                <input type="checkbox" checked={editing.aktif} onChange={(e) => setEditing({...editing, aktif: e.target.checked})} className="h-4 w-4 accent-[#FF6B1A]" /> Tampilkan di halaman customer
              </label>
            </div>
            <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Batal</Button>
              <Button variant="primary" className="flex-1" onClick={saveEdit}>Simpan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}