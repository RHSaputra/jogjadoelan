"use client";

import { useEffect, useId } from "react";
import {
  Award, ShieldCheck, Truck, Brush, Package, Bike, Palette, Coffee,
  Star, Heart, Flame, Zap, Facebook, MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/keys";
import { api } from "@/lib/api/fetcher";
import { LANDING_DEFAULT, type LandingConfig } from "@/lib/admin-toko-master-helpers";

/** Hook: baca konfigurasi landing dari DB & otomatis update saat admin menyimpan */
export function useLandingLive(): LandingConfig & { isLoaded: boolean } {
  const qc = useQueryClient();
  const { data, isFetched } = useQuery({
    queryKey: qk.settings.section("landing"),
    queryFn: () => api.get<{ landing?: LandingConfig }>("/api/settings", { query: { keys: "landing" } }),
    staleTime: 5 * 60 * 1000, // 5 minutes client-side cache
    refetchInterval: 15000, // 15 seconds polling for live updates
  });

  useEffect(() => {
    const sync = () => {
      void qc.invalidateQueries({ queryKey: qk.settings.section("landing") });
    };
    window.addEventListener("jogjadoelan_landing_changed", sync);

    const bc = new BroadcastChannel("jogjadoelan_settings");
    bc.onmessage = (event) => {
      if (event.data?.type === "landing_changed") sync();
    };

    return () => {
      window.removeEventListener("jogjadoelan_landing_changed", sync);
      bc.close();
    };
  }, [qc]);

  const config = data?.landing ?? LANDING_DEFAULT;
  return { ...config, isLoaded: isFetched };
}

/** Custom SVG untuk Instagram dengan gradient asli (#FDC128 → #E1306C → #833AB4) */
export const InstagramGradientIcon = ({ className }: { className?: string }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id={`ig-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDC128" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill={`url(#ig-grad-${id})`} />
      <circle cx="12" cy="12" r="5" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
    </svg>
  );
};


/** Custom SVG untuk TikTok */
export const TiktokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
  </svg>
);

/** Custom SVG untuk WhatsApp */
export const WhatsappIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488" />
  </svg>
);

/** Resolver: kunci ikon (dari ICON_OPTIONS admin) → komponen ikon */
export function resolveIcon(key: string): React.ComponentType<{ className?: string }> {
  const map: Record<string, LucideIcon | React.ComponentType<{ className?: string }>> = {
    award: Award, "shield-check": ShieldCheck, truck: Truck, brush: Brush,
    package: Package, bike: Bike, palette: Palette, coffee: Coffee,
    star: Star, heart: Heart, flame: Flame, zap: Zap,
    instagram: InstagramGradientIcon, facebook: Facebook, chat: MessageCircle,
    tiktok: TiktokIcon, whatsapp: WhatsappIcon,
  };
  return (map[key] ?? Star) as React.ComponentType<{ className?: string }>;
}

/** Helper render judul + bagian highlight orange */
export function renderTitle(title: string, highlight?: string) {
  if (!highlight) return title.toUpperCase();
  const parts = title.split(new RegExp(`(${highlight})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === highlight.toLowerCase()
      ? <span key={i} className="text-rust">{p.toUpperCase()}</span>
      : <span key={i}>{p.toUpperCase()}</span>
  );
}