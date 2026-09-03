# 12_BLACKBOX_TEST_CASES

## BLACKBOX TEST CASES — JOGJADOELAN

### 1. AUTHENTICATION

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| AUTH-01 | Customer | Login | Login dengan email & password yang benar | Akun terdaftar | email: valid, password: correct | Login berhasil, redirect ke homepage |
| AUTH-02 | Customer | Login | Login dengan email yang salah | - | email: tidak terdaftar, password: apapun | Error: email tidak ditemukan |
| AUTH-03 | Customer | Login | Login dengan password yang salah | Akun terdaftar | email: valid, password: salah | Error: password salah |
| AUTH-04 | Customer | Login | Login dengan Google OAuth | Akun Google aktif | Klik "Login with Google" | Redirect ke Google, lalu login berhasil |
| AUTH-05 | Customer | Register | Register dengan data lengkap | Belum punya akun | username, email, noHp, password | Register berhasil, akun dibuat |
| AUTH-06 | Customer | Register | Register dengan email yang sudah ada | Email sudah terdaftar | email: sudah ada | Error: email sudah terdaftar |
| AUTH-07 | Customer | Lupa Password | Request reset password | Akun terdaftar | email | Reset link terkirim via email/WA |
| AUTH-08 | Customer | Lupa Password | Reset password dengan link valid | Link reset aktif | password baru | Password berhasil diubah |
| AUTH-09 | Admin | Login Admin | Login dengan username & password admin | Akun admin aktif | username, password | Login berhasil, redirect ke /admin/dashboard |
| AUTH-10 | Admin | Login Admin | Login dengan admin non-aktif | Admin.aktif = false | username, password | Error: akun tidak aktif |

### 2. PRODUK

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| PRD-01 | Customer | Katalog | Lihat daftar produk | Produk tersedia | Buka /belanja | Produk ditampilkan dengan gambar, harga, rating |
| PRD-02 | Customer | Detail Produk | Lihat detail produk | Produk ada | Klik produk | Gambar, spesifikasi, ukuran, ulasan ditampilkan |
| PRD-03 | Customer | Filter | Filter produk berdasarkan jenis | Produk ada | Pilih filter jenis | Produk difilter sesuai jenis |
| PRD-04 | Customer | Sort | Urutkan produk berdasarkan harga | Produk ada | Pilih sort | Produk terurut sesuai pilihan |
| PRD-05 | Customer | Promo | Lihat produk promo | Ada produk promo | Buka /promo | Produk promo ditampilkan |
| PRD-06 | Admin | Produk Admin | Tambah produk baru | Admin login | Isi form produk | Produk berhasil ditambahkan |
| PRD-07 | Admin | Produk Admin | Edit produk | Produk ada | Ubah data produk | Produk berhasil diupdate |
| PRD-08 | Admin | Produk Admin | Hapus produk | Produk ada | Klik hapus | Produk berhasil dihapus |

### 3. SEARCH

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| SRC-01 | Customer | Pencarian | Cari produk dengan keyword | Produk ada | Ketik keyword | Produk yang cocok ditampilkan |
| SRC-02 | Customer | Pencarian | Cari dengan keyword tidak ada | - | Ketik keyword unik | Pesan "Tidak ditemukan" |
| SRC-03 | Customer | Pencarian | Pencarian kosong | - | Submit form kosong | Semua produk ditampilkan |

### 4. CART

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| CRT-01 | Customer | Cart | Tambah produk ke cart | Login, stok tersedia | Pilih ukuran/warna, klik "Tambah ke Keranjang" | Item ditambahkan ke cart |
| CRT-02 | Customer | Cart | Tambah produk yang sudah ada di cart | Item sudah di cart | Pilih ukuran/warna sama | Qty bertambah 1 |
| CRT-03 | Customer | Cart | Update qty item | Item di cart | Ubah jumlah | Qty berhasil diupdate |
| CRT-04 | Customer | Cart | Hapus item dari cart | Item di cart | Klik hapus | Item berhasil dihapus |
| CRT-05 | Customer | Cart | Checkout dengan cart kosong | Cart kosong | Klik checkout | Error: cart kosong |

### 5. CHECKOUT

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| CHK-01 | Customer | Checkout | Checkout lengkap | Cart ada item | Pilih alamat, ongkir, voucher, metode bayar | Order berhasil dibuat |
| CHK-02 | Customer | Checkout | Checkout tanpa alamat | Tidak ada alamat | Klik checkout | Error: alamat wajib diisi |
| CHK-03 | Customer | Checkout | Checkout dengan voucher | Voucher valid | Masukkan kode voucher | Diskon diterapkan |
| CHK-04 | Customer | Checkout | Checkout dengan voucher kadaluarsa | Voucher expired | Masukkan kode voucher | Error: voucher tidak valid |

