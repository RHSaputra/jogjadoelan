"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Plus, Trash2, Eye, EyeOff, ChevronDown, Settings2, ImageIcon, Star, MapPin, Share2 } from "lucide-react";
import { getLandingAsync, saveLandingAsync, LANDING_DEFAULT, type LandingConfig, type HeroSlide } from "@/lib/admin-toko-master-helpers";
import { FileUploadField } from "@/components/admin/FileUploadField";
import { PageHeader, Section, Input, Textarea, Grid, Button, FormActions } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";

const SECTION_META: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
  kategori: { label: "Kategori Produk", desc: "2 kartu: Ready Stock & Custom", icon: <Settings2 className="h-4 w-4" /> },
  rekomendasi: { label: "Rekomendasi Produk", desc: "Judul & tombol lihat semua", icon: <Star className="h-4 w-4" /> },
  partner: { label: "Karakter & Budaya", desc: "3 kartu keunggulan brand", icon: <Star className="h-4 w-4" /> },
  keunggulan: { label: "Keunggulan Toko", desc: "4 poin kelebihan toko", icon: <Star className="h-4 w-4" /> },
  infoToko: { label: "Lokasi & Jam Buka", desc: "Alamat, jam, Google Maps", icon: <MapPin className="h-4 w-4" /> },
  follow: { label: "Follow Sosmed", desc: "4 kartu sosial media", icon: <Share2 className="h-4 w-4" /> },
};
const SECTION_KEYS = ["kategori","rekomendasi","partner","keunggulan","infoToko","follow"] as const;
const COLORS = ["bg-amber-500","bg-emerald-500","bg-rose-500","bg-violet-500","bg-blue-500","bg-[#FF6B1A]","bg-[#fc970a]"];

