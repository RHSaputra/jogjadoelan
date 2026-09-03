# 18_RESEARCH_CHECKLIST

## RESEARCH_CHECKLIST — JOGJADOELAN

### Checklist Bukti Penelitian

| Klaim Penelitian | Bukti yang Dibutuhkan | Bukti Tersedia | Status |
|---|---|---|---|
| Sistem memiliki fitur e-commerce lengkap | Source code + UI + database | 39 customer features, 34 admin features, 38 DB models | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki custom order | Source code + flow + database | `customorder` model, 17 status, multi-step form, admin interface | SEBAGIAN — source code ada, testing belum |
| Sistem mendukung pembayaran multi-metode | API + UI + database | Transfer Bank (4 bank), QRIS, manual verification | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki notifikasi multi-channel | Dispatcher + trigger + templates | Email (Resend, 30+ template), WA (Fonnte, 7 template), In-App, Pusher | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki real-time chat | Pusher integration + UI | `chatsupportmessage` model, Pusher channels, typing indicator | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki complaint/refund/return | Source code + flow + database | `komplain`, `refund`, `tukar` models, eligibility logic, chat | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki TIC | Source code + API | `/api/admin/tic/*`, financial calculations, charts | SEBAGIAN — source code ada, testing belum |
| Sistem membantu admin | Fitur admin + evaluasi | Dashboard, TIC, validasi pembayaran, broadcast, audit log | SEBAGIAN — source code ada, testing belum |
| Sistem menggunakan metode prototype | Dokumentasi iterasi | Git history, comment "Phase 3 DB migration" | BELUM — dokumen prototype tidak ditemukan |
| Sistem diuji dengan black box testing | Test case + hasil | 59 test cases disiapkan | BELUM — testing belum dilakukan |
| Sistem berjalan pada teknologi modern | Tech stack documentation | Next.js 16, React 19, Prisma 7, TypeScript | TERBUKTI — source code |
| Sistem memiliki audit logging | Source code + database | `auditlog` model, 30+ actions, IP tracking | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki rate limiting | Source code + middleware | `lib/rate-limit.ts`, 4-tier limits | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki voucher/promo | Source code + database | `voucher`, `voucherusage` models, PERSEN/NOMINAL types | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki auto-expire order | Source code + cron | `/api/cron/expire-orders`, 24h expiry, stock restore | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki stock management | Source code + database | `lib/server/stock-mutation.ts`, atomic mutation, variant support | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki broadcast multi-channel | Source code + database | `whatsappbroadcast`, `broadcast` models, pause/resume/cancel | SEBAGIAN — source code ada, testing belum |
| Sistem memiliki Google OAuth | Source code + config | `lib/auth.ts`, NextAuth Google provider | SEBAGIAN — source code ada, testing belum |
| Sistem menggunakan Biteship ongkir | Source code + API | `lib/biteship.ts`, J&T Express integration | SEBAGIAN — source code ada, testing belum |

### Ringkasan Status

| Status | Jumlah |
|---|---|
| TERBUKTI | 1 |
| SEBAGIAN | 17 |
| BELUM TERBUKTI | 2 |
| TIDAK RELEVAN | 0 |

### Catatan Penting

1. **17 dari 20 klaim** memiliki bukti SEBAGIAN (source code ada, testing belum)
2. **1 klaim** TERBUKTI (tech stack modern)
3. **2 klaim** BELUM TERBUKTI:
   - Metode prototype: dokumen iterasi tidak ditemukan
   - Black box testing: testing belum dilakukan
4. **Semua klaim memerlukan testing** untuk status TERBUKTI

### Rekomendasi untuk Peneliti

1. **Siapkan lingkungan testing** sesuai README.md
2. **Jalankan Black Box Testing** sesuai test cases yang disiapkan
3. **Siapkan dokumen prototype** yang diperlukan:
   - Requirement document
   - Wireframe/mockup
   - Screenshot per iterasi
   - Catatan feedback
4. **Perbarui checklist ini** setelah testing selesai

---

> Checklist ini bersifat provisional dan harus diperbarui setelah pengujian dilakukan
