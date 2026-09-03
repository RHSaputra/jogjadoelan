"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Settings } from "lucide-react";
import { getFooterSettings, saveFooterSettings, FOOTER_SETTINGS_DEFAULT, type FooterSettings, type FooterLink } from "@/lib/footer-admin-helpers";
import { PageHeader, Section, Input, Grid, Button, FormActions } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";
import { TokoSubnav } from "@/components/admin/TokoSubnav";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AlignLeft } from "lucide-react";

function GroupEditor({ title, links, onAdd, onUpdate, onDelete }: { title: string; links: FooterLink[]; onAdd: () => void; onUpdate: (idx: number, field: string, val: string) => void; onDelete: (idx: number) => void }) {
  return (
    <Section title={title} icon={<Settings className="h-4 w-4" />}>
      <div className="space-y-2">
        {links.map((link, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input value={link.label} onChange={(e) => onUpdate(idx, "label", e.target.value)} placeholder="Label" className="flex-1" />
            <Input value={link.href} onChange={(e) => onUpdate(idx, "href", e.target.value)} placeholder="Link (href)" className="flex-[2] font-mono text-[10px]" />
            <Button variant="danger" size="sm" icon={<Trash2 className="h-3 w-3" />} onClick={() => onDelete(idx)}>Hapus</Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={onAdd} className="text-[#FF6B1A]">Tambah Link</Button>
      </div>
    </Section>
  );
}

export default function FooterPage() {
  const [settings, setSettings] = useState<FooterSettings>(FOOTER_SETTINGS_DEFAULT);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success: notifySuccess, error: notifyError } = useAdminNotification();

  useEffect(() => { getFooterSettings().then(setSettings).catch(() => {}); }, []);

  const update = (newSettings: FooterSettings) => { setSettings(newSettings); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try { await saveFooterSettings(settings); setDirty(false); notifySuccess("Footer Tersimpan", "Pengaturan footer customer berhasil diperbarui."); }
    catch { notifyError("Gagal Menyimpan"); }
    finally { setSaving(false); }
  };

  const updateGroup = (group: keyof FooterSettings["links"], links: FooterLink[]) => { update({ ...settings, links: { ...settings.links, [group]: links } }); };
  const addLink = (group: keyof FooterSettings["links"]) => updateGroup(group, [...settings.links[group], { label: "Link Baru", href: "/" }]);
  const updateLink = (group: keyof FooterSettings["links"], idx: number, field: keyof FooterLink, value: string) => { const newLinks = [...settings.links[group]]; newLinks[idx] = { ...newLinks[idx], [field]: value }; updateGroup(group, newLinks); };
  const deleteLink = (group: keyof FooterSettings["links"], idx: number) => { const newLinks = [...settings.links[group]]; newLinks.splice(idx, 1); updateGroup(group, newLinks); };

  return (
    <div className="space-y-6 pb-20">
      <TokoSubnav />

      <AdminPageHeader
        title="Footer Toko"
        subtitle="Kelola tautan navigasi, informasi bantuan, metode pembayaran, dan sosial media di footer"
        breadcrumbs={[{ label: "Toko" }, { label: "Footer" }]}
        icon={AlignLeft}
      />

      <GroupEditor title="LAYANAN PELANGGAN" links={settings.links.layananPelanggan} onAdd={() => addLink("layananPelanggan")} onUpdate={(idx, f, v) => updateLink("layananPelanggan", idx, f as keyof FooterLink, v)} onDelete={(idx) => deleteLink("layananPelanggan", idx)} />
      <GroupEditor title="TENTANG KAMI" links={settings.links.tentangKami} onAdd={() => addLink("tentangKami")} onUpdate={(idx, f, v) => updateLink("tentangKami", idx, f as keyof FooterLink, v)} onDelete={(idx) => deleteLink("tentangKami", idx)} />
      <GroupEditor title="METODE PEMBAYARAN" links={settings.links.metodePembayaran} onAdd={() => addLink("metodePembayaran")} onUpdate={(idx, f, v) => updateLink("metodePembayaran", idx, f as keyof FooterLink, v)} onDelete={(idx) => deleteLink("metodePembayaran", idx)} />
      <GroupEditor title="SOCIAL MEDIA" links={settings.links.socialMedia} onAdd={() => addLink("socialMedia")} onUpdate={(idx, f, v) => updateLink("socialMedia", idx, f as keyof FooterLink, v)} onDelete={(idx) => deleteLink("socialMedia", idx)} />
      <GroupEditor title="METODE PENGIRIMAN" links={settings.links.metodePengiriman} onAdd={() => addLink("metodePengiriman")} onUpdate={(idx, f, v) => updateLink("metodePengiriman", idx, f as keyof FooterLink, v)} onDelete={(idx) => deleteLink("metodePengiriman", idx)} />

      <Section title="Warna Footer" subtitle="Atur warna background dan teks footer" icon={<Settings className="h-4 w-4" />}>
        <Grid cols={2}>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Background</label>
            <div className="flex gap-2"><input type="color" value={settings.bgColor} onChange={(e) => update({ ...settings, bgColor: e.target.value })} className="h-10 w-12 rounded border-2 border-gray-200" /><input value={settings.bgColor} onChange={(e) => update({ ...settings, bgColor: e.target.value })} className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none focus:ring-4 focus:ring-[#FF6B1A]/10" /></div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">Teks</label>
            <div className="flex gap-2"><input type="color" value={settings.textColor} onChange={(e) => update({ ...settings, textColor: e.target.value })} className="h-10 w-12 rounded border-2 border-gray-200" /><input value={settings.textColor} onChange={(e) => update({ ...settings, textColor: e.target.value })} className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none focus:ring-4 focus:ring-[#FF6B1A]/10" /></div>
          </div>
        </Grid>
      </Section>

      <Section title="Copyright & Credit" subtitle="Teks copyright dan credit di bagian bawah footer" icon={<Settings className="h-4 w-4" />}>
        <Input label="Teks Copyright" value={settings.copyright} onChange={(e) => update({ ...settings, copyright: e.target.value })} />
        <Input label="Teks Credit (bawah)" value={settings.credit} onChange={(e) => update({ ...settings, credit: e.target.value })} />
      </Section>

      {dirty && <FormActions onSubmit={handleSave} submitLabel="Simpan Semua" loading={saving} onCancel={() => { getFooterSettings().then(setSettings); setDirty(false); }} />}
    </div>
  );
}