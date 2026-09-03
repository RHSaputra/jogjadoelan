# 02_FEATURE_INVENTORY

## FEATURE INVENTORY — JOGJADOELAN

### CUSTOMER FEATURES

| No | Fitur | Aktor | Status | Bukti | File/Route | Keterangan |
|---|---|---|---|---|---|---|
| 1 | Homepage | Customer | IMPLEMENTED | `app/(customer)/page.tsx` | `/` | Landing page dengan hero, produk rekomendasi, promo |
| 2 | Katalog/Belanja | Customer | IMPLEMENTED | `app/(customer)/belanja/page.tsx` | `/belanja` | Browse produk dengan kategori |
| 3 | Pencarian Produk | Customer | IMPLEMENTED | `app/(customer)/cari/page.tsx` | `/cari` | Search produk |
| 4 | Filter & Sort | Customer | IMPLEMENTED | `app/(customer)/produk/page.tsx` | `/produk` | Filter by jenis, promo, rekomendasi, sort |
| 5 | Detail Produk | Customer | IMPLEMENTED | `app/(customer)/produk/[id]/page.tsx` | `/produk/[id]` | Gambar, spesifikasi, ukuran, rating, ulasan |
| 6 | Promo | Customer | IMPLEMENTED | `app/(customer)/promo/page.tsx` | `/promo` | Daftar promo aktif |
| 7 | Keranjang (Cart) | Customer | IMPLEMENTED | `app/(customer)/keranjang/page.tsx`, `app/api/cart/` | `/keranjang` | CRUD cart, sync guest-to-user via merge |
| 8 | Wishlist | Customer | IMPLEMENTED | `app/(customer)/akun/wishlist/page.tsx`, `app/api/wishlist/` | `/akun/wishlist` | Simpan produk favorit, sync guest-to-user |
| 9 | Checkout | Customer | IMPLEMENTED | `app/(customer)/checkout/page.tsx`, `app/api/order/` | `/checkout` | Alamat, ongkir (Biteship), voucher, metode bayar |
| 10 | Pembayaran Transfer Bank | Customer | IMPLEMENTED | `app/(customer)/pembayaran/[orderId]/page.tsx`, `app/(customer)/pembayaran/transfer-bank/` | `/pembayaran/[orderId]` | Upload bukti transfer, instruksi bank |
| 11 | Pembayaran QRIS | Customer | IMPLEMENTED | `app/(customer)/pembayaran/qris/page.tsx`, `app/api/qris/` | `/pembayaran/qris` | Tampilkan QR code, upload bukti bayar |
| 12 | Pelunasan (DP) | Customer | IMPLEMENTED | `app/(customer)/pelunasan/page.tsx`, `app/(customer)/pelunasan/[id]/` | `/pelunasan` | Daftar order DP, halaman pelunasan |
| 13 | Pesanan (Order History) | Customer | IMPLEMENTED | `app/(customer)/pesanan/page.tsx`, `app/(customer)/pesanan/[orderId]/` | `/pesanan` | Daftar pesanan + detail dengan timeline |
| 14 | Tracking Pesanan | Customer | IMPLEMENTED | `app/(customer)/pengiriman/page.tsx` | `/pengiriman` | Info pengiriman + tracking |
| 15 | Konfirmasi Diterima | Customer | IMPLEMENTED | API: `app/api/order/[id]/actions/route.ts` | Order actions | Customer konfirmasi barang diterima |
| 16 | Custom Order | Customer | IMPLEMENTED | `app/(customer)/custom/page.tsx`, `app/(customer)/custom/[id]/`, `app/(customer)/custom/riwayat/` | `/custom` | Multi-step form konfigurasi helm, estimasi, DP, pelunasan |
| 17 | Komplain | Customer | IMPLEMENTED | `app/(customer)/komplain/page.tsx`, `app/(customer)/komplain/baru/`, `app/(customer)/komplain/[id]/` | `/komplain` | Buat komplain dengan chat real-time |
| 18 | Refund | Customer | IMPLEMENTED | `app/(customer)/refund/page.tsx`, `app/(customer)/refund/[komplainId]/` | `/refund` | Form rekening bank, kirim barang balik |
| 19 | Tukar | Customer | IMPLEMENTED | `app/(customer)/tukar/page.tsx`, `app/(customer)/tukar/[komplainId]/` | `/tukar` | Pilih varian baru, alamat pengiriman |
| 20 | Return | Customer | IMPLEMENTED | `app/(customer)/return/page.tsx` | `/return` | Halaman return (terintegrasi dengan komplain) |
| 21 | Ulasan/Review | Customer | IMPLEMENTED | `app/(customer)/ulasan/[orderId]/page.tsx`, `app/api/ulasan/` | `/ulasan/[orderId]` | Rating + komentar + foto, hanya untuk order selesai |
| 22 | Chat Support | Customer | IMPLEMENTED | `app/(customer)/chat/page.tsx`, `app/api/chat/` | `/chat` | Real-time chat dengan admin via Pusher |
| 23 | Notifikasi In-App | Customer | IMPLEMENTED | `app/(customer)/notifikasi/page.tsx`, `app/api/notifikasi/` | `/notifikasi` | Daftar notifikasi, mark read, auto-clean >30 hari |
| 24 | Profil Akun | Customer | IMPLEMENTED | `app/(customer)/akun/profil/page.tsx` | `/akun/profil` | Edit nama, email, HP, avatar |
| 25 | Alamat | Customer | IMPLEMENTED | `app/(customer)/akun/alamat/page.tsx` | `/akun/alamat` | CRUD alamat pengiriman |
| 26 | Voucher Saya | Customer | IMPLEMENTED | `app/(customer)/akun/voucher/page.tsx` | `/akun/voucher` | Daftar voucher yang dimiliki |
| 27 | Ulasan Saya | Customer | IMPLEMENTED | `app/(customer)/akun/ulasan/page.tsx` | `/akun/ulasan` | Daftar ulasan yang sudah ditulis |
| 28 | Login | Customer | IMPLEMENTED | `app/(customer)/login/page.tsx` | `/login` | Email/username + password, Google OAuth |
| 29 | Register | Customer | IMPLEMENTED | `app/(customer)/register/page.tsx`, `app/(customer)/register/alamat/` | `/register` | Daftar akun + alamat |
| 30 | Lupa Password | Customer | IMPLEMENTED | `app/(customer)/lupa-password/page.tsx`, `app/(customer)/lupa-password/baru/` | `/lupa-password` | Reset via email/WhatsApp |
| 31 | Lokasi Toko | Customer | IMPLEMENTED | `app/(customer)/lokasi/page.tsx` | `/lokasi` | Peta lokasi cabang toko |
| 32 | Kontak | Customer | IMPLEMENTED | `app/(customer)/kontak/page.tsx` | `/kontak` | Info kontak toko |
| 33 | Bantuan/FAQ | Customer | IMPLEMENTED | `app/(customer)/bantuan/page.tsx` | `/bantuan` | FAQ dari database `faq` |
| 34 | Tentang Kami | Customer | IMPLEMENTED | `app/(customer)/tentang/page.tsx` | `/tentang` | Halaman tentang |
| 35 | Syarat & Ketentuan | Customer | IMPLEMENTED | `app/(customer)/syarat/page.tsx` | `/syarat` | T&C |
| 36 | Kebijakan Privasi | Customer | IMPLEMENTED | `app/(customer)/privasi/page.tsx` | `/privasi` | Privacy policy |
| 37 | Kebijakan Refund | Customer | IMPLEMENTED | `app/(customer)/kebijakan/refund/page.tsx` | `/kebijakan/refund` | Kebijakan refund |
| 38 | Kebijakan Pengembalian | Customer | IMPLEMENTED | `app/(customer)/kebijakan/pengembalian/page.tsx` | `/kebijakan/pengembalian` | Kebijakan return |
| 39 | Kebijakan Tukar | Customer | IMPLEMENTED | `app/(customer)/kebijakan/tukar/page.tsx` | `/kebijakan/tukar` | Kebijakan tukar |

