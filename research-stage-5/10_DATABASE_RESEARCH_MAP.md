# 10_DATABASE_RESEARCH_MAP

## DATABASE RESEARCH MAP — JOGJADOELAN

### Entity Count: 38 models

| Entity | Fungsi | Relasi | Digunakan Fitur | Bukti |
|---|---|---|---|---|
| `user` | Akun customer | → alamat, cartitem, chatsupportmessage, customorder, komplain, notifikasi, order, refund, tukar, ulasan, voucherusage, wishlistitem | Auth, semua fitur customer | `prisma/schema.prisma:609-637` |
| `adminuser` | Akun admin | → auditlog, customprogress, ordertimeline, payment | Auth admin, semua fitur admin | `prisma/schema.prisma:9-29` |
| `alamat` | Alamat pengiriman | ← user | Checkout, custom order, tukar | `prisma/schema.prisma:31-48` |
| `produk` | Produk helm | → cartitem, produkimage, produkvarian, tukar, ulasan, wishlistitem | Katalog, cart, order | `prisma/schema.prisma:419-466` |
| `produkimage` | Gambar produk | ← produk | Detail produk | `prisma/schema.prisma:468-477` |
| `produkvarian` | Varian produk (ukuran/warna) | ← produk | Pilihan ukuran/warna | `prisma/schema.prisma:479-490` |
| `cartitem` | Item keranjang | ← user, → produk | Keranjang | `prisma/schema.prisma:108-123` |
| `wishlistitem` | Item wishlist | ← user, → produk | Wishlist | `prisma/schema.prisma:687-698` |
| `order` | Pesanan | ← user, → orderitem, ordertimeline, payment, refund, tukar, ulasan, komplain | Checkout, pesanan, tracking | `prisma/schema.prisma:304-350` |
| `orderitem` | Item pesanan | ← order, → ulasan | Detail pesanan | `prisma/schema.prisma:352-372` |
| `ordertimeline` | Timeline status order | ← order, → adminuser | Tracking pesanan | `prisma/schema.prisma:374-388` |
| `payment` | Pembayaran | ← order?, ← customorder?, → adminuser | Pembayaran, validasi | `prisma/schema.prisma:390-417` |
| `customorder` | Pesanan custom | ← user, → customprogress, komplain, payment | Custom order | `prisma/schema.prisma:140-172` |
| `customprogress` | Progress custom order | ← customorder, → adminuser | Progress pengerjaan | `prisma/schema.prisma:174-187` |
| `komplain` | Komplain | ← user, ← order?, ← customorder?, → refund?, → tukar? | Komplain, refund, tukar | `prisma/schema.prisma:241-272` |
| `refund` | Refund | ← komplain, ← order, ← user | Refund | `prisma/schema.prisma:500-533` |
| `tukar` | Tukar/exchange | ← komplain, ← order, ← produk?, ← user | Tukar | `prisma/schema.prisma:541-582` |
| `ulasan` | Ulasan/review | ← user, ← produk, ← order, ← orderitem | Review produk | `prisma/schema.prisma:584-607` |
| `chatsupportmessage` | Pesan chat | ← user | Chat support | `prisma/schema.prisma:125-138` |
| `notifikasi` | Notifikasi in-app | ← user | Notifikasi | `prisma/schema.prisma:285-302` |
| `notificationlog` | Log notifikasi email/WA | - | Audit notifikasi | `prisma/schema.prisma:1012-1035` |
| `emaillog` | Log email | - | Audit email | `prisma/schema.prisma:203-219` |
| `broadcast` | Broadcast legacy | - | Broadcast | `prisma/schema.prisma:80-89` |
| `whatsappbroadcast` | Broadcast WA | → whatsappbroadcastlog | WA broadcast | `prisma/schema.prisma:963-978` |
| `whatsappbroadcastlog` | Log broadcast WA | ← whatsappbroadcast | Audit broadcast | `prisma/schema.prisma:980-996` |
| `whatsapptransactional` | Log WA transaksional | - | Audit WA transaksional | `prisma/schema.prisma:998-1010` |
| `bank` | Rekening bank | - | Pembayaran | `prisma/schema.prisma:68-78` |
| `ekspedisi` | Ekspedisi | - | Pengiriman | `prisma/schema.prisma:189-201` |
| `qrisconfig` | Konfigurasi QRIS | - | Pembayaran QRIS | `prisma/schema.prisma:492-498` |
| `voucher` | Voucher | → voucherusage | Promo, diskon | `prisma/schema.prisma:653-672` |
| `voucherusage` | Pemakaian voucher | ← voucher, ← user | Voucher tracking | `prisma/schema.prisma:674-685` |
| `faq` | FAQ | - | Bantuan | `prisma/schema.prisma:221-232` |
| `sitesetting` | Pengaturan situs | - | Konfigurasi umum | `prisma/schema.prisma:535-539` |
| `instruksipembayaran` | Instruksi pembayaran | - | Instruksi bayar | `prisma/schema.prisma:234-239` |
| `auditlog` | Log audit admin | ← adminuser | Audit trail | `prisma/schema.prisma:50-66` |
| `cabang` | Cabang toko | - | Lokasi toko | `prisma/schema.prisma:91-106` |
| `liburitem` | Hari libur | - | Operasional toko | `prisma/schema.prisma:276-283` |
| `verificationtoken` | Token verifikasi | - | Email/OTP verifikasi | `prisma/schema.prisma:639-651` |

