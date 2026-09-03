# 01_TECH_STACK_AUDIT

## TECH_STACK_AUDIT — JOGJADOELAN

| Komponen | Teknologi | Bukti | Lokasi File | Fungsi |
|---|---|---|---|---|
| Framework | Next.js 16.2.4 (App Router) | `package.json` baris 26: `"next": "16.2.4"` | `package.json:26` | Full-stack React framework dengan server-side rendering, API routes, middleware |
| Frontend | React 19.2.4, TypeScript 5 | `package.json` baris 32-33: `"react": "19.2.4"`, `"react-dom": "19.2.4"` | `package.json:32-33` | UI library |
| UI Library | shadcn/ui, Radix UI 1.4.3, Lucide React 0.469.0, Tailwind CSS 4 | `package.json` baris 23, 31, 38, 55 | `package.json:23,31,38,55` | Komponen UI, styling, icons |
| Data Fetching | TanStack React Query 5.100.14 | `package.json` baris 19 | `package.json:19` | Server state management, caching, refetching |
| Database | MySQL/MariaDB | `.env.example.txt` baris 4: `DATABASE_URL="mysql://root@localhost:3306/jogjadoelan_db"` | `.env.example.txt:4` | Relational database |
| ORM | Prisma 7.8.0 (`@prisma/client`, `@prisma/adapter-mariadb`) | `package.json` baris 17-18: `"@prisma/client": "^7.8.0"`, `"@prisma/adapter-mariadb": "^7.8.0"` | `package.json:17-18` | Database ORM, schema management, migrations |
| Authentication | NextAuth.js v5.0.0-beta.31 (JWT strategy) | `package.json` baris 27: `"next-auth": "5.0.0-beta.31"` | `package.json:27` | User authentication (Credentials + Google OAuth) |
| Auth Providers | Google OAuth, User Credentials, Admin Credentials | `lib/auth.ts` baris 26-85 | `lib/auth.ts:26-85` | Multi-provider login |
| Payment | Manual Transfer Bank, QRIS (manual verification) | Database model `payment` (schema.prisma:390-417), `qrisconfig` (schema.prisma:492-498) | `prisma/schema.prisma:390-498` | Customer upload bukti bayar, admin verifikasi manual |
| Email | Resend SDK | `package.json` baris 35: `"resend": "^6.12.4"`, `lib/email/provider.ts` | `lib/email/provider.ts` | Transactional email (30+ template), broadcast email |
| WhatsApp | Fonnte API (`api.fonnte.com/send`) | `lib/whatsapp.ts` baris 54, `.env.example.txt` baris 50 | `lib/whatsapp.ts:54` | Transactional WA (7 template), broadcast WA |
| Realtime | Pusher Channels (cluster: ap1) | `package.json` baris 29-30: `"pusher": "^5.3.3"`, `"pusher-js": "^8.5.0"` | `lib/pusher-server.ts` | Live chat, admin notifications, typing indicators |
| Shipping | Biteship API (J&T Express) | `lib/biteship.ts`, `.env.example.txt` baris 75 (BITESHIP_API_KEY) | `lib/biteship.ts` | Kalkulasi ongkir real-time, area search |
| Storage | Vercel Blob | `package.json` baris 20: `"@vercel/blob": "^2.4.0"` | `package.json:20` | File upload (gambar produk, bukti bayar, dll) |
| Validation | Zod 4.4.3 | `package.json` baris 42: `"zod": "^4.4.3"` | `package.json:42` | Input validation di API routes dan forms |
| Rate Limiting | Custom in-memory sliding window | `lib/rate-limit.ts`, `middleware.ts` baris 7 | `lib/rate-limit.ts` | Edge-compatible rate limiting per IP |
| Cache | Custom in-memory server cache | `lib/server-cache.ts` | `lib/server-cache.ts` | TTL-based caching untuk data yang jarang berubah |
| Deployment | Vercel (implied by cron endpoint, Vercel Blob) | README.md baris 39, `app/api/cron/expire-orders/` | `README.md:39` | Hosting, serverless functions, cron jobs |
| Logging | Custom logger | `lib/logger.ts` | `lib/logger.ts` | Application logging |
| Build Tool | pnpm | `pnpm-lock.yaml`, `pnpm-workspace.yaml` | `pnpm-lock.yaml` | Package manager |
| Linting | ESLint 9 + eslint-config-next | `package.json` baris 52-53 | `package.json:52-53` | Code quality |
| Image Processing | Sharp 0.34.5 | `package.json` baris 37: `"sharp": "^0.34.5"` | `package.json:37` | Image compression/optimization |
| Notifications UI | Sonner 2.0.7 | `package.json` baris 38: `"sonner": "^2.0.7"` | `package.json:38` | Toast notifications di client-side |
| Theming | next-themes 0.4.6 | `package.json` baris 28: `"next-themes": "^0.4.6"` | `package.json:28` | Dark/light mode |

### Catatan Teknis

- **38 Prisma models** ditemukan di `prisma/schema.prisma`
- **168+ API route files** ditemukan di `app/api/`
- **58 customer pages** ditemukan di `app/(customer)/`
- **45 admin pages** ditemukan di `app/admin/`
- **76 lib files** ditemukan di `lib/`
- **4 email template files** dengan 30+ template functions di `lib/email/templates/`
- **6 external integrations**: Resend, Fonnte, Pusher, Biteship, Google OAuth, Vercel Blob
- **Rate limiting** berjenjang: Auth (10/min), Upload (20/min), Write (30/min), Read (100/min)
- **Cache-Control** adaptif: auth/upload = no-store, user data = must-revalidate, public data = 60s

---

> Semua data di atas bersumber dari: source code, package.json, schema.prisma, .env.example.txt, README.md, dan file-file di dalam lib/
