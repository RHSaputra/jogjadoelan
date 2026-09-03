# 05_CUSTOM_ORDER_AUDIT

## CUSTOM ORDER AUDIT — JOGJADOELAN

### 1. Halaman Custom Order

**Bukti:** `app/(customer)/custom/page.tsx`, `app/(customer)/custom/[id]/page.tsx`, `app/(customer)/custom/riwayat/page.tsx`, `app/(customer)/custom/detail/page.tsx`, `app/(customer)/custom/dp/page.tsx`, `app/(customer)/custom/estimasi/page.tsx`

**Status:** IMPLEMENTED

### 2. Komponen Konfigurasi

**Bukti:** `lib/custom-order-context.tsx` (React Context), `lib/custom-order-helpers.ts` (utility functions), `app/admin/toko/custom/page.tsx` (admin konfigurasi form)

**Status:** IMPLEMENTED

### 3. Pilihan Bahan

**Bukti:** `lib/custom-order-context.tsx` baris `CustomOrderForm.bahan`, `prisma/schema.prisma:149` model `customorder` field `bahan`

**Status:** IMPLEMENTED

### 4. Pilihan Komponen

**Bukti:** `prisma/schema.prisma:146-150` fields: `finishing`, `strap`, `motifBusa`, `bahan`, `aksesoris`

**Status:** IMPLEMENTED

### 5. Pilihan Warna

**Bukti:** `prisma/schema.prisma:151` field `warnaList` (Json), `lib/custom-order-context.tsx` type `WarnaItem` dengan `{hex, name, source}` (preset + custom)

**Status:** IMPLEMENTED

### 6. Pilihan Desain/Referensi

**Bukti:** `prisma/schema.prisma:154` field `referensiPaths` (Json), upload referensi via `app/api/upload/`

**Status:** IMPLEMENTED

### 7. Data Konfigurasi

**Bukti:** `prisma/schema.prisma:140-172` model `customorder`:
- `jenis` (String)
- `ukuran` (String)
- `finishing` (String?)
- `strap` (String?)
- `motifBusa` (String?)
- `bahan` (String?)
- `aksesoris` (String?)
- `warnaList` (Json)
- `warnaCatatan` (Text?)
- `notes` (Text?)
- `referensiPaths` (Json)

**Status:** IMPLEMENTED

### 8. Harga

**Bukti:** `prisma/schema.prisma:163` field `hargaFinal` (Int?), admin input harga via `SetEstimasiSchema` (`lib/api/custom-schemas.ts`)

**Status:** IMPLEMENTED

### 9. Estimasi

**Bukti:** `prisma/schema.prisma:156-157` fields `estimasi` (Json?), `estimasiTanggal` (Json?), admin set estimasi via `POST /api/admin/custom/[id]/action` (action: set-estimasi)

**Status:** IMPLEMENTED

### 10. DP (Down Payment)

**Bukti:** `prisma/schema.prisma:164` field `dpAmount` (Int?), `customorder_paymentType` enum: DP | LUNAS, customer bayar DP via `POST /api/custom/[id]/pay`

**Status:** IMPLEMENTED

### 11. Status Pengerjaan

**Bukti:** `prisma/schema.prisma:712-729` enum `customorder_status` dengan 17 status:
- DRAFT, SUBMITTED, ESTIMATED, APPROVED, REJECTED
- MENUNGGU_ESTIMASI, MENUNGGU_PERSETUJUAN, MENUNGGU_PEMBAYARAN
- MENUNGGU_VERIFIKASI_DP, MENUNGGU_VERIFIKASI_LUNAS, MENUNGGU_VERIFIKASI_PELUNASAN
- DIPROSES, SIAP_DILUNASI, DIKIRIM, SELESAI, DIBATALKAN

**Status:** IMPLEMENTED

### 12. Progres

**Bukti:** `prisma/schema.prisma:174-187` model `customprogress`:
- `tahap` (String)
- `deskripsi` (Text?)
- `fotoPath` (Text?)
- `byAdminId` (String?)
- `createdAt` (DateTime)

