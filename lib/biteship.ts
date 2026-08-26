// lib/biteship.ts — Biteship API Client
// Docs: https://biteship.com/id/docs/api
// Base URL: https://api.biteship.com/v1

const API_KEY = process.env.BITESHIP_API_KEY ?? "";
const BASE = "https://api.biteship.com/v1";
const ORIGIN_POSTAL = process.env.BITESHIP_ORIGIN_POSTAL ?? "55782";
const ORIGIN_LAT = parseFloat(process.env.BITESHIP_ORIGIN_LAT ?? "-7.7956");
const ORIGIN_LNG = parseFloat(process.env.BITESHIP_ORIGIN_LNG ?? "110.3695");

// --------------- TYPES ---------------
export interface BiteshipArea {
  id: string;
  name: string;
  type: string; // "province" | "city" | "district" | "subdistrict"
  postal_code: string;
  country_name: string;
  country_code: string;
  administrative_division_level_1_name: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_3_name?: string;
}

export interface BiteshipCourierRate {
  courier: string;
  courier_name: string;
  courier_code: string;
  courier_service_name: string;
  courier_service_code: string;
  duration: string;
  shipment_duration_range: string;
  shipment_duration_unit: string;
  price: number;
  currency: string;
  service_type: string;
  description: string;
  note?: string;
}

export interface BiteshipRatesResponse {
  success: boolean;
  message: string;
  object: string;
  origin: Record<string, unknown>;
  destination: Record<string, unknown>;
  pricing: BiteshipCourierRate[];
}

export interface BiteshipAreaResponse {
  success: boolean;
  message: string;
  areas: BiteshipArea[];
}

// --------------- COURIER CODES ---------------
// Hanya J&T Express — satu-satunya ekspedisi yang digunakan
export const BITESHIP_COURIERS: Record<string, string> = {
  jnt: "J&T Express",
};

// --------------- CORE FETCH ---------------
async function fetchBS<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string> ?? {}) }, signal: AbortSignal.timeout(15000) });
  const json = await res.json();

  if (!res.ok) {
    const errMsg = json?.message ?? json?.error ?? `HTTP ${res.status}`;
    throw new Error(`Biteship ${res.status}: ${errMsg}`);
  }
  return json as T;
}

// --------------- AREA SEARCH ---------------
/**
 * Cari area (kota/kecamatan) berdasarkan keyword.
 * Endpoint: GET /maps/areas?countries=ID&input=keyword&type=single
 */
export async function searchAreas(keyword: string): Promise<BiteshipArea[]> {
  if (keyword.trim().length < 2) return [];
  const params = new URLSearchParams({
    countries: "ID",
    input: keyword.trim(),
    type: "single",
  });
  try {
    const data = await fetchBS<BiteshipAreaResponse>(`/maps/areas?${params.toString()}`);
    if (!data.success) throw new Error(data.message);
    return data.areas ?? [];
  } catch {
    throw new Error("Gagal mencari area tujuan");
  }
}

// --------------- GET RATES ---------------
export interface RatesRequest {
  /** Postal code tujuan */
  destinationPostalCode: string;
  /** List kode kurir: jnt */
  couriers: string[];
  /** Items dengan berat (gram) */
  items: Array<{ weight: number; quantity: number; value: number }>;
  /** Latitude tujuan */
  destinationLat?: number;
  /** Longitude tujuan */
  destinationLng?: number;
}

export async function getRates(params: RatesRequest): Promise<BiteshipCourierRate[]> {
  const body: Record<string, unknown> = {
    origin_postal_code: ORIGIN_POSTAL,
    destination_postal_code: params.destinationPostalCode,
    couriers: params.couriers.join(","),
    items: params.items,
  };

  // Origin coordinates always included for better accuracy
  body.origin_latitude = ORIGIN_LAT;
  body.origin_longitude = ORIGIN_LNG;

  // Destination coordinates jika ada
  if (params.destinationLat !== undefined && params.destinationLng !== undefined) {
    body.destination_latitude = params.destinationLat;
    body.destination_longitude = params.destinationLng;
  }

  try {
    const data = await fetchBS<BiteshipRatesResponse>("/rates/couriers", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!data.success) throw new Error(data.message);
    return data.pricing ?? [];
  } catch {
    throw new Error("Gagal menghitung ongkos kirim");
  }
}