### 6. PAYMENT

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| PAY-01 | Customer | Pembayaran | Upload bukti transfer bank | Order pending | Upload gambar bukti bayar | Bukti berhasil diupload, status berubah |
| PAY-02 | Customer | Pembayaran | Upload bukti QRIS | Order pending | Upload gambar bukti bayar | Bukti berhasil diupload |
| PAY-03 | Admin | Validasi | Verifikasi bukti bayar valid | Ada bukti bayar | Klik verifikasi | Order status: DIPROSES, notifikasi ke customer |
| PAY-04 | Admin | Validasi | Tolak bukti bayar | Ada bukti bayar | Klik tolak + alasan | Order status: kembali ke MENUNGGU_PEMBAYARAN |
| PAY-05 | Customer | Pelunasan | Bayar pelunasan DP | Custom order DP terbayar | Upload bukti pelunasan | Pelunasan tercatat |

### 7. ORDER

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| ORD-01 | Customer | Pesanan | Lihat daftar pesanan | Punya pesanan | Buka /pesanan | Daftar pesanan ditampilkan |
| ORD-02 | Customer | Pesanan | Lihat detail pesanan | Ada pesanan | Klik pesanan | Detail + timeline ditampilkan |
| ORD-03 | Customer | Pesanan | Batalkan pesanan | Status: MENUNGGU_PEMBAYARAN | Klik batalkan | Pesanan dibatalkan, stok dikembalikan |
| ORD-04 | Customer | Pesanan | Konfirmasi diterima | Status: DIKIRIM | Klik konfirmasi diterima | Status: SELESAI |
| ORD-05 | Admin | Pesanan | Proses pesanan | Status: MENUNGGU_KONFIRMASI | Klik proses | Status: DIPROSES |
| ORD-06 | Admin | Pesanan | Kirim pesanan | Status: DIPROSES | Isi no resi, klik kirim | Status: DIKIRIM, notifikasi ke customer |

### 8. CUSTOM ORDER

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| CST-01 | Customer | Custom Order | Submit custom order | Login | Isi form lengkap + submit | Custom order dibuat, status: SUBMITTED |
| CST-02 | Admin | Custom Order | Set estimasi | Ada custom order | Input harga + DP + estimasi | Status: ESTIMATED, notifikasi ke customer |
| CST-03 | Customer | Custom Order | Approve estimasi | Estimasi diterima | Klik approve | Status: APPROVED |
| CST-04 | Customer | Custom Order | Reject estimasi | Estimasi diterima | Klik reject | Status: REJECTED |
| CST-05 | Customer | Custom Order | Bayar DP | Status: APPROVED | Upload bukti bayar DP | Status: MENUNGGU_VERIFIKASI_DP |
| CST-06 | Admin | Custom Order | Verifikasi DP | Ada bukti DP | Klik verifikasi | Status: DIPROSES |
| CST-07 | Admin | Custom Order | Update progress | Status: DIPROSES | Input tahap + deskripsi + foto | Progress tercatat |
| CST-08 | Customer | Custom Order | Bayar pelunasan | Status: SIAP_DILUNASI | Upload bukti pelunasan | Status: MENUNGGU_VERIFIKASI_PELUNASAN |

### 9. COMPLAINT

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| KMP-01 | Customer | Komplain | Buat komplain | Order selesai, within 72 jam | Pilih order, jenis, tindakan, upload bukti | Komplain dibuat, status: BARU |
| KMP-02 | Admin | Komplain | Terima komplain | Komplain baru | Klik accept | Status: DISETUJUI |
| KMP-03 | Admin | Komplain | Tolak komplain | Komplain baru | Klik reject + alasan | Status: DITOLAK |
| KMP-04 | Customer | Komplain | Chat dalam komplain | Komplain aktif | Kirim pesan | Pesan terkirim real-time |
| KMP-05 | Customer | Komplain | Cancel komplain | Komplain aktif | Klik cancel | Komplain dibatalkan |

### 10. REFUND

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| RFD-01 | Customer | Refund | Isi form refund | Komplain disetujui | Isi rekening bank | Refund request tercatat |
| RFD-02 | Customer | Refund | Kirim barang balik | Refund approved | Upload bukti kirim | Status: DIKIRIM_BALIK |
| RFD-03 | Admin | Refund | Terima barang | Barang diterima | Klik received | Status: DITERIMA_ADMIN |
| RFD-04 | Admin | Refund | Transfer refund | Status: DITERIMA_ADMIN | Upload bukti transfer | Status: TRANSFER_DIKIRIM |
| RFD-05 | Customer | Refund | Konfirmasi terima refund | Transfer terkirim | Klik konfirmasi | Status: SELESAI |

