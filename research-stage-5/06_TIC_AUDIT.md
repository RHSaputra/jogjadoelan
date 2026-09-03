# 06_TIC_AUDIT

## TIC (TRANSACTION INTELLIGENCE CENTER) AUDIT — JOGJADOELAN

### Penjelasan Umum

TIC pada sistem Jogjadoelan adalah modul analisis keuangan yang terintegrasi di halaman admin. TIC menyediakan ringkasan keuangan, daftar transaksi dengan rincian finansial, dan grafik tren.

### Komponen TIC

| Komponen | Ditemukan | Bukti | Penjelasan |
|---|---|---|---|
| Financial Summary | YA | `app/api/admin/tic/summary/route.ts` | Menghitung gross revenue, net revenue, gross profit, net profit, refund amount, ongkir, biaya packing |
| Transaction List | YA | `app/api/admin/tic/transactions/route.ts` | Daftar transaksi dengan rincian finansial per transaksi (subtotal, ongkir, diskon, refund, net) |
| Charts/Trends | YA | `app/api/admin/tic/charts/route.ts` | Grafik tren, top produk, top customers |
| UI Dashboard | YA | `app/admin/transactions/page.tsx` | Halaman admin yang menampilkan data TIC |
| Date Range Filter | YA | `app/api/admin/tic/summary/route.ts` baris 9-29 | Filter berdasarkan rentang tanggal (from/to) |
| Profit Margin | YA | `app/api/admin/tic/summary/route.ts` baris 153-154 | Perhitungan profit margin = (net profit / gross revenue) * 100 |
| Refund Ratio | YA | `app/api/admin/tic/summary/route.ts` baris 147-148 | Perhitungan refund ratio = (total refund / gross revenue) * 100 |
| Cancellation Ratio | YA | `app/api/admin/tic/summary/route.ts` baris 149-151 | Perhitungan cancellation ratio = (dibatalkan / total orders) * 100 |
| Order Status Breakdown | YA | `app/api/admin/tic/summary/route.ts` baris 33-67 | Jumlah order per status: total, selesai, pending, diproses, dikirim, dibatalkan, kadaluarsa |
| Custom Order Stats | YA | `app/api/admin/tic/summary/route.ts` baris 69-76 | Jumlah custom order selesai dan dibatalkan |
| Payment Stats | YA | `app/api/admin/tic/summary/route.ts` baris 78-97 | Total verified payment nominal |
| Revenue Calculation | YA | `app/api/admin/tic/summary/route.ts` baris 122-123 | Gross revenue = sum of all order.total (SELESAI + DIKIRIM + DIPROSES + MENUNGGU_KONFIRMASI) |
| Net Revenue | YA | `app/api/admin/tic/summary/route.ts` baris 132-133 | Net revenue = gross revenue - total refund |
| Gross Profit | YA | `app/api/admin/tic/summary/route.ts` baris 136-138 | Gross profit = gross revenue - ongkir - biaya packing |
| Net Profit | YA | `app/api/admin/tic/summary/route.ts` baris 140-141 | Net profit = gross profit - total refund |
| Access Control | YA | `app/api/admin/tic/summary/route.ts` baris 15 | Hanya admin (requireAdmin()) yang dapat mengakses |
| Audit Log | PARTIAL | `app/admin/audit/page.tsx`, `app/api/admin/audit/` | Log aktivitas admin terpisah dari TIC |
| Recommendation/Insight | TIDAK DITEMUKAN | - | Tidak ada sistem rekomendasi atau insight otomatis |
| AI/ML Analytics | TIDAK DITEMUKAN | - | Tidak ada integrasi AI/ML untuk prediksi atau klasifikasi |

### API Endpoints TIC

| Endpoint | Method | Fungsi | Bukti |
|---|---|---|---|
| `/api/admin/tic/summary` | GET | Financial summary (revenue, profit, ratios) | `app/api/admin/tic/summary/route.ts` |
| `/api/admin/tic/transactions` | GET | Paginated transaction list dengan financial breakdown | `app/api/admin/tic/transactions/route.ts` |
| `/api/admin/tic/charts` | GET | Trend charts, top products, top customers | `app/api/admin/tic/charts/route.ts` |

### Data yang Digunakan TIC

| Data Source | Entity | Field yang Digunakan | Bukti |
|---|---|---|---|
| Orders | `order` | total, ongkir, biayaPacking, diskon, subtotal, status, createdAt | `app/api/admin/tic/summary/route.ts:60-66` |
| Payments | `payment` | nominal, type, status, createdAt | `app/api/admin/tic/summary/route.ts:78-97` |
| Refunds | `refund` | nominalRefund, status, createdAt | `app/api/admin/tic/summary/route.ts:100-119` |
| Custom Orders | `customorder` | status, createdAt | `app/api/admin/tic/summary/route.ts:70-76` |

### Perhitungan yang Dilakukan

1. **Gross Revenue** = SUM(order.total) untuk order dengan status SELESAI/DIKIRIM/DIPROSES/MENUNGGU_KONFIRMASI
2. **Net Revenue** = Gross Revenue - Total Refund Amount
3. **Gross Profit** = Gross Revenue - Total Ongkir - Total Biaya Packing
4. **Net Profit** = Gross Profit - Total Refund Amount
5. **Refund Ratio** = (Total Refund / Gross Revenue) x 100
6. **Cancellation Ratio** = (Total Dibatalkan / Total Orders) x 100
7. **Profit Margin** = (Net Profit / Gross Revenue) x 100

### Indikator yang Ditampilkan

1. Total Orders (per status)
2. Gross Revenue
3. Net Revenue
4. Gross Profit
5. Net Profit
6. Total Refund Amount + Count
7. Total Ongkir
8. Total Biaya Packing
9. Total Verified Payment
10. Refund Ratio (%)
11. Cancellation Ratio (%)
12. Profit Margin (%)

### Siapa yang Dapat Mengakses

- **Admin** (role: ADMIN atau SUPER_ADMIN) — dibuktikan dengan `requireAdmin()` di setiap API endpoint TIC

### Limitasi TIC

1. **Tidak ada prediksi** — TIC hanya menampilkan data historis, tidak ada forecasting
2. **Tidak ada insight otomatis** — Tidak ada rekomendasi berbasis data
3. **Tidak ada AI/ML** — Tidak ada integrasi machine learning
4. **Tidak ada benchmarking** — Tidak ada perbandingan dengan periode sebelumnya atau kompetitor
5. **Tidak ada export** — Tidak ada fitur export laporan ke PDF/Excel
6. **Dashboard client-side** — `app/admin/transactions/page.tsx` menggunakan data dari `lib/orders-storage` yang merupakan client-side fetch

---

> Semua data di atas bersumber dari: source code TIC API endpoints, admin page, dan Prisma schema
