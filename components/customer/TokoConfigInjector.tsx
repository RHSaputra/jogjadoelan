"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
  getBrandingAsync, getLandingAsync, getOperasionalAsync, getKontakAsync,
  type BrandingConfig, type LandingConfig, type OperasionalConfig, type KontakExtended,
} from "@/lib/admin-toko-master-helpers";

export default function TokoConfigInjector() {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [landing, setLanding] = useState<LandingConfig | null>(null);
  const [op, setOp] = useState<OperasionalConfig | null>(null);
  const [kontak, setKontak] = useState<KontakExtended | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [annClosed, setAnnClosed] = useState(false);
  
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  
  const reload = () => {
    void Promise.all([
      getBrandingAsync().then(setBranding),
      getLandingAsync().then(setLanding),
      getOperasionalAsync().then(setOp),
      getKontakAsync().then(setKontak),
    ]);
  };

  useEffect(() => {
    reload();
    const events = [
      "jogjadoelan_branding_changed", "jogjadoelan_landing_changed",
      "jogjadoelan_operasional_changed", "jogjadoelan_kontak_changed"
    ];

    events.forEach((e) => window.addEventListener(e, reload));

    // Polling landing dari DB/API supaya perubahan admin tidak hilang setelah refresh
    // walau event lintas konteks (tab/device) tidak sampai.
    const POLL_MS = 15000;
    const poll = () => {
      if (isAdmin) return;
      void getLandingAsync().then((next) => setLanding(next));
      void getBrandingAsync().then((next) => setBranding(next));
    };
    const t = window.setInterval(poll, POLL_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, reload));
      window.clearInterval(t);
    };
  }, [isAdmin]);

  // Popup welcome
  useEffect(() => {
    if (!landing?.popup.aktif) return;
    const key = "jogjadoelan_popup_seen";
    const now = Date.now();
    const seen = Number(localStorage.getItem(key) || 0);
    const freq = landing.popup.frequency;
    let show = false;
    
    if (freq === "session" && !sessionStorage.getItem("jogjadoelan_popup_session")) show = true;
    else if (freq === "daily" && now - seen > 86400000) show = true;
    else if (freq === "once" && !seen) show = true;
    
    if (show) {
      const t = setTimeout(() => {
        setPopupOpen(true);
        localStorage.setItem(key, String(now));
        sessionStorage.setItem("jogjadoelan_popup_session", "1");
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [landing?.popup.aktif, landing?.popup.frequency]);

  if (!branding || isAdmin) return null;

  // Cek libur aktif
  const today = new Date().toISOString().slice(0, 10);
  const liburAktif = op?.libur.find((l) => l.tanggalMulai && l.tanggalSelesai && today >= l.tanggalMulai && today <= l.tanggalSelesai);

  // WA href
  const waNumber = (kontak?.waUtama || "").replace(/\D/g, "");
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(kontak?.waTemplate || "")}` : "#";

  return (
    <>
      {/* CSS Variables global */}
      <style jsx global>{`
        :root {
          --brand-primary: ${branding.primaryColor};
          --brand-accent: ${branding.accentColor};
          --brand-bg: ${branding.bgColor};
          --brand-text: ${branding.textColor};
        }
      `}</style>

      {/* MAINTENANCE MODE OVERLAY */}
      {op?.maintenanceMode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0E2148] p-4">
          <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <span className="text-3xl">🔧</span>
            </div>
            <h2 className="text-xl font-black text-[#0E2148]">Sedang Maintenance</h2>
            <p className="mt-2 text-sm text-gray-600">{op.maintenancePesan}</p>
            {waNumber && <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-full bg-[#FF6B1A] px-5 py-2 text-xs font-black text-white">Hubungi via WhatsApp</a>}
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT BAR */}
      {landing?.announcement.aktif && !annClosed && landing.announcement.text && (
        <div className={`relative ${landing.announcement.warna} px-4 py-2 text-center text-xs font-black text-white`}>
          {landing.announcement.link ? (
            <Link href={landing.announcement.link} className="hover:underline">{landing.announcement.text}</Link>
          ) : <span>{landing.announcement.text}</span>}
          <button onClick={() => setAnnClosed(true)} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* LIBUR BANNER */}
      {liburAktif && !op?.maintenanceMode && (
        <div className="bg-amber-500 px-4 py-2 text-center text-xs font-black text-white">
          🌴 Toko libur: {liburAktif.alasan} ({liburAktif.tanggalMulai} s/d {liburAktif.tanggalSelesai})
        </div>
      )}

      {/* POPUP WELCOME */}
      {popupOpen && landing?.popup.aktif && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4" onClick={() => setPopupOpen(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {landing.popup.gambar && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={landing.popup.gambar} alt="" className="h-48 w-full object-contain" />
            )}
            <div className="p-6 text-center">
              <h3 className="text-xl font-black text-[#0E2148]">{landing.popup.judul}</h3>
              <p className="mt-2 text-sm text-gray-600">{landing.popup.deskripsi}</p>
              <Link href={landing.popup.ctaLink} onClick={() => setPopupOpen(false)}
                className="mt-4 inline-block w-full rounded-full bg-[#FF6B1A] py-3 text-sm font-black text-white">
                {landing.popup.ctaText}
              </Link>
              <button onClick={() => setPopupOpen(false)} className="mt-2 text-[11px] font-black text-gray-400">Nanti saja</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}