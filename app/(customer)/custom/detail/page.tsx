"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, FileText, Eye, X } from "lucide-react";
import { useCustomOrder } from "@/lib/custom-order-context";
import { PesananMasukModal } from "@/components/customer/custom/PesananMasukModal";

export default function CustomDetailPage() {
  const router = useRouter();
    const { draft, submitOrder } = useCustomOrder();
  const [showModal, setShowModal] = useState(false);
  const [showRefModal, setShowRefModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewableRefs = draft.referensiFiles.filter((f) => !!f.dataUrl);

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Jenis Helm", value: draft.jenis },
    {
      label: "Warna Cat Luaran",
      value: (
        <div className="flex gap-1">
          {draft.warnaList.length === 0 ? (
            <span className="text-xs text-gray-400">—</span>
          ) : (
            draft.warnaList.slice(0, 5).map((w, i) => (
              <div
                key={i}
                className="h-6 w-6 rounded border border-gray-300"
                style={{ backgroundColor: w.hex }}
                title={w.nama || w.hex}
              />
            ))
          )}
        </div>
      ),
    },
    { label: "Finishing", value: draft.finishing },
    { label: "Strap", value: draft.strap },
    { label: "Ukuran", value: draft.ukuran },
    { label: "Motif Cover Busa", value: draft.motifBusa },
    { label: "Bahan Helm", value: draft.bahan },
    { label: "Aksesoris", value: draft.aksesoris },
    {
      label: "Unggahan Referensi Desain",
      value: (
        <button
          type="button"
          onClick={() => draft.referensiFiles.length > 0 && setShowRefModal(true)}
          disabled={draft.referensiFiles.length === 0}
          className="flex items-center gap-1 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 transition hover:border-orange-400 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-gray-300 disabled:hover:bg-gray-50"
        >
          <FileText className="h-4 w-4 text-gray-600" />
          <span className="text-xs text-gray-700">{draft.referensiFiles.length}</span>
          <Eye className="ml-1 h-4 w-4 text-gray-600" />
        </button>
      ),
    },
  ];

   const handlePesan = async () => {
    await submitOrder();
    setShowModal(true);
  };

  const handleCek = () => {
    setShowModal(false);
    /* Estimasi sekarang di-set ADMIN. Customer langsung ke halaman tunggu. */
    router.push("/custom/estimasi");
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <div className="border-b bg-white">
        <div className="container mx-auto flex items-center gap-6 px-4 py-3">
          <Link href="/custom" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
            Pesanan
          </Link>
          <span className="border-b-2 border-orange-500 pb-1 text-sm font-semibold text-gray-900">
            Detail
          </span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <h1 className="mb-5 text-xl font-bold text-gray-900">Detail Pesanan Custom Anda</h1>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-medium text-gray-700">Lihat Kembali Detail Pesanan Anda</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium text-gray-900">{r.label}</span>
                <span className="text-sm text-gray-700">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/custom")}
            className="rounded-md border border-gray-300 bg-gray-50 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Ubah Pesanan
          </button>
          <button
            type="button"
            onClick={handlePesan}
            className="rounded-md bg-orange-500 px-8 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
          >
            Pesan
          </button>
        </div>
      </div>

      <PesananMasukModal open={showModal} onCheck={handleCek} />

      {showRefModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowRefModal(false)}
          role="dialog"
        >
          <div
            className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h3 className="text-sm font-bold text-gray-900">
                Referensi Desain ({draft.referensiFiles.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowRefModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {draft.referensiFiles.length === 0 ? (
                <p className="text-center text-sm italic text-gray-400">
                  Belum ada referensi diunggah.
                </p>
              ) : previewableRefs.length === 0 ? (
                <ul className="space-y-2">
                  {draft.referensiFiles.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <FileText className="h-4 w-4 text-orange-500" />
                      <span className="truncate text-xs text-gray-700">{f.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {draft.referensiFiles.map((f, i) =>
                    f.dataUrl ? (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewUrl(f.dataUrl!)}
                        className="group relative block aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                        title={f.name}
                      >
                        <Image
                          src={f.dataUrl}
                          alt={f.name}
                          width={0}
                          height={0}
                          sizes="300px"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-[10px] text-white">
                          {f.name}
                        </span>
                      </button>
                    ) : (
                      <div
                        key={i}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-2 text-center"
                        title={f.name}
                      >
                        <FileText className="h-6 w-6 text-orange-500" />
                        <span className="line-clamp-2 text-[10px] text-gray-600">{f.name}</span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreviewUrl(null)}
          role="dialog"
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
          <Image
            src={previewUrl}
            alt="Preview"
            width={0}
            height={0}
            sizes="100vw"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}