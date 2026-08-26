"use client";

import { Check } from "lucide-react";

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
}

export function SuccessModal({ open, title = "Berhasil Disimpan", onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl animate-in zoom-in-95">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/40">
          <Check className="h-10 w-10 text-white" strokeWidth={4} />
        </div>
        <p className="mt-5 text-xl font-black text-gray-900">{title}</p>
        <button onClick={onClose} className="mt-6 rounded-md bg-[#fc970a] px-8 py-2.5 text-sm font-black text-white shadow hover:bg-[#e08a00]">
          Oke
        </button>
      </div>
    </div>
  );
}