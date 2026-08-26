"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PackagePlus } from "lucide-react";
import { addCustomProduct } from "@/lib/admin-produk-helpers";
import { ProdukForm, EMPTY_PRODUK, type ProdukFormValue } from "@/lib/produk-form-shared";
import { PageHeader, FormActions } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";

export default function TambahProdukPage() {
  const router = useRouter();
  const [v, setV] = useState<ProdukFormValue>(EMPTY_PRODUK);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const { success: notifySuccess, error: notifyError } = useAdminNotification();

  const submit = async () => {
    setErr("");
    if (!v.nama.trim()) return setErr("Nama produk wajib diisi");
    if (!v.harga || v.harga <= 0) return setErr("Harga harus lebih dari 0");
    if ((v.gambars ?? []).length === 0) return setErr("Minimal 1 gambar produk");
    setSaving(true);
    try {
      const { id: omitId, gambar: omitGambar, ...rest } = v;
      void omitId;
      void omitGambar;
      const created = await addCustomProduct({
        ...rest,
        gambars: v.gambars ?? [],
        isRekomendasi: v.isRekomendasi ?? false,
      });
      notifySuccess("Produk Berhasil Ditambahkan", "Produk baru telah disimpan dan siap tampil di katalog.");
      router.push(`/admin/produk?created=${created.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan produk";
      setErr(msg);
      notifyError("Gagal Menyimpan", msg);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        title="Tambah Produk Baru"
        subtitle="Isi semua informasi produk yang akan tampil di katalog customer"
        icon={PackagePlus}
        variant="orange"
        actions={
          <Link href="/admin/produk"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[11px] font-black text-white hover:bg-white/20 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </Link>
        }
      />

      {err && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-[10px]">!</span>
          {err}
        </div>
      )}

      <ProdukForm value={v} onChange={setV} />

      <FormActions
        cancelHref="/admin/produk"
        onSubmit={submit}
        submitLabel="Simpan Produk"
        loading={saving}
      />
    </div>
  );
}