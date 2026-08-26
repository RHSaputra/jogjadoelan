"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, RotateCcw } from "lucide-react";
import {
  getEffectiveProductById, updateCustomProduct, deleteCustomProduct,
  isCustomProductId, clearProductOverride,
} from "@/lib/admin-produk-helpers";
import { ProdukForm, EMPTY_PRODUK, type ProdukFormValue } from "@/lib/produk-form-shared";

export default function EditProdukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [v, setV] = useState<ProdukFormValue>(EMPTY_PRODUK);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");
  const isCustom = isCustomProductId(id);

    useEffect(() => {
    let active = true;
    getEffectiveProductById(id).then((p) => {
      if (!active) return;
      if (p) {
        setV({
          ...EMPTY_PRODUK,
          id: p.id, nama: p.nama, jenis: p.jenis, jenisLabel: p.jenisLabel,
          harga: p.harga, hargaCoret: p.hargaCoret ?? 0, diskonPersen: p.diskonPersen ?? 0,
          promoLabel: p.promoLabel ?? "", stok: p.stok, rating: p.rating ?? 5,
          terjual: p.terjual ?? 0,
          gambar: p.gambar ?? "", gambars: p.gambars ?? [],
          deskripsiSingkat: p.deskripsiSingkat ?? "",
          deskripsi: p.deskripsi ?? [],
          ukuran: p.ukuran ?? [],
          kondisi: p.kondisi ?? "Baru",
          spesifikasi: p.spesifikasi ?? "",
          isRekomendasi: (p as { isRekomendasi?: boolean }).isRekomendasi ?? false,
        });
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [id]);

  const submit = async () => {
  if (!v.nama.trim()) return setErr("Nama wajib diisi");
  if (!v.harga || v.harga <= 0) return setErr("Harga harus > 0");

  const { id: omitId, gambar: omitGambar, ...rest } = v;
  void omitId;
  void omitGambar;
  const updated = await updateCustomProduct(id, {
    ...rest,
    gambars: v.gambars ?? [],
  });

  if (!updated) return setErr("Gagal menyimpan");

  router.push("/admin/produk");
};

const del = async () => {
  if (!isCustom) return;

  if (!confirm("Hapus produk ini permanen?")) return;

  const okDel = await deleteCustomProduct(id);

  if (okDel) {
    router.push("/admin/produk");
  } else {
    setErr("Gagal menghapus produk");
  }
};

const reset = () => {
  if (isCustom) return;

  if (confirm("Hapus semua override dan kembalikan ke data default?")) {
    clearProductOverride(id);
    router.push("/admin/produk");
  }
};

  if (!loaded) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-3 rounded-2xl bg-[#fc970a] p-4 text-white shadow-lg">
        <Link href="/admin/produk" className="rounded-full bg-white/10 p-2"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <p className="text-sm font-black">Edit Produk {isCustom ? "(Custom)" : "(Default + Override)"}</p>
          <p className="text-[10px] opacity-80">ID: {id}</p>
        </div>
        {!isCustom && (
          <button onClick={reset} className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-[10px] font-black"><RotateCcw className="h-3 w-3" /> Reset</button>
        )}
        {isCustom && (
          <button onClick={del} className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-[10px] font-black"><Trash2 className="h-3 w-3" /> Hapus</button>
        )}
      </div>

      {err && <div className="rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-700">{err}</div>}

      {!isCustom && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-800">
          Produk default. Perubahan disimpan sebagai override; tombol Reset di pojok kanan mengembalikan ke data asli.
        </div>
      )}

      <ProdukForm value={v} onChange={setV} />

      <div className="sticky bottom-4 z-10 flex gap-2">
        <Link href="/admin/produk" className="flex-1 rounded-full border-2 border-gray-200 bg-white py-3 text-center text-xs font-black text-gray-600 shadow-lg">Batal</Link>
        <button onClick={submit} className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-[#FF6B1A] py-3 text-xs font-black text-white shadow-2xl">
          <Save className="h-4 w-4" /> Simpan
        </button>
      </div>
    </div>
  );
}