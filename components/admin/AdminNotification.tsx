"use client";

import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Info, X,
  ShieldAlert, Ban, ThumbsUp, FileWarning, ServerCrash,
  type LucideIcon,
} from "lucide-react";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { emitSync, type SyncChannel } from "@/lib/sync-events";
import { playNotificationSound, playChatSound } from "@/lib/sounds";

/* ================================================================
   ADMIN NOTIFICATION SYSTEM
   SweetAlert-style professional modal notifications
   Muncul di tengah layar, ikon jelas, warna sesuai status
   ================================================================ */

export type NotificationVariant =
  | "success"       // ✅ Data berhasil disimpan/diperbarui/dihapus
  | "success-sent"  // ✅ Data berhasil dikirim
  | "warning"       // ⚠️ Peringatan
  | "validation"    // ⚠️ Validasi gagal
  | "error"         // ❌ Error sistem
  | "error-save"    // ❌ Gagal menyimpan
  | "error-update"  // ❌ Gagal memperbarui
  | "error-delete"  // ❌ Gagal menghapus
  | "info";         // ℹ️ Informasi umum

export interface NotificationData {
  variant: NotificationVariant;
  title: string;
  message?: string;
  duration?: number;        // ms, default 3000. 0 = manual close only
  onConfirm?: () => void;
  confirmText?: string;
  showCancel?: boolean;
  cancelText?: string;
  onCancel?: () => void;
  html?: boolean;           // if true, message renders as HTML
}

interface NotificationState extends NotificationData {
  id: string;
  visible: boolean;
}

type NotificationFn = (data: NotificationData) => string;

interface AdminNotifyPayload {
  variant?: string;
  title?: string;
  message?: string;
  syncChannel?: SyncChannel;
}

interface NotificationContextValue {
  notify: NotificationFn;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let globalNotify: NotificationFn | null = null;

export function useAdminNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useAdminNotification must be used within AdminNotificationProvider");
  return ctx;
}

/**
 * Non-hook notifier — untuk dipakai di luar React tree (misalnya di helpers/utilities)
 */
