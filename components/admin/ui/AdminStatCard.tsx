"use client";

import { type ReactNode, type ElementType } from "react";
import { cn } from "@/lib/utils";

export type StatColor = "orange" | "blue" | "emerald" | "amber" | "purple" | "rose" | "slate";

export interface AdminStatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: ElementType;
  color?: StatColor;
  trend?: {
    value: string;
    isUp?: boolean;
    isNeutral?: boolean;
  };
  badge?: ReactNode;
  alert?: boolean;
  className?: string;
  onClick?: () => void;
}

const colorMap: Record<StatColor, { bg: string; text: string; border: string }> = {
  orange:  { bg: "bg-orange-50",  text: "text-[#FF6B1A]", border: "border-orange-100" },
  blue:    { bg: "bg-sky-50",     text: "text-sky-600",    border: "border-sky-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600",  border: "border-amber-100" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-600", border: "border-purple-100" },
  rose:    { bg: "bg-rose-50",    text: "text-rose-600",   border: "border-rose-100" },
  slate:   { bg: "bg-slate-100",  text: "text-slate-600",  border: "border-slate-200" },
};

export function AdminStatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color = "orange",
  trend,
  badge,
  alert,
  className,
  onClick,
}: AdminStatCardProps) {
  const theme = colorMap[color] || colorMap.orange;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition-all duration-200",
        onClick ? "cursor-pointer hover:shadow-md hover:border-slate-300" : "hover:border-slate-300/80",
        className
      )}
    >
      {alert && (
        <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
            {label}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {value}
            </span>
            {badge}
          </div>

          {(subtitle || trend) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              {trend && (
                <span
                  className={cn(
                    "font-bold text-[11px]",
                    trend.isNeutral
                      ? "text-slate-500"
                      : trend.isUp
                      ? "text-emerald-600"
                      : "text-rose-600"
                  )}
                >
                  {trend.value}
                </span>
              )}
              {subtitle && (
                <span className="text-slate-500 text-[11px] truncate">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border transition-transform duration-200",
            theme.bg,
            theme.text,
            theme.border
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
