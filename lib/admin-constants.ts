import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, MessageCircle, Store, Package,
  ShoppingBag, Receipt, FileCheck, AlertCircle, RotateCcw, Star,
  Users, Landmark, Truck, Tag, Megaphone, BarChart3, Settings,
  Wrench, UserCircle, Lock, LogOut, TrendingUp, Palette,
} from "lucide-react";

// === HARDCODED ADMIN CREDENTIALS (MOCK) ===
// PENTING: Password default ini WAJIB diganti via /admin/akun/password setelah login pertama.
// Override tersimpan di localStorage key `jogjadoelan_admin_password_<username>`.
export const ADMIN_CREDENTIALS = [
  { username: "admin", password: "admin123", nama: "Super Admin", email: "jogjadoelantechforlocal.id@gmail.com", noHp: "081234567890" },
];

export interface AdminUser {
  username: string;
  nama: string;
  email: string;
  noHp: string;
  foto?: string;
  loggedAt: string;
}

// === ADMIN COLOR THEME (Dark Navy + Orange Accent) ===
export const ADMIN_COLORS = {
  navy: "#0E2148",
  navyDark: "#09152E",
  navyLight: "#1A3066",
  orange: "#FF6B1A",
  orangeDark: "#E55A0F",
  cream: "#F5EBD6",
  white: "#FFFFFF",
  gray: "#F1F3F8",
} as const;

// === SIDEBAR MENU STRUCTURE ===
/** BATCH F: key untuk live counter dari useAdminCounters() */
export type AdminBadgeKey = "chat" | "validasi" | "penjualan" | "custom" | "komplain" | "ulasan" | "return" | "stok";

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** label statis (mis. "BETA") — pakai badgeKey utk angka dinamis */
  badge?: string;
  /** BATCH F: kalau diisi, sidebar render angka live dari useAdminCounters() */
  badgeKey?: AdminBadgeKey;
}
export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const ADMIN_MENU: MenuSection[] = [
  {
    title: "UTAMA",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Room Chat", href: "/admin/chat", icon: MessageCircle, badgeKey: "chat" },
    ],
  },
  {
    title: "KELOLA TOKO",
    items: [
      { label: "Halaman Utama", href: "/admin/toko/landing", icon: LayoutDashboard },
      { label: "Informasi & Lokasi Toko", href: "/admin/toko/cabang", icon: Store },
      { label: "FAQ", href: "/admin/toko/faq", icon: AlertCircle },
      { label: "Operasional & Libur", href: "/admin/toko/operasional", icon: Wrench },
      { label: "Footer Customizer", href: "/admin/toko/footer", icon: Settings },
      { label: "Form Custom Helm", href: "/admin/toko/custom", icon: Palette },
    ],
  },
  {
    title: "PRODUK & PROMO",
    items: [
      { label: "Kelola Produk", href: "/admin/produk", icon: Package, badgeKey: "stok" },
      { label: "Promo & Voucher", href: "/admin/promo", icon: Tag },
      { label: "Pelanggan", href: "/admin/pelanggan", icon: Users },
    ],
  },
   {
    title: "PENJUALAN",
    items: [
      { label: "Penjualan Saya", href: "/admin/penjualan", icon: ShoppingBag, badgeKey: "penjualan" },
      { label: "Validasi Bukti", href: "/admin/validasi-bukti", icon: FileCheck, badgeKey: "validasi" },
      { label: "Transaksi", href: "/admin/transaksi", icon: Receipt },
      { label: "Custom Order", href: "/admin/custom", icon: Wrench, badgeKey: "custom" },
      { label: "Komplain", href: "/admin/komplain", icon: AlertCircle, badgeKey: "komplain" },
      { label: "Return", href: "/admin/return", icon: RotateCcw, badgeKey: "return" },
      { label: "Ulasan", href: "/admin/ulasan", icon: Star, badgeKey: "ulasan" },
    ],
  },
   {
    title: "OPERASIONAL",
    items: [
      { label: "Bank & Rekening", href: "/admin/bank", icon: Landmark },
      { label: "Ekspedisi", href: "/admin/ekspedisi", icon: Truck },
      { label: "Broadcast Notif", href: "/admin/broadcast", icon: Megaphone },
      { label: "Laporan", href: "/admin/laporan", icon: BarChart3 },
      { label: "Transaction Intelligence", href: "/admin/audit", icon: TrendingUp },
    ],
  },
  {
    title: "AKUN",
    items: [
      { label: "Edit Akun", href: "/admin/akun/edit", icon: UserCircle },
      { label: "Ganti Password", href: "/admin/akun/password", icon: Lock },
      { label: "Logout", href: "/admin/logout", icon: LogOut },
    ],
  },
];

// === STORAGE KEYS ===
export const ADMIN_STORAGE_KEYS = {
  session: "jogjadoelan_admin_session",
  broadcastHistory: "jogjadoelan_broadcast_history",
} as const;