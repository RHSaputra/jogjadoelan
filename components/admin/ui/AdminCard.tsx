"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AdminCardProps {
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  hoverEffect?: boolean;
}

export function AdminCard({
  children,
  className,
  headerClassName,
  bodyClassName,
  title,
  subtitle,
  icon,
  badge,
  action,
  footer,
  hoverEffect = false,
}: AdminCardProps) {
  const hasHeader = Boolean(title || subtitle || icon || badge || action);

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden",
        hoverEffect && "transition-all duration-200 hover:shadow-md hover:border-slate-300",
        className
      )}
    >
      {hasHeader && (
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4",
            headerClassName
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B1A] border border-orange-100">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {title && (
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight truncate">
                    {title}
                  </h3>
                )}
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && (
            <div className="flex items-center gap-2 flex-shrink-0 sm:self-center">
              {action}
            </div>
          )}
        </div>
      )}

      <div className={cn("p-5", bodyClassName)}>
        {children}
      </div>

      {footer && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
}
