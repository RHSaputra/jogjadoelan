"use client";
// lib/footer-admin-helpers.ts
// Footer settings sekarang melalui API → SiteSetting key "footer".

import { FOOTER_LINKS } from "@/lib/constants";

export interface FooterLink {
  label: string;
  href: string;
  icon?: string;
}

export interface FooterLinksData {
  layananPelanggan: FooterLink[];
  tentangKami: FooterLink[];
  metodePembayaran: FooterLink[];
  socialMedia: FooterLink[];
  metodePengiriman: FooterLink[];
}

export interface FooterSettings {
  links: FooterLinksData;
  bgColor: string;
  textColor: string;
  copyright: string;
  credit: string;
}

const DEFAULT_LINKS = {
  layananPelanggan: FOOTER_LINKS.layananPelanggan,
  tentangKami: FOOTER_LINKS.tentangKami,
  metodePembayaran: FOOTER_LINKS.metodePembayaran,
  socialMedia: FOOTER_LINKS.socialMedia,
  metodePengiriman: FOOTER_LINKS.metodePengiriman,
};

export const FOOTER_SETTINGS_DEFAULT: FooterSettings = {
  links: DEFAULT_LINKS,
  bgColor: "",
  textColor: "#ffffff",
  copyright: "© 2026 Jogjadoelan. Hak cipta dilindungi.",
  credit: "Developed by TechForLocal.id · PJBL UNJAYA SI KELOMPOK 2 · v1.0",
};

const SETTING_KEY = "footer";

export async function getFooterSettings(): Promise<FooterSettings> {
  try {
    const res = await fetch(`/api/settings?keys=${SETTING_KEY}`);
    const j = await res.json();
    const saved = j?.data?.[SETTING_KEY] as FooterSettings | null;
    if (!saved) return FOOTER_SETTINGS_DEFAULT;
    return {
      ...FOOTER_SETTINGS_DEFAULT,
      ...saved,
      links: { ...FOOTER_SETTINGS_DEFAULT.links, ...saved.links },
    };
  } catch { return FOOTER_SETTINGS_DEFAULT; }
}

export async function saveFooterSettings(settings: FooterSettings): Promise<void> {
  await fetch("/api/admin/settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SETTING_KEY, value: settings }),
  });
  window.dispatchEvent(new Event("jogjadoelan_footer_updated"));
}
