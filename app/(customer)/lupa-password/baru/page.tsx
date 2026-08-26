"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Check, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const emailParam = params.get("email") || "";
  const tokenParam = params.get("token") || "";
  const { confirmResetPassword } = useAuth();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  const pwdRules = useMemo(
    () => [
      { label: "Minimal 12 karakter", ok: password.length >= 12 },
      { label: "Ada huruf besar", ok: /[A-Z]/.test(password) },
      { label: "Ada huruf kecil", ok: /[a-z]/.test(password) },
      { label: "Ada angka", ok: /[0-9]/.test(password) },
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
    const res = await confirmResetPassword(email, token, password);
    setLoading(false);
    if (!res.ok) return setError(res.error ?? "Gagal mengubah password");
    setSukses(true);
  }

  if (!mounted) return <div className="min-h-screen bg-brand-cream-light" />;

  return (
    <div className="min-h-screen bg-brand-cream-light">
      <div className="container mx-auto max-w-md px-4 py-8">
        <Link
          href="/lupa-password"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-brand-black/70 hover:text-brand-orange"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <div className="rounded-2xl border border-brand-cream bg-white p-6 shadow-sm md:p-8">
          {!sukses ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange/10">
                <KeyRound className="h-7 w-7 text-brand-orange" />
              </div>
              <h1 className="mt-4 text-2xl font-black text-brand-black">
                Buat Password Baru
              </h1>
              <p className="mt-1 text-sm text-brand-black/60">
                Masukkan token reset dari email dan pilih password baru — minimal 12 karakter dengan kombinasi huruf besar/kecil dan angka.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-bold text-brand-black">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-md border-2 border-brand-cream bg-brand-cream-light px-3 py-2.5 text-sm focus:border-brand-orange focus:outline-none"
                    placeholder="kamu@email.com"
                    readOnly={!!emailParam}
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-brand-black">
                    Token Reset Password
                  </label>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="mt-1.5 w-full rounded-md border-2 border-brand-cream bg-white px-3 py-2.5 font-mono text-sm focus:border-brand-orange focus:outline-none"
                    placeholder="Masukkan token dari email"
                    readOnly={!!tokenParam}
                  />
                  <p className="mt-1 text-[11px] text-brand-black/50">
                    Token dikirim ke email Anda saat meminta reset password. Token berlaku 1 jam.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-bold text-brand-black">
                    Password Baru
                  </label>
                  <div className="mt-1.5 flex items-center rounded-md border-2 border-brand-cream bg-white focus-within:border-brand-orange">
                    <input
                      type={showPwd ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none"
                      placeholder="Minimal 12 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="px-3 text-brand-black/50 hover:text-brand-black"
                      aria-label="Tampilkan password"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                    {pwdRules.map((r) => (
                      <li
                        key={r.label}
                        className={`flex items-center gap-1.5 text-[11px] font-medium ${
                          r.ok ? "text-emerald-600" : "text-brand-black/50"
                        }`}
                      >
                        {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {r.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="text-sm font-bold text-brand-black">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={konfirmasi}
                    onChange={(e) => setKonfirmasi(e.target.value)}
                    className="mt-1.5 w-full rounded-md border-2 border-brand-cream bg-white px-3 py-2.5 text-sm focus:border-brand-orange focus:outline-none"
                    placeholder="Ulangi password baru"
                  />
                  {konfirmasi.length > 0 && !match && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      Konfirmasi tidak cocok
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !allOk || !match || !token.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-orange px-6 py-3 text-base font-black text-white shadow-md hover:bg-brand-orange-dark disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan Password Baru
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="mt-4 text-2xl font-black text-brand-black">
                Password Berhasil Diubah
              </h1>
              <p className="mt-2 text-sm text-brand-black/70">
                Silakan login dengan password baru kamu.
              </p>
              <button
                type="button"
                onClick={() => router.replace("/login")}
                className="mt-4 w-full rounded-md bg-brand-orange px-6 py-3 text-base font-black text-white shadow-md hover:bg-brand-orange-dark"
              >
                Kembali ke Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LupaPasswordBaruPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream-light" />}>
      <ResetForm />
    </Suspense>
  );
}