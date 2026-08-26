"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/akun";
  
  const { login, loginWithGoogle, isAuthenticated, user } = useAuth();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      // INI KUNCINYA: Cek apakah user Google baru (alamatList masih kosong)
      const hasAlamat = user.alamatList && user.alamatList.length > 0;

      if (!hasAlamat) {
        // Jika kosong, PAKSA ke halaman isi alamat
        router.replace(`/register/alamat?next=${encodeURIComponent(next)}`);
      } else {
        // Jika sudah ada, baru boleh masuk
        router.replace(next);
      }
    }
}, [mounted, isAuthenticated, user, router, next]);
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(identifier, password);
    if (!res.ok) {
      setLoading(false);
      setError(res.error ?? "Gagal masuk");
    }
    // Gak ada router.replace di sini, biarkan useEffect bekerja
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const res = await loginWithGoogle();
    if (!res.ok) {
      setGoogleLoading(false);
      setError(res.error ?? "Gagal masuk dengan Google");
    }
    // Gak ada router.replace di sini, biarkan useEffect bekerja
  }

  if (!mounted || (isAuthenticated && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream-light">
      <div className="container mx-auto max-w-md px-4 py-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-brand-black/70 hover:text-brand-orange">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <div className="rounded-2xl border border-brand-cream bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-black text-brand-black md:text-3xl">Masuk</h1>
          <p className="mt-1 text-sm text-brand-black/60">Selamat datang kembali di Jogjadoelan</p>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading || googleLoading}
            className="mt-6 h-11 w-full gap-3 border-zinc-300 bg-white font-semibold hover:bg-zinc-50"
          >
            {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-6 w-6">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.5 5.4-6.8 6.5l6.2 5.2C38.7 36.1 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
              </svg>
            )}
            Masuk dengan Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-brand-black/40">
            <div className="h-px flex-1 bg-brand-cream" />
            <span>atau</span>
            <div className="h-px flex-1 bg-brand-cream" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="text-sm font-bold text-brand-black">Username atau Email</label>
              <input id="identifier" type="text" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="mt-1.5 w-full rounded-md border-2 border-brand-cream bg-white px-3 py-2.5 text-sm text-brand-black focus:border-brand-orange focus:outline-none" placeholder="username_kamu atau email" />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-bold text-brand-black">Password</label>
                <Link href="/lupa-password" className="text-xs font-bold text-brand-orange hover:underline">Lupa password?</Link>
              </div>
              <div className="mt-1.5 flex items-center rounded-md border-2 border-brand-cream bg-white focus-within:border-brand-orange">
                <input id="password" type={showPwd ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent px-3 py-2.5 text-sm text-brand-black focus:outline-none" placeholder="Password" />
                <button type="button" onClick={() => setShowPwd((v) => !v)} className="px-3 text-brand-black/50 hover:text-brand-black">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}

            <button type="submit" disabled={loading || googleLoading} className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-orange px-6 py-3 text-base font-black text-white shadow-md transition hover:bg-brand-orange-dark disabled:opacity-50">
              {(loading || googleLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
              Masuk
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-brand-black/70">
            Belum punya akun?{" "}
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-bold text-brand-orange hover:underline">Daftar di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-brand-cream-light" />}><LoginForm /></Suspense>;
}