### 11. TUKAR

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| TKR-01 | Customer | Tukar | Pilih varian baru | Komplain disetujui | Pilih ukuran/warna baru | Tukar request tercatat |
| TKR-02 | Customer | Tukar | Kirim barang lama | Tukar approved | Upload bukti kirim | Status: DIKIRIM_BALIK |
| TKR-03 | Admin | Tukar | Kirim varian baru | Barang lama diterima | Input no resi | Status: VARIAN_BARU_DIKIRIM |
| TKR-04 | Customer | Tukar | Konfirmasi terima | Varian baru dikirim | Klik konfirmasi | Status: SELESAI |

### 12. REVIEW

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| Rvw-01 | Customer | Ulasan | Tulis ulasan | Order selesai | Rating + komentar + foto | Ulasan berhasil dibuat |
| Rvw-02 | Customer | Ulasan | Tulis ulasan untuk order belum selesai | Order belum selesai | Coba tulis ulasan | Error: belum bisa ulas |
| Rvw-03 | Admin | Ulasan | Sembunyikan ulasan | Ulasan ada | Klik hide | Ulasan tersembunyi |
| Rvw-04 | Admin | Ulasan | Balas ulasan | Ulasan ada | Ketik balasan | Balasan tercatat |

### 13. CHAT

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| CHT-01 | Customer | Chat | Kirim pesan chat | Login | Ketik + kirim pesan | Pesan terkirim, admin terima real-time |
| CHT-02 | Admin | Chat | Balas pesan chat | Ada chat room | Ketik + kirim balasan | Balasan terkirim, customer terima real-time |
| CHT-03 | Customer | Chat | Kirim gambar di chat | Login | Upload gambar | Gambar terkirim |

### 14. NOTIFICATION

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| NTF-01 | Customer | Notifikasi | Lihat notifikasi | Punya notifikasi | Buka /notifikasi | Daftar notifikasi ditampilkan |
| NTF-02 | Customer | Notifikasi | Tandai sudah dibaca | Ada notifikasi unread | Klik notifikasi | Status: read |
| NTF-03 | Customer | Notifikasi | Tandai semua sudah dibaca | Ada notifikasi unread | Klik "Tandai semua" | Semua notifikasi: read |

### 15. ADMIN DASHBOARD

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| ADM-01 | Admin | Dashboard | Lihat ringkasan | Admin login | Buka /admin/dashboard | Revenue, orders, customers ditampilkan |
| ADM-02 | Admin | Dashboard | Lihat grafik sales trend | Admin login | Buka dashboard | Grafik revenue harian ditampilkan |
| ADM-03 | Admin | Dashboard | Lihat low stock alert | Ada produk stok rendah | Buka dashboard | Alert stok rendah ditampilkan |

### 16. ADMIN TIC

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| TIC-01 | Admin | TIC | Lihat financial summary | Admin login | Buka /admin/transaksi | Gross revenue, net profit, ratios ditampilkan |
| TIC-02 | Admin | TIC | Filter tanggal | Admin login | Pilih rentang tanggal | Data difilter sesuai tanggal |
| TIC-03 | Admin | TIC | Lihat transaksi list | Admin login | Buka tab transaksi | Daftar transaksi dengan financial breakdown |

### 17. ADMIN BROADCAST

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| BCA-01 | Admin | Broadcast | Kirim broadcast WA | Admin login | Pilih channel WA, target, pesan | Broadcast berhasil dikirim |
| BCA-02 | Admin | Broadcast | Kirim broadcast email | Admin login | Pilih channel email, target, pesan | Broadcast berhasil dikirim |
| BCA-03 | Admin | Broadcast | Pause broadcast | Broadcast sedang proses | Klik pause | Broadcast berhenti sementara |
| BCA-04 | Admin | Broadcast | Cancel broadcast | Broadcast sedang proses | Klik cancel | Broadcast dibatalkan |

### 18. AUDIT LOG

| ID | Aktor | Fitur | Skenario | Precondition | Input | Expected Result |
|---|---|---|---|---|---|---|
| AUD-01 | Admin | Audit Log | Lihat log | Admin login | Buka /admin/audit | Log aktivitas ditampilkan |
| AUD-02 | Admin | Audit Log | Filter log | Admin login | Filter by admin/action/entity | Log difilter sesuai kriteria |

---

> Test cases di atas dibuat berdasarkan fitur yang benar-benar ditemukan dalam source code
