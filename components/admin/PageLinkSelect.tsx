"use client";

import { Link2, ExternalLink } from "lucide-react";

/** Halaman customer built-in (path & label awam) */
export const BUILT_IN_PAGES = [
  { value: "/", label: "Beranda (Home)" },
  { value: "/belanja", label: "Belanja - Semua Produk" },
  { value: "/custom", label: "Custom Helm" },
  { value: "/promo", label: "Halaman Promo" },
  { value: "/tentang", label: "Tentang Kami" },
  { value: "/kontak", label: "Kontak / WhatsApp" },
  { value: "/faq", label: "FAQ - Tanya Jawab" },
  { value: "/chat", label: "Live Chat Admin" },
  { value: "/pesanan", label: "Pesanan Saya" },
  { value: "/keranjang", label: "Keranjang Belanja" },
  { value: "/akun", label: "Akun Saya" },
] as const;

interface PageLinkSelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}

export function PageLinkSelect({
  label = "Halaman Tujuan Tombol",
  value,
  onChange,
  hint,
}: PageLinkSelectProps) {
  const isBuiltIn = BUILT_IN_PAGES.some((p) => p.value === value);
  const mode: "builtin" | "manual" =
    isBuiltIn || !value ? "builtin" : "manual";

  return (
    <div>
      <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-900">
        {label}
      </label>
      {hint && <p className="mb-1.5 text-[10px] text-gray-500">{hint}</p>}

      {/* Toggle: pilih halaman / link manual */}
      <div className="mb-2 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => {
            if (!isBuiltIn) onChange("/belanja");
          }}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-black transition-all ${
            mode === "builtin"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          <Link2 className="h-3 w-3" /> Pilih Halaman
        </button>
        <button
          type="button"
          onClick={() => {
            if (isBuiltIn) onChange("");
          }}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-black transition-all ${
            mode === "manual"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          <ExternalLink className="h-3 w-3" /> Link Manual
        </button>
      </div>

      {mode === "builtin" ? (
        <select
          value={isBuiltIn ? value : "/belanja"}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none"
        >
          {BUILT_IN_PAGES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Contoh: https://wa.me/628xxx atau /belanja?kat=bogo"
          className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none"
        />
      )}

      {value && (
        <p className="mt-1 truncate text-[10px] text-gray-400">
          Arahkan ke: <span className="font-mono">{value}</span>
        </p>
      )}
    </div>
  );
}