"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Store, MapPin, Phone, Clock, Package2 } from "lucide-react";
import { FileUploadField } from "@/components/admin/FileUploadField";
import { getTokoConfig, saveTokoConfig, TOKO_DEFAULT, type TokoConfig } from "@/lib/admin-toko-helpers";
import { Section, Input, Textarea, Grid, PageHeader, Button, FormActions } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";
import { isValidNoHp } from "@/lib/phone-utils";

/* --- BIAYA PACKING SECTION --- */
function BiayaPackingSection() {
  const [biayaPacking, setBiayaPacking] = useState<number>(10000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success: notifySuccess, error: notifyError } = useAdminNotification();

  useEffect(() => {
    fetch("/api/admin/settings?keys=biayaPacking")
      .then(r => r.json())
      .then(j => {
        const val = Number(j?.biayaPacking);
        if (val > 0) setBiayaPacking(val);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "biayaPacking", value: biayaPacking }),
      });
      notifySuccess("Biaya Packing Tersimpan", `Biaya packing diset menjadi Rp ${biayaPacking.toLocaleString("id-ID")}`);
    } catch {
      notifyError("Gagal Menyimpan", "Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="py-6 text-center text-xs text-gray-400">Memuat biaya packing...</div>
  );

  return (
    <Section
      title="Biaya Packing"
      subtitle="Biaya packing per pesanan — otomatis ditambahkan ke setiap order (ready stock & custom)"
      icon={<Package2 className="h-4 w-4" />}
    >
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label="Biaya Packing per Order (Rp)"
            type="number"
            prefix="Rp"
            value={String(biayaPacking)}
            onChange={(e) => setBiayaPacking(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
        <Button onClick={handleSave} loading={saving} size="md">
          <Save className="h-4 w-4" /> Simpan
        </Button>
      </div>
    </Section>
  );
}

export default function AdminPengaturanPage() {
  const [c, setC] = useState<TokoConfig>(TOKO_DEFAULT);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success: notifySuccess, error: notifyError } = useAdminNotification();

  const upd = (patch: Partial<TokoConfig>) => { setC((p) => ({ ...p, ...patch })); setDirty(true); };

  const save = async () => {
    if (c.noHp && !isValidNoHp(c.noHp)) {
      notifyError("Nomor HP tidak valid", "Harus diawali 08, berisi angka, dan memiliki panjang 10-13 digit");
      return;
    }
    setSaving(true);
    try {
      saveTokoConfig(c);
      setDirty(false);
      notifySuccess("Pengaturan Tersimpan", "Semua informasi toko telah diperbarui.");
    } catch {
      notifyError("Gagal Menyimpan", "Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        title="Pengaturan Toko"
        subtitle="Info dasar toko untuk footer, halaman about, dan kontak"
        icon={Settings}
        variant="orange"
      />

      <Section
        title="Identitas Toko"
        subtitle="Nama, tagline, deskripsi, dan logo toko"
        icon={<Store className="h-4 w-4" />}
      >
        <Input
          label="Nama Toko"
          value={c.namaToko}
          onChange={(e) => upd({ namaToko: e.target.value })}
          placeholder="Jogjadoelan Helm"
        />
        <Input
          label="Tagline"
          value={c.tagline}
          onChange={(e) => upd({ tagline: e.target.value })}
          placeholder="Helm Custom Terbaik di Jogja"
        />
        <Textarea
          label="Deskripsi"
          value={c.deskripsi}
          onChange={(e) => upd({ deskripsi: e.target.value })}
          rows={3}
        />
        <FileUploadField
          label="Logo Toko"
          hint="Pilih file logo dari galeri/komputer kamu (PNG/WebP disarankan)"
          value={c.logoUrl ?? ""}
          onChange={(v) => upd({ logoUrl: v })}
          aspect="free"
        />
      </Section>

      <Section
        title="Alamat"
        subtitle="Alamat lengkap toko"
        icon={<MapPin className="h-4 w-4" />}
      >
        <Input
          label="Alamat Lengkap"
          value={c.alamat}
          onChange={(e) => upd({ alamat: e.target.value })}
        />
        <Grid cols={2}>
          <Input
            label="Kota"
            value={c.kota}
            onChange={(e) => upd({ kota: e.target.value })}
          />
          <Input
            label="Kode Pos"
            value={c.kodePos}
            onChange={(e) => upd({ kodePos: e.target.value })}
          />
        </Grid>
      </Section>

      <Section
        title="Kontak"
        subtitle="Nomor HP, WhatsApp, email, dan sosial media"
        icon={<Phone className="h-4 w-4" />}
      >
        <Grid cols={2}>
          <Input
            label="No HP"
            value={c.noHp}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 13);
              upd({ noHp: val });
            }}
          />
          <Input
            label="WhatsApp"
            value={c.whatsapp}
            onChange={(e) => upd({ whatsapp: e.target.value })}
            placeholder="6281234567890"
            prefix="+"
          />
        </Grid>
        <Grid cols={2}>
          <Input
            label="Email"
            type="email"
            value={c.email}
            onChange={(e) => upd({ email: e.target.value })}
          />
          <Input
            label="Instagram"
            value={c.instagram}
            onChange={(e) => upd({ instagram: e.target.value })}
            placeholder="@username"
            prefix="@"
          />
        </Grid>
      </Section>

      <Section
        title="Jam Operasional"
        subtitle="Hari dan jam buka toko"
        icon={<Clock className="h-4 w-4" />}
      >
        <Input
          label="Hari Buka"
          value={c.hariBuka}
          onChange={(e) => upd({ hariBuka: e.target.value })}
          placeholder="Senin - Minggu"
        />
        <Grid cols={2}>
          <Input
            label="Jam Buka"
            value={c.jamBuka}
            onChange={(e) => upd({ jamBuka: e.target.value })}
            placeholder="08:00"
          />
          <Input
            label="Jam Tutup"
            value={c.jamTutup}
            onChange={(e) => upd({ jamTutup: e.target.value })}
            placeholder="20:00"
          />
        </Grid>
      </Section>

      <BiayaPackingSection />

      {dirty && (
        <FormActions
          onSubmit={save}
          submitLabel="Simpan Semua Perubahan"
          loading={saving}
          onCancel={() => { setC(getTokoConfig()); setDirty(false); }}
        />
      )}
    </div>
  );
}