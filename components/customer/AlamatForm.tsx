"use client";

import { useState, useMemo, type FormEvent, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { Alamat } from "@/lib/auth-context";
import { isValidNoHp } from "@/lib/phone-utils";
import WilayahSelect from "@/components/customer/WilayahSelect";

export type AlamatFormValues = Omit<Alamat, "id">;

interface Props {
  initial?: Partial<AlamatFormValues>;
  submitLabel: string;
  onSubmit: (v: AlamatFormValues) => Promise<void> | void;
  onCancel?: () => void;
  loading?: boolean;
  hideUtamaToggle?: boolean;
}

const LABEL_PRESET = ["Rumah", "Kost", "Kantor", "Lainnya"] as const;

export default function AlamatForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  loading,
  hideUtamaToggle,
}: Props) {
  const [labelTipe, setLabelTipe] = useState<string>(
    initial?.label && LABEL_PRESET.includes(initial.label as (typeof LABEL_PRESET)[number])
      ? initial.label
      : initial?.label
        ? "Lainnya"
        : "Rumah",
  );
  const [labelCustom, setLabelCustom] = useState<string>(
    initial?.label && !LABEL_PRESET.includes(initial.label as (typeof LABEL_PRESET)[number])
      ? initial.label
      : "",
  );
  const [penerima, setPenerima] = useState(initial?.penerima ?? "");
  const [noHp, setNoHp] = useState(initial?.noHp ?? "");
  const [provinsi, setProvinsi] = useState(initial?.provinsi ?? "");
  const [kota, setKota] = useState(initial?.kota ?? "");
  const [kecamatan, setKecamatan] = useState(initial?.kecamatan ?? "");
  const [kodePos, setKodePos] = useState(initial?.kodePos ?? "");

  // Untuk WilayahSelect: parse "Kecamatan, Kelurahan" dari initial.kecamatan
  // (DB menyimpan gabungan "Kec, Kel" di field kecamatan)
  const parsedWilayah = useMemo(() => {
    const kecRaw = (initial?.kecamatan ?? "").trim();
    if (!kecRaw) {
      return {
        provinsi: initial?.provinsi,
        kabupaten: initial?.kota,
        kecamatan: undefined,
        kelurahan: undefined,
        kodePos: initial?.kodePos,
      };
    }
    const parts = kecRaw.split(",").map((s) => s.trim());
    const kecamatan = parts[0] || undefined;
    const kelurahan = parts[1] || undefined;
    return {
      provinsi: initial?.provinsi,
      kabupaten: initial?.kota,
      kecamatan,
      kelurahan,
      kodePos: initial?.kodePos,
    };
  }, [initial?.provinsi, initial?.kota, initial?.kecamatan, initial?.kodePos]);

  const handleWilayahChange = useCallback((data: { provinsi: string; kabupaten: string; kecamatan: string; kelurahan: string; kodePos: string }) => {
    setProvinsi(data.provinsi);
    setKota(data.kabupaten);
    setKecamatan(`${data.kecamatan}${data.kelurahan ? `, ${data.kelurahan}` : ""}`);
    if (data.kodePos) setKodePos(data.kodePos);
  }, []);
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [isUtama, setIsUtama] = useState(initial?.isUtama ?? true);
  const [isToko, setIsToko] = useState(initial?.isToko ?? false);
  const [isPengembalian, setIsPengembalian] = useState(
    initial?.isPengembalian ?? false,
  );
  const [error, setError] = useState<string | null>(null);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const finalLabel = labelTipe === "Lainnya" ? labelCustom.trim() : labelTipe;
    
    if (!finalLabel) return setError("Tag alamat wajib diisi");
    if (!penerima.trim()) return setError("Nama penerima wajib diisi");
    
    // --- VALIDASI NO HP BARU ---
    if (!isValidNoHp(noHp.trim())) return setError("Nomor handphone harus diawali 08, hanya berisi angka, dan memiliki panjang 10-13 digit");
    // ---------------------------

    if (!provinsi.trim() || !kota.trim() || !kecamatan.trim() || !kodePos.trim())
      return setError("Provinsi, Kota, Kecamatan, dan Kode Pos wajib diisi");
    if (!detail.trim()) return setError("Detail alamat wajib diisi");

    await onSubmit({
      label: finalLabel,
      penerima: penerima.trim(),
      noHp: noHp.trim(),
      provinsi: provinsi.trim(),
      kota: kota.trim(),
      kecamatan: kecamatan.trim(),
      kodePos: kodePos.trim(),
      detail: detail.trim(),
      isUtama,
      isToko,
      isPengembalian,
    });
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      {/* Tag alamat */}
      <div>
        <label className="text-sm font-bold text-brand-black">Tag Alamat</label>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {LABEL_PRESET.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setLabelTipe(opt)}
              className={`rounded-md border-2 px-2 py-2 text-xs font-bold transition ${
                labelTipe === opt
                  ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                  : "border-brand-cream bg-white text-brand-black/70 hover:border-brand-orange/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {labelTipe === "Lainnya" && (
          <input
            type="text"
            value={labelCustom}
            onChange={(e) => setLabelCustom(e.target.value.slice(0, 20))}
            placeholder="Misal: Indekos Bunda"
            className="mt-2 w-full rounded-md border-2 border-brand-cream bg-white px-3 py-2.5 text-sm focus:border-brand-orange focus:outline-none"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-bold text-brand-black">
            Nama Penerima
          </label>
          <input
            type="text"
            value={penerima}
            onChange={(e) => setPenerima(e.target.value)}
            placeholder="Nama lengkap"
            className="mt-1.5 w-full rounded-md border-2 border-brand-cream bg-white px-3 py-2.5 text-sm focus:border-brand-orange focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-brand-black">No HP</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={13} // Kunci maksimal 13 digit dari HTML
            value={noHp}
            onChange={(e) => setNoHp(e.target.value.replace(/\D/g, ""))}
            placeholder="08xxxxxxxxxx"
            className="mt-1.5 w-full rounded-md border-2 border-brand-cream bg-white px-3 py-2.5 text-sm focus:border-brand-orange focus:outline-none"
          />
        </div>
      </div>

      <WilayahSelect
        onChange={handleWilayahChange}
        loading={loading}
        initialValue={parsedWilayah}
      />

      <div>
        <label className="text-sm font-bold text-brand-black">
          Detail Alamat
        </label>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Nama jalan, nomor rumah, RT/RW, patokan…"
          rows={3}
          className="mt-1.5 w-full rounded-md border-2 border-brand-cream bg-white px-3 py-2.5 text-sm focus:border-brand-orange focus:outline-none"
        />
      </div>

      {/* Toggle peruntukan - Alamat Utama sudah diposisikan paling depan */}
      <div className="rounded-lg border-2 border-brand-cream bg-brand-cream-light p-3">
        <p className="text-xs font-bold text-brand-black/70">
          Gunakan alamat ini sebagai:
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          
          {/* URUTAN 1: Alamat Utama */}
          {!hideUtamaToggle && (
            <label className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-bold text-brand-black hover:bg-brand-cream-light">
              <input
                type="checkbox"
                checked={isUtama}
                onChange={(e) => setIsUtama(e.target.checked)}
                className="h-4 w-4 accent-brand-orange"
              />
              Alamat Utama
            </label>
          )}
          
          {/* URUTAN 2: Alamat Toko */}
          <label className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-bold text-brand-black hover:bg-brand-cream-light">
            <input
              type="checkbox"
              checked={isToko}
              onChange={(e) => setIsToko(e.target.checked)}
              className="h-4 w-4 accent-brand-orange"
            />
            Alamat Toko
          </label>
          
          {/* URUTAN 3: Alamat Pengembalian */}
          <label className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-bold text-brand-black hover:bg-brand-cream-light">
            <input
              type="checkbox"
              checked={isPengembalian}
              onChange={(e) => setIsPengembalian(e.target.checked)}
              className="h-4 w-4 accent-brand-orange"
            />
            Alamat Pengembalian
          </label>

        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-md border-2 border-brand-cream bg-white px-4 py-3 text-sm font-bold text-brand-black hover:border-brand-orange disabled:opacity-50"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-brand-orange px-4 py-3 text-sm font-black text-white shadow-md hover:bg-brand-orange-dark disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}