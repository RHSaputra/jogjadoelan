# 17_RESEARCH_DATA

## RESEARCH_DATA — JOGJADOELAN

---

### A. System Profile

| Atribut | Nilai | Sumber |
|---|---|---|
| Nama Sistem | Jogjadoelan | `package.json`, `README.md` |
| Tipe | E-commerce UMKM | `README.md` |
| Target Produk | Helm custom | Source code analysis |
| Framework | Next.js 16.2.4 (App Router) | `package.json:26` |
| Frontend | React 19.2.4, TypeScript 5, Tailwind CSS 4 | `package.json` |
| Backend | Next.js API Routes (168+ endpoints) | `app/api/` |
| Database | MySQL/MariaDB via Prisma 7.8.0 | `prisma/schema.prisma` |
| Authentication | NextAuth v5 (Credentials + Google OAuth) | `lib/auth.ts` |
| Real-time | Pusher Channels | `lib/pusher-server.ts` |
| Email | Resend | `lib/email/provider.ts` |
| WhatsApp | Fonnte API | `lib/whatsapp.ts` |
| Shipping | Biteship API (J&T Express) | `lib/biteship.ts` |
| Storage | Vercel Blob | `package.json:20` |
| Deployment | Vercel (implied) | `README.md` |
| Jumlah Models | 38 Prisma models | `prisma/schema.prisma` |
| Jumlah API Routes | 168+ route files | `app/api/` |
| Jumlah Customer Pages | 58 pages | `app/(customer)/` |
| Jumlah Admin Pages | 45 pages | `app/admin/` |
| Jumlah Lib Files | 76 files | `lib/` |

---

### B. Feature Inventory

#### Customer Features (39 fitur terimplementasi)
1. Homepage, Katalog, Pencarian, Filter/Sort
2. Detail Produk, Promo
3. Keranjang (Cart), Wishlist
4. Checkout (alamat, ongkir Biteship, voucher, metode bayar)
5. Pembayaran Transfer Bank, QRIS
6. Pelunasan (DP)
7. Pesanan (Order History), Tracking, Konfirmasi Diterima
8. Custom Order (multi-step form, estimasi, DP, pelunasan, progress)
9. Komplain (dengan chat real-time)
10. Refund, Tukar, Return
11. Ulasan/Review (rating + foto)
12. Chat Support (real-time via Pusher)
13. Notifikasi In-App
14. Profil, Alamat, Voucher Saya, Ulasan Saya
15. Login, Register, Lupa Password (Google OAuth)
16. Lokasi Toko, Kontak, FAQ, Tentang, Syarat, Privasi, Kebijakan

#### Admin Features (34 fitur terimplementasi)
1. Dashboard (KPI, revenue, orders, customers, urgent items)
2. TIC (Financial summary, transaction list, charts)
3. Produk (CRUD, gambar, varian)
4. Stok (adjustment)
5. Pesanan (list, filter, detail)
6. Validasi Pembayaran (verifikasi bukti bayar)
7. Custom Order (estimasi, progress, verifikasi)
8. Komplain (accept/reject, chat)
9. Refund (approve, received, transfer)
10. Tukar (approve, received, ship)
11. Ulasan (list, hide/unhide, balas)
12. Pelanggan
13. Chat (real-time rooms)
14. Broadcast (multi-channel: WA, email, in-app, hybrid)
15. Laporan
16. Audit Log
17. Bank, Ekspedisi, QRIS
18. Pengaturan, FAQ, Landing Page CMS, Cabang, Jam Operasional, Footer CMS
19. Tampilan/Branding
20. Promo/Voucher
21. Notifikasi (settings + logs)
22. Kasir/POS
23. Login, Lupa Password, Profil Admin

---

### C. Customer Flow

```
Homepage → Login/Register → Katalog → Detail Produk → Cart → Checkout → Pembayaran → Order → Tracking → Selesai → Ulasan
```

Alur alternatif:
- Guest browsing (tanpa login)
- Custom order (multi-step)
- Komplain → Refund/Tukar
- Chat support

---

### D. Admin Flow

```
Login Admin → Dashboard → Kelola Produk → Kelola Pesanan → Validasi Pembayaran → Proses Pesanan → Update Status → Notifikasi
```

Alur alternatif:
- TIC (analisis keuangan)
- Custom order management
- Komplain/Refund/Tukar management
- Broadcast
- Audit log

---

### E. Custom Order

**Database Model:** `customorder` + `customprogress`

**Status Flow:**
DRAFT → SUBMITTED → ESTIMATED → APPROVED → MENUNGGU_PEMBAYARAN → MENUNGGU_VERIFIKASI_DP → DIPROSES → SIAP_DILUNASI → MENUNGGU_VERIFIKASI_PELUNASAN → SELESAI

**Konfigurasi:**
- Jenis helm
- Ukuran
- Warna (preset + custom hex)
- Finishing, Strap, Motif Busa, Bahan, Aksesoris
- Referensi gambar
- Catatan

**Pembayaran:**
- DP (Down Payment) atau Full Payment
- Pelunasan

**Progress:**
- Tahap pengerjaan
- Deskripsi
- Foto progress
- Oleh admin

---

### F. Payment

**Metode:**
- Transfer Bank (BCA, BNI, BRI, Mandiri)
- QRIS

