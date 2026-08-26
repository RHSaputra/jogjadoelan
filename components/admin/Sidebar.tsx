"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ADMIN_MENU } from "@/lib/admin-constants";
import { useAdminCounters } from "@/lib/use-admin-counters";
import { useAdminAuth } from "@/lib/admin-context";
import { useSession } from "next-auth/react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const counters = useAdminCounters();
  const { admin, isLoading } = useAdminAuth();
  const { data: session } = useSession();

  // Check if current user is super admin
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#FFF3E0] text-gray-900 shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Logo + close */}
        <div className="flex h-16 items-center justify-between border-b border-black/10 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-orange-600 shadow">JD</div>
            <div>
              <p className="text-sm font-black leading-none text-gray-900">JOGJADOELAN</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-700">Admin Panel</p>
            </div>
          </Link>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-700 hover:bg-black/5 lg:hidden">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Profile - only show for non-super admins */}
        {!isSuperAdmin && !isLoading && admin ? (
          <div className="flex flex-col items-center pt-4 pb-6 border-b border-black/10">
            <div className="relative h-12 w-12">
              {admin.foto ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={admin.foto}
                  alt="Profile"
                  className="h-12 w-12 rounded-full border-2 border-white object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-sm font-black text-white">
                  {/* Show first character of nama as fallback, or "?" if empty */}
                  {admin.nama ? admin.nama.charAt(0) : "?"}
                </div>
              )}
            </div>
            <p className="mt-2 text-sm font-black text-gray-800">{admin.nama || "-"}</p>
            <p className="text-xs text-gray-500">@{admin.username || "-"}</p>
          </div>
        ) : !isSuperAdmin && (
          // Loading placeholder (only for non-super admins)
          <div className="flex flex-col items-center pt-4 pb-6 border-b border-black/10">
            <div className="h-12 w-12 rounded-full bg-orange-200 flex items-center justify-center">
              <p className="text-xs font-black">...</p>
            </div>
            <p className="mt-2 text-sm font-black text-gray-600">Memuat...</p>
          </div>
        )}

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {ADMIN_MENU.map((sec) => (
            <div key={sec.title} className="mb-5">
              <p className="mb-1.5 px-2 text-[10px] font-black uppercase tracking-widest text-gray-700">{sec.title}</p>
              <div className="space-y-0.5">
                                {sec.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                  const liveCount = item.badgeKey ? counters[item.badgeKey] : 0;
                  return (
                    <Link key={item.href} href={item.href} onClick={onClose}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-black transition ${
                        active ? "bg-white text-orange-600 shadow-md" : "text-gray-700 hover:bg-white/40 hover:text-gray-900"
                      }`}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[8px] font-black text-gray-800">{item.badge}</span>
                      )}
                      {liveCount > 0 && (
                        <span
                          aria-label={`${liveCount} butuh aksi`}
                          className={`min-w-[26px] rounded-full px-2 py-1 text-center text-xs font-black tabular-nums shadow leading-tight ${
                            active
                              ? "bg-orange-500 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
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

        {/* Footer */}
        <div className="border-t border-black/10 p-3 text-center text-[10px] text-gray-600">
          © 2026 Jogjadoelan v1.0
        </div>
      </aside>
    </>
  );
}