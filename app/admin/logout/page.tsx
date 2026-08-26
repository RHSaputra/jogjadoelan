"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, AlertTriangle } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-context";

export default function AdminLogoutPage() {
  const { logout, admin } = useAdminAuth();
  const router = useRouter();
  const [showConfirm] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleConfirm() {
    setLoggingOut(true);
    logout();
    setTimeout(() => router.replace("/admin/login"), 1000);
  }

  function handleCancel() {
    router.back();
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#FFF3E0]">
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
            {/* Header */}
            <div className="bg-[#FFF3E0] px-6 py-5 text-center border-b border-orange-100">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 ring-4 ring-red-100">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-lg font-black text-gray-900">Konfirmasi Logout</h2>
              <p className="mt-1 text-xs text-gray-500">
                Apakah Anda yakin ingin keluar dari akun{" "}
                <strong className="text-gray-700">{admin?.nama ?? admin?.username ?? "Admin"}</strong>?
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 p-5">
              <button
                onClick={handleCancel}
                disabled={loggingOut}
                className="flex-1 rounded-full border-2 border-gray-200 bg-white py-2.5 text-xs font-black text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={loggingOut}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-500 py-2.5 text-xs font-black text-white shadow-lg shadow-red-500/25 hover:bg-red-600 disabled:opacity-50 transition-all"
              >
                {loggingOut ? (
                  "Keluar..."
                ) : (
                  <>
                    <LogOut className="h-4 w-4" /> Ya, Keluar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background text */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 ring-4 ring-orange-50">
          <LogOut className="h-7 w-7 text-orange-500" />
        </div>
        <p className="mt-4 text-sm font-black text-gray-800">Logout Admin</p>
        <p className="mt-1 text-xs text-gray-500">Anda akan dialihkan ke halaman login</p>
      </div>
    </div>
  );
}