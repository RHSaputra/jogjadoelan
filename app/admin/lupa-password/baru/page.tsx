"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Loader2, X,
} from "lucide-react";

const emptySubscribe = () => () => {};

function ResetForm() {
  const params = useSearchParams();
  const emailParam = params.get("email") || "";
  const tokenParam = params.get("token") || "";

  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const pwdRules = useMemo(
    () => [
      { label: "Minimal 6 karakter", ok: password.length >= 6 },
      { label: "ADA ANGKA", ok: /[0-9]/.test(password) },
    ],
    [password],
  );
  const allOk = pwdRules.every((r) => r.ok);
  const match = konfirmasi.length > 0 && konfirmasi === password;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) return setError("Email wajib diisi");
    if (!token.trim()) return setError("Token reset password wajib diisi. Cek email Anda.");
    if (!match) return setError("Konfirmasi password tidak cocok");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), token: token.trim(), newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Gagal mengubah password");
        setLoading(false);
        return;
      }
      setSukses(true);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
      setLoading(false);
    }
  }

  if (!mounted) return <div className="min-h-screen bg-gray-900" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-gray-800 shadow-2xl ring-1 ring-white/10">
          <div className="bg-gray-800 px-8 py-7 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 shadow-lg">
              <span className="font-black text-white">JD</span>
            </div>
            <h1 className="text-2xl font-black text-white">Buat Password Baru</h1>
            <p className="mt-1 text-xs text-gray-400">Untuk akun admin</p>
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
                    readOnly={!!emailParam}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-gray-300">Token Reset</label>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="mt-1.5 w-full rounded-full border border-gray-700 bg-gray-900 px-4 py-2.5 font-mono text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500 focus:bg-gray-900"
                    readOnly={!!tokenParam}
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Token dari email reset password. Berlaku 1 jam.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black text-gray-300">Password Baru</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPwd ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-full border border-gray-700 bg-gray-900 px-4 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500 focus:bg-gray-900"
                      placeholder="Minimal 6 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-400"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {pwdRules.map((r) => (
                      <li
                        key={r.label}
                        className={`flex items-center gap-1.5 text-[11px] font-medium ${
                          r.ok ? "text-emerald-400" : "text-gray-500"
                        }`}
                      >
                        {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {r.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="text-xs font-black text-gray-300">Konfirmasi Password</label>
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={konfirmasi}
                    onChange={(e) => setKonfirmasi(e.target.value)}
                    className="mt-1.5 w-full rounded-full border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500 focus:bg-gray-900"
                    placeholder="Ulangi password baru"
                  />
                  {konfirmasi.length > 0 && !match && (
                    <p className="mt-1 text-xs font-medium text-red-400">Konfirmasi tidak cocok</p>
                  )}
                </div>

                {error && (
                  <div className="rounded-md bg-red-900/50 px-3 py-2 text-xs font-semibold text-red-300 border border-red-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !allOk || !match || !token.trim()}
                  className="w-full rounded-full bg-orange-500 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                  {loading ? "MENYIMPAN..." : "SIMPAN PASSWORD BARU"}
                </button>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-black text-white text-center">Password Berhasil Diubah</h2>
                <p className="text-sm text-gray-400 text-center">
                  Silakan login dengan password baru Anda.
                </p>
                <Link
                  href="/admin/login"
                  className="flex items-center justify-center gap-2 w-full rounded-full bg-orange-500 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600"
                >
                  Kembali ke Login Admin
                </Link>
              </>
            )}

            <Link
              href="/admin/lupa-password"
              className="flex items-center justify-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 mt-2"
            >
              <ArrowLeft className="h-3 w-3" /> Kembali
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLupaPasswordBaruPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
      <ResetForm />
    </Suspense>
  );
}