### Enums yang Digunakan

| Enum | Fungsi | Nilai | Bukti |
|---|---|---|---|
| `order_status` | Status pesanan | MENUNGGU_PEMBAYARAN, MENUNGGU_KONFIRMASI, DIPROSES, DIKIRIM, SELESAI, KADALUARSA, DIBATALKAN | `prisma/schema.prisma:817-825` |
| `customorder_status` | Status custom order | 17 nilai (DRAFT s/d DIBATALKAN) | `prisma/schema.prisma:712-729` |
| `payment_status` | Status pembayaran | PENDING, VERIFIED, REJECTED | `prisma/schema.prisma:952-956` |
| `payment_type` | Tipe pembayaran | FULL, DP, PELUNASAN | `prisma/schema.prisma:827-831` |
| `payment_metode` | Metode pembayaran | TRANSFER, QRIS | `prisma/schema.prisma:866-869` |
| `komplain_status` | Status komplain | BARU s/d DIBATALKAN (9 nilai) | `prisma/schema.prisma:940-950` |
| `komplain_jenis` | Jenis komplain | 14 jenis | `prisma/schema.prisma:844-859` |
| `komplain_tindakan` | Tindakan komplain | REFUND, TUKAR, KOMPLAIN_SAJA | `prisma/schema.prisma:917-921` |
| `refund_status` | Status refund | 8 nilai | `prisma/schema.prisma:871-880` |
| `tukar_status` | Status tukar | 8 nilai | `prisma/schema.prisma:899-908` |
| `ordertimeline_step` | Step timeline | DIBUAT s/d KADALUARSA (9 nilai) | `prisma/schema.prisma:755-765` |
| `auditlog_action` | Aksi audit | 30+ aksi | `prisma/schema.prisma:767-802` |
| `notifikasi_type` | Tipe notifikasi | ORDER, PEMBAYARAN, PENGIRIMAN, KOMPLAIN, REFUND, TUKAR, ULASAN, CUSTOM, PROMO, INFO | `prisma/schema.prisma:737-748` |
| `adminuser_role` | Role admin | SUPER_ADMIN, ADMIN | `prisma/schema.prisma:935-938` |
| `user_provider` | Provider auth | MANUAL, GOOGLE | `prisma/schema.prisma:930-933` |
| `voucher_jenis` | Jenis voucher | PERSEN, NOMINAL | `prisma/schema.prisma:882-885` |
| `broadcast_tipe` | Tipe broadcast | ORDER, PEMBAYARAN, PENGIRIMAN, KOMPLAIN, REFUND, TUKAR, ULASAN, CUSTOM, PROMO, INFO | `prisma/schema.prisma:804-815` |
| `broadcast_target` | Target broadcast | ALL, PEMBELI, GUEST | `prisma/schema.prisma:833-837` |
| `emaillog_status` | Status email | SENT, FAILED | `prisma/schema.prisma:839-842` |
| `customorder_paymentType` | Tipe bayar custom | DP, LUNAS | `prisma/schema.prisma:958-961` |

### Index Database

Total indexes: 50+ indexes untuk optimasi query

---

> Semua data di atas bersumber dari: prisma/schema.prisma
