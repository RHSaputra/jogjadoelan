"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell, ChevronDown, Menu, UserCircle, CheckCircle2,
  MessageCircle, FileCheck, ShoppingBag, Wrench, AlertCircle, Star,
  RotateCcw, Package
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin-context";
import { useAdminCounters } from "@/lib/use-admin-counters";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";

interface Props {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export function AdminTopbar({ title, subtitle, onMenuClick }: Props) {
  const { admin, logout } = useAdminAuth();
  const counters = useAdminCounters();

  // State untuk mengontrol dropdown
  const [openMenu, setOpenMenu] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);

  /* BATCH F: data list notif dinamis */
  const notifItems = [
    { count: counters.validasi, label: "Bukti Bayar Perlu Validasi", desc: "Customer sudah upload bukti transfer/QRIS, tunggu admin verifikasi.", href: "/admin/validasi-bukti", icon: FileCheck },
    { count: counters.penjualan, label: "Pesanan Siap Dikirim", desc: "Pesanan sudah lunas & masuk antrian packing/kirim.", href: "/admin/penjualan", icon: ShoppingBag },
    { count: counters.custom, label: "Custom Order Butuh Aksi", desc: "Estimasi belum diset, verifikasi pembayaran, atau siap dilunasi.", href: "/admin/custom", icon: Wrench },
    { count: counters.komplain, label: "Komplain Urgent", desc: "Komplain baru / sedang ditinjau / menunggu review admin.", href: "/admin/komplain", icon: AlertCircle },
    { count: counters.chat, label: "Pesan Chat Belum Dibalas", desc: "Customer kirim pesan, tunggu balasan admin.", href: "/admin/chat", icon: MessageCircle },
    { count: counters.ulasan, label: "Ulasan Belum Dibalas", desc: "Customer memberikan rating/ulasan baru, tunggu balasan admin.", href: "/admin/ulasan", icon: Star },
    { count: counters.return, label: "Return Perlu Tindakan", desc: "Customer meminta refund atau penukaran barang, butuh aksi admin.", href: "/admin/return", icon: RotateCcw },
    { count: counters.stok, label: "Stok Kritis / Habis", desc: "Ada varian produk yang stoknya tersisa 2 atau kurang.", href: "/admin/produk", icon: Package },
  ].filter((n) => n.count > 0);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white shadow-xs">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <button type="button" onClick={onMenuClick} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden transition-colors">
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-slate-900 sm:text-lg tracking-tight">{title}</h1>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>

        {/* Search */}
        <div className="hidden md:block">
          <AdminGlobalSearch />
        </div>

                {/* NOTIFIKASI DROPDOWN — BATCH F: REAL counter, no dummy */}
        <div className="relative">
            <button
              type="button"
              onClick={() => { setOpenNotif(!openNotif); setOpenMenu(false); }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={`Notifikasi (${counters.total} butuh aksi)`}
          >
            <Bell className="h-5 w-5" />
            {counters.total > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-[#FF6B1A] px-1 text-[10px] font-extrabold tabular-nums leading-none text-white shadow-sm ring-2 ring-white">
                {counters.total > 99 ? "99+" : counters.total}
              </span>
            )}
          </button>

          {openNotif && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpenNotif(false)} />

              <div className="absolute right-0 top-full z-40 mt-2 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200 sm:w-80">
                {/* Header */}
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">Perlu Aksi Admin</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    counters.total > 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {counters.total > 0 ? `${counters.total} Antrian` : "Aman ✓"}
                  </span>
                </div>

                {/* List dinamis */}
                <div className="max-h-[360px] overflow-y-auto">
                  {notifItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                      <p className="mt-2 text-xs font-black text-orange-600">Semua sudah ditangani</p>
                      <p className="mt-1 text-[10px] text-gray-500">Tidak ada antrian admin saat ini.</p>
                    </div>
                  ) : (
                    notifItems.map((n) => {
                      const Icon = n.icon;
                      return (
                        <Link
                          key={n.href}
                          href={n.href}
                          onClick={() => setOpenNotif(false)}
                          className="block cursor-pointer border-b border-gray-50 bg-orange-50/30 p-4 transition-colors hover:bg-orange-50/80 last:border-0"
                        >
                          <div className="flex gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF6B1A]/10 text-[#FF6B1A]">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-bold text-gray-800">{n.label}</p>
                                <span className="shrink-0 rounded-full bg-[#FF6B1A] px-2 py-0.5 min-w-[22px] text-center text-[10px] font-extrabold tabular-nums leading-none text-white shadow-sm">
                                  {n.count > 99 ? "99+" : n.count}
                                </span>
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{n.desc}</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 bg-gray-50 p-2">
                  <Link
                    href="/admin"
                    onClick={() => setOpenNotif(false)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#FF6B1A] py-2 text-[10px] font-bold text-white hover:bg-[#E55A0F] transition-colors shadow-sm"
                  >
                    Buka Dashboard
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => { setOpenMenu(!openMenu); setOpenNotif(false); }} 
            className="flex min-w-0 items-center gap-2 rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            {admin?.foto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={admin.foto}
                alt="Profile"
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-black text-white">
                {/* Show first character of nama as fallback, or "?" if empty */}
                {admin?.nama ? admin.nama.charAt(0) : "?"}
              </div>
            )}
            <div className="hidden text-left sm:block">
              <p className="text-sm font-black text-gray-800">{admin?.nama ?? "Admin"}</p>
              <p className="text-xs text-gray-500">@{admin?.username}</p>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-gray-500 sm:block" />
          </button>
          
          {openMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpenMenu(false)} />
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-gray-200 bg-white py-2 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-xs font-black text-gray-800">{admin?.nama}</p>
                  <p className="text-[10px] text-gray-500">{admin?.email}</p>
                </div>
                <Link href="/admin/akun/edit" onClick={() => setOpenMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  <UserCircle className="h-4 w-4" /> Edit Profil
                </Link>
                <button type="button" onClick={() => { setOpenMenu(false); logout(); window.location.href = "/admin/login"; }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                  Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}