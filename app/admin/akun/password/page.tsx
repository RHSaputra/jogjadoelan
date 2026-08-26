"use client";

import { useState } from "react";
import { Lock, Save, Eye } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-context";
import { PageHeader, Section, Input, Button } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";

export default function AdminPasswordPage() {
  const { changePassword } = useAdminAuth();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const { success: notifySuccess, error: notifyError, warning: notifyWarning } = useAdminNotification();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { notifyWarning("Password Tidak Cocok", "Konfirmasi password baru tidak sesuai."); return; }
    const r = await changePassword(oldPwd, newPwd);
    if (r.ok) {
      notifySuccess("Password Berhasil Diubah", "Silakan login ulang untuk verifikasi.");
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
    } else { notifyError("Gagal", r.error ?? "Gagal mengubah password"); }
  };

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title="Ganti Password" subtitle="Minimal 6 karakter" icon={Lock} variant="orange" />
      <Section title="Form Ganti Password" subtitle="Masukkan password lama dan password baru" icon={<Lock className="h-4 w-4" />}>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Input label="Password Lama" type={showOld ? "text" : "password"} value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} className="pr-10" />
            <button type="button" onClick={() => setShowOld(v => !v)} className="absolute right-2 top-[30px] rounded p-1.5 text-gray-400 hover:text-gray-600"><Eye className="h-4 w-4" /></button>
          </div>
          <div className="relative">
            <Input label="Password Baru" type={showNew ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="pr-10" />
            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2 top-[30px] rounded p-1.5 text-gray-400 hover:text-gray-600"><Eye className="h-4 w-4" /></button>
          </div>
          <div className="relative">
            <Input label="Konfirmasi Password Baru" type={showNew ? "text" : "password"} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="pr-10" />
            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2 top-[30px] rounded p-1.5 text-gray-400 hover:text-gray-600"><Eye className="h-4 w-4" /></button>
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!oldPwd || !newPwd || !confirmPwd}>
            <Save className="h-4 w-4" /> Simpan Password Baru
          </Button>
        </form>
      </Section>
    </div>
  );
}