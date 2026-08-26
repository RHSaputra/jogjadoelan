// lib/api/custom-schemas.ts
// Zod schemas untuk Custom Order API.
// Mirror dari `CustomOrderForm` di lib/custom-order-context.tsx,
// tapi `referensiFiles` (dataURL) DIGANTI `referensiPaths` (string[])
// karena file di-upload dulu via /api/admin/upload sub=custom atau /api/upload.

import { z } from "zod/v4";

export const WarnaItemSchema = z.object({
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "HEX warna tidak valid"),
  nama: z.string().trim().max(40).optional(),
  sumber: z.enum(["preset", "custom"]),
});

export const CustomOrderInputSchema = z.object({
  jenis: z.string().trim().min(1).max(40),
  ukuran: z.string().trim().min(1).max(20),
  finishing: z.string().trim().max(40).optional().nullable(),
  strap: z.string().trim().max(40).optional().nullable(),
  motifBusa: z.string().trim().max(40).optional().nullable(),
  bahan: z.string().trim().max(40).optional().nullable(),
  aksesoris: z.string().trim().max(40).optional().nullable(),
  warnaList: z.array(WarnaItemSchema).min(1).max(5),
  warnaCatatan: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  referensiPaths: z.array(z.string().trim().min(1)).max(10).default([]),
});
export type CustomOrderInput = z.infer<typeof CustomOrderInputSchema>;

/** Admin set estimasi */
export const EstimasiItemSchema = z.object({
  label: z.string().trim().min(1).max(80),
  sub: z.string().trim().max(120).default(""),
  harga: z.number().int().nonnegative(),
  hari: z.number().int().nonnegative(),
});

export const SetEstimasiSchema = z.object({
  items: z.array(EstimasiItemSchema).min(1),
  total: z.number().int().positive(),
  tanggalMulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tanggalSelesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  catatan: z.string().trim().max(1000).optional().nullable(),
});
export type SetEstimasiInput = z.infer<typeof SetEstimasiSchema>;

/** Referensi upload (admin tambah foto referensi setelah order dibuat) */
export const AddReferensiSchema = z.object({
  paths: z.array(z.string().trim().min(1)).min(1).max(10),
});

export const RemoveReferensiSchema = z.object({
  path: z.string().trim().min(1),
});