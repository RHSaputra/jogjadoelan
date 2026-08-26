"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function AdminRefundDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <div className="space-y-4 p-6">
      <div>
        <Link
          href="/admin/refund"
          className="text-sm font-bold text-blue-600 hover:underline"
        >
          ← Kembali ke daftar refund
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-black text-gray-900">
          Detail Refund
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          ID refund:
        </p>

        <p className="mt-1 rounded-lg bg-gray-100 px-3 py-2 font-mono text-xs text-gray-700">
          {id}
        </p>

        <p className="mt-4 text-sm text-gray-500">
          Halaman detail refund admin belum lengkap. Placeholder ini dibuat agar route valid dan build bisa lanjut.
        </p>
      </div>
    </div>
  );
}