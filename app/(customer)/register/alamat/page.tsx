"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import AlamatForm, { type AlamatFormValues } from "@/components/customer/AlamatForm";
import { toast } from "sonner";

function AlamatStepInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/akun";

  // Ambil addAlamatAsync untuk Google (awaitable), dan registerComplete untuk Manual
  const {
    hasPendingRegister,
    registerComplete,
    cancelPendingRegister,
    isAuthenticated,
    user,
    addAlamatAsync
  } = useAuth();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;

    // Kalau Google masuk ke sini:
    if (isAuthenticated && user) {
      // Pastikan kalau dia sebenernya udah punya alamat, usir dari halaman ini
      if (user.alamatList && user.alamatList.length > 0) {
        router.replace(next);
      }
      return; // Boleh stay kalau alamatList kosong
    }

    // Kalau pendaftar manual:
    if (hasPendingRegister()) return;

    router.replace("/register");
  }, [mounted, isAuthenticated, user, hasPendingRegister, router, next]);

  async function handleSubmit(v: AlamatFormValues) {
    try {
      if (isAuthenticated && user) {
        // JALUR GOOGLE: Await sampai alamat tersimpan di DB + query me() ter-refetch
        await addAlamatAsync({ ...v, isUtama: true });
        toast.success("Alamat berhasil disimpan!");
        router.replace(next);
      } else {
        // JALUR REGISTER MANUAL: Selesaikan proses pendaftaran
        const res = await registerComplete({ ...v, isUtama: true });
        if (!res.ok) {
          setError(res.error ?? "Gagal mendaftar");
          return;
        }
        router.replace(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan alamat");
    }
  }

  function handleBatal() {
    if (isAuthenticated) {
      toast.info("Pengisian alamat dilewati");
      router.replace("/");
    } else {
      if (typeof window !== "undefined") {
        toast.success("Pendaftaran dibatalkan", {
          description: "Data akun yang telah diisi berhasil dibatalkan.",
        });
      }
      cancelPendingRegister();
      router.replace("/register");
    }
  }

  if (!mounted) return <div className="min-h-screen bg-brand-cream-light" />;

  const isGoogleFlow = isAuthenticated;

  return (
    <div className="min-h-screen bg-brand-cream-light">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <button
          onClick={handleBatal}
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-brand-black/70 hover:text-brand-orange"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>

        {!isGoogleFlow && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white">
                ✓
              </div>
              <div className="h-0.5 flex-1 bg-brand-orange" />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange text-sm font-black text-white">
                2
              </div>
            </div>
            <p className="mb-4 text-xs font-bold text-brand-black/60">
              Langkah 2 dari 2 · Alamat Utama
            </p>
          </>
        )}

        <div className="rounded-2xl border border-brand-cream bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-black text-brand-black md:text-3xl">
            {isGoogleFlow ? "Lengkapi Alamat Utama" : "Alamat Utama"}
          </h1>
          <p className="mt-1 text-sm text-brand-black/60">
            {isGoogleFlow 
              ? "Satu langkah lagi! Alamat ini dipakai untuk pengiriman pesanan kamu." 
              : "Alamat ini dipakai untuk pengiriman pesanan kamu. Bisa diubah / tambah lagi nanti di menu Akun."}
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
          
          <AlamatForm
          submitLabel={isGoogleFlow ? "Simpan Alamat" : "Selesaikan Pendaftaran"}
          onSubmit={handleSubmit}
          // Properti hideUtamaToggle dibuang supaya checkbox muncul di depan
          initial={{ isUtama: true }}
        />
          </div>
        </div>
      </div>
  );
}

export default function RegisterAlamatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream-light" />}>
      <AlamatStepInner />
    </Suspense>
  );
}