import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, MessageCircle, Store, Package,
  ShoppingBag, Receipt, FileCheck, AlertCircle, RotateCcw, Star,
  Users, Landmark, Truck, Tag, Megaphone, BarChart3, Settings,
  Wrench, UserCircle, Lock, LogOut, TrendingUp, Palette,
  Bell, Shield,
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
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Transaction Intelligence", href: "/admin/audit", icon: TrendingUp },
    ],
  },
  {
    title: "SALES",
    items: [
      { label: "Pesanan", href: "/admin/penjualan", icon: ShoppingBag, badgeKey: "penjualan" },
      { label: "Custom Order", href: "/admin/custom", icon: Wrench, badgeKey: "custom" },
      { label: "Validasi Pembayaran", href: "/admin/validasi-bukti", icon: FileCheck, badgeKey: "validasi" },
      { label: "Riwayat Transaksi", href: "/admin/transaksi", icon: Receipt },
      { label: "Pengiriman & Ekspedisi", href: "/admin/ekspedisi", icon: Truck },
    ],
  },
  {
    title: "CATALOG",
    items: [
      { label: "Kelola Produk", href: "/admin/produk", icon: Package, badgeKey: "stok" },
      { label: "Voucher & Promo", href: "/admin/promo", icon: Tag },
    ],
  },
  {
    title: "CUSTOMER",
    items: [
      { label: "Data Pelanggan", href: "/admin/pelanggan", icon: Users },
      { label: "Ulasan Produk", href: "/admin/ulasan", icon: Star, badgeKey: "ulasan" },
      { label: "Room Chat", href: "/admin/chat", icon: MessageCircle, badgeKey: "chat" },
    ],
  },
  {
    title: "AFTER SALES",
    items: [
      { label: "Komplain", href: "/admin/komplain", icon: AlertCircle, badgeKey: "komplain" },
      { label: "Return & Tukar", href: "/admin/return", icon: RotateCcw, badgeKey: "return" },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      { label: "Pusat Notifikasi", href: "/admin/notifikasi", icon: Bell },
      { label: "Broadcast WhatsApp", href: "/admin/broadcast", icon: Megaphone },
    ],
  },
  {
    title: "REPORTS",
    items: [
      { label: "Laporan Keuangan", href: "/admin/laporan", icon: BarChart3 },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Bank & QRIS", href: "/admin/bank", icon: Landmark },
      { label: "Pengaturan Toko", href: "/admin/toko/landing", icon: Store },
      { label: "Profil Admin", href: "/admin/akun/edit", icon: UserCircle },
      { label: "Activity Log", href: "/admin/audit?tab=activity", icon: Shield },
      { label: "Logout", href: "/admin/logout", icon: LogOut },
    ],
  },
];

// === STORAGE KEYS ===
export const ADMIN_STORAGE_KEYS = {
  session: "jogjadoelan_admin_session",
  broadcastHistory: "jogjadoelan_broadcast_history",
} as const;