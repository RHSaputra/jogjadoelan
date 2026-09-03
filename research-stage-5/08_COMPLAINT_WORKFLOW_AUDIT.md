# 08_COMPLAINT_WORKFLOW_AUDIT

## COMPLAINT/REFUND/RETURN WORKFLOW AUDIT — JOGJADOELAN

### Overview

Sistem Jogjadoelan memiliki alur komplain, refund, tukar, dan return yang terintegrasi. Komplain menjadi entry point, kemudian customer memilih tindakan: Refund, Tukar, atau Komplain Saja.

### Database Models

| Model | Fungsi | Bukti |
|---|---|---|
| `komplain` | Entitas utama komplain | `prisma/schema.prisma:241-272` |
| `refund` | Data refund (terhubung ke komplain) | `prisma/schema.prisma:500-533` |
| `tukar` | Data tukar (terhubung ke komplain) | `prisma/schema.prisma:541-582` |
| `chatsupportmessage` | Chat dalam komplain | `prisma/schema.prisma:125-138` |

### Komplain

**Status:** IMPLEMENTED

**Jenis Komplain** (`komplain_jenis` enum):
- PRODUK_TIDAK_SESUAI
- PRODUK_CACAT
- PENGIRIMAN_TERLAMBAT
- BARANG_TIDAK_SAMPAI
- ALAMAT_SALAH
- DOUBLE_CHARGE
- REFUND_LAMA
- METODE_PEMBAYARAN_ERROR
- PENOLAKAN_RETURN
- ONGKIR_RETURN_MAHAL
- BARANG_PENGGANTI_LAMA
- INGIN_UBAH_PESANAN
- INGIN_BATAL_PESANAN
- LAINNYA

**Tindakan** (`komplain_tindakan` enum):
- REFUND
- TUKAR
- KOMPLAIN_SAJA

**Status Komplain** (`komplain_status` enum):
- BARU → DITINJAU → DISETUJUI / DITOLAK
- MENUNGGU_REVIEW_ADMIN → MENUNGGU_BALIKAN → DIPROSES → BERHASIL
- DIBATALKAN

**Eligibility Logic:** `lib/komplain-eligibility.ts`
- REFUND/TUKAR: Barang harus diterima + within 72 jam dari konfirmasi diterima
- KOMPLAIN_SAJA: Selalu diizinkan kecuali ada komplain aktif atau komplain berhasil sebelumnya
- Appeal limit: 1x rejection = appeal exhausted

**Customer Pages:**
- `/komplain` — Daftar komplain
- `/komplain/baru` — Form buat komplain baru
- `/komplain/[id]` — Detail komplain + chat real-time

**Admin Pages:**
- `/admin/komplain` — Daftar komplain (filter tab/status)
- `/admin/komplain/[id]` — Detail komplain + accept/reject + chat

**API Endpoints:**
- `GET/POST /api/komplain` — List/Create
- `GET /api/komplain/[id]` — Detail
- `POST /api/komplain/[id]/cancel` — Cancel
- `POST /api/komplain/[id]/chat` — Kirim chat
- `POST /api/komplain/[id]/typing` — Typing indicator
- `GET /api/admin/komplain` — Admin list
- `POST /api/admin/komplain/[id]/accept` — Accept
- `POST /api/admin/komplain/[id]/reject` — Reject
- `POST /api/admin/komplain/[id]/chat` — Admin chat

**Chat:** Real-time via Pusher (`private-komplain-{komplainId}`)

**Upload Bukkti:** Via `POST /api/upload` (limit 5MB)

### Refund

**Status:** IMPLEMENTED

**Status Refund** (`refund_status` enum):
- MENUNGGU_REVIEW_ADMIN
- MENUNGGU_PENGIRIMAN_BALIK
- DIKIRIM_BALIK
- DITERIMA_ADMIN
- TRANSFER_DIKIRIM
- SELESAI
- DITOLAK
- DIBATALKAN

**Customer Flow:**
1. Komplain disetujui → Isi form rekening bank (nama bank, atas nama, no rek)
2. Upload bukti kirim barang balik
3. Tunggu admin verifikasi
4. Admin transfer → Customer konfirmasi diterima

