"use client";

import { useRef, useState } from "react";
import { UserCircle, Upload, Camera } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-context";
import { PageHeader, Section, Input, Grid, Button, FormActions } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";
import { isValidNoHp } from "@/lib/phone-utils";

export default function AdminEditAkunPage() {
  const { admin, updateProfile } = useAdminAuth();
  const [namaDraft, setNamaDraft] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [noHpDraft, setNoHpDraft] = useState<string | null>(null);
  const [fotoDraft, setFotoDraft] = useState<string | null>(null);
  const nama = namaDraft ?? admin?.nama ?? "";
  const email = emailDraft ?? admin?.email ?? "";
  const noHp = noHpDraft ?? admin?.noHp ?? "";
  const foto = fotoDraft ?? admin?.foto ?? "";
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { success: notifySuccess, error: notifyError } = useAdminNotification();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sub", "pp-admin");
      const r = await fetch("/api/admin/upload", { method: "POST", credentials: "include", body: fd });
      const j = await r.json();
      if (r.ok && j.data?.path) {
        setFotoDraft(j.data.path);
        notifySuccess("Foto Berhasil Diupload");
      } else {
        notifyError("Gagal Upload", j.error ?? "Unknown error");
      }
    } catch {
      notifyError("Gagal Upload Foto");
    } finally {
      setUploading(false);
    }
  };

  const save = () => {
    if (!isValidNoHp(noHp)) {
      notifyError("Nomor HP tidak valid", "Harus diawali 08, berisi angka, dan memiliki panjang 10-13 digit");
      return;
    }
    updateProfile({ nama, email, noHp, foto });
    notifySuccess("Profil Tersimpan", "Data akun admin berhasil diperbarui.");
  };

  return (
    <div className="space-y-5 pb-20">
      <PageHeader
        title="Edit Akun Admin"
        subtitle={admin?.username ?? "Memuat..."}
        icon={UserCircle}
        variant="orange"
      />

      <Section
        title="Informasi Profil"
        subtitle="Foto, nama, email, dan nomor HP admin"
        icon={<Camera className="h-4 w-4" />}
      >
        {/* Avatar Upload */}
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#FFD23F] text-3xl font-black text-white shadow-lg">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" className="h-full w-full object-cover" />
            ) : (
              nama.charAt(0).toUpperCase()
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
            >
              <Upload className="h-6 w-6 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-900">{admin?.nama}</p>
            <p className="text-[10px] text-gray-500">@{admin?.username}</p>
            <Button
              variant="ghost"
              size="sm"
              icon={uploading ? undefined : <Upload className="h-3 w-3" />}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-1"
            >
              {uploading ? "Uploading..." : "Ganti Foto"}
            </Button>
          </div>
        </div>

        <Input label="Nama Lengkap" value={nama} onChange={(e) => setNamaDraft(e.target.value)} />
        <Grid cols={2}>
          <Input label="Email" type="email" value={email} onChange={(e) => setEmailDraft(e.target.value)} />
          <Input 
            label="No HP" 
            value={noHp} 
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 13);
              setNoHpDraft(val);
            }} 
          />
        </Grid>
      </Section>

      <FormActions
        onSubmit={save}
        submitLabel="Simpan Profil"
      />
    </div>
  );
}