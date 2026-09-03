# 13_BLACKBOX_RESULTS

## BLACKBOX RESULTS — JOGJADOELAN

### Status

> **BLOCKED — credential/environment tidak tersedia**

Sistem JOGJADOELAN membutuhkan:
1. Database MySQL/MariaDB yang sudah di-migrate dan di-seed
2. Environment variables (NEXTAUTH_SECRET, DATABASE_URL, dll)
3. API keys (RESEND_API_KEY, FONNTE_TOKEN, BITESHIP_API_KEY, PUSHER_*, BLOB_READ_WRITE_TOKEN)
4. Akun admin yang sudah dibuat

Tanpa lingkungan yang lengkap, pengujian Black Box **tidak dapat dilakukan**.

### Hasil Pengujian

| ID | Fitur | Skenario | Expected | Actual | Status | Bukti |
|---|---|---|---|---|---|---|
| - | - | - | - | - | BLOCKED | Credential/environment tidak tersedia |

### Kondisi untuk Menjalankan Pengujian

1. **Database**: MySQL/MariaDB harus berjalan dengan schema yang sudah di-push
2. **Seed Data**: Jalankan `npx tsx prisma/seed.ts` dan `npx tsx prisma/seed-produk.ts`
3. **Environment**: Copy `.env.example.txt` ke `.env` dan isi semua variabel
4. **API Keys**: Minimal siapkan RESEND_API_KEY (sandbox) dan FONNTE_TOKEN
5. **Node.js**: Versi 20 atau lebih tinggi
6. **pnpm**: Package manager

### Rekomendasi untuk Peneliti

Untuk melakukan Black Box Testing:

1. Siapkan lingkungan development lokal sesuai README.md
2. Jalankan `pnpm install` untuk install dependencies
3. Setup database dan jalankan seed
4. Jalankan `pnpm dev` untuk mengaktifkan server
5. Buka browser ke `http://localhost:3000`
6. Login sebagai admin (credential dari seed)
7. Login sebagai customer (buat akun baru atau dari seed)
8. Jalankan test cases sesuai `12_BLACKBOX_TEST_CASES.md`
9. Catat hasil aktual pada tabel di atas

---

> Pengujian Black Box Testing **belum dapat dilakukan** karena lingkungan tidak tersedia.
