"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-context";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopbar } from "@/components/admin/Topbar";
import { ADMIN_MENU } from "@/lib/admin-constants";
import { AdminNotificationProvider } from "@/components/admin/AdminNotification";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPublicPage =
    pathname === "/admin/login" ||
    pathname === "/admin/logout" ||
    pathname === "/admin/lupa-password" ||
    pathname.startsWith("/admin/lupa-password/");

  // Redirect dengan jeda 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading && !isAuthenticated && !isPublicPage) {
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, isPublicPage, pathname, router]);

  // Track interaksi (biarkan tetap)
  useEffect(() => {
    if (isPublicPage) return;
    const bump = () =>
      sessionStorage.setItem(
        "jogjadoelan_admin_last_interaction",
        String(Date.now()),
      );
    bump();
    window.addEventListener("click", bump);
    window.addEventListener("keydown", bump);
    return () => {
      window.removeEventListener("click", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [isPublicPage]);

  if (isPublicPage) return <>{children}</>;

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F1F3F8]"><p className="text-sm font-bold text-gray-900">Memuat...</p></div>;
  }
  if (!isAuthenticated) return null; // redirect di useEffect

  // Resolve current page title
  const currentItem = ADMIN_MENU.flatMap((s) => s.items).find((i) => i.href === pathname || (i.href !== "/admin" && pathname.startsWith(i.href)));
  const title = currentItem?.label ?? "Dashboard";
  const subtitle = ADMIN_MENU.find((s) => s.items.some((i) => i.href === currentItem?.href))?.title;

  return (
    <AdminNotificationProvider>
      <div className="admin-shell flex min-h-screen bg-[#F1F3F8]" data-admin-shell>
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(true)} />
          <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AdminNotificationProvider>
  );
}