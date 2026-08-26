# Jogja Doelan — Toko Online

Platform e-commerce full-stack untuk usaha kuliner/oleh-oleh khas Yogyakarta: katalog produk, pesan custom (cake/hampers), pembayaran multi-channel, hingga penanganan komplain — dilengkapi dashboard admin yang komprehensif dan notifikasi realtime via Email & WhatsApp.

## Fitur

### Pelanggan
- **Katalog & Pencarian** — produk dengan kategori, promo, ulasan, dan rating
- **Pesan Custom** — form permintaan produk custom dengan persetujuan admin, sistem DP, dan pelunasan
- **Keranjang & Wishlist** — tersinkron untuk tamu maupun user terdaftar (merge saat login)
- **Checkout Lengkap** — alamat berjenjang (provinsi/kota/kecamatan), ongkir otomatis via [Biteship](https://biteship.com), voucher & promo
- **Pembayaran** — QRIS dinamis & transfer bank dengan validasi bukti bayar oleh admin
- **Lacak Pesanan** — timeline status pesanan hingga konfirmasi diterima
- **Komplain, Refund, Tukar & Return** — pengajuan dengan chat langsung bersama admin
- **Ulasan Produk** — rating + foto, hanya untuk pesanan selesai
- **Chat Support Realtime** — Powered by Pusher
- **Notifikasi** — email (Resend) & WhatsApp (Fonnte) untuk setiap perubahan status

### Admin
- **Dashboard Analitik** — ringkasan penjualan, produk terlaris, grafik (Recharts)
- **Manajemen** — produk, stok, kategori, promo/voucher, pelanggan, cabang toko
- **Transaksi** — validasi pembayaran, kelola pesanan & pengiriman, pelunasan custom order
- **Penanganan After-Sales** — modul komplain, refund, tukar, dan return terintegrasi chat
- **Broadcast & Pesan Transaksional** — WhatsApp massal dengan queue, pause/resume/cancel, dan retry otomatis
- **Laporan & Audit Log** — rekap penjualan serta jejak aktivitas admin
- **Pengaturan Toko** — landing page, footer, FAQ, jam operasional, rekening bank, ekspedisi

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS 4 · shadcn/ui · Radix UI · Lucide Icons |
| Database | MySQL/MariaDB · [Prisma ORM 7](https://www.prisma.io) |
| Autentikasi | [NextAuth v5](https://authjs.dev) (Credentials + Google OAuth) |
| Realtime | [Pusher Channels](https://pusher.com) |
| Email | [Resend](https://resend.com) |
| WhatsApp | [Fonnte API](https://fonnte.com) |
| Ongkir | [Biteship API](https://biteship.com) |
| File Storage | [Vercel Blob](https://vercel.com/storage/blob) |
| Validasi | Zod |
| Data Fetching | TanStack Query |

## Prasyarat

- **Node.js ≥ 20**
- **pnpm** (`npm i -g pnpm`)
- **MySQL/MariaDB** berjalan lokal (dikembangkan dengan [Laragon](https://laragon.org))

## Instalasi

1. **Clone & install dependency**

   ```bash
   git clone https://github.com/RHSaputra/jogjadoelan.git
   cd jogjadoelan
   pnpm install
   ```

2. **Siapkan environment variable**

   ```bash
   cp .env.example.txt .env
   ```

   Lalu isi nilai pada tabel berikut sesuai kebutuhan:

   | Variabel | Keterangan |
   |---|---|
   | `DATABASE_URL` | Koneksi MySQL/MariaDB |
   | `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Secret & base URL aplikasi |
   | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Kredensial Google OAuth (opsional) |
   | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` | Kirim email notifikasi |
   | `FONNTE_TOKEN` | Kirim WhatsApp notifikasi |
   | `BITESHIP_API_KEY`, `BITESHIP_ORIGIN_*` | Kalkulasi ongkir |
   | `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` | Chat & notifikasi realtime |
   | `BLOB_READ_WRITE_TOKEN` | Upload gambar ke Vercel Blob |

3. **Setup database**

   ```bash
   npx prisma generate      # generate Prisma Client
   npx prisma db push       # sinkronkan skema ke database
   npx tsx prisma/seed.ts   # data awal (admin, toko, dll)
   npx tsx prisma/seed-produk.ts   # data contoh produk
   ```

4. **Jalankan**

   ```bash
   pnpm dev        # development → http://localhost:3000
   pnpm build      # production build
   pnpm start      # jalankan hasil build
   ```

## engujian & Utilitas

```bash
pnpm test           # uji sistem notifikasi
pnpm test:broadcast # integrasi broadcast WhatsApp
pnpm test:audit     # audit broadcast
pnpm lint           # ESLint
```

Skrip maintenance lainnya tersedia di folder `scripts/` (migrasi nomor telepon, cleanup order/chat, audit broadcast, dsb).

## Struktur Proyek (ringkas)

```
├── app/
│   ├── (customer)/   # Halaman storefront (belanja, checkout, pesanan, dsb)
│   ├── admin/        # Dashboard & halaman admin
│   ├── api/          # 160+ REST endpoint
│   └── ulasan/       # Halaman ulasan publik
├── components/       # UI (shadcn/ui) + komponen customer/admin/shared
├── lib/              # Helper server/client, auth, notifikasi, integrasi API
├── hooks/            # Custom React hooks
├── prisma/           # Schema (38 model), seeder, skrip DB
└── middleware.ts     # Proteksi route admin, rate limit, cache policy
```

## Keamanan

- Rate limiting berjenjang per-IP pada seluruh endpoint `/api/*`
- Proteksi route `/admin/*` berbasis role (`ADMIN` / `SUPER_ADMIN`) di middleware
- `Cache-Control` adaptif per jenis endpoint (data sensitif tidak pernah di-cache)
- Validasi input menyeluruh dengan Zod + audit log aktivitas admin

---

Dikembangkan oleh [RHSaputra](https://github.com/RHSaputra) © 2026
