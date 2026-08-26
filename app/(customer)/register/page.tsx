"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  X,
} from "lucide-react";
import { isValidNoHp } from "@/lib/phone-utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

interface PwdRule {
  label: string;
  ok: boolean;
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/akun";
  const { registerAccount, loginWithGoogle } = useAuth();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [username, setUsername] = useState("");
  const [noHp, setNoHp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [setuju, setSetuju] = useState(false);

  const [showPwd, setShowPwd] = useState(false);
  const [showKonf, setShowKonf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Live indikator kekuatan password */
  const pwdRules: PwdRule[] = useMemo(
    () => [
      { label: "Minimal 12 karakter", ok: password.length >= 12 },
      { label: "Ada huruf besar", ok: /[A-Z]/.test(password) },
      { label: "Ada huruf kecil", ok: /[a-z]/.test(password) },
      { label: "Ada angka", ok: /[0-9]/.test(password) },
    ],
    [password],
  );
  const allPwdOk = pwdRules.every((r) => r.ok);
  const pwdMatch = konfirmasi.length > 0 && konfirmasi === password;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Validasi Nomor HP
    if (!isValidNoHp(noHp)) {
      setError("Nomor HP harus diawali 08, berisi angka, dan memiliki panjang 10-13 digit");
      return;
    }

    setLoading(true);
    const res = await registerAccount({
      username: username.trim(),
      noHp: noHp.trim(),
      email: email.trim(),
      password,
      konfirmasi,
      setuju,
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error ?? "Gagal mendaftar");
      return;
    }
    const q = next ? `?next=${encodeURIComponent(next)}` : "";
    router.push(`/register/alamat${q}`);
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const res = await loginWithGoogle();
    setGoogleLoading(false);
    if (!res.ok) return setError(res.error ?? "Gagal mendaftar dengan Google");
    router.replace(next);
  }

  if (!mounted) return <div className="min-h-screen bg-brand-cream-light" />;

  return (
    <div className="min-h-screen bg-brand-cream-light">
      <div className="container mx-auto max-w-md px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-brand-black/70 hover:text-brand-orange"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        {/* Stepper 1/2 */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange text-sm font-black text-white">
            1
          </div>
          <div className="h-0.5 flex-1 bg-brand-cream" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-cream bg-white text-sm font-black text-brand-black/40">
            2
          </div>
        </div>
        <p className="mb-4 text-xs font-bold text-brand-black/60">
          Langkah 1 dari 2 · Data Akun
        </p>

        <div className="rounded-2xl border border-brand-cream bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-black text-brand-black md:text-3xl">Daftar Akun</h1>

{/* Tambahkan mb-8 di sini untuk memberi jarak ke tombol di bawahnya */}
<p className="mt-1 mb-8 text-sm text-brand-black/60">
  Bergabung dengan Jogjadoelan
</p>

<Button
  type="button"
  variant="outline"
  onClick={handleGoogle}
  disabled={loading || googleLoading}
  className="h-11 w-full gap-3 border-zinc-300 bg-white font-semibold hover:bg-zinc-50"
>
  {googleLoading ? (
    <Loader2 className="h-5 w-5 animate-spin" />
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="h-5 w-5"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.5 5.4-6.8 6.5l6.2 5.2C38.7 36.1 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  )}

  Daftar dengan Google
</Button>

          <div className="my-5 flex items-center gap-3 text-xs text-brand-black/40">
            <div className="h-px flex-1 bg-brand-cream" />
            <span>atau</span>
            <div className="h-px flex-1 bg-brand-cream" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="text-sm font-bold text-brand-black"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.replace(/\s/g, "").slice(0, 24),
                  )
                }
                className="mt-1.5 w-full rounded-md border-2 border-brand-cream bg-white px-3 py-2.5 text-sm text-brand-black focus:border-brand-orange focus:outline-none"
                placeholder="username_kamu"
              />
              <p className="mt-1 text-xs text-brand-black/50">
                3–24 karakter (huruf, angka, _ atau .)
              </p>
            </div>

            {/* No HP Input Tanpa +62 */}
            <div>
              <label
                htmlFor="noHp"
                className="text-sm font-bold text-brand-black"
              >
                Nomor HP
              </label>
              <div className="mt-1.5 flex items-center rounded-md border-2 border-brand-cream bg-white focus-within:border-brand-orange">
                <input
                  id="noHp"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  value={noHp}
                  onChange={(e) => {
                    // Hanya angka dan maksimal 13 digit
                    const val = e.target.value.replace(/\D/g, "").slice(0, 13);
                    setNoHp(val);
                  }}
                  className="flex-1 bg-transparent px-4 py-2.5 text-sm text-brand-black focus:outline-none"
                  placeholder="Contoh: 081234567890"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="text-sm font-bold text-brand-black"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border-2 border-brand-cream bg-white px-3 py-2.5 text-sm text-brand-black focus:border-brand-orange focus:outline-none"
                placeholder="kamu@email.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="text-sm font-bold text-brand-black"
              >
                Password
              </label>
              <div className="mt-1.5 flex items-center rounded-md border-2 border-brand-cream bg-white focus-within:border-brand-orange">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-brand-black focus:outline-none"
                  placeholder="Minimal 12 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="px-3 text-brand-black/50 hover:text-brand-black"
                  aria-label="Tampilkan password"
                >
                  {showPwd ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Live rules */}
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {pwdRules.map((r) => (
                  <li
                    key={r.label}
                    className={`flex items-center gap-1.5 text-[11px] font-medium ${
                      r.ok ? "text-emerald-600" : "text-brand-black/50"
                    }`}
                  >
                    {r.ok ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Konfirmasi */}
            <div>
              <label
                htmlFor="konfirmasi"
                className="text-sm font-bold text-brand-black"
              >
                Konfirmasi Password
              </label>
              <div className="mt-1.5 flex items-center rounded-md border-2 border-brand-cream bg-white focus-within:border-brand-orange">
                <input
                  id="konfirmasi"
                  type={showKonf ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={konfirmasi}
                  onChange={(e) => setKonfirmasi(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-brand-black focus:outline-none"
                  placeholder="Ulangi password"
                />
                <button
                  type="button"
                  onClick={() => setShowKonf((v) => !v)}
                  className="px-3 text-brand-black/50 hover:text-brand-black"
                  aria-label="Tampilkan konfirmasi"
                >
                  {showKonf ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {konfirmasi.length > 0 && !pwdMatch && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Konfirmasi tidak cocok
                </p>
              )}
            </div>

            {/* Syarat & Ketentuan */}
            <label className="flex cursor-pointer items-start gap-2 text-xs text-brand-black/70">
              <input
                type="checkbox"
                checked={setuju}
                onChange={(e) => setSetuju(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-orange"
              />
              <span>
                Saya menyetujui{" "}
                <Link
                  href="/syarat"
                  className="font-bold text-brand-orange hover:underline"
                >
                  Syarat & Ketentuan
                </Link>{" "}
                dan{" "}
                <Link
                  href="/privasi"
                  className="font-bold text-brand-orange hover:underline"
                >
                  Kebijakan Privasi
                </Link>{" "}
                Jogjadoelan.
              </span>
            </label>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                googleLoading ||
                !allPwdOk ||
                !pwdMatch ||
                !setuju ||
                !username ||
                !noHp ||
                !email
              }
              className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-orange px-6 py-3 text-base font-black text-white shadow-md transition hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Lanjut ke Alamat
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-brand-black/70">
            Sudah punya akun?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="font-bold text-brand-orange hover:underline"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream-light" />}>
      <RegisterForm />
    </Suspense>
  );
}