**Status:** IMPLEMENTED

### 13. Verifikasi

**Bukti:** Admin verifikasi pembayaran via `POST /api/admin/custom/[id]/action` (action: verify-payment), customer approve estimasi via `POST /api/custom/[id]/approve`

**Status:** IMPLEMENTED

### 14. Pelunasan

**Bukti:** `prisma/schema.prisma:165` field `sisaAmount` (Int?), customer bayar pelunasan via `POST /api/custom/[id]/pay` dengan type PELUNASAN, halaman `/custom/dp`

**Status:** IMPLEMENTED

### 15. Notifikasi

**Bukti:** Email notifikasi via `lib/notification-dispatcher.ts` (event: order-created, payment-success, order-shipped, order-completed), In-app notification via `app/api/notifikasi/`

**Status:** IMPLEMENTED

### 16. Komunikasi

**Bukti:** Chat komplain terintegrasi di `app/(customer)/komplain/[id]/` dengan real-time via Pusher (`private-komplain-{komplainId}` channel)

**Status:** IMPLEMENTED

### 17. Database Model

**Bukti:** `prisma/schema.prisma:140-172` model `customorder`, `prisma/schema.prisma:174-187` model `customprogress`

**Status:** IMPLEMENTED

### 18. API Endpoints

**Bukti:**
- `GET/POST /api/custom` — List/Create custom orders
- `GET /api/custom/[id]` — Detail custom order
- `POST /api/custom/[id]/approve` — Customer approve estimasi
- `POST /api/custom/[id]/reject` — Customer reject estimasi
- `POST /api/custom/[id]/pay` — Customer bayar DP/pelunasan/lunas
- `POST /api/custom/[id]/konfirmasi` — Admin konfirmasi pembayaran
- `POST /api/custom/[id]/konfirmasi-terima` — Customer konfirmasi terima
- `POST /api/custom/[id]/cancel` — Customer cancel
- `GET /api/admin/custom` — Admin list
- `POST /api/admin/custom/[id]/action` — Admin actions (set-estimasi, verify-payment, ship)
- `PUT /api/admin/custom/[id]/referensi` — Admin update referensi

**Status:** IMPLEMENTED

### 19. Admin Interface

**Bukti:** `app/admin/custom/page.tsx` (list), `app/admin/custom/[id]/page.tsx` (detail dengan estimasi, progress, verifikasi)

**Status:** IMPLEMENTED

### CUSTOM ORDER FLOW (Lengkap)

```
Customer → Konfigurasi Helm (multi-step form)
    ↓
Submit → Status: SUBMITTED
    ↓
Admin Set Estimasi (harga + DP + estimasi tanggal) → Status: ESTIMATED
    ↓
Customer Setuju Estimasi → Status: APPROVED
    ↓
Customer Bayar DP → Status: MENUNGGU_VERIFIKASI_DP
    ↓
Admin Verifikasi DP → Status: DIPROSES
    ↓
Admin Update Progress (tahap + foto) → customprogress records
    ↓
Admin Set Selesai → Status: SIAP_DILUNASI
    ↓
Customer Bayar Pelunasan → Status: MENUNGGU_VERIFIKASI_PELUNASAN
    ↓
Admin Verifikasi Pelunasan → Status: SELESAI
    ↓
Atau: Customer Konfirmasi Terima → Status: SELESAI
```

### ALTERNATIF: LUNAS (Tanpa DP)

```
Customer Pilih Pembayaran LUNAS
    ↓
Bayar Full → Status: MENUNGGU_VERIFIKASI_LUNAS
    ↓
Admin Verifikasi → Status: DIPROSES
    ↓
Sama seperti alur di atas
```

### ALTERNATIF: DITOLAK/DIBATALKAN

```
Customer Tolak Estimasi → Status: REJECTED
Customer Cancel → Status: DIBATALKAN
Admin Tolak → Status: REJECTED
```

---

> Semua data di atas bersumber dari: source code, Prisma schema, API routes, dan komponen UI
