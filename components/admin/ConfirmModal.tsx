"use client";

import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  variant?: "warning" | "danger";
}

export function ConfirmModal({ open, title, message, confirmText = "Lanjut", cancelText = "Batal", onConfirm, onClose, variant = "warning" }: Props) {
  if (!open) return null;
  const colors = variant === "danger"
    ? { icon: "bg-red-500", btn: "bg-red-600 hover:bg-red-700" }
    : { icon: "bg-amber-500", btn: "bg-[#FF6B1A] hover:bg-[#E55A0F]" };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl animate-in zoom-in-95">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${colors.icon} shadow-lg`}>
          <AlertTriangle className="h-8 w-8 text-white" />
        </div>
        <p className="mt-5 text-lg font-black text-gray-900">{title}</p>
        {message && <p className="mt-1.5 text-sm text-gray-600">{message}</p>}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-md border-2 border-gray-200 bg-white py-2.5 text-sm font-black text-gray-900 hover:bg-gray-50">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`flex-1 rounded-md py-2.5 text-sm font-black text-white shadow ${colors.btn}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}