"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RefundListRedirect() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const qs = sp.toString();
    router.replace(qs ? `/tukar?${qs}` : "/tukar");
  }, [router, sp]);

  return (
    <div className="grid min-h-screen place-items-center bg-brand-cream-light">
      <p className="text-sm font-bold text-brand-black/40">
        Mengarahkan ke Pusat Resolusi…
      </p>
    </div>
  );
}

export default function RefundListRedirectPage() {
  return (
    <Suspense fallback={
      <div className="grid min-h-screen place-items-center bg-brand-cream-light">
        <p className="text-sm font-bold text-brand-black/40">
          Mengarahkan ke Pusat Resolusi…
        </p>
      </div>
    }>
      <RefundListRedirect />
    </Suspense>
  );
}