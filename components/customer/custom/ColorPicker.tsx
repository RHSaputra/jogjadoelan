"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { CUSTOM_PALETTE_PRESETS, CUSTOM_WARNA_MAX } from "@/lib/constants";
import { getCustomFormAsync } from "@/lib/admin-custom-options";
import { subscribeSync } from "@/lib/sync-events";
import type { WarnaItem } from "@/lib/custom-order-context";

interface ColorPickerProps {
  warnaList: WarnaItem[];
  catatan: string;
  onChange: (p: { warnaList?: WarnaItem[]; catatan?: string }) => void;
}

export function ColorPicker({ warnaList, catatan, onChange }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState("#FF6B1A");
  const [palettePresets, setPalettePresets] = useState(CUSTOM_PALETTE_PRESETS);
  const [warnaMax, setWarnaMax] = useState(CUSTOM_WARNA_MAX);

  const refreshPalette = () => {
    getCustomFormAsync()
      .then((adminForm) => {
        if (adminForm.palette && adminForm.palette.length > 0) {
          setPalettePresets(
            adminForm.palette.map((s) => ({ id: s.id, nama: s.nama, hex: s.hex })),
          );
        }
        if (adminForm.warnaMax) {
          setWarnaMax(adminForm.warnaMax);
        }
      })
      .catch(() => {
        // fallback ke hardcoded
      });
  };

  useEffect(() => {
    // Schedule initial refresh to avoid synchronous state updates in effect
    const initialRefresh = () => {
      refreshPalette();
    };
    setTimeout(initialRefresh, 0);

    // Subscribe to "custom" channel for future updates
    const unsubscribe = subscribeSync("custom", refreshPalette);
    return unsubscribe;
  }, []);

  const sisa = warnaMax - warnaList.length;
  const penuh = sisa <= 0;

  const addWarna = (w: WarnaItem) => {
    if (penuh) return;
    if (warnaList.some((x) => x.hex.toLowerCase() === w.hex.toLowerCase())) return;
    onChange({ warnaList: [...warnaList, w] });
  };

  const removeWarna = (idx: number) => {
    onChange({ warnaList: warnaList.filter((_, i) => i !== idx) });
  };

  const isHexValid = (h: string) => /^#([0-9a-fA-F]{6})$/.test(h);

  return (
    <div className="space-y-4">
      {/* Daftar warna terpilih */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-700">
          Warna Terpilih ({warnaList.length}/{warnaMax})
        </p>
        {warnaList.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-center text-xs text-gray-500">
            Belum ada warna. Pilih dari preset atau tambah custom HEX.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {warnaList.map((w, i) => (
              <div
                key={`${w.hex}-${i}`}
                className="group relative flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 shadow-sm"
              >
                <span
                  className="h-7 w-7 rounded-full border border-white shadow"
                  style={{ backgroundColor: w.hex }}
                />
                <span className="text-xs font-medium text-gray-700">
                  {w.nama || w.hex.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => removeWarna(i)}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600"
                  aria-label={`Hapus warna ${w.nama || w.hex}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preset palette dari admin */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-700">Preset Warna (dari Admin)</p>
        <div className="grid grid-cols-5 gap-2">
          {palettePresets.map((p) => {
            const sudah = warnaList.some(
              (x) => x.hex.toLowerCase() === p.hex.toLowerCase(),
            );
            return (
              <button
                key={p.id}
                type="button"
                disabled={penuh || sudah}
                onClick={() =>
                  addWarna({ hex: p.hex, nama: p.nama, sumber: "preset" })
                }
                className={`flex flex-col items-center gap-1 rounded-md border p-2 text-[10px] transition ${
                  sudah
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50"
                } ${penuh && !sudah ? "cursor-not-allowed opacity-40" : ""}`}
                title={sudah ? "Sudah dipilih" : p.nama}
              >
                <span
                  className="h-8 w-8 rounded-full border border-white shadow"
                  style={{ backgroundColor: p.hex }}
                />
                <span className="line-clamp-1 font-medium text-gray-700">
                  {p.nama}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom HEX — color picker penuh */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-700">Custom HEX</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="color"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            disabled={penuh}
            className="h-12 w-14 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-white disabled:cursor-not-allowed disabled:opacity-50"
          />
          <input
            type="text"
            value={customHex}
            onChange={(e) => {
              const v = e.target.value.startsWith("#")
                ? e.target.value
                : `#${e.target.value}`;
              setCustomHex(v.slice(0, 7));
            }}
            maxLength={7}
            placeholder="#RRGGBB"
            disabled={penuh}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm uppercase outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
          />
          <button
            type="button"
            disabled={penuh || !isHexValid(customHex)}
            onClick={() => {
              addWarna({ hex: customHex.toUpperCase(), sumber: "custom" });
            }}
            className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Tambah
          </button>
        </div>
        {penuh && (
          <p className="mt-1 text-[11px] text-amber-700">
            Sudah maksimal {warnaMax} warna. Hapus salah satu untuk menambah.
          </p>
        )}
      </div>

      {/* Catatan */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">
          Catatan Warna (opsional)
        </label>
        <textarea
          value={catatan}
          onChange={(e) => onChange({ catatan: e.target.value })}
          rows={3}
          placeholder="Misal: gradient orange ke hitam, glossy, finish doff, dll."
          className="w-full resize-none rounded-md border border-gray-300 bg-white px-2 py-2 text-sm outline-none focus:border-orange-500"
        />
      </div>
    </div>
  );
}