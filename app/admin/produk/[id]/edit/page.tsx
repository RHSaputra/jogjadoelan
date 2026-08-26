"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, RotateCcw, Pencil } from "lucide-react";
import {
  getEffectiveProductById, updateCustomProduct, deleteCustomProduct,
  isCustomProductId, setProductOverride, clearProductOverride,
} from "@/lib/admin-produk-helpers";
import { ProdukForm, EMPTY_PRODUK, type ProdukFormValue } from "@/lib/produk-form-shared";
import { PageHeader, FormActions, Button } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";

export default function EditProdukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [v, setV] = useState<ProdukFormValue>(EMPTY_PRODUK);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const isCustom = isCustomProductId(id);
  const { success: notifySuccess, error: notifyError, warning: notifyWarning } = useAdminNotification();

  useEffect(() => {
    (async () => {
      const p = await getEffectiveProductById(id);
      if (p) {
        setV({
          ...EMPTY_PRODUK,
          id: p.id, nama: p.nama, jenis: p.jenis, jenisLabel: p.jenisLabel,
          harga: p.harga, diskonPersen: p.diskonPersen ?? 0,
          promoLabel: p.promoLabel ?? "", stok: p.stok, rating: p.rating ?? 5, terjual: p.terjual ?? 0,
          gambar: p.gambar ?? "", gambars: p.gambars ?? [],
          deskripsiSingkat: p.deskripsiSingkat ?? "",
          deskripsi: p.deskripsi ?? [], ukuran: p.ukuran ?? [],
          kondisi: p.kondisi ?? "Baru", spesifikasi: p.spesifikasi ?? "",
          isRekomendasi: (p as { isRekomendasi?: boolean }).isRekomendasi ?? false,
        });
      }
      setLoaded(true);
    })();
  }, [id]);

  const submit = async () => {
    setErr("");
    if (!v.nama.trim()) return setErr("Nama wajib diisi");
    if (!v.harga || v.harga <= 0) return setErr("Harga harus > 0");
    setSaving(true);

    try {
      const { id: omitId, ...rest } = v;
      void omitId;

      if (isCustom) {
        await updateCustomProduct(id, rest);
      } else {
        await setProductOverride(id, {
          harga: v.harga,
          diskonPersen: v.diskonPersen || null,
          promoLabel: v.promoLabel || null,
          nama: v.nama,
          jenis: v.jenis,
          jenisLabel: v.jenisLabel,
          gambars: v.gambars,
          deskripsiSingkat: v.deskripsiSingkat,
          deskripsi: v.deskripsi,
          ukuran: v.ukuran,
          kondisi: v.kondisi,
          spesifikasi: v.spesifikasi,
          rating: v.rating,
          terjual: v.terjual,
          isRekomendasi: v.isRekomendasi ?? false,
        });
      }

      notifySuccess("Produk Berhasil Diperbarui", "Semua perubahan telah disimpan.");
      router.push("/admin/produk");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan produk";
      setErr(msg);
      notifyError("Gagal Memperbarui", msg);
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!isCustom) return;
    notifyWarning(
      "Hapus Produk Permanen?",
      "Produk yang dihapus tidak dapat dikembalikan. Lanjutkan?",
    );
    // Gunakan confirm untuk safety
    if (confirm("Hapus produk ini permanen?")) {
      deleteCustomProduct(id);
      notifySuccess("Produk Dihapus", "Produk telah dihapus dari katalog.");
      router.push("/admin/produk");
    }
  };

  const handleReset = () => {
    if (isCustom) return;
    notifyWarning(
      "Reset Override?",
      "Semua perubahan harga, promo, dan stok akan dikembalikan ke data default. Lanjutkan?",
    );
    if (confirm("Hapus semua override dan kembalikan ke data default?")) {
      clearProductOverride(id);
      notifySuccess("Override Direset", "Produk kembali ke data default.");
      router.push("/admin/produk");
    }
  };

  if (!loaded) return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="text-sm font-bold text-gray-400">Memuat data produk...</p>
    </div>
  );

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        title={`Edit Produk`}
        subtitle={isCustom ? "Produk tambahan admin" : "Produk default toko"}
        icon={Pencil}
        variant="orange"
        actions={
          <>
            {!isCustom && (
              <Button variant="ghost" size="sm" onClick={handleReset}
                className="bg-white/15 text-white hover:bg-white/25">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
            {isCustom && (
              <Button variant="danger" size="sm" onClick={handleDelete}
                className="bg-red-500/80 text-white hover:bg-red-600">
                <Trash2 className="h-3.5 w-3.5" /> Hapus
              </Button>
            )}
            <Link href="/admin/produk"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[11px] font-black text-white hover:bg-white/20">
              <ArrowLeft className="h-3.5 w-3.5" /> Kembali
            </Link>
          </>
        }
      />

      {err && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-[10px]">!</span>
          {err}
        </div>
      )}

      {!isCustom && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-800 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-[10px]">i</span>
          Produk default. Perubahan disimpan sebagai override. Tombol <strong>Reset</strong> di header mengembalikan ke data asli.
        </div>
      )}

      <ProdukForm value={v} onChange={setV} />

      <FormActions
        cancelHref="/admin/produk"
        onSubmit={submit}
        submitLabel="Simpan Perubahan"
        loading={saving}
        showDelete={isCustom}
        deleteLabel="Hapus Produk"
        onDelete={handleDelete}
      />
    </div>
  );
}