"use client";

import { useState } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { useAuth, type Alamat } from "@/lib/auth-context";
import AlamatForm, {
  type AlamatFormValues,
} from "@/components/customer/AlamatForm";

interface Props {
  /** Callback dipanggil saat user pilih / tambah alamat. */
  onPick: (a: Alamat) => void;
  /** ID alamat yang sedang dipakai checkout (buat highlight). */
  selectedId?: string | null;
}

/**
 * Tombol "+" + Modal pemilih alamat untuk halaman Checkout.
 * - Klik tombol → buka modal
 * - Modal nampilin daftar alamat tersimpan + tombol "Tambah Alamat Baru"
 * - User klik salah satu kartu → onPick + tutup modal
 * - User klik "Tambah Baru" → form alamat → simpan → auto pilih
 */
export default function CheckoutAlamatDialog({ onPick, selectedId }: Props) {
  const { alamatList, addAlamat, updateAlamatAsync } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editAlamatTarget, setEditAlamatTarget] = useState<Alamat | null>(null);
  const [saving, setSaving] = useState(false);

  function openDialog() {
    setOpen(true);
    setMode(alamatList.length === 0 ? "add" : "list");
  }

  async function handleAdd(v: AlamatFormValues) {
    setSaving(true);
    const baru = addAlamat(v);
    setSaving(false);
    if (baru) {
      onPick(baru);
      setOpen(false);
    }
  }

  async function handleEdit(v: AlamatFormValues) {
    if (!editAlamatTarget) return;
    setSaving(true);
    try {
      await updateAlamatAsync(editAlamatTarget.id, v);
      const updated: Alamat = {
        ...v,
        id: editAlamatTarget.id,
      };
      onPick(updated);
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handlePilih(a: Alamat) {
    onPick(a);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex items-center gap-1 rounded-md border-2 border-dashed border-brand-orange bg-brand-orange/5 px-3 py-1.5 text-xs font-black text-brand-orange hover:bg-brand-orange/10"
      >
        <Plus className="h-3.5 w-3.5" /> Tambah / Ganti Alamat
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black text-brand-black">
                {mode === "list"
                  ? "Pilih Alamat Pengiriman"
                  : mode === "add"
                  ? "Tambah Alamat Baru"
                  : "Edit Alamat"}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-brand-black/60 hover:bg-brand-cream"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {mode === "list" ? (
              <>
                <ul className="space-y-2">
                  {alamatList.map((a) => (
                    <li
                      key={a.id}
                      className={`relative flex items-center justify-between rounded-lg border-2 p-3 transition ${
                        selectedId === a.id
                          ? "border-brand-orange bg-brand-orange/5"
                          : "border-brand-cream bg-white hover:border-brand-orange/50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handlePilih(a)}
                        className="flex-1 text-left focus:outline-none"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-brand-cream-light px-2 py-0.5 text-[11px] font-bold text-brand-black">
                            {a.label}
                          </span>
                          {a.isUtama && (
                            <span className="rounded bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-white">
                              UTAMA
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-bold text-brand-black">
                          {a.penerima}{" "}
                          <span className="font-normal text-brand-black/60">
                            · {a.noHp}
                          </span>
                        </p>
                        <p className="text-xs text-brand-black/70 pr-8">
                          {a.detail}, {a.kecamatan}, {a.kota}, {a.provinsi}{" "}
                          {a.kodePos}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditAlamatTarget(a);
                          setMode("edit");
                        }}
                        className="rounded-md p-2 text-brand-black/60 hover:bg-brand-cream hover:text-brand-orange"
                        title="Edit Alamat"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setMode("add")}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-brand-orange bg-brand-orange/5 px-4 py-3 text-sm font-black text-brand-orange hover:bg-brand-orange/10"
                >
                  <Plus className="h-4 w-4" /> Tambah Alamat Baru
                </button>
              </>
            ) : mode === "add" ? (
              <AlamatForm
                key="add"
                submitLabel="Simpan & Pakai Alamat Ini"
                loading={saving}
                onSubmit={handleAdd}
                onCancel={
                  alamatList.length > 0 ? () => setMode("list") : undefined
                }
              />
            ) : (
              <AlamatForm
                key={editAlamatTarget?.id || "edit"}
                initial={editAlamatTarget ?? undefined}
                submitLabel="Perbarui & Pakai Alamat Ini"
                loading={saving}
                onSubmit={handleEdit}
                onCancel={() => setMode("list")}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}