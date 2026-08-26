"use client";

/**
 * Halaman "Komplain Saya" sudah dinonaktifkan.
 * Semua pengajuan (Refund + Tukar) kini terpusat di "Tukar Saya" (/tukar).
 *
 * L1 FIX: query param (mis. ?orderId=JD-...) dipertahankan agar
 * filter di /tukar tetap berfungsi.
 */

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function KomplainListRedirect() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const qs = sp.toString();
    router.replace(qs ? `/tukar?${qs}` : "/tukar");
  }, [router, sp]);

  return (
    <div className="grid min-h-screen place-items-center bg-brand-cream-light">
      <p className="text-sm text-brand-black/60">
        Mengarahkan ke Tukar Saya…
      </p>
    </div>
  );
}

export default function KomplainListRedirectPage() {
  return (
    <Suspense fallback={
      <div className="grid min-h-screen place-items-center bg-brand-cream-light">
        <p className="text-sm text-brand-black/60">
          Mengarahkan ke Tukar Saya…
        </p>
      </div>
    }>
      <KomplainListRedirect />
    </Suspense>
  );
}