export function adminNotify(data: NotificationData): string {
  if (globalNotify) return globalNotify(data);
  console.warn("[AdminNotification] Provider belum mounted, notifikasi diabaikan:", data.title);
  return "";
}

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<NotificationState[]>([]);

  const dismiss = useCallback((id: string) => {
    setQueue((prev) => prev.map((n) => (n.id === id ? { ...n, visible: false } : n)));
    setTimeout(() => setQueue((prev) => prev.filter((n) => n.id !== id)), 300);
  }, []);

  const dismissAll = useCallback(() => {
    setQueue((prev) => prev.map((n) => ({ ...n, visible: false })));
  }, []);

  const notify: NotificationFn = useCallback((data: NotificationData) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = data.duration ?? 3000;
    const state: NotificationState = { ...data, id, visible: true };
    setQueue((prev) => [...prev, state]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  // Shortcut helpers
  const success = useCallback((title: string, message?: string, duration?: number) =>
    notify({ variant: "success", title, message, duration }), [notify]);
  const error = useCallback((title: string, message?: string, duration?: number) =>
    notify({ variant: "error", title, message, duration: duration ?? 5000 }), [notify]);
  const warning = useCallback((title: string, message?: string, duration?: number) =>
    notify({ variant: "warning", title, message, duration: duration ?? 4000 }), [notify]);
  const info = useCallback((title: string, message?: string, duration?: number) =>
    notify({ variant: "info", title, message, duration }), [notify]);

  // Expose global notify
  useEffect(() => {
    globalNotify = notify;
    return () => { globalNotify = null; };
  }, [notify]);

  // Subscribe to real-time Pusher notifications
  useEffect(() => {
    let pusherClient: Pusher | null = null;
    let channel: Channel | null = null;

    const initPusher = async () => {
      try {
        const PusherClient = (await import("pusher-js")).default;
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "f3e9ef9647495d6eb53f";
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";

        pusherClient = new PusherClient(key, { cluster });
        channel = pusherClient.subscribe("admin-notifications");

        channel.bind("notify", (payload: AdminNotifyPayload) => {
          // Mainkan suara spesifik chat atau notifikasi biasa
          if (payload.syncChannel === "chat") {
            playChatSound();
          } else {
            playNotificationSound();
          }

          const variant: NotificationVariant =
            payload.variant && payload.variant in VARIANT_CONFIG
              ? (payload.variant as NotificationVariant)
              : "info";

          // Munculkan toast
          notify({
            variant,
            title: payload.title || "Notifikasi",
            message: payload.message,
          });

          // Jika ada channel sync, jalankan emitSync agar counter refresh
          if (payload.syncChannel) {
            emitSync(payload.syncChannel);
          } else {
            // Default: asumsikan order/notif berubah agar counter terefresh
            emitSync("notif");
          }
        });
      } catch (err) {
        console.error("Failed to initialize Pusher in AdminNotification:", err);
      }
    };

    initPusher();

    return () => {
      if (channel) channel.unbind_all();
      if (pusherClient) {
        pusherClient.unsubscribe("admin-notifications");
        pusherClient.disconnect();
      }
    };
  }, [notify]);

  const ctx: NotificationContextValue = { notify, success, error, warning, info, dismiss, dismissAll };

  return (
    <NotificationContext.Provider value={ctx}>
      {children}
      {/* Render queue — satu notifikasi ditampilkan per waktu (LIFO) */}
      {queue.length > 0 && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {queue.map((n, idx) => (
            <NotificationModal
              key={n.id}
              data={n}
              stackIndex={queue.length - 1 - idx}
              onDismiss={() => dismiss(n.id)}
            />
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

/* ================================================================
   INDIVIDUAL NOTIFICATION MODAL
   ================================================================ */

const VARIANT_CONFIG: Record<NotificationVariant, {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  ringColor: string;
  badgeColor: string;
}> = {
  "success": {
    icon: CheckCircle2,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    accentColor: "border-emerald-500",
    ringColor: "ring-emerald-500/20",
    badgeColor: "bg-emerald-500",
  },
  "success-sent": {
    icon: ThumbsUp,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    accentColor: "border-sky-500",
    ringColor: "ring-sky-500/20",
    badgeColor: "bg-sky-500",
  },
  "warning": {
    icon: AlertTriangle,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    accentColor: "border-amber-500",
    ringColor: "ring-amber-500/20",
    badgeColor: "bg-amber-500",
  },
  "validation": {
    icon: FileWarning,
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    accentColor: "border-yellow-500",
    ringColor: "ring-yellow-500/20",
    badgeColor: "bg-yellow-500",
  },
  "error": {
    icon: XCircle,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    accentColor: "border-red-500",
    ringColor: "ring-red-500/20",
    badgeColor: "bg-red-500",
  },
  "error-save": {
    icon: ServerCrash,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    accentColor: "border-rose-500",
    ringColor: "ring-rose-500/20",
    badgeColor: "bg-rose-500",
  },
  "error-update": {
    icon: ShieldAlert,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    accentColor: "border-orange-500",
    ringColor: "ring-orange-500/20",
    badgeColor: "bg-orange-500",
  },
  "error-delete": {
    icon: Ban,
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    accentColor: "border-pink-500",
    ringColor: "ring-pink-500/20",
    badgeColor: "bg-pink-500",
  },
  "info": {
    icon: Info,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    accentColor: "border-blue-500",
    ringColor: "ring-blue-500/20",
    badgeColor: "bg-blue-500",
  },
};

function NotificationModal({
  data,
  stackIndex,
  onDismiss,
}: {
  data: NotificationState;
  stackIndex: number;
  onDismiss: () => void;
}) {
  const config = VARIANT_CONFIG[data.variant];
  const Icon = config.icon;
  const offset = stackIndex * 10;

  // Animation entry
  useEffect(() => {
    if (!data.visible) return;
    const timer = setTimeout(() => {
      // Auto-handled by CSS animation
    }, 50);
    return () => clearTimeout(timer);
  }, [data.visible]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onDismiss();
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center pointer-events-auto transition-all duration-300 ${
        data.visible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        zIndex: 9999 + stackIndex,
        marginTop: `${offset}px`,
        marginLeft: `${offset}px`,
      }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={data.title}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-[420px] mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden ${
          data.visible ? "animate-in zoom-in-95 fade-in duration-200" : "animate-out zoom-out-95 fade-out duration-200"
        }`}
      >


        <div className="p-6 sm:p-8 text-center">
          {/* Icon */}
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${config.iconBg} shadow-lg ${config.iconBg.replace("100", "200")}/50 ring-4 ${config.ringColor}`}>
            <Icon className={`h-10 w-10 ${config.iconColor}`} strokeWidth={2.5} />
          </div>

          {/* Title */}
          <h3 className="mt-5 text-xl font-black text-gray-900 leading-tight">
            {data.title}
          </h3>

          {/* Message */}
          {data.message && (
            <div className="mt-2">
              {data.html ? (
                <p
                  className="text-sm text-gray-600 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: data.message }}
                />
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">{data.message}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-center gap-3">
            {data.showCancel && (
              <button
                onClick={() => {
                  data.onCancel?.();
                  onDismiss();
                }}
                className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                {data.cancelText ?? "Batal"}
              </button>
            )}
            <button
              onClick={() => {
                data.onConfirm?.();
                onDismiss();
              }}
              className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all ${
                data.variant.startsWith("error") || data.variant === "validation"
                  ? "bg-red-500 hover:bg-red-600"
                  : data.variant === "warning"
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-[#FF6B1A] hover:bg-[#E55A0F]"
              }`}
            >
              {data.confirmText ?? "Mengerti"}
            </button>
          </div>
        </div>

        {/* Close button (top right) */}
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Tutup notifikasi"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}