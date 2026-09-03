# 14_PERFORMANCE_AUDIT

## PERFORMANCE AUDIT — JOGJADOELAN

### Rekomendasi

> **TIDAK PERLU** untuk penelitian ini.

### Alasan

Penelitian ini berfokus pada:
1. Pengembangan sistem e-commerce UMKM dengan metode **Prototype**
2. Pengujian dengan **Black Box Testing**
3. Evaluasi fitur dan alur kerja

Data performa (response time, loading time, API latency, throughput, database query time) **tidak relevan** dengan research gap yang sedang diteliti karena:

1. **Fokus penelitian** adalah metode pengembangan (prototype) dan pengujian fungsional (black box), bukan optimasi performa
2. **Black Box Testing** menguji fungsi sesuai spesifikasi, bukan performa
3. **UMKM context** — untuk skala UMKM, performa aplikasi web standar sudah memadai
4. **Prototype method** — tujuan utamanya adalah membuktikan konsep, bukan optimasi

### Catatan Teknis (Opsional)

Jika peneliti ingin menambahkan analisis performa sebagai pelengkap:

1. **Database Query Time** — dapat diukur dengan Prisma logging
2. **API Response Time** — dapat diukur dengan tools seperti Lighthouse atau k6
3. **Page Load Time** — dapat diukur dengan Next.js Analytics atau Web Vitals
4. **Bundle Size** — dapat diukur dengan `next build`

Namun, data-data tersebut **bukan bagian dari metode Black Box Testing** dan harus diperlakukan sebagai data pendukung tambahan, bukan bukti utama.

---

> Rekomendasi: TIDAK PERLU untuk penelitian dengan metode Prototype + Black Box Testing
