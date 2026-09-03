"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  breadcrumbs,
  icon: Icon,
  badge,
  actions,
  secondaryActions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-2", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/admin" className="hover:text-slate-800 transition-colors">
            Admin
          </Link>
          {breadcrumbs.map((bc, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-slate-400" />
              {bc.href ? (
                <Link href={bc.href} className="hover:text-slate-800 transition-colors">
                  {bc.label}
                </Link>
              ) : (
                <span className="text-slate-700 font-semibold">{bc.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Main Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-[#FF6B1A] border border-orange-500/20">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {(actions || secondaryActions) && (
          <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
            {secondaryActions}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
