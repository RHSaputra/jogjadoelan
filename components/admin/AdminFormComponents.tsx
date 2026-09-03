"use client";

import { type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ================================================================
   SHARED ADMIN FORM COMPONENTS
   Digunakan di seluruh halaman admin untuk konsistensi UI/UX
   ================================================================ */

// ─── SECTION CARD ───────────────────────────────────────────────
interface SectionProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  badge?: string | number;
  action?: ReactNode;
}

export function Section({ title, subtitle, icon, children, className, badge, action }: SectionProps) {
  return (
    <section className={cn(
      "rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-all",
      className,
    )}>
      {/* Section Header */}
      <div className="flex flex-col items-stretch justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#FF6B1A]/10 text-[#FF6B1A]">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 leading-snug line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
          {badge !== undefined && (
            <span className="flex-shrink-0 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
              {badge}
            </span>
          )}
        </div>
        {action && <div className="flex w-full flex-shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{action}</div>}
      </div>

      {/* Section Body */}
      <div className="space-y-4 p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}

// ─── FIELD LABEL ────────────────────────────────────────────────
interface LabelProps {
  children: ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
  htmlFor?: string;
}

export function Label({ children, required, hint, className, htmlFor }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block", className)}>
      <span className="text-xs font-semibold text-slate-700">
        {children}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {hint && (
        <span className="ml-1.5 text-[11px] font-normal text-slate-400">
          — {hint}
        </span>
      )}
    </label>
  );
}

// ─── TEXT INPUT ─────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

export function Input({ label, required, hint, error, prefix, suffix, className, id, ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);

  return (
    <div className="w-full">
      {label && <Label required={required} hint={hint} htmlFor={inputId}>{label}</Label>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900",
            "placeholder:text-slate-400 placeholder:font-normal",
            "focus:border-[#FF6B1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/15",
            "transition-all duration-150",
            error ? "border-rose-300 bg-rose-50/30 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-200",
            prefix && "pl-9",
            suffix && "pr-9",
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs font-semibold text-rose-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── TEXTAREA ───────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
}

export function Textarea({ label, required, hint, error, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);

  return (
    <div className="w-full">
      {label && <Label required={required} hint={hint} htmlFor={textareaId}>{label}</Label>}
      <textarea
        id={textareaId}
        className={cn(
          "w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900",
          "placeholder:text-slate-400 placeholder:font-normal",
          "focus:border-[#FF6B1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/15",
          "transition-all duration-150 resize-y min-h-[60px]",
          error ? "border-rose-300 bg-rose-50/30 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-200",
          className,
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs font-semibold text-rose-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── SELECT ─────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export function Select({ label, required, hint, error, options, placeholder, className, id, ...props }: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined);

  return (
    <div className="w-full">
      {label && <Label required={required} hint={hint} htmlFor={selectId}>{label}</Label>}
      <select
        id={selectId}
        className={cn(
          "w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900",
          "focus:border-[#FF6B1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/15",
          "transition-all duration-150 appearance-none cursor-pointer",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_10px_center] bg-no-repeat",
          error ? "border-rose-300 bg-rose-50/30 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-200",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── TOGGLE / SWITCH ────────────────────────────────────────────
interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className={cn(
      "flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
      checked ? "border-[#FF6B1A] bg-orange-50/50" : "border-gray-200 bg-white hover:border-gray-300",
      disabled && "opacity-50 cursor-not-allowed",
    )}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-[#FF6B1A]/20",
          checked ? "bg-[#FF6B1A]" : "bg-gray-200",
          disabled && "cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black text-gray-900">{label}</p>
        {description && (
          <p className="mt-0.5 text-[10px] text-gray-500 leading-snug">{description}</p>
        )}
      </div>
    </label>
  );
}

// ─── RADIO / CHIP GROUP ─────────────────────────────────────────
interface ChipGroupProps {
  label?: string;
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ChipGroup({ label, options, value, onChange, className }: ChipGroupProps) {
  return (
    <div className={cn("w-full", className)}>
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex min-h-9 max-w-full items-center justify-center rounded-full border-2 px-4 py-2 text-center text-xs font-black leading-tight transition-all duration-150",
                active
                  ? "border-[#FF6B1A] bg-[#FF6B1A] text-white shadow-md shadow-[#FF6B1A]/20 scale-[1.02]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-[#FF6B1A] hover:text-[#FF6B1A] hover:bg-orange-50/30",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MULTI-CHECK CHIPS ──────────────────────────────────────────
interface MultiChipProps {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiChip({ label, options, selected, onChange }: MultiChipProps) {
  const toggle = (opt: string) => {
    onChange(
      selected.includes(opt)
        ? selected.filter((x) => x !== opt)
        : [...selected, opt],
    );
  };

  return (
    <div className="w-full">
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "inline-flex min-h-9 max-w-full items-center justify-center rounded-full border-2 px-4 py-2 text-center text-xs font-black leading-tight transition-all duration-150",
                on
                  ? "border-[#FF6B1A] bg-[#FF6B1A] text-white shadow-md"
                  : "border-gray-200 bg-white text-gray-600 hover:border-[#FF6B1A] hover:text-[#FF6B1A]",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── GRID LAYOUT HELPER ─────────────────────────────────────────
interface GridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}

export function Grid({ children, cols = 2, className }: GridProps) {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-3", colClasses[cols], className)}>
      {children}
    </div>
  );
}

// ─── BUTTON VARIANTS ────────────────────────────────────────────
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  href?: string;
}

const buttonVariants = {
  primary: "bg-[#FF6B1A] text-white hover:bg-[#E55A0F] shadow-xs active:scale-[0.98]",
  secondary: "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 active:scale-[0.98]",
  danger: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:scale-[0.98]",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98]",
};

const buttonSizes = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-9 px-4 py-2 text-xs",
  lg: "min-h-10 px-5 py-2.5 text-sm",
};

export function Button({
  children, onClick, variant = "primary", size = "md",
  type = "button", disabled, loading, icon, className, href,
}: ButtonProps) {
  const baseClasses = cn(
    "inline-flex max-w-full select-none items-center justify-center gap-1.5 rounded-xl text-center font-semibold leading-tight transition-all duration-150",
    "[&>svg]:shrink-0 [&_svg]:shrink-0",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {loading ? <Spinner /> : icon}
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={baseClasses}>
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
    </svg>
  );
}

// ─── STAT CARD ──────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: "blue" | "orange" | "amber" | "red" | "emerald" | "purple";
  alert?: boolean;
  subtitle?: string;
}

const statColors = {
  blue:    { bg: "bg-blue-500", light: "bg-blue-50", text: "text-blue-600" },
  orange:  { bg: "bg-[#FF6B1A]", light: "bg-orange-50", text: "text-[#FF6B1A]" },
  amber:   { bg: "bg-amber-500", light: "bg-amber-50", text: "text-amber-600" },
  red:     { bg: "bg-red-500", light: "bg-red-50", text: "text-red-600" },
  emerald: { bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600" },
  purple:  { bg: "bg-purple-500", light: "bg-purple-50", text: "text-purple-600" },
};

export function StatCard({ label, value, icon: Icon, color = "blue", alert, subtitle }: StatCardProps) {
  const c = statColors[color];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      {alert && <span className="absolute right-2 top-2 h-2 w-2 animate-ping rounded-full bg-red-500" />}
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} text-white shadow-lg ${c.bg}/30`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-xl font-black text-gray-900">{value}</p>
      {subtitle && <p className="mt-0.5 text-[10px] text-gray-400">{subtitle}</p>}
    </div>
  );
}

// ─── EMPTY STATE ────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 px-4 text-center shadow-sm">
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-300" />}
      <p className="mt-4 text-sm font-black text-gray-500">{title}</p>
      {description && <p className="mt-1 text-xs text-gray-400 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ─── BADGE ──────────────────────────────────────────────────────
interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const badgeVariants = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide",
      badgeVariants[variant],
      className,
    )}>
      {children}
    </span>
  );
}

// ─── PAGE HEADER ────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  actions?: ReactNode;
  variant?: "clean" | "orange" | "navy" | "gradient";
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B1A] border border-orange-100">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="admin-page-header-actions flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:flex-shrink-0 sm:items-center sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

export * from "./ui";

// ─── FORM ACTIONS (Sticky Bottom Bar) ───────────────────────────
interface FormActionsProps {
  onCancel?: () => void;
  cancelHref?: string;
  onSubmit?: () => void;
  submitLabel?: string;
  loading?: boolean;
  showDelete?: boolean;
  deleteLabel?: string;
  onDelete?: () => void;
  secondaryAction?: ReactNode;
}

export function FormActions({
  onCancel, cancelHref, onSubmit, submitLabel = "Simpan",
  loading, showDelete, deleteLabel = "Hapus", onDelete,
  secondaryAction,
}: FormActionsProps) {
  return (
    <div className="admin-form-actions sticky bottom-3 z-20 mt-6 sm:bottom-4">
      <div className="admin-form-actions__inner flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl sm:flex-row sm:items-center sm:justify-end">
        {/* Secondary action (left) */}
        {secondaryAction && <div className="w-full sm:mr-auto sm:w-auto">{secondaryAction}</div>}

        {/* Delete button */}
        {showDelete && onDelete && (
          <Button variant="danger" size="sm" onClick={onDelete} className="w-full sm:mr-auto sm:w-auto">
            {deleteLabel}
          </Button>
        )}

        {/* Cancel */}
        {cancelHref ? (
          <a href={cancelHref}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-center text-[11px] font-black leading-tight text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto">
            Batal
          </a>
        ) : onCancel ? (
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">Batal</Button>
        ) : null}

        {/* Submit */}
        {onSubmit && (
          <Button variant="primary" size="lg" onClick={onSubmit} loading={loading} className="w-full sm:w-auto">
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}