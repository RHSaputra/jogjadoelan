"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

export default function AdminLupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Gagal mengirim permintaan reset");
        setLoading(false);
        return;
      }
      setSukses(true);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-gray-800 shadow-2xl ring-1 ring-white/10">
          <div className="bg-gray-800 px-8 py-7 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 shadow-lg">
              <span className="font-black text-white">JD</span>
            </div>
            <h1 className="text-2xl font-black text-white">Lupa Password Admin</h1>
            <p className="mt-1 text-xs text-gray-400">Reset password akun admin Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-8 py-7">
            {!sukses ? (
              <>
                <div>
                  <label className="text-xs font-black text-gray-300">Email Admin</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-full border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500 focus:bg-gray-900"
                    placeholder="admin@jogjadoelan.com"
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-red-900/50 px-3 py-2 text-xs font-semibold text-red-300 border border-red-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-orange-500 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                  {loading ? "MENGIRIM..." : "KIRIM LINK RESET"}
                </button>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-black text-white text-center">Cek Email Anda</h2>
                <p className="text-sm text-gray-400 text-center">
                  Kami sudah mengirim instruksi reset password ke{" "}
                  <span className="font-bold text-white">{email}</span>.
                </p>
                <p className="text-xs text-gray-500 text-center">
                  Ikuti link di email untuk membuat password baru. Link berlaku 1 jam.
                </p>
              </>
            )}

            <Link
              href="/admin/login"
              className="flex items-center justify-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 mt-2"
            >
              <ArrowLeft className="h-3 w-3" /> Kembali ke Login Admin
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