export default function LandingCMSPage() {
  const [c, setC] = useState<LandingConfig>(LANDING_DEFAULT);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("kategori");
  const [slideOpen, setSlideOpen] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const { success: notifySuccess, error: notifyError } = useAdminNotification();

  useEffect(() => { void getLandingAsync().then((next) => setC(next)); }, []);

  const upd = (p: Partial<LandingConfig>) => { setC((x) => ({ ...x, ...p })); setDirty(true); };
  const submit = async () => {
    setSaving(true);
    try { await saveLandingAsync(c); setDirty(false); notifySuccess("Halaman Utama Tersimpan!", "Perubahan langsung tampil di halaman utama customer."); }
    catch { notifyError("Gagal Menyimpan"); }
    finally { setSaving(false); }
  };
  const toggleSlideOpen = (id: string) => setSlideOpen((x) => ({ ...x, [id]: !x[id] }));
  const isSlideOpen = (id: string) => slideOpen[id] ?? false;

  const addSlide = () => { const s: HeroSlide = { id: `slide-${Date.now()}`, title: "", subtitle: "", cta: "Belanja Sekarang", ctaLink: "/belanja", image: "", bgImage: "", aktif: true, urutan: c.heroSlides.length }; upd({ heroSlides: [...c.heroSlides, s] }); setSlideOpen((x) => ({ ...x, [s.id]: true })); };
  const updSlide = (i: number, p: Partial<HeroSlide>) => upd({ heroSlides: c.heroSlides.map((s, idx) => idx === i ? { ...s, ...p } : s) });
  const delSlide = (i: number) => upd({ heroSlides: c.heroSlides.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title="Halaman Utama" subtitle="Atur tampilan halaman utama toko â€” slider, section, pengumuman, popup" icon={LayoutDashboard} variant="gradient" />

      <Section title={`Slider Hero (${c.heroSlides.length} slide)`} subtitle="Gambar & teks yang muncul paling atas halaman utama" icon={<ImageIcon className="h-4 w-4" />}>
        {c.heroSlides.length === 0 && <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center"><ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-300" /><p className="text-xs text-gray-400">Belum ada slide. Klik <strong>Tambah Slide</strong> di bawah.</p></div>}
        <div className="space-y-3">
          {c.heroSlides.map((s, i) => {
            const open = isSlideOpen(s.id) || false;
            return (
              <div key={s.id} className={`rounded-xl border-2 transition ${s.aktif ? "border-gray-200 bg-gray-50" : "border-red-200 bg-red-50/30"}`}>
                <button type="button" onClick={() => toggleSlideOpen(s.id)} className="flex w-full items-center justify-between gap-3 p-3 text-left">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${s.aktif ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{s.aktif ? "Tampil" : "Disembunyikan"}</span><span className="text-sm font-black text-gray-900 truncate">{s.title || `Slide ${i+1}`}</span></div><p className="mt-1 text-[9px] text-gray-500 truncate">{s.subtitle || "Klik untuk lihat detail"}</p></div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
                </button>
                {open && (
                  <div className="border-t border-gray-100 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => updSlide(i, { aktif: !s.aktif })}>{s.aktif ? <><Eye className="h-3 w-3"/> Tampil</> : <><EyeOff className="h-3 w-3"/> Sembunyi</>}</Button>
                        <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3"/>} onClick={() => delSlide(i)}>Hapus</Button>
                      </div>
                    </div>
                    <Input label="Judul Utama" value={s.title} onChange={(e) => updSlide(i, { title: e.target.value })} />
                    <Textarea label="Teks Pendukung" value={s.subtitle} onChange={(e) => updSlide(i, { subtitle: e.target.value })} rows={2} />
                    <Grid cols={2}><Input label="Teks Tombol" value={s.cta} onChange={(e) => updSlide(i, { cta: e.target.value })} /><Input label="Link Tombol" value={s.ctaLink} onChange={(e) => updSlide(i, { ctaLink: e.target.value })} placeholder="/belanja" /></Grid>
                    <FileUploadField label="Gambar Produk (depan)" hint="Tempel link dari Google Drive, Cloudinary, dll." value={s.image} onChange={(v) => updSlide(i, { image: v })} aspect="square" />
                    <FileUploadField label="Gambar Latar (background)" hint="Boleh dikosongkan" value={s.bgImage} onChange={(v) => updSlide(i, { bgImage: v })} aspect="landscape" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5"/>} onClick={addSlide} className="w-full border-2 border-dashed border-gray-200 hover:border-[#FF6B1A] hover:text-[#FF6B1A] py-2.5">Tambah Slide Baru</Button>
      </Section>

      <Section title="Section Halaman Utama" subtitle="Pilih section di kiri untuk mengedit kontennya" icon={<LayoutDashboard className="h-4 w-4" />}>
        <div className="flex flex-col md:flex-row gap-5 items-start">
          <div className="w-full md:w-1/3 flex flex-col gap-2">
            {SECTION_KEYS.map(key => {
              const meta = SECTION_META[key];
              const visible = c.sectionVis[key];
              const isActive = activeTab === key;
              return (
                <div key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${isActive ? "border-[#FF6B1A] bg-orange-50/50" : "border-gray-100 bg-gray-50/60 hover:border-gray-200"}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-[#FF6B1A] text-white shadow-md" : "bg-gray-100 text-gray-500"}`}>{meta?.icon}</div>
                  <div className="flex-1 min-w-0"><p className={`text-xs font-black truncate ${isActive ? "text-[#FF6B1A]" : "text-gray-900"}`}>{meta?.label}</p><p className="text-[9px] text-gray-400 truncate">{meta?.desc}</p></div>
                  <div className="flex items-center shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => upd({ sectionVis: { ...c.sectionVis, [key]: !visible } })} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black transition-all ${visible ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>{visible ? <><Eye className="h-3 w-3"/>Tampil</> : <><EyeOff className="h-3 w-3"/>Sembunyi</>}</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-full md:w-2/3 border-2 border-gray-100 rounded-xl p-5 bg-white min-h-[400px]">
            {SECTION_KEYS.map(key => {
              if (activeTab !== key) return null;
              return (
                <div key={key} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* ===== KATEGORI ===== */}
                  {key === "kategori" && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Header + 2 Kartu (Ready Stock & Custom)</p>
                      <Grid cols={2}>
                        <Input label="Eyebrow" value={c.kategori.header.eyebrow} onChange={(e) => upd({ kategori: { ...c.kategori, header: { ...c.kategori.header, eyebrow: e.target.value } } })} />
                        <Input label="Title" value={c.kategori.header.title} onChange={(e) => upd({ kategori: { ...c.kategori, header: { ...c.kategori.header, title: e.target.value } } })} />
                      </Grid>
                      <Input label="Subtitle" value={c.kategori.header.subtitle} onChange={(e) => upd({ kategori: { ...c.kategori, header: { ...c.kategori.header, subtitle: e.target.value } } })} />
                      <div className="space-y-3">
                        {c.kategori.cards.map((card, idx) => (
                          <div key={card.id} className="rounded-xl border-2 border-gray-100 bg-gray-50/30 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-black text-gray-900">Kartu {idx + 1}</p>
                              <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3" />} disabled={c.kategori.cards.length <= 1} onClick={() => { const next = c.kategori.cards.filter((_, i) => i !== idx); upd({ kategori: { ...c.kategori, cards: next } }); }}>Hapus</Button>
                            </div>
                            <Grid cols={2}>
                              <Input label="Nama" value={card.nama} onChange={(e) => { const next = c.kategori.cards.map((x, i) => (i === idx ? { ...x, nama: e.target.value } : x)); upd({ kategori: { ...c.kategori, cards: next } }); }} />
                              <Input label="CTA Text" value={card.ctaText} onChange={(e) => { const next = c.kategori.cards.map((x, i) => (i === idx ? { ...x, ctaText: e.target.value } : x)); upd({ kategori: { ...c.kategori, cards: next } }); }} />
                            </Grid>
                            <Textarea label="Deskripsi" value={card.deskripsi} onChange={(e) => { const next = c.kategori.cards.map((x, i) => (i === idx ? { ...x, deskripsi: e.target.value } : x)); upd({ kategori: { ...c.kategori, cards: next } }); }} rows={3} />
                            <Input label="Href" value={card.href} onChange={(e) => { const next = c.kategori.cards.map((x, i) => (i === idx ? { ...x, href: e.target.value } : x)); upd({ kategori: { ...c.kategori, cards: next } }); }} placeholder="/belanja" />
                            <FileUploadField label="Image (Base64/URL)" hint="Tempel link dari Google Drive, Cloudinary, dll." value={card.image} onChange={(v) => { const next = c.kategori.cards.map((x, i) => (i === idx ? { ...x, image: v } : x)); upd({ kategori: { ...c.kategori, cards: next } }); }} aspect="square" />
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { const id = `kategori-${Date.now()}`; upd({ kategori: { ...c.kategori, cards: [...c.kategori.cards, { id, nama: "", deskripsi: "", ctaText: "", href: "/belanja", image: "" }] } }); }} className="w-full border-2 border-dashed border-gray-200 hover:border-[#FF6B1A] hover:text-[#FF6B1A] py-2.5">Tambah Kartu</Button>
                      </div>
                    </>
                  )}

                  {/* ===== REKOMENDASI ===== */}
                  {key === "rekomendasi" && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Rekomendasi Produk (Customer)</p>
                      <Grid cols={2}>
                        <Input label="Title" value={c.rekomendasi.title} onChange={(e) => upd({ rekomendasi: { ...c.rekomendasi, title: e.target.value } })} />
                        <Input label="CTA Lihat Semua" value={c.rekomendasi.ctaLihatSemua} onChange={(e) => upd({ rekomendasi: { ...c.rekomendasi, ctaLihatSemua: e.target.value } })} />
                      </Grid>
                      <Input label="Subtitle" value={c.rekomendasi.subtitle ?? ""} onChange={(e) => upd({ rekomendasi: { ...c.rekomendasi, subtitle: e.target.value } })} />
                      <Input label="CTA Href" value={c.rekomendasi.ctaHref} onChange={(e) => upd({ rekomendasi: { ...c.rekomendasi, ctaHref: e.target.value } })} placeholder="/belanja" />
                    </>
                  )}

                  {/* ===== PARTNER / KARAKTER & BUDAYA ===== */}
                  {key === "partner" && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Karakter & Budaya (Partner Cards)</p>
                      <Grid cols={2}>
                        <Input label="Header Eyebrow" value={c.partner.header.eyebrow} onChange={(e) => upd({ partner: { ...c.partner, header: { ...c.partner.header, eyebrow: e.target.value } } })} />
                        <Input label="Header Title" value={c.partner.header.title} onChange={(e) => upd({ partner: { ...c.partner, header: { ...c.partner.header, title: e.target.value } } })} />
                      </Grid>
                      <Input label="Header Title Highlight" value={c.partner.header.titleHighlight ?? ""} onChange={(e) => upd({ partner: { ...c.partner, header: { ...c.partner.header, titleHighlight: e.target.value } } })} />
                      <Textarea label="Header Subtitle" value={c.partner.header.subtitle} onChange={(e) => upd({ partner: { ...c.partner, header: { ...c.partner.header, subtitle: e.target.value } } })} rows={3} />
                      <div className="space-y-3">
                        {c.partner.cards.map((card, idx) => (
                          <div key={card.id} className="rounded-xl border-2 border-gray-100 bg-gray-50/30 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-black text-gray-900">Card {idx + 1}</p>
                              <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3" />} disabled={c.partner.cards.length <= 1} onClick={() => upd({ partner: { ...c.partner, cards: c.partner.cards.filter((_, i) => i !== idx) } })}>Hapus</Button>
                            </div>
                            <Grid cols={2}>
                              <Input label="ID" value={card.id} onChange={(e) => { const next = c.partner.cards.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)); upd({ partner: { ...c.partner, cards: next } }); }} />
                              <FileUploadField label="Upload Foto / Icon" value={card.iconKey} onChange={(v) => { const next = c.partner.cards.map((x, i) => (i === idx ? { ...x, iconKey: v } : x)); upd({ partner: { ...c.partner, cards: next } }); }} aspect="square" />
                            </Grid>
                            <Grid cols={2}>
                              <Input label="Title" value={card.title} onChange={(e) => { const next = c.partner.cards.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)); upd({ partner: { ...c.partner, cards: next } }); }} />
                              <Input label="Badge" value={card.badge} onChange={(e) => { const next = c.partner.cards.map((x, i) => (i === idx ? { ...x, badge: e.target.value } : x)); upd({ partner: { ...c.partner, cards: next } }); }} />
                            </Grid>
                            <Input label="Subtitle" value={card.subtitle} onChange={(e) => { const next = c.partner.cards.map((x, i) => (i === idx ? { ...x, subtitle: e.target.value } : x)); upd({ partner: { ...c.partner, cards: next } }); }} />
                            <Textarea label="Description" value={card.description} onChange={(e) => { const next = c.partner.cards.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)); upd({ partner: { ...c.partner, cards: next } }); }} rows={3} />
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { const id = `partner-${Date.now()}`; upd({ partner: { ...c.partner, cards: [...c.partner.cards, { id, iconKey: "bike", title: "", subtitle: "", description: "", badge: "" }] } }); }} className="w-full border-2 border-dashed border-gray-200 hover:border-[#FF6B1A] hover:text-[#FF6B1A] py-2.5">Tambah Card</Button>
                      </div>
                      <Grid cols={2}>
                        <Input label="Footnote Title" value={c.partner.footnoteTitle} onChange={(e) => upd({ partner: { ...c.partner, footnoteTitle: e.target.value } })} />
                        <div className="opacity-0"><Input label="Spacer" value="" onChange={() => {}} /></div>
                      </Grid>
                      <Textarea label="Footnote Text" value={c.partner.footnoteText} onChange={(e) => upd({ partner: { ...c.partner, footnoteText: e.target.value } })} rows={2} />
                    </>
                  )}

                  {/* ===== KEUNGGULAN ===== */}
                  {key === "keunggulan" && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Keunggulan Toko</p>
                      <Grid cols={2}>
                        <Input label="Header Eyebrow" value={c.keunggulan.header.eyebrow} onChange={(e) => upd({ keunggulan: { ...c.keunggulan, header: { ...c.keunggulan.header, eyebrow: e.target.value } } })} />
                        <Input label="Header Title" value={c.keunggulan.header.title} onChange={(e) => upd({ keunggulan: { ...c.keunggulan, header: { ...c.keunggulan.header, title: e.target.value } } })} />
                      </Grid>
                      <Grid cols={2}>
                        <Input label="Title Highlight" value={c.keunggulan.header.titleHighlight ?? ""} onChange={(e) => upd({ keunggulan: { ...c.keunggulan, header: { ...c.keunggulan.header, titleHighlight: e.target.value } } })} />
                        <div className="opacity-0"><Input label="Spacer" value="" onChange={() => {}} /></div>
                      </Grid>
                      <Textarea label="Header Subtitle" value={c.keunggulan.header.subtitle} onChange={(e) => upd({ keunggulan: { ...c.keunggulan, header: { ...c.keunggulan.header, subtitle: e.target.value } } })} rows={3} />
                      <div className="space-y-3">
                        {c.keunggulan.items.map((item, idx) => (
                          <div key={item.id} className="rounded-xl border-2 border-gray-100 bg-gray-50/30 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-black text-gray-900">Item {idx + 1}</p>
                              <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3" />} disabled={c.keunggulan.items.length <= 1} onClick={() => upd({ keunggulan: { ...c.keunggulan, items: c.keunggulan.items.filter((_, i) => i !== idx) } })}>Hapus</Button>
                            </div>
                            <Grid cols={2}>
                              <Input label="ID" value={item.id} onChange={(e) => { const next = c.keunggulan.items.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)); upd({ keunggulan: { ...c.keunggulan, items: next } }); }} />
                              <FileUploadField label="Upload Foto / Icon" value={item.iconKey} onChange={(v) => { const next = c.keunggulan.items.map((x, i) => (i === idx ? { ...x, iconKey: v } : x)); upd({ keunggulan: { ...c.keunggulan, items: next } }); }} aspect="square" />
                            </Grid>
                            <Input label="Judul" value={item.judul} onChange={(e) => { const next = c.keunggulan.items.map((x, i) => (i === idx ? { ...x, judul: e.target.value } : x)); upd({ keunggulan: { ...c.keunggulan, items: next } }); }} />
                            <Textarea label="Deskripsi" value={item.deskripsi} onChange={(e) => { const next = c.keunggulan.items.map((x, i) => (i === idx ? { ...x, deskripsi: e.target.value } : x)); upd({ keunggulan: { ...c.keunggulan, items: next } }); }} rows={2} />
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { const id = `keunggulan-${Date.now()}`; upd({ keunggulan: { ...c.keunggulan, items: [...c.keunggulan.items, { id, iconKey: "award", judul: "", deskripsi: "" }] } }); }} className="w-full border-2 border-dashed border-gray-200 hover:border-[#FF6B1A] hover:text-[#FF6B1A] py-2.5">Tambah Item</Button>
                      </div>
                      <Textarea label="Footnote" value={c.keunggulan.footnote} onChange={(e) => upd({ keunggulan: { ...c.keunggulan, footnote: e.target.value } })} rows={2} />
                    </>
                  )}

                  {/* ===== INFO TOKO (LOKASI & JAM BUKA) ===== */}
                  {key === "infoToko" && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Lokasi & Jam Buka â€” Header & Label</p>
                      <Grid cols={2}>
                        <Input label="Header Eyebrow" value={c.infoToko.header.eyebrow} onChange={(e) => upd({ infoToko: { ...c.infoToko, header: { ...c.infoToko.header, eyebrow: e.target.value } } })} />
                        <Input label="Header Title" value={c.infoToko.header.title} onChange={(e) => upd({ infoToko: { ...c.infoToko, header: { ...c.infoToko.header, title: e.target.value } } })} />
                      </Grid>
                      <Grid cols={2}>
                        <Input label="Title Highlight" value={c.infoToko.header.titleHighlight ?? ""} onChange={(e) => upd({ infoToko: { ...c.infoToko, header: { ...c.infoToko.header, titleHighlight: e.target.value } } })} />
                        <div className="opacity-0"><Input label="Spacer" value="" onChange={() => {}} /></div>
                      </Grid>
                      <Textarea label="Header Subtitle" value={c.infoToko.header.subtitle} onChange={(e) => upd({ infoToko: { ...c.infoToko, header: { ...c.infoToko.header, subtitle: e.target.value } } })} rows={3} />

                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 pt-2">Label & Pengaturan Kartu</p>
                      <Grid cols={2}>
                        <Input label="Label Alamat" value={c.infoToko.labelAlamat} onChange={(e) => upd({ infoToko: { ...c.infoToko, labelAlamat: e.target.value } })} />
                        <Input label="Label Jam Buka" value={c.infoToko.labelJam} onChange={(e) => upd({ infoToko: { ...c.infoToko, labelJam: e.target.value } })} />
                      </Grid>
                      <Grid cols={2}>
                        <Input label="Teks Tombol Maps" value={c.infoToko.ctaMapsText} onChange={(e) => upd({ infoToko: { ...c.infoToko, ctaMapsText: e.target.value } })} />
                        <Input label="URL Google Maps" value={c.infoToko.mapsUrl} onChange={(e) => upd({ infoToko: { ...c.infoToko, mapsUrl: e.target.value } })} placeholder="https://maps.google.com/..." />
                      </Grid>
                      <Input label="Catatan Jam Buka" value={c.infoToko.jamCatatan} onChange={(e) => upd({ infoToko: { ...c.infoToko, jamCatatan: e.target.value } })} />
                      <Textarea label="Footnote" value={c.infoToko.footnote} onChange={(e) => upd({ infoToko: { ...c.infoToko, footnote: e.target.value } })} rows={2} />
                    </>
                  )}

                  {/* ===== FOLLOW SOSMED ===== */}
                  {key === "follow" && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Follow Sosmed â€” Header</p>
                      <Grid cols={2}>
                        <Input label="Header Eyebrow" value={c.follow.header.eyebrow} onChange={(e) => upd({ follow: { ...c.follow, header: { ...c.follow.header, eyebrow: e.target.value } } })} />
                        <Input label="Header Title" value={c.follow.header.title} onChange={(e) => upd({ follow: { ...c.follow, header: { ...c.follow.header, title: e.target.value } } })} />
                      </Grid>
                      <Grid cols={2}>
                        <Input label="Title Highlight" value={c.follow.header.titleHighlight ?? ""} onChange={(e) => upd({ follow: { ...c.follow, header: { ...c.follow.header, titleHighlight: e.target.value } } })} />
                        <Input label="Live Ticker" value={c.follow.liveTicker} onChange={(e) => upd({ follow: { ...c.follow, liveTicker: e.target.value } })} />
                      </Grid>
                      <Textarea label="Header Subtitle" value={c.follow.header.subtitle} onChange={(e) => upd({ follow: { ...c.follow, header: { ...c.follow.header, subtitle: e.target.value } } })} rows={3} />

                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 pt-2">Kartu Sosial Media</p>
                      <div className="space-y-3">
                        {c.follow.cards.map((card, idx) => (
                          <div key={card.id} className="rounded-xl border-2 border-gray-100 bg-gray-50/30 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-black text-gray-900">Card {idx + 1}</p>
                              <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3" />} disabled={c.follow.cards.length <= 1} onClick={() => upd({ follow: { ...c.follow, cards: c.follow.cards.filter((_, i) => i !== idx) } })}>Hapus</Button>
                            </div>
                            <Grid cols={2}>
                              <Input label="ID" value={card.id} onChange={(e) => { const next = c.follow.cards.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)); upd({ follow: { ...c.follow, cards: next } }); }} />
                              <Input label="Icon Key" value={card.iconKey} onChange={(e) => { const next = c.follow.cards.map((x, i) => (i === idx ? { ...x, iconKey: e.target.value } : x)); upd({ follow: { ...c.follow, cards: next } }); }} hint="instagram/tiktok/facebook/chat" />
                            </Grid>
                            <Grid cols={2}>
                              <Input label="Label" value={card.label} onChange={(e) => { const next = c.follow.cards.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)); upd({ follow: { ...c.follow, cards: next } }); }} />
                              <Input label="Followers" value={card.followers} onChange={(e) => { const next = c.follow.cards.map((x, i) => (i === idx ? { ...x, followers: e.target.value } : x)); upd({ follow: { ...c.follow, cards: next } }); }} />
                            </Grid>
                            <Input label="URL" value={card.href} onChange={(e) => { const next = c.follow.cards.map((x, i) => (i === idx ? { ...x, href: e.target.value } : x)); upd({ follow: { ...c.follow, cards: next } }); }} placeholder="https://..." />
                            <Textarea label="Deskripsi" value={card.desc} onChange={(e) => { const next = c.follow.cards.map((x, i) => (i === idx ? { ...x, desc: e.target.value } : x)); upd({ follow: { ...c.follow, cards: next } }); }} rows={2} />
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { const id = `follow-${Date.now()}`; upd({ follow: { ...c.follow, cards: [...c.follow.cards, { id, iconKey: "instagram", label: "", handle: "", followers: "", desc: "", href: "" }] } }); }} className="w-full border-2 border-dashed border-gray-200 hover:border-[#FF6B1A] hover:text-[#FF6B1A] py-2.5">Tambah Card</Button>
                      </div>

                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 pt-2">Ribbon Bawah</p>
                      <Input label="Ribbon Text" value={c.follow.ribbonText} onChange={(e) => upd({ follow: { ...c.follow, ribbonText: e.target.value } })} />
                      <Input label="Ribbon Note" value={c.follow.ribbonNote} onChange={(e) => upd({ follow: { ...c.follow, ribbonNote: e.target.value } })} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Banner Pengumuman" subtitle="Strip kecil di bagian paling atas halaman" icon={<ImageIcon className="h-4 w-4" />}>
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"><span className="text-xs font-black text-gray-900">Tampilkan banner pengumuman</span><button onClick={() => upd({ announcement: { ...c.announcement, aktif: !c.announcement.aktif } })} className={`rounded-full px-3 py-1 text-[10px] font-black ${c.announcement.aktif ? "bg-emerald-500 text-white" : "bg-gray-300 text-gray-600"}`}>{c.announcement.aktif ? "AKTIF" : "OFF"}</button></div>
        {c.announcement.aktif && <><Input label="Teks Pengumuman" value={c.announcement.text} onChange={(e) => upd({ announcement: { ...c.announcement, text: e.target.value } })} /><Input label="Link (opsional)" value={c.announcement.link ?? ""} onChange={(e) => upd({ announcement: { ...c.announcement, link: e.target.value } })} placeholder="/promo" /><div><label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Warna Banner</label><div className="flex flex-wrap gap-1.5">{COLORS.map(cl => <button key={cl} onClick={() => upd({ announcement: { ...c.announcement, warna: cl } })} className={`h-8 w-12 rounded ${cl} transition-all ${c.announcement.warna === cl ? "ring-2 ring-[#FF6B1A] ring-offset-1" : "opacity-70 hover:opacity-100"}`} />)}</div></div></>}
      </Section>

      <Section title="Pop-up Selamat Datang" subtitle="Modal yang muncul saat pengunjung baru" icon={<ImageIcon className="h-4 w-4" />}>
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"><span className="text-xs font-black text-gray-900">Aktifkan popup</span><button onClick={() => upd({ popup: { ...c.popup, aktif: !c.popup.aktif } })} className={`rounded-full px-3 py-1 text-[10px] font-black ${c.popup.aktif ? "bg-emerald-500 text-white" : "bg-gray-300 text-gray-600"}`}>{c.popup.aktif ? "AKTIF" : "OFF"}</button></div>
        {c.popup.aktif && <><Input label="Judul Popup" value={c.popup.judul} onChange={(e) => upd({ popup: { ...c.popup, judul: e.target.value } })} /><Textarea label="Deskripsi" value={c.popup.deskripsi} onChange={(e) => upd({ popup: { ...c.popup, deskripsi: e.target.value } })} rows={3} /><FileUploadField label="URL Gambar (opsional)" value={c.popup.gambar ?? ""} onChange={(v) => upd({ popup: { ...c.popup, gambar: v } })} aspect="landscape" /><Grid cols={2}><Input label="Teks Tombol" value={c.popup.ctaText} onChange={(e) => upd({ popup: { ...c.popup, ctaText: e.target.value } })} /><Input label="Link Tombol" value={c.popup.ctaLink} onChange={(e) => upd({ popup: { ...c.popup, ctaLink: e.target.value } })} placeholder="/belanja" /></Grid><div><label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Seberapa Sering?</label><select value={c.popup.frequency} onChange={(e) => upd({ popup: { ...c.popup, frequency: e.target.value as "once"|"daily"|"session" } })} className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none focus:ring-4 focus:ring-[#FF6B1A]/10"><option value="once">Sekali per perangkat</option><option value="daily">Satu kali/hari</option><option value="session">Setiap buka browser</option></select></div></>}
      </Section>

      {dirty && <FormActions onSubmit={submit} submitLabel="Simpan Semua Perubahan" loading={saving} onCancel={() => { getLandingAsync().then(setC); setDirty(false); }} />}
    </div>
  );
}