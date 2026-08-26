"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Navigation, Phone } from "lucide-react";

// Data default jika belum ada yang tersimpan
const defaultStoreInfo = {
  headerText: "Toko Helm Jadul Yogyakarta - Free ongkir Yogyakarta order min Rp 500rb",
  namaToko: "Jogjadoelan Vintage Helmet",
  alamat: "Jalan Imogiri Siluk Jetis, Miri, Sriharjo, Kec. Imogiri, Kab. Bantul, DIY 55782",
  mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3951.758999863212!2d110.3708453147754!3d-7.920268594294473!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e7a5500257e53f1%3A0x6b5d8f6d6f21226c!2sJogjadoelan%20Vintage%20Helmet!5e0!3m2!1sen!2sid!4v1716450000000!5m2!1sen!2sid",
  jamSeninJumat: "09.00 - 21.00",
  jamSabtu: "09.00 - 22.00",
  jamMinggu: "10.00 - 20.00",
  noHp: "+62 81244736703"
};

export default function LokasiPage() {
  const [storeInfo, setStoreInfo] = useState(defaultStoreInfo);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings?keys=operasional")
      .then((r) => r.json())
      .then((j) => {
        const info = j?.data?.operasional as Partial<typeof defaultStoreInfo> | null;
        if (info) setStoreInfo((prev) => ({ ...prev, ...info }));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Fungsi untuk membuat link Google Maps navigasi berdasarkan alamat
  const getMapsDirectionsUrl = () => {
    const query = encodeURIComponent(storeInfo.alamat);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  // Format nomor WA (hapus spasi dan +62 -> 62)
  const getWaNumber = () => {
    let nomor = storeInfo.noHp.replace(/\s/g, "");
    if (nomor.startsWith("+")) nomor = nomor.slice(1);
    if (!nomor.startsWith("62") && nomor.startsWith("0")) nomor = "62" + nomor.slice(1);
    return nomor;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-cream-light flex items-center justify-center">
        <div className="text-brand-black/60">Memuat informasi toko...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link href="/akun" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-lg font-black text-brand-black">Lokasi Toko</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-5">
        {/* MAP IFRAME */}
              <div className="overflow-hidden rounded-2xl border border-brand-cream shadow-sm">
        {storeInfo.mapsUrl?.includes("google.com/maps/embed") ? (
          <iframe
            src={storeInfo.mapsUrl}
            width="100%" height="280" style={{ border: 0 }} allowFullScreen loading="lazy"
            referrerPolicy="no-referrer-when-downgrade" title="Lokasi Jogjadoelan"
          />
        ) : (
          <div className="flex h-[280px] w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
            🗺️ Link peta tidak valid. Hubungi admin untuk perbaikan.
          </div>
        )}
      </div>

        {/* ALAMAT */}
        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-navy">Alamat Toko</p>
              <p className="mt-1 text-sm font-bold text-brand-black">{storeInfo.namaToko}</p>
              <p className="mt-1 text-sm text-brand-black/80">{storeInfo.alamat}</p>
            </div>
          </div>
          <a
            href={getMapsDirectionsUrl()}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-md bg-brand-navy py-2.5 text-xs font-black text-white shadow hover:bg-brand-navy-dark"
          >
            <Navigation className="h-3.5 w-3.5" /> Buka di Google Maps
          </a>
        </section>

        {/* JAM BUKA */}
        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase text-brand-navy">Jam Buka</p>
              <div className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between text-brand-black/80">
                  <span>Senin - Jumat</span>
                  <span className="font-bold text-brand-black">{storeInfo.jamSeninJumat}</span>
                </div>
                <div className="flex justify-between text-brand-black/80">
                  <span>Sabtu</span>
                  <span className="font-bold text-brand-black">{storeInfo.jamSabtu}</span>
                </div>
                <div className="flex justify-between text-brand-black/80">
                  <span>Minggu</span>
                  <span className="font-bold text-brand-black">{storeInfo.jamMinggu}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KONTAK WA */}
        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
              <Phone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase text-brand-navy">Kontak</p>
              <p className="mt-1 text-sm font-bold text-brand-black">
                {storeInfo.noHp.startsWith("+") ? storeInfo.noHp : `+${storeInfo.noHp}`}
              </p>
              <a
                href={`https://wa.me/${getWaNumber()}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-bold text-brand-navy underline"
              >
                Chat WhatsApp
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}