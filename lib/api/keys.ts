// lib/api/keys.ts
// Central registry semua React Query keys.
// Pakai factory pattern supaya invalidation gampang & type-safe.

export const qk = {
  auth: {
    all: ["auth"] as const,
    me: () => [...qk.auth.all, "me"] as const,
  },
  produk: {
    all: ["produk"] as const,
    list: (filter?: Record<string, unknown>) =>
      [...qk.produk.all, "list", filter ?? {}] as const,
    detail: (id: string) => [...qk.produk.all, "detail", id] as const,
    byIds: (ids: string[]) => ["produk", "byIds", [...ids].sort().join(",")] as const,
  },

  order: {
    all: ["order"] as const,
    list: (filter?: Record<string, unknown>) =>
      [...qk.order.all, "list", filter ?? {}] as const,
    detail: (id: string) => [...qk.order.all, "detail", id] as const,
    mine: () => [...qk.order.all, "mine"] as const,
  },
  cart: {
    all: ["cart"] as const,
    mine: () => [...qk.cart.all, "mine"] as const,
    list: (uid: string) => [...qk.cart.all, "list", uid] as const,
  },
  wishlist: {
    all: ["wishlist"] as const,
    mine: () => [...qk.wishlist.all, "mine"] as const,
    list: (uid: string) => [...qk.wishlist.all, "list", uid] as const,
  },
  custom: {
    all: ["custom"] as const,
    list: () => [...qk.custom.all, "list"] as const,
    detail: (id: string) => [...qk.custom.all, "detail", id] as const,
  },
  komplain: {
    list: () => ["komplain"] as const,
    byId: (id: string) => ["komplain", id] as const,
    stats: () => ["komplain", "stats"] as const,
    adminList: (q: Record<string, string>) => ["admin-komplain", q] as const,
  },
  refund: {
    all: ["refund"] as const,
    list: () => [...qk.refund.all, "list"] as const,
    detail: (id: string) => [...qk.refund.all, "detail", id] as const,
  },
  tukar: {
    all: ["tukar"] as const,
    list: () => [...qk.tukar.all, "list"] as const,
    detail: (id: string) => [...qk.tukar.all, "detail", id] as const,
  },
  ulasan: {
    mine: (uid: string) => ["ulasan", "mine", uid] as const,
    pending: (uid: string) => ["ulasan", "pending", uid] as const,
    byProduk: (produkId: string) => ["ulasan", "produk", produkId] as const,
    adminList: (q: object) => ["ulasan", "admin", q] as const,
  },
  notif: {
    list: (uid: string) => ["notif", uid] as const,
    unread: (uid: string) => ["notif", uid, "unread"] as const,
  },
  chat: {
    all: ["chat"] as const,
    mine: () => [...qk.chat.all, "mine"] as const,
  },
  voucher: {
    all: ["voucher"] as const,
    list: () => [...qk.voucher.all, "list"] as const,
  },
  admin: {
    all: ["admin"] as const,
    counters: () => [...qk.admin.all, "counters"] as const,
    users: (filter?: Record<string, unknown>) => [...qk.admin.all, "users", filter ?? {}] as const,
    orders: (filter?: Record<string, unknown>) => [...qk.admin.all, "orders", filter ?? {}] as const,
    payments: (filter?: Record<string, unknown>) => [...qk.admin.all, "payments", filter ?? {}] as const,
  },
  settings: {
    all: ["settings"] as const,
    section: (key: string) => [...qk.settings.all, key] as const,
    banks: () => [...qk.settings.all, "banks"] as const,
    qris: () => [...qk.settings.all, "qris"] as const,
    ekspedisi: () => [...qk.settings.all, "ekspedisi"] as const,
    instruksi: () => [...qk.settings.all, "instruksi"] as const,
    faq: () => [...qk.settings.all, "faq"] as const,
    libur: () => [...qk.settings.all, "libur"] as const,
  },
  dashboard: {
    summary: () => ["dashboard", "summary"] as const,
    salesTrend: (days: number) => ["dashboard", "sales-trend", days] as const,
    topProducts: (days: number, limit: number) => ["dashboard", "top", days, limit] as const,
    lowStock: (threshold: number) => ["dashboard", "low-stock", threshold] as const,
    recentOrders: (limit: number) => ["dashboard", "recent", limit] as const,
  },
  audit: {
    list: (f: object) => ["audit", f] as const,
  },
} as const;