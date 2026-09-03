"use client";

import { type ReactNode } from "react";
import {
  CheckCircle2, Clock, Package, Truck, XCircle, AlertCircle,
  RotateCcw, ShieldCheck, Banknote, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "neutral";

export interface AdminStatusBadgeProps {
  status?: string;
  label?: string;
  variant?: StatusVariant;
  icon?: ReactNode;
  size?: "sm" | "md";
  className?: string;
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; border: string; dot: string }> = {
  success: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  warning: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  danger:  { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-500" },
  info:    { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",     dot: "bg-sky-500" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200",  dot: "bg-purple-500" },
  neutral: { bg: "bg-slate-100",  text: "text-slate-700",   border: "border-slate-200",   dot: "bg-slate-400" },
};

export function AdminStatusBadge({
  status,
  label,
  variant,
  icon,
  size = "md",
  className,
}: AdminStatusBadgeProps) {
  // Infer variant and icon from common status strings if not specified
  const norm = (status || label || "").toLowerCase().replace(/[\s-]/g, "_");

  let resolvedVariant: StatusVariant = variant || "neutral";
  let resolvedIcon: ReactNode = icon;
  let resolvedLabel: string = label || status || "";

  if (!variant) {
    if (["selesai", "paid", "lunas", "success", "aktif", "aman"].includes(norm)) {
      resolvedVariant = "success";
      if (!resolvedIcon) resolvedIcon = <CheckCircle2 className="h-3 w-3" />;
    } else if (["menunggu_pembayaran", "pending", "menunggu_konfirmasi", "perlu_estimasi", "menunggu_verifikasi_dp", "menunggu_verifikasi_lunas", "menunggu_verifikasi_pelunasan", "menipis"].includes(norm)) {
      resolvedVariant = "warning";
      if (!resolvedIcon) resolvedIcon = <Clock className="h-3 w-3" />;
    } else if (["dibatalkan", "rejected", "ditolak", "kadaluarsa", "habis", "danger", "gagal"].includes(norm)) {
      resolvedVariant = "danger";
      if (!resolvedIcon) resolvedIcon = <XCircle className="h-3 w-3" />;
    } else if (["diproses", "dikirim", "diproduksi", "produksi", "shipping", "shipped"].includes(norm)) {
      resolvedVariant = "info";
      if (!resolvedIcon) resolvedIcon = norm.includes("kirim") ? <Truck className="h-3 w-3" /> : <Package className="h-3 w-3" />;
    } else if (["refund", "return", "tukar", "siap_dilunasi"].includes(norm)) {
      resolvedVariant = "purple";
      if (!resolvedIcon) resolvedIcon = <RotateCcw className="h-3 w-3" />;
    }
  }

  const theme = variantStyles[resolvedVariant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-bold rounded-full border tracking-wide",
        theme.bg,
        theme.text,
        theme.border,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      {resolvedIcon ? (
        <span className="flex-shrink-0">{resolvedIcon}</span>
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", theme.dot)} />
      )}
      <span className="truncate">{resolvedLabel}</span>
    </span>
  );
}
