# 04_ADMIN_FLOW

## ADMIN_FLOW — JOGJADOELAN

### ALUR LOGIN ADMIN

```
Admin Akses /admin/*
    ↓
Middleware Check (role: ADMIN atau SUPER_ADMIN)
    ↓
Jika belum login → Redirect ke /admin/login
    ↓
Login dengan username + password
    ↓
NextAuth Credentials (admin-credentials provider)
    ↓
Update lastLoginAt → Redirect ke /admin/dashboard
```

### ALUR DASHBOARD

```
/admin/dashboard
    ↓
API: /api/admin/dashboard/summary
  - Revenue (today, 7d, 30d, allTime)
  - Orders (pending, diproses, dikirim, selesai)
  - Customers (new, total)
  - Urgent items (komplain baru, refund pending, tukar pending, stok rendah)
    ↓
API: /api/admin/dashboard/sales-trend
  - Grafik revenue harian (Recharts)
    ↓
API: /api/admin/dashboard/top-products
  - Produk terlaris
    ↓
API: /api/admin/dashboard/low-stock
  - Alert stok rendah
    ↓
API: /api/admin/dashboard/recent-orders
  - Pesanan terbaru
```

### ALUR KELOLA PRODUK

```
/admin/produk
    ↓
API: GET /api/admin/produk (filter: all, promo, low-stock, out-of-stock)
    ↓
List Produk → Klik untuk detail/edit
    ↓
/admin/produk/baru → Form buat produk baru
  - Upload gambar via /api/admin/upload
  - Isi: nama, jenis, kategori, harga, stok, deskripsi, spesifikasi
  - Simpan → POST /api/admin/produk
    ↓
/admin/produk/[id]/edit → Form edit produk
  - Update semua field
  - Simpan → PUT /api/admin/produk/[id]
    ↓
Stok Management → /admin/stok
  - PATCH /api/admin/produk/[id]/stok
```

### ALUR KELOLA PESANAN

```
/admin/pesanan
    ↓
API: GET /api/admin/order (filter: status, user, search)
    ↓
Klik Order → /admin/penjualan/[id]
    ↓
Validasi Pembayaran:
  - Lihat bukti bayar (gambar)
  - Klik Verifikasi → POST /api/admin/order/[id]/actions (action: verify)
  - Tolak → POST /api/admin/order/[id]/actions (action: reject)
    ↓
Proses Pesanan:
  - Set status: DIPROSES
  - Update estimasi
    ↓
Kirim Pesanan:
  - Isi no resi
  - Set status: DIKIRIM
  - Email + WA notifikasi ke customer otomatis
    ↓
Selesai:
  - Customer konfirmasi → Status: SELESAI
  - Atau auto-complete setelah 72 jam
```

### ALUR VALIDASI PEMBAYARAN

```
/admin/validasi-bukti
    ↓
Daftar bukti bayar yang menunggu verifikasi
    ↓
Klik untuk detail
  - Lihat gambar bukti bayar
  - Lihat detail order
    ↓
Setujui:
  - POST /api/admin/order/[id]/actions (action: verify)
  - Status order: MENUNGGU_KONFIRMASI → DIPROSES
  - Kirim notifikasi email + WA ke customer
    ↓
Tolak:
  - POST /api/admin/order/[id]/actions (action: reject)
  - Status order: kembali ke MENUNGGU_PEMBAYARAN
  - Kirim notifikasi penolakan
```

### ALUR CUSTOM ORDER (ADMIN)

```
/admin/custom
    ↓
API: GET /api/admin/custom (filter status)
    ↓
Klik Custom Order → /admin/custom/[id]
    ↓
Set Estimasi:
  - Input harga final, DP amount, estimasi tanggal
  - POST /api/admin/custom/[id]/action (action: set-estimasi)
    ↓
Progress Update:
  - Update tahap pengerjaan
  - Upload foto progress
  - Data tersimpan di customprogress
    ↓
Konfirmasi Pembayaran:
  - POST /api/admin/custom/[id]/action (action: verify-payment)
    ↓
Kirim:
  - Update status: DIKIRIM
  - Input no resi
```

### ALUR KOMPLAIN (ADMIN)

```
/admin/komplain
    ↓
API: GET /api/admin/komplain (filter: tab, status, search)
    ↓
Klik Komplain → /admin/komplain/[id]
    ↓
Lihat detail komplain + foto bukti
    ↓
Chat dengan customer (real-time via Pusher)
    ↓
Terima:
  - POST /api/admin/komplain/[id]/accept
  - Status: DISETUJUI
  - Customer perlu isi form refund/tukar
    ↓
Tolak:
  - POST /api/admin/komplain/[id]/reject
  - Status: DITOLAK
  - Kirim alasan penolakan
```

### ALUR REFUND (ADMIN)

```
/admin/return → tab Refund
    ↓
Klik Refund → /admin/refund/[id]
    ↓
Approve:
  - POST /api/admin/refund/[id]/approve
  - Status: MENUNGGU_PENGIRIMAN_BALIK
    ↓
Konfirmasi Barang Diterima:
  - POST /api/admin/refund/[id]/received
  - Status: DITERIMA_ADMIN
    ↓
Transfer Refund:
  - POST /api/admin/refund/[id]/transfer
  - Upload bukti transfer
  - Status: TRANSFER_DIKIRIM
    ↓
Tolak:
  - POST /api/admin/refund/[id]/reject
  - Status: DITOLAK
```

### ALUR TUKAR (ADMIN)

```
/admin/return → tab Tukar
    ↓
Klik Tukar → Detail
    ↓
Approve:
  - POST /api/admin/tukar/[id]/approve
  - Status: MENUNGGU_PENGIRIMAN_BALIK
    ↓
Konfirmasi Barang Lama Diterima:
  - POST /api/admin/tukar/[id]/received
  - Status: DITERIMA_ADMIN
    ↓
Kirim Varian Baru:
  - POST /api/admin/tukar/[id]/ship
  - Input no resi, kurir
  - Status: VARIAN_BARU_DIKIRIM
    ↓
Tolak:
  - POST /api/admin/tukar/[id]/reject
  - Status: DITOLAK
```

### ALUR BROADCAST

```
/admin/broadcast
    ↓
Pilih channel: WA / Email / In-App / Hybrid
    ↓
Pilih target: Semua / Aktif / Custom
    ↓
Input pesan dengan template variables {nama}, {nomor}, {email}
    ↓
Preview → Kirim
    ↓
Background runner:
  - Proses queue satu per satu
  - Delay 2.5 detik antar pesan (WA)
  - Pause/Resume/Cancel support
  - Retry otomatis
  - Status: PENDING → PROCESSING → COMPLETED
```

### ALUR AUDIT LOG

```
/admin/audit
    ↓
API: GET /api/admin/audit (filter: admin, action, entity, date)
    ↓
Tampilkan log aktivitas admin:
  - Order actions (confirm, reject, ship, deliver, cancel)
  - Produk (create, update, delete, stok adjust)
  - Komplain (accept, reject, reply)
  - Refund/Tukar (approve, received, transfer, reject)
  - Ulasan (hide, unhide, delete)
  - Broadcast
  - Chat
    ↓
Clear All → DELETE /api/admin/audit
```

---

> Semua alur di atas direkonstruksi berdasarkan: source code, API routes, database schema, dan komponen UI
