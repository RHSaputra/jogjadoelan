"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import { ADMIN_MENU } from "@/lib/admin-constants";
import { useAdminCounters } from "@/lib/use-admin-counters";
import { useAdminAuth } from "@/lib/admin-context";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const counters = useAdminCounters();
  const { admin, isLoading, logout } = useAdminAuth();
  const { data: session } = useSession();

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0F172A] text-slate-100 shadow-2xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 border-r border-slate-800",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Logo Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF6B1A] to-amber-500 text-sm font-black text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              JD
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-white leading-none">
                JOGJADOELAN
              </p>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
                Admin Console
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Admin Profile Strip */}
        <div className="px-3 py-3 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="relative h-8 w-8 flex-shrink-0">
              {admin?.foto ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={admin.foto}
                  alt="Profile"
                  className="h-8 w-8 rounded-lg object-cover border border-slate-700"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-xs font-black text-amber-400 border border-slate-700">
                  {admin?.nama ? admin.nama.charAt(0) : "A"}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#0F172A]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate leading-tight">
                {admin?.nama || (isLoading ? "Memuat..." : "Admin")}
              </p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">
                {isSuperAdmin ? "Super Admin" : "Staff Operasional"}
              </p>
            </div>

            <button
              onClick={() => logout()}
              title="Logout"
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Grouped Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {ADMIN_MENU.map((sec) => (
            <div key={sec.title}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/90">
                {sec.title}
              </p>

              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/admin" && pathname.startsWith(item.href));
                  const liveCount = item.badgeKey ? counters[item.badgeKey] : 0;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all duration-150 group",
                        active
                          ? "bg-[#FF6B1A] text-white shadow-md shadow-orange-500/25 font-bold"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active
                            ? "text-white"
                            : "text-slate-400 group-hover:text-slate-200"
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>

                      {item.badge && (
                        <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
                          {item.badge}
                        </span>
                      )}

                      {liveCount > 0 && (
                        <span
                          className={cn(
                            "min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-extrabold tabular-nums leading-none",
                            active
                              ? "bg-white text-[#FF6B1A]"
                              : "bg-[#FF6B1A] text-white shadow-sm"
                          )}
                        >
                          {liveCount > 99 ? "99+" : liveCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer info */}
        <div className="border-t border-slate-800/80 p-3 text-center text-[10px] text-slate-400 font-medium">
          Jogjadoelan Enterprise v2.0
        </div>
      </aside>
    </>
  );
}