**Flow:**
1. Customer upload bukti bayar
2. Admin verifikasi manual
3. Status berubah (VERIFIED/REJECTED)
4. Notifikasi ke customer

**Custom Order Payment:**
- DP → Verifikasi → Proses → Pelunasan → Verifikasi → Selesai

---

### G. Notification

**Channels:**
- Email (Resend) — 30+ template
- WhatsApp (Fonnte) — 7 template transaksional
- In-App (database `notifikasi`)
- Real-time (Pusher — admin notifications, chat, typing)

**Events:**
- registrasi, otp, order-created, payment-success, order-processing, order-shipped, order-completed, forgot-password

**Configuration:**
- Per-event channel config (email on/off, whatsapp on/off)
- Admin dapat mengatur melalui /admin/notifikasi

**Logging:**
- `notificationlog` — semua pengiriman tercatat
- `emaillog` — log email
- `whatsapptransactional` — log WA transaksional

---

### H. Complaint/Refund/Return

**Komplain:**
- 14 jenis komplain
- 3 tindakan: Refund, Tukar, Komplain Saja
- Chat real-time dengan admin
- Eligibility logic (72 jam warranty, appeal limit)

**Refund:**
- Form rekening bank
- Kirim barang balik
- Admin approve → terima → transfer
- Customer konfirmasi

**Tukar:**
- Pilih varian baru
- Kirim barang lama
- Admin approve → terima → kirim varian baru
- Customer konfirmasi

---

### I. TIC (Transaction Intelligence Center)

**Fungsi:** Analisis keuangan untuk admin

**Data:**
- Order stats (total, selesai, pending, diproses, dikirim, dibatalkan, kadaluarsa)
- Custom order stats
- Payment stats (verified payments)
- Refund stats

**Perhitungan:**
- Gross Revenue = SUM(order.total)
- Net Revenue = Gross Revenue - Total Refund
- Gross Profit = Gross Revenue - Ongkir - Biaya Packing
- Net Profit = Gross Profit - Total Refund
- Refund Ratio = (Total Refund / Gross Revenue) x 100
- Cancellation Ratio = (Dibatalkan / Total Orders) x 100
- Profit Margin = (Net Profit / Gross Revenue) x 100

**Access:** Hanya admin

---

### J. Database

**38 Models:**

| Kategori | Models |
|---|---|
| User | user, adminuser, alamat, verificationtoken |
| Produk | produk, produkimage, produkvarian |
| Order | order, orderitem, ordertimeline, payment |
| Custom | customorder, customprogress |
| Cart/Wishlist | cartitem, wishlistitem |
| Komplain | komplain, refund, tukar |
| Review | ulasan |
| Chat | chatsupportmessage |
| Notification | notifikasi, notificationlog, emaillog |
| Broadcast | broadcast, whatsappbroadcast, whatsappbroadcastlog, whatsapptransactional |
| Config | sitesetting, bank, ekspedisi, qrisconfig, voucher, voucherusage |
| Audit | auditlog |
| Lainnya | faq, instruksipembayaran, cabang, liburitem |

---

### K. Prototype Evidence

**Tersedia:**
- README.md (dokumentasi teknis)
- Git history
- Comment di source code tentang "Phase 3 DB migration"

**TIDAK DITEMUKAN:**
- Dokumen requirement
- Wireframe/mockup
- Screenshot prototype per iterasi
- Catatan feedback
- Timeline pengembangan
- Dokumen PJBL

**Kesimpulan:** Dokumentasi iterasi Prototype **tidak ditemukan pada source code**.

---

### L. Black Box Test Cases

**Total test cases:** 59 test cases

**Distribusi:**
- Authentication: 10
- Produk: 8
- Search: 3
- Cart: 5
- Checkout: 4
- Payment: 5
- Order: 6
- Custom Order: 8
- Complaint: 5
- Refund: 5
- Tukar: 4
- Review: 4
- Chat: 3
- Notification: 3
- Admin Dashboard: 3
- Admin TIC: 3
- Admin Broadcast: 4
- Admin Audit Log: 2

---

### M. Black Box Results

> **BLOCKED** — credential/environment tidak tersedia

---

### N. Performance Data

> **TIDAK PERLU** — tidak relevan dengan metode Prototype + Black Box Testing

---

### O. Usability Data

> **TIDAK PERLU** — tidak relevan dengan metode Prototype + Black Box Testing

---

### P. Research Evidence

| Klaim | Status | Keterangan |
|---|---|---|
| Sistem e-commerce UMKM | SEBAGIAN | Source code ada, perlu testing |
| Custom order helm | SEBAGIAN | Source code ada, perlu testing |
| Integrasi WhatsApp | SEBAGIAN | Source code ada, perlu testing |
| Integrasi Email | SEBAGIAN | Source code ada, perlu testing |
| Real-time chat | SEBAGIAN | Source code ada, perlu testing |
| Payment validation | SEBAGIAN | Source code ada, perlu testing |
| Complaint management | SEBAGIAN | Source code ada, perlu testing |
| TIC | SEBAGIAN | Source code ada, perlu testing |
| Multi-channel notification | SEBAGIAN | Source code ada, perlu testing |
| Audit logging | SEBAGIAN | Source code ada, perlu testing |

---

> Semua data di atas bersumber dari: source code analysis (READ ONLY)
