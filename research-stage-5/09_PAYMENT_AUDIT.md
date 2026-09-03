# 09_PAYMENT_AUDIT

## PAYMENT AUDIT — JOGJADOELAN

### Metode Pembayaran

| Metode | Customer Flow | Admin Flow | Validasi | Database | Bukti |
|---|---|---|---|---|---|
| Transfer Bank | Customer pilih bank → Upload bukti transfer → Status: MENUNGGU_PEMBAYARAN | Admin lihat bukti bayar → Verifikasi/Tolak | Manual oleh admin (cek gambar bukti bayar) | `payment` model: `metode=TRANSFER`, `bankKey=BCA/BNI/BRI/MANDIRI` | `app/(customer)/pembayaran/transfer-bank/`, `app/api/order/[id]/bayar/route.ts` |
| QRIS | Customer lihat QR code → Upload bukti bayar → Status: MENUNGGU_PEMBAYARAN | Admin lihat bukti bayar → Verifikasi/Tolak | Manual oleh admin (cek gambar bukti bayar) | `payment` model: `metode=QRIS` | `app/(customer)/pembayaran/qris/`, `app/api/qris/route.ts` |
| DP (Custom Order) | Customer bayar DP → Upload bukti → Status: MENUNGGU_VERIFIKASI_DP | Admin verifikasi DP | Manual oleh admin | `payment` model: `type=DP`, `customOrderId` | `app/api/custom/[id]/pay/route.ts` |
| Pelunasan (Custom Order) | Customer bayar sisa → Upload bukti → Status: MENUNGGU_VERIFIKASI_PELUNASAN | Admin verifikasi pelunasan | Manual oleh admin | `payment` model: `type=PELUNASAN`, `customOrderId` | `app/api/custom/[id]/pay/route.ts` |
| Full Payment (Custom Order) | Customer bayar full → Upload bukti → Status: MENUNGGU_VERIFIKASI_LUNAS | Admin verifikasi | Manual oleh admin | `payment` model: `type=FULL`, `customOrderId` | `app/api/custom/[id]/pay/route.ts` |

### Bank yang Didukung

**Bukti:** `prisma/schema.prisma:892-897` enum `order_bankKey`:
- BCA
- BNI
- BRI
- MANDIRI

**Konfigurasi Bank:** `prisma/schema.prisma:68-78` model `bank`:
- `keyUnik` (unique)
- `nama`
- `noRek`
- `anNama` (atas nama)
- `color`
- `logoPath`
- `urutan`
- `aktif`

### QRIS Configuration

**Bukti:** `prisma/schema.prisma:492-498` model `qrisconfig`:
- `merchantName` (default: "Jogjadoelan QRIS")
- `qrPath` (path ke gambar QR code)
- `aktif`

### Payment Validation Flow

```
Customer Upload Bukti Bayar
    ↓
API: POST /api/order/[id]/bayar (multipart/form-data)
    - Validasi: ada file gambar
    - Simpan: buktiBayar path, buktiBayarAt
    - Status: MENUNGGU_PEMBAYARAN → MENUNGGU_KONFIRMASI (via timeline)
    ↓
Admin Lihat di /admin/validasi-bukti
    - GET /api/admin/order (filter: menunggu_konfirmasi)
    - Detail: /admin/penjualan/[id]
    - Lihat gambar bukti bayar
    ↓
Admin Verifikasi:
    - POST /api/admin/order/[id]/actions (action: verify)
    - Status: MENUNGGU_KONFIRMASI → DIPROSES
    - Audit log: ORDER_CONFIRM_PAYMENT
    - Notifikasi: email + WA ke customer
    ↓
Atau Admin Tolak:
    - POST /api/admin/order/[id]/actions (action: reject)
    - Status: kembali ke MENUNGGU_PEMBAYARAN
    - Audit log: ORDER_REJECT_PAYMENT
    - Notifikasi: email + WA penolakan ke customer
```

### Payment for Custom Orders

```
Customer Bayar DP/Full/Pelunasan
    ↓
API: POST /api/custom/[id]/pay (multipart/form-data)
    - Input: type (DP/FULL/PELUNASAN), bukti bayar, nama pengirim, bank, no rek
    - Simpan di tabel payment
    ↓
Admin Verifikasi:
    - POST /api/admin/custom/[id]/action (action: verify-payment)
    - Status berubah sesuai type pembayaran
    - Audit log
    ↓
Pelunasan:
    - Customer bayar sisa → POST /api/custom/[id]/pay (type: PELUNASAN)
    - Admin verifikasi → Status: SELESAI
```

### Payment Database Schema

**Model `payment`:**
```prisma
model payment {
  id            String
  orderId       String?          // untuk order reguler
  customOrderId String?          // untuk custom order
  type          payment_type     // FULL | DP | PELUNASAN
  metode        payment_metode   // TRANSFER | QRIS
  bankKey       payment_bankKey? // BCA | BNI | BRI | MANDIRI
  nominal       Int
  buktiPath     String           // path gambar bukti bayar
  pengirimNama  String
  pengirimBank  String?
  pengirimNoRek String?
  jamTransfer   DateTime
  status        payment_status   // PENDING | VERIFIED | REJECTED
  verifiedAt    DateTime?
  verifiedById  String?
  alasanTolak   Text?
  createdAt     DateTime
}
```

### Payment Expiry

**Bukti:** `app/api/cron/expire-orders/route.ts`:
- Order unpaid expire setelah 24 jam
- Cron job otomatis membatalkan order yang belum dibayar
- Stock dikembalikan
- Voucher dikembalikan (jika digunakan)

### TIDAK DITEMUKAN

| Metode | Status | Keterangan |
|---|---|---|
| Payment Gateway (Midtrans/Xendit) | NOT FOUND | Tidak ada integrasi payment gateway |
| Virtual Account | NOT FOUND | Tidak ada |
| Credit Card | NOT FOUND | Tidak ada |
| E-Wallet (GoPay, OVO, Dana) | NOT FOUND | Tidak ada |
| COD (Cash on Delivery) | NOT FOUND | Tidak ada |
| Auto-verification (OCR) | NOT FOUND | Verifikasi 100% manual oleh admin |

---

> Semua data di atas bersumber dari: source code, Prisma schema, API routes, dan komponen UI
