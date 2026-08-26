"use client";
// lib/admin-ekspedisi-helpers.ts
// Operasi ekspedisi sekarang melalui API → Database.

export interface StoredEkspedisi {
  id?: string;
  keyUnik?: string;
  nama: string;
  trackUrlTemplate: string;
  layanan?: string | null;
  estimasi?: string | null;
  harga?: number;
  isApi?: boolean;
  forReturn?: boolean;
  aktif?: boolean;
  urutan?: number;
}

interface EkspedisiRow {
  id?: string;
  keyUnik?: string;
  nama: string;
  trackUrlTemplate?: string | null;
  layanan?: string | null;
  estimasi?: string | null;
  harga?: number | null;
  isApi?: boolean;
  forReturn?: boolean;
  aktif?: boolean;
  urutan?: number;
}

function rowToStored(row: EkspedisiRow): StoredEkspedisi {
  return {
    id: row.id,
    keyUnik: row.keyUnik,
    nama: row.nama,
    trackUrlTemplate: row.trackUrlTemplate ?? "",
    layanan: row.layanan ?? null,
    estimasi: row.estimasi ?? null,
    harga: row.harga ?? 0,
    isApi: row.isApi ?? false,
    forReturn: row.forReturn ?? false,
    aktif: row.aktif ?? true,
    urutan: row.urutan ?? 0,
  };
}

export async function getAdminEkspedisi(): Promise<StoredEkspedisi[]> {
  try {
    const res = await fetch("/api/admin/ekspedisi", { credentials: "include" });
    const j = await res.json();
    return Array.isArray(j?.data) ? j.data.map(rowToStored) : [];
  } catch { return []; }
}

export async function saveAdminEkspedisi(list: StoredEkspedisi[]): Promise<void> {
  const payload = list.map((e, i) => ({
    keyUnik: e.keyUnik ?? e.id ?? `kurir-${i}`,
    nama: e.nama,
    trackUrlTemplate: e.trackUrlTemplate,
    layanan: e.layanan ?? null,
    estimasi: e.estimasi ?? null,
    harga: e.harga ?? 0,
    isApi: e.isApi ?? false,
    forReturn: e.forReturn ?? false,
    aktif: e.aktif ?? true,
    urutan: e.urutan ?? i,
  }));
  await fetch("/api/admin/ekspedisi", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  window.dispatchEvent(new Event("jogjadoelan_ekspedisi_changed"));
}

export async function addAdminEkspedisi(e: StoredEkspedisi) {
  const cur = await getAdminEkspedisi();
  await saveAdminEkspedisi([...cur, e]);
}
export async function updateAdminEkspedisi(id: string, patch: Partial<StoredEkspedisi>) {
  const cur = await getAdminEkspedisi();
  await saveAdminEkspedisi(cur.map((x) => (x.id === id || x.keyUnik === id ? { ...x, ...patch } : x)));
}
export async function deleteAdminEkspedisi(id: string) {
  const cur = await getAdminEkspedisi();
  await saveAdminEkspedisi(cur.filter((x) => x.id !== id && x.keyUnik !== id));
}