**Admin Flow:**
1. Approve refund request
2. Tunggu customer kirim barang balik
3. Konfirmasi barang diterima
4. Transfer refund + upload bukti transfer

**Customer Pages:**
- `/refund` — Daftar refund
- `/refund/[komplainId]` — Form rekening bank
- `/refund/[komplainId]/sukses` — Berhasil submit
- `/refund/[komplainId]/ditolak` — Ditolak

**Admin Pages:**
- `/admin/return` → tab Refund
- `/admin/refund/[id]` — Detail refund

**API Endpoints:**
- `GET/POST /api/refund` — List/Create
- `GET /api/refund/by-komplain/[komplainId]` — By komplain
- `POST /api/refund/[id]/konfirmasi` — Customer konfirmasi
- `POST /api/refund/[id]/kirim-balik` — Customer kirim balik
- `POST /api/refund/[id]/cancel` — Cancel
- `GET /api/admin/refund` — Admin list
- `POST /api/admin/refund/[id]/approve` — Approve
- `POST /api/admin/refund/[id]/received` — Confirm received
- `POST /api/admin/refund/[id]/reject` — Reject
- `POST /api/admin/refund/[id]/transfer` — Mark transfer sent

### Tukar (Exchange)

**Status:** IMPLEMENTED

**Status Tukar** (`tukar_status` enum):
- MENUNGGU_REVIEW_ADMIN
- MENUNGGU_PENGIRIMAN_BALIK
- DIKIRIM_BALIK
- DITERIMA_ADMIN
- VARIAN_BARU_DIKIRIM
- SELESAI
- DITOLAK
- DIBATALKAN

**Customer Flow:**
1. Komplain disetujui → Pilih varian baru (ukuran/warna)
2. Isi alamat pengiriman
3. Upload bukti kirim barang lama
4. Tunggu admin kirim varian baru
5. Konfirmasi diterima

**Admin Flow:**
1. Approve tukar request
2. Tunggu customer kirim barang lama
3. Konfirmasi barang lama diterima
4. Kirim varian baru + no resi

**Customer Pages:**
- `/tukar` — Daftar tukar
- `/tukar/[komplainId]` — Form pilih varian baru
- `/tukar/[komplainId]/sukses` — Berhasil submit
- `/tukar/[komplainId]/ditolak` — Ditolak

**Admin Pages:**
- `/admin/return` → tab Tukar

**API Endpoints:**
- `GET/POST /api/tukar` — List/Create
- `GET /api/tukar/by-komplain/[komplainId]` — By komplain
- `POST /api/tukar/[id]/konfirmasi` — Customer konfirmasi
- `POST /api/tukar/[id]/kirim-balik` — Customer kirim balik
- `POST /api/tukar/[id]/cancel` — Cancel
- `GET /api/admin/tukar` — Admin list
- `POST /api/admin/tukar/[id]/approve` — Approve
- `POST /api/admin/tukar/[id]/received` — Confirm received
- `POST /api/admin/tukar/[id]/reject` — Reject
- `POST /api/admin/tukar/[id]/ship` — Ship varian baru

### Return

**Status:** IMPLEMENTED

Return diimplementasikan sebagai gabungan dari Refund dan Tukar, dengan halaman terpisah:
- `/admin/return` — Halaman admin yang menampilkan refund dan tukar dalam satu view
- `/return` — Halaman customer untuk return

### Audit Log untuk Komplain/Refund/Tukar

**Bukti:** `prisma/schema.prisma:767-802` enum `auditlog_action`:
- KOMPLAIN_ACCEPT, KOMPLAIN_REJECT, KOMPLAIN_REPLY
- REFUND_APPROVE, REFUND_RECEIVED, REFUND_TRANSFER, REFUND_REJECT
- TUKAR_APPROVE, TUKAR_RECEIVED, TUKAR_SHIP, TUKAR_REJECT

---

> Semua data di atas bersumber dari: source code, Prisma schema, API routes, dan komponen UI
