# 07_NOTIFICATION_AUDIT

## NOTIFICATION AUDIT — JOGJADOELAN

### 1. Email Notification

| Trigger | Dispatcher | Channel | Recipient | Output | Bukti |
|---|---|---|---|---|---|
| Registrasi | `dispatchNotification("registrasi")` | Resend API | Customer (email) | Welcome email | `lib/notification-dispatcher.ts:248-255` |
| OTP Verifikasi | `dispatchNotification("otp")` | Resend API | Customer (email) | Kode OTP | `lib/notification-dispatcher.ts:256-264` |
| Order Dibuat | `dispatchNotification("order-created")` | Resend API | Customer (email) | Detail pesanan + total + expired | `lib/notification-dispatcher.ts:190-199` |
| Pembayaran Berhasil | `dispatchNotification("payment-success")` | Resend API | Customer (email) | Konfirmasi pembayaran | `lib/notification-dispatcher.ts:212-219` |
| Pesanan Diproses | `dispatchNotification("order-processing")` | Resend API | Customer (email) | Update status proses | `lib/notification-dispatcher.ts:230-236` |
| Pesanan Dikirim | `dispatchNotification("order-shipped")` | Resend API | Customer (email) | No resi + ekspedisi | `lib/notification-dispatcher.ts:201-210` |
| Pesanan Selesai | `dispatchNotification("order-completed")` | Resend API | Customer (email) | Konfirmasi selesai + ajakan ulasan | `lib/notification-dispatcher.ts:221-228` |
| Lupa Password | `dispatchNotification("forgot-password")` | Resend API | Customer (email) | Link reset password | `lib/notification-dispatcher.ts:239-246` |
| Order Baru (Admin) | `sendAdminEmail("new-order")` | Resend API | Admin (email) | Alert order baru | `lib/email/send.ts` |
| Pembayaran Baru (Admin) | `sendAdminEmail("new-payment")` | Resend API | Admin (email) | Alert pembayaran baru | `lib/email/send.ts` |
| Stok Rendah (Admin) | `sendAdminEmail("low-stock")` | Resend API | Admin (email) | Alert stok rendah | `lib/email/send.ts` |
| Komplain Baru (Admin) | `sendAdminEmail("new-komplain")` | Resend API | Admin (email) | Alert komplain baru | `lib/email/send.ts` |
| Broadcast Email | `sendBroadcastToRecipient()` | Resend API | Multi-recipient | Email massal | `lib/notification/broadcast-sender.ts` |

### 2. WhatsApp Notification

| Trigger | Dispatcher | Channel | Recipient | Output | Bukti |
|---|---|---|---|---|---|
| Registrasi | `dispatchNotification("registrasi")` | Fonnte API | Customer (WA) | Pesan selamat datang | `lib/notification-dispatcher.ts:382-384` |
| OTP | `dispatchNotification("otp")` | Fonnte API | Customer (WA) | Kode OTP | `lib/notification-dispatcher.ts:386-388` |
| Order Dibuat | `dispatchNotification("order-created")` | Fonnte API | Customer (WA) | Detail pesanan + link | `lib/notification-dispatcher.ts:357-361` |
| Pembayaran Berhasil | `dispatchNotification("payment-success")` | Fonnte API | Customer (WA) | Konfirmasi pembayaran | `lib/notification-dispatcher.ts:366-369` |
| Pesanan Diproses | `dispatchNotification("order-processing")` | Fonnte API | Customer (WA) | Update status | `lib/notification-dispatcher.ts:374-377` |
| Pesanan Dikirim | `dispatchNotification("order-shipped")` | Fonnte API | Customer (WA) | No resi + tracking | `lib/notification-dispatcher.ts:362-365` |
| Pesanan Selesai | `dispatchNotification("order-completed")` | Fonnte API | Customer (WA) | Konfirmasi + ajakan ulasan | `lib/notification-dispatcher.ts:370-373` |
| Lupa Password | `dispatchNotification("forgot-password")` | Fonnte API | Customer (WA) | Link reset password | `lib/notification-dispatcher.ts:378-381` |
| Broadcast WA | `runWhatsappBroadcast()` | Fonnte API | Multi-recipient | Pesan massal | `lib/whatsapp.ts:196-293` |

### 3. In-App Notification

| Trigger | Dispatcher | Channel | Recipient | Output | Bukti |
|---|---|---|---|---|---|
| Order Status Change | `prisma.notifikasi.create()` | Database | Customer | Notifikasi in-app | `app/api/notifikasi/route.ts` |
| Komplain Update | `prisma.notifikasi.create()` | Database | Customer | Notifikasi in-app | `app/api/notifikasi/route.ts` |
| Refund Update | `prisma.notifikasi.create()` | Database | Customer | Notifikasi in-app | `app/api/notifikasi/route.ts` |
| Tukar Update | `prisma.notifikasi.create()` | Database | Customer | Notifikasi in-app | `app/api/notifikasi/route.ts` |
| Broadcast In-App | `sendBroadcastToRecipient()` | Database | Multi-recipient | Notifikasi massal | `lib/notification/broadcast-sender.ts` |

### 4. Realtime Notification (Pusher)

| Trigger | Dispatcher | Channel | Recipient | Output | Bukti |
|---|---|---|---|---|---|
| New Order | `pushAdminNotification()` | `admin-notifications` | Admin (all connected) | Toast notification real-time | `lib/admin-notification-server.ts` |
| New Payment | `pushAdminNotification()` | `admin-notifications` | Admin | Toast notification real-time | `lib/admin-notification-server.ts` |
| New Komplain | `pushAdminNotification()` | `admin-notifications` | Admin | Toast notification real-time | `lib/admin-notification-server.ts` |
| Chat Message | Pusher trigger | `private-chat-{userId}` | Customer + Admin | Real-time chat message | `lib/pusher-server.ts` |
| Komplain Chat | Pusher trigger | `private-komplain-{komplainId}` | Customer + Admin | Real-time komplain chat | `lib/pusher-server.ts` |
| Typing Indicator | Pusher trigger | Channel-specific | Customer + Admin | Typing status | `app/api/chat/typing/route.ts` |
| Admin Counter Sync | Pusher trigger | `admin-notifications` | Admin | Counter badge update | `lib/admin-notification-server.ts` |

### 5. Channel Configuration

**Bukti:** `lib/notification-dispatcher.ts:37-57`, `sitesetting` key: `notification_channels`

Setiap event dapat dikonfigurasi secara independen untuk mengaktifkan/menonaktifkan channel email dan/atau WhatsApp melalui halaman admin `/admin/notifikasi`.

### 6. Notification Log

**Bukti:** `prisma/schema.prisma:1012-1035` model `notificationlog`:
- `channel` (email/whatsapp)
- `recipient`
- `template`
- `subject`
- `message`
- `status` (pending/sent/delivered/read/failed)
- `provider` (resend/fonnte)
- `provider_response` (Json)
- `related_order_id`
- `related_user_id`

**Log Query:** `GET /api/admin/notification/logs`, `GET /api/admin/notification/analytics`

### 7. Notification Analytics

**Bukti:** `GET /api/admin/notification/analytics` — statistik pengiriman notifikasi per channel, per event, success rate

### 8. Test Notification

**Bukti:** `POST /api/admin/notification/test` — kirim notifikasi test ke email/WA tertentu

---

> Semua data di atas bersumber dari: source code, lib/notification-dispatcher.ts, lib/whatsapp.ts, lib/email/, lib/pusher-server.ts, lib/admin-notification-server.ts