### ADMIN FEATURES

| No | Fitur | Aktor | Status | Bukti | File/Route | Keterangan |
|---|---|---|---|---|---|---|
| 1 | Dashboard | Admin | IMPLEMENTED | `app/admin/dashboard/page.tsx`, `app/api/admin/dashboard/` | `/admin/dashboard` | KPI: revenue, orders, customers, urgent items |
| 2 | Analytics (TIC) | Admin | IMPLEMENTED | `app/admin/transactions/page.tsx`, `app/api/admin/tic/` | `/admin/transaksi` | Financial summary, transaction list, charts |
| 3 | Manajemen Produk | Admin | IMPLEMENTED | `app/admin/produk/page.tsx`, `app/admin/produk/baru/`, `app/admin/produk/[id]/`, `app/admin/produk/[id]/edit/` | `/admin/produk` | CRUD produk, gambar, varian |
| 4 | Manajemen Stok | Admin | IMPLEMENTED | `app/admin/stok/page.tsx` | `/admin/stok` | Stok adjustment |
| 5 | Pesanan | Admin | IMPLEMENTED | `app/admin/pesanan/page.tsx`, `app/admin/penjualan/[id]/` | `/admin/pesanan` | Daftar order, filter status |
| 6 | Validasi Pembayaran | Admin | IMPLEMENTED | `app/admin/validasi-bukti/page.tsx` | `/admin/validasi-bukti` | Verifikasi bukti bayar dari customer |
| 7 | Custom Order | Admin | IMPLEMENTED | `app/admin/custom/page.tsx`, `app/admin/custom/[id]/` | `/admin/custom` | Set estimasi, approve/reject, progress |
| 8 | Komplain | Admin | IMPLEMENTED | `app/admin/komplain/page.tsx`, `app/admin/komplain/[id]/` | `/admin/komplain` | Accept/reject, chat dengan customer |
| 9 | Refund | Admin | IMPLEMENTED | `app/admin/refund/[id]/page.tsx` | `/admin/refund/[id]` | Approve, confirm received, transfer |
| 10 | Return | Admin | IMPLEMENTED | `app/admin/return/page.tsx` | `/admin/return` | Refund + exchange management |
| 11 | Ulasan | Admin | IMPLEMENTED | `app/admin/ulasan/page.tsx`, `app/admin/ulasan/[orderId]/` | `/admin/ulasan` | List, hide/unhide, balas |
| 12 | Pelanggan | Admin | IMPLEMENTED | `app/admin/pelanggan/page.tsx`, `app/admin/customer/page.tsx` | `/admin/pelanggan` | Daftar customer |
| 13 | Chat | Admin | IMPLEMENTED | `app/admin/chat/page.tsx` | `/admin/chat` | Real-time chat rooms dengan customer |
| 14 | Broadcast | Admin | IMPLEMENTED | `app/admin/broadcast/page.tsx` | `/admin/broadcast` | Multi-channel broadcast (WA/email/notif) |
| 15 | Laporan | Admin | IMPLEMENTED | `app/admin/laporan/page.tsx` | `/admin/laporan` | Rekap penjualan |
| 16 | Audit Log | Admin | IMPLEMENTED | `app/admin/audit/page.tsx`, `app/api/admin/audit/` | `/admin/audit` | Jejak aktivitas admin |
| 17 | Bank | Admin | IMPLEMENTED | `app/admin/bank/page.tsx` | `/admin/bank` | CRUD rekening bank |
| 18 | Ekspedisi | Admin | IMPLEMENTED | `app/admin/ekspedisi/page.tsx` | `/admin/ekspedisi` | CRUD ekspedisi |
| 19 | QRIS | Admin | IMPLEMENTED | `app/api/admin/upload/qris/route.ts`, `app/api/qris/` | QRIS config | Upload QR code QRIS |
| 20 | Pengaturan | Admin | IMPLEMENTED | `app/admin/pengaturan/page.tsx` | `/admin/pengaturan` | Store info, notification settings |
| 21 | FAQ | Admin | IMPLEMENTED | `app/admin/toko/faq/page.tsx` | `/admin/toko/faq` | CRUD FAQ |
| 22 | Landing Page CMS | Admin | IMPLEMENTED | `app/admin/toko/landing/page.tsx` | `/admin/toko/landing` | Kelola konten landing page |
| 23 | Cabang Toko | Admin | IMPLEMENTED | `app/admin/toko/cabang/page.tsx` | `/admin/toko/cabang` | CRUD lokasi cabang |
| 24 | Jam Operasional | Admin | IMPLEMENTED | `app/admin/toko/operasional/page.tsx` | `/admin/toko/operasional` | Jam buka + hari libur |
| 25 | Footer CMS | Admin | IMPLEMENTED | `app/admin/toko/footer/page.tsx` | `/admin/toko/footer` | Kelola konten footer |
| 26 | Tampilan/Branding | Admin | IMPLEMENTED | `app/admin/tampilan/page.tsx` | `/admin/tampilan` | Pengaturan tampilan |
| 27 | Pengaturan Custom Order | Admin | IMPLEMENTED | `app/admin/toko/custom/page.tsx` | `/admin/toko/custom` | Konfigurasi form custom order |
| 28 | Promo/Voucher | Admin | IMPLEMENTED | `app/admin/promo/page.tsx` | `/admin/promo` | CRUD promo banner + voucher |
| 29 | Notifikasi | Admin | IMPLEMENTED | `app/admin/notifikasi/page.tsx` | `/admin/notifikasi` | Setting kanal notifikasi + logs |
| 30 | Toko | Admin | IMPLEMENTED | `app/admin/toko/` | `/admin/toko` | Pengaturan toko |
| 31 | Kasir/POS | Admin | IMPLEMENTED | `app/admin/kasir/page.tsx` | `/admin/kasir` | Point-of-sale interface |
| 32 | Login Admin | Admin | IMPLEMENTED | `app/admin/login/page.tsx` | `/admin/login` | Login admin |
| 33 | Lupa Password Admin | Admin | IMPLEMENTED | `app/admin/lupa-password/page.tsx` | `/admin/lupa-password` | Reset password admin |
| 34 | Profil Admin | Admin | IMPLEMENTED | `app/admin/akun/edit/page.tsx`, `app/admin/akun/password/page.tsx` | `/admin/akun` | Edit profil + ganti password |

### TIDAK DITEMUKAN (Not Found Features)

| No | Fitur | Status | Keterangan |
|---|---|---|---|
| 1 | Push Notification (Mobile) | NOT FOUND | Tidak ada implementasi push notification (FCM/APNs) |
| 2 | Midtrans/Xendit payment gateway | NOT FOUND | Pembayaran manual (transfer bank + QRIS), tidak ada payment gateway |
| 3 | Multi-bahasa (i18n) | NOT FOUND | Hanya bahasa Indonesia |
| 4 | Live video call support | NOT FOUND | Tidak ada |
| 5 | Social media sharing | NOT FOUND | Tidak ada share button terintegrasi |
| 6 | Product comparison | NOT FOUND | Tidak ada fitur banding produk |
| 7 | Multi-warehouse | NOT FOUND | Tidak ada sistem multi-gudang |
| 8 | Affiliate/referral | NOT FOUND | Tidak ada sistem referral |
| 9 | Loyalty points | NOT FOUND | Tidak ada sistem poin |
| 10 | Subscription/recurring | NOT FOUND | Tidak ada |

---

> Semua data di atas bersumber dari: source code, route files, API endpoints, dan Prisma schema
