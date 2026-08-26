"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Instagram, Facebook, Mail } from "lucide-react";
import { getFooterSettings, type FooterSettings, FOOTER_SETTINGS_DEFAULT } from "@/lib/footer-admin-helpers";

const SOSMED_ICONS = {
  Instagram: Instagram,
  Facebook: Facebook,
  Email: Mail,
};

export function Footer() {
  const [settings, setSettings] = useState<FooterSettings | null>(null);

  useEffect(() => {
    getFooterSettings().then(setSettings).catch(() => {});

    const sync = () => getFooterSettings().then(setSettings).catch(() => {});
    window.addEventListener("jogjadoelan_footer_updated", sync);
    return () => {
      window.removeEventListener("jogjadoelan_footer_updated", sync);
    };
  }, []);

  // Selagi loading, tampilkan placeholder atau gunakan fallback
  const data = settings || FOOTER_SETTINGS_DEFAULT;
  const links = data.links;

  return (
    <footer className="bg-brand-black pb-24 text-white md:pb-0" style={{ backgroundColor: data.bgColor, color: data.textColor }}>
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Layanan Pelanggan */}
          <div>
            <h3 className="mb-3 font-bebas text-base tracking-wider">LAYANAN PELANGGAN</h3>
            <ul className="space-y-2 text-sm text-white/70">
              {links.layananPelanggan.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-brand-orange">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tentang Kami */}
          <div>
            <h3 className="mb-3 font-bebas text-base tracking-wider">TENTANG KAMI</h3>
            <ul className="space-y-2 text-sm text-white/70">
              {links.tentangKami.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-brand-orange">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <h3 className="mb-3 font-bebas text-base tracking-wider">METODE PEMBAYARAN</h3>
            <ul className="space-y-2 text-sm text-white/70">
              {links.metodePembayaran.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-brand-orange">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="mb-3 font-bebas text-base tracking-wider">SOCIAL MEDIA</h3>
            <ul className="space-y-2 text-sm text-white/70">
              {links.socialMedia.map((link) => {
                const Icon = SOSMED_ICONS[link.label as keyof typeof SOSMED_ICONS];
                return (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-brand-orange">
                      {Icon && <Icon className="h-4 w-4" />}
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Metode Pengiriman */}
        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <h3 className="mb-3 font-bebas text-base tracking-wider">METODE PENGIRIMAN</h3>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm text-white/70">
            {links.metodePengiriman.map((item, i) => (
              <span key={item.href} className="inline-flex items-center gap-3">
                <Link href={item.href} className="hover:text-brand-orange">{item.label}</Link>
                {i < links.metodePengiriman.length - 1 && <span className="text-white/30">·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="border-t border-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-4 text-xs text-white/50 sm:flex-row">
          <div className="text-center sm:text-left">
            {data.copyright}
            <div className="text-[10px] text-white/35 mt-1">{data.credit}</div>
          </div>
          <div className="flex gap-4">
            <Link href="/syarat" className="hover:text-brand-orange">Syarat & Ketentuan</Link>
            <Link href="/privasi" className="hover:text-brand-orange">Kebijakan Privasi</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}