# 16_RESEARCH_EVIDENCE_MAP

## RESEARCH EVIDENCE MAP — JOGJADOELAN

### Catatan

Research gap dan novelty belum ditentukan pada Tahap 4. Peta ini disusun berdasarkan fitur yang ditemukan pada sistem Jogjadoelan, sehingga dapat digunakan untuk mengevaluasi novelty apa pun yang dipilih.

| Research Gap / Klaim | Novelty | Fitur Jogjadoelan | Bukti Source Code | Bukti Testing | Data Tambahan | Status |
|---|---|---|---|---|---|---|
| Sistem e-commerce UMKM | Platform online untuk UMKM | Full e-commerce (katalog, cart, checkout, payment, order) | `app/(customer)/`, `app/api/`, `prisma/schema.prisma` | Perlu testing | Dokumentasi UMKM target | SEBAGIAN |
| Custom order untuk helm | Konfigurasi custom produk | Multi-step custom order (jenis, ukuran, warna, bahan, finishing) | `app/(customer)/custom/`, `app/api/custom/`, `customorder` model | Perlu testing | - | SEBAGIAN |
| Integrasi WhatsApp | Notifikasi via WA | Fonnte API integration, broadcast, transactional | `lib/whatsapp.ts`, `whatsappbroadcast` model | Perlu testing | Akun Fonnte aktif | SEBAGIAN |
| Integrasi Email | Notifikasi via email | Resend API, 30+ template | `lib/email/`, `emaillog` model | Perlu testing | Akun Resend aktif | SEBAGIAN |
| Real-time chat | Live chat customer-admin | Pusher channels, real-time messaging | `lib/pusher-server.ts`, `chatsupportmessage` model | Perlu testing | Akun Pusher aktif | SEBAGIAN |
| Payment validation | Verifikasi manual bukti bayar | Upload bukti, admin review | `app/api/order/[id]/bayar/`, `payment` model | Perlu testing | - | SEBAGIAN |
| Complaint management | Sistem komplain terintegrasi | Komplain + chat + refund + tukar | `komplain`, `refund`, `tukar` models | Perlu testing | - | SEBAGIAN |
| TIC / Financial Analytics | Dashboard analisis keuangan | Revenue, profit, ratios, charts | `app/api/admin/tic/`, `app/admin/transaksi/` | Perlu testing | - | SEBAGIAN |
| Multi-channel notification | Email + WA + In-App + Pusher | Dispatcher dengan channel config | `lib/notification-dispatcher.ts`, `notificationlog` model | Perlu testing | - | SEBAGIAN |
| Audit logging | Jejak aktivitas admin | 30+ audit actions, IP tracking | `auditlog` model, `lib/audit.ts` | Perlu testing | - | SEBAGIAN |
| Biteship ongkir | Kalkulasi ongkir real-time | Biteship API (J&T Express) | `lib/biteship.ts` | Perlu testing | API key aktif | SEBAGIAN |
| Google OAuth | Login dengan Google | NextAuth Google provider | `lib/auth.ts` | Perlu testing | Google OAuth credentials | SEBAGIAN |
| Broadcast multi-channel | Pengiriman massal | WA, email, in-app, hybrid | `whatsappbroadcast`, `broadcast` models | Perlu testing | - | SEBAGIAN |
| Voucher/promo system | Diskon dan promosi | Voucher PERSEN/NOMINAL, promo banners | `voucher`, `voucherusage` models | Perlu testing | - | SEBAGIAN |
| Auto-expire order | Pembatalan otomatis | Cron job expire 24h, stock restore | `app/api/cron/expire-orders/`, `lib/order-jobs.ts` | Perlu testing | - | SEBAGIAN |
| Auto-selesai order | Penyelesaian otomatis | Auto-complete 72 jam setelah delivered | `lib/auto-selesai.ts` | Perlu testing | - | SEBAGIAN |
| Stock management | Pengelolaan stok | Atomic stock mutation, variant support | `lib/server/stock-mutation.ts` | Perlu testing | - | SEBAGIAN |
| Rate limiting | Perlindungan API | In-memory sliding window | `lib/rate-limit.ts`, `middleware.ts` | Perlu testing | - | SEBAGIAN |

### Keterangan Status

- **TERBUKTI**: Bukti lengkap dari source code DAN testing
- **SEBAGIAN**: Bukti dari source code, belum diuji
- **BELUM TERBUKTI**: Tidak ada bukti yang memadai
- **TIDAK RELEVAN**: Tidak berhubungan dengan penelitian

### Catatan Penting

> Peta di atas bersifat **provisional**. Peneliti harus menentukan research gap dan novelty final pada Tahap 4, kemudian memperbarui peta ini untuk mencocokkan klaim penelitian dengan bukti yang tersedia.

---

> Semua data di atas bersumber dari: source code analysis
