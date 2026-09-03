# 03_CUSTOMER_FLOW

## CUSTOMER_FLOW — JOGJADOELAN

### ALUR UTAMA (Main Flow)

```
Homepage
    ↓
Login/Register (opsional, bisa browse tanpa login)
    ↓
Katalog/Belanja → Pencarian → Filter/Sort
    ↓
Detail Produk (gambar, spesifikasi, ukuran, rating, ulasan)
    ↓
Tambah ke Keranjang (pilih ukuran, warna)
    ↓
Keranjang (update qty, hapus item, merge guest-to-user)
    ↓
Checkout (pilih alamat, kalkulasi ongkir via Biteship, voucher, metode bayar)
    ↓
Pembayaran (Transfer Bank / QRIS → upload bukti bayar)
    ↓
Order Dibuat (status: MENUNGGU_PEMBAYARAN, expired 24 jam)
    ↓
Admin Validasi Pembayaran → Status: MENUNGGU_KONFIRMASI
    ↓
Admin Konfirmasi → Status: DIPROSES
    ↓
Admin Proses & Kirim → Status: DIKIRIM (dengan no resi)
    ↓
Customer Terima → Konfirmasi Diterima → Status: SELESAI
    ↓
Beri Ulasan (rating + komentar + foto)
```

### ALUR CUSTOM ORDER

```
Halaman Custom Order (/custom)
    ↓
Multi-step Form:
  - Pilih jenis helm
  - Pilih ukuran
  - Pilih warna (preset + custom hex)
  - Pilih finishing, strap, motif busa, bahan, aksesoris
  - Upload referensi gambar
  - Catatan tambahan
    ↓
Submit → Status: SUBMITTED
    ↓
Admin Set Estimasi (harga + timeline) → Status: ESTIMATED
    ↓
Customer Setuju/Tolak Estimasi
  - Setujui → Status: APPROVED
  - Tolak → Status: REJECTED
    ↓
Customer Bayar DP → Status: MENUNGGU_VERIFIKASI_DP
    ↓
Admin Verifikasi DP → Status: DIPROSES
    ↓
Admin Update Progress (tahap pengerjaan + foto)
    ↓
Admin Konfirmasi Selesai → Status: SIAP_DILUNASI
    ↓
Customer Bayar Pelunasan → Status: MENUNGGU_VERIFIKASI_PELUNASAN
    ↓
Admin Verifikasi Pelunasan → Status: SELESAI
```

### ALUR PEMBAYARAN DP/PELUNASAN

```
Customer Pilih Order DP
    ↓
Halaman Pelunasan → Lihat sisa yang harus dibayar
    ↓
Upload Bukti Bayar (Transfer Bank / QRIS)
    ↓
Status: MENUNGGU_VERIFIKASI_DP / MENUNGGU_VERIFIKASI_PELUNASAN
    ↓
Admin Verifikasi → Status berubah sesuai
```

### ALUR KOMPLAIN

```
Halaman Komplain (/komplain)
    ↓
Buat Komplain Baru:
  - Pilih order
  - Pilih jenis: Produk Tidak Sesuai / Cacat / Pengiriman Terlambat / dll
  - Pilih tindakan: Refund / Tukar / Komplain Saja
  - Upload foto bukti
  - Deskripsi
    ↓
Status: BARU
    ↓
Admin Review → Status: DITINJAU
  - Terima → Status: DISETUJUI
  - Tolak → Status: DITOLAK
    ↓
Customer Isi Form Refund/Tukar (jika diperlukan)
    ↓
Chat dengan admin via real-time
    ↓
Proses refund/tukar hingga selesai
```

### ALUR REFUND

```
Komplain Disetujui → Pilih Refund
    ↓
Isi Form Rekening Bank (nama bank, atas nama, no rek)
    ↓
Status: MENUNGGU_REVIEW_ADMIN
    ↓
Admin Approve → Status: MENUNGGU_PENGIRIMAN_BALIK
    ↓
Customer Kirim Barang Balik → Upload bukti kirim
    ↓
Status: DIKIRIM_BALIK
    ↓
Admin Konfirmasi Terima → Status: DITERIMA_ADMIN
    ↓
Admin Transfer Refund → Upload bukti transfer
    ↓
Status: TRANSFER_DIKIRIM
    ↓
Customer Konfirmasi → Status: SELESAI
```

### ALUR TUKAR

```
Komplain Disetujui → Pilih Tukar
    ↓
Pilih Varian Baru (ukuran/warna)
    ↓
Isi Alamat Pengiriman
    ↓
Status: MENUNGGU_REVIEW_ADMIN
    ↓
Admin Approve → Status: MENUNGGU_PENGIRIMAN_BALIK
    ↓
Customer Kirim Barang Lama → Upload bukti kirim
    ↓
Status: DIKIRIM_BALIK
    ↓
Admin Terima Barang Lama → Status: DITERIMA_ADMIN
    ↓
Admin Kirim Varian Baru → No resi baru
    ↓
Status: VARIAN_BARU_DIKIRIM
    ↓
Customer Konfirmasi → Status: SELESAI
```

### ALUR CHAT SUPPORT

```
Klik Tombol Chat (floating button)
    ↓
Halaman Chat (/chat)
    ↓
Kirim Pesan → API POST /api/chat/send
    ↓
Pusher Event → Admin Dashboard (real-time)
    ↓
Admin Balas → Pusher Event → Customer (real-time)
    ↓
Typing Indicator → Pusher Presence
```

### ALUR NOTIFIKASI

```
Event Trigger (order status change, payment, etc)
    ↓
dispatchNotification(event, payload)
    ↓
Channel Config dari Sitesetting (email: on/off, whatsapp: on/off)
    ↓
Email via Resend (3x retry)
    ↓
WhatsApp via Fonnte (3x retry)
    ↓
In-App Notification → Tabel notifikasi
    ↓
Real-time → Pusher (admin notifications channel)
```

---

> Semua alur di atas direkonstruksi berdasarkan: source code, API routes, database schema, dan komponen UI
