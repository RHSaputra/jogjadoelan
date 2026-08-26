// lib/wilayah-id.ts — API Wilayah Indonesia (Gratis, Tanpa API Key)
// Sumber: https://emsifa.github.io/api-wilayah-indonesia
// Data: Kemendagri — dengan in-memory cache untuk kecepatan

const BASE = "https://emsifa.github.io/api-wilayah-indonesia/api";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface WilayahProvinsi {
  id: string;
  name: string;
}
export interface WilayahKabupaten {
  id: string;
  name: string;
  province_id: string;
}
export interface WilayahKecamatan {
  id: string;
  name: string;
  regency_id: string;
}
export interface WilayahKelurahan {
  id: string;
  name: string;
  district_id: string;
}

// Simple cache
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

async function fetchWilayah<T>(endpoint: string, cacheKey: string): Promise<T> {
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${BASE}/${endpoint}`, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Wilayah API ${res.status}`);
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

// --------------- PROVINSI ---------------
export async function getProvinsi(): Promise<WilayahProvinsi[]> {
  return fetchWilayah<WilayahProvinsi[]>("provinces.json", "provinces");
}

// --------------- KABUPATEN/KOTA ---------------
export async function getKabupaten(idProvinsi: string): Promise<WilayahKabupaten[]> {
  const data = await fetchWilayah<Array<{ id: string; name: string }>>(`regencies/${idProvinsi}.json`, `regencies_${idProvinsi}`);
  return data.map(d => ({ id: d.id, name: d.name, province_id: idProvinsi }));
}

// --------------- KECAMATAN ---------------
export async function getKecamatan(idKabupaten: string): Promise<WilayahKecamatan[]> {
  const data = await fetchWilayah<Array<{ id: string; name: string }>>(`districts/${idKabupaten}.json`, `districts_${idKabupaten}`);
  return data.map(d => ({ id: d.id, name: d.name, regency_id: idKabupaten }));
}

// --------------- KELURAHAN/DESA ---------------
export async function getKelurahan(idKecamatan: string): Promise<WilayahKelurahan[]> {
  const data = await fetchWilayah<Array<{ id: string; name: string }>>(`villages/${idKecamatan}.json`, `villages_${idKecamatan}`);
  return data.map(d => ({ id: d.id, name: d.name, district_id: idKecamatan }));
}