"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LupaPasswordPage() {
  const { requestResetPassword } = useAuth();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await requestResetPassword(email, channel);
    setLoading(false);
    if (!res.ok) return setError(res.error ?? "Gagal mengirim permintaan reset");
    setSukses(true);
  }

  if (!mounted) return <div className="min-h-screen bg-brand-cream-light" />;

  return (
    <div className="min-h-screen bg-brand-cream-light">
      <div className="container mx-auto max-w-md px-4 py-8">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-brand-black/70 hover:text-brand-orange"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Login
        </Link>

        <div className="rounded-2xl border border-brand-cream bg-white p-6 shadow-sm md:p-8">
          {!sukses ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange/10">
                <Mail className="h-7 w-7 text-brand-orange" />
              </div>
              <h1 className="mt-4 text-2xl font-black text-brand-black">
                Lupa Password?
              </h1>
              <p className="mt-1 text-sm text-brand-black/60">
                Masukkan email akun kamu dan pilih metode pengiriman link untuk mereset password baru.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-bold text-brand-black"
                  >
                    Email Akun
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-md border-2 border-brand-cream bg-white px-3 py-2.5 text-sm focus:border-brand-orange focus:outline-none"
                    placeholder="kamu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-brand-black block">
                    Metode Pengiriman Link Reset
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center gap-2.5 rounded-lg border-2 p-3 cursor-pointer transition ${
                      channel === "email" ? "border-brand-orange bg-brand-orange/5" : "border-brand-cream hover:border-gray-300"
                    }`}>
                      <input
                        type="radio"
                        name="channel"
                        value="email"
                        checked={channel === "email"}
                        onChange={() => setChannel("email")}
                        className="accent-brand-orange h-4 w-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-brand-black">Kirim via Email</span>
                    </label>

                    <label className={`flex items-center gap-2.5 rounded-lg border-2 p-3 cursor-pointer transition ${
                      channel === "whatsapp" ? "border-brand-orange bg-brand-orange/5" : "border-brand-cream hover:border-gray-300"
                    }`}>
                      <input
                        type="radio"
                        name="channel"
                        value="whatsapp"
                        checked={channel === "whatsapp"}
                        onChange={() => setChannel("whatsapp")}
                        className="accent-brand-orange h-4 w-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-brand-black">Kirim via WhatsApp</span>
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-orange px-6 py-3 text-base font-black text-white shadow-md hover:bg-brand-orange-dark disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Kirim Link Reset
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="mt-4 text-2xl font-black text-brand-black">
                {channel === "email" ? "Cek Email Kamu" : "Cek WhatsApp Kamu"}
              </h1>
              <p className="mt-2 text-sm text-brand-black/70">
                {channel === "email" ? (
                  <>
                    Kami sudah mengirim instruksi reset password ke{" "}
                    <span className="font-bold text-brand-black">{email}</span>.
                    Silakan ikuti link di email tersebut.
                  </>
                ) : (
                  <>
                    Kami sudah mengirim link reset password ke nomor WhatsApp yang terdaftar pada akun{" "}
                    <span className="font-bold text-brand-black">{email}</span>.
                    Silakan ikuti link di pesan WhatsApp tersebut.
                  </>
                )}
              </p>

              <Link
                href="/login"
                className="mt-4 block text-center text-sm font-bold text-brand-black/60 hover:text-brand-orange"
              >
                Kembali ke Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}