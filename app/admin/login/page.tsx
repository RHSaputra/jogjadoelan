"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-context";

function AdminLogin() {
  const router = useRouter();
  const sp = useSearchParams();
  const rawNext = sp.get("next") || "/admin";
  const next = rawNext === "/admin/logout" || rawNext === "/admin/login" ? "/admin" : rawNext;
  const { login, isAuthenticated, isLoading } = useAdminAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace(next);
  }, [isAuthenticated, isLoading, next, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const r = await login(username.trim(), password, remember);
    if (!r.ok) { setErr(r.error ?? "Gagal login"); setSubmitting(false); return; }
    router.replace(next);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF3E0] p-4">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-gray-900 shadow-2xl ring-1 ring-white/10">
          {/* Header */}
          <div className="bg-gray-900 px-8 py-7 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 shadow-lg">
              <span className="font-black text-white">JD</span>
            </div>
            <h1 className="text-2xl font-black text-white">Masuk ke Akun</h1>
            <p className="mt-1 text-xs text-gray-400">Masuk Untuk Mengelola Toko</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 px-8 py-7">
            <div>
              <label className="text-xs font-black text-gray-300">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus
                className="mt-1.5 w-full rounded-full border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500 focus:bg-gray-800" />
            </div>
            <div>
              <label className="text-xs font-black text-gray-300">Password</label>
              <div className="relative mt-1.5">
                <input value={password} onChange={(e) => setPassword(e.target.value)} required
                  type={showPwd ? "text" : "password"}
                  className="w-full rounded-full border border-gray-700 bg-gray-800 px-4 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500 focus:bg-gray-800" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-400">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-orange-500" />
                Ingatkan saya
              </label>
              <Link href="/admin/lupa-password" className="text-xs font-bold text-orange-400 hover:underline">Lupa Password ?</Link>
            </div>

            {err && <div className="rounded-md bg-red-900/50 px-3 py-2 text-xs font-semibold text-red-300 border border-red-800">{err}</div>}

            <button type="submit" disabled={submitting}
              className="w-full rounded-full bg-orange-500 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 disabled:opacity-60">
              {submitting ? "MEMPROSES..." : "LOGIN"}
            </button>

            <p className="text-center text-[10px] text-gray-500">
              Akses panel admin terbatas. Hubungi pemilik toko untuk akun baru.
            </p>
          </form>
        </div>

        <p className="mt-4 text-center text-[10px] text-gray-500">© 2026 Jogjadoelan · Admin Panel v1.0</p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#FFF3E0] p-4" />}>
      <AdminLogin />
    </Suspense>
  );
}