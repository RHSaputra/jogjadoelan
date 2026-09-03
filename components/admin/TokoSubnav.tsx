"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Clock, Wrench, HelpCircle,
  MapPin, AlignLeft, Palette, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOKO_TABS = [
  { href: "/admin/toko/landing", label: "Beranda Toko", icon: LayoutDashboard },
  { href: "/admin/toko/operasional", label: "Operasional & Libur", icon: Clock },
  { href: "/admin/toko/custom", label: "Opsi Custom Helm", icon: Wrench },
  { href: "/admin/toko/faq", label: "FAQ", icon: HelpCircle },
  { href: "/admin/toko/cabang", label: "Cabang & Lokasi", icon: MapPin },
  { href: "/admin/toko/footer", label: "Footer", icon: AlignLeft },
  { href: "/admin/pengaturan", label: "Pengaturan Umum", icon: Settings },
];

export function TokoSubnav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200/80 bg-white -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 lg:-mx-6 lg:-mt-6 mb-6 px-4 sm:px-6">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
        {TOKO_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0",
                isActive
                  ? "bg-[#FF6B1A] text-white shadow-xs font-bold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
