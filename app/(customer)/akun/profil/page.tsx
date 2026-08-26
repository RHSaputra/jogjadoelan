"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Save,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isValidNoHp } from "@/lib/phone-utils";

export default function ProfilPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"profil" | "password">("profil");

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [noHp, setNoHp] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>(undefined);

  const [pwdLama, setPwdLama] = useState("");
  const [pwdBaru, setPwdBaru] = useState("");
  const [pwdKonfirmasi, setPwdKonfirmasi] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/akun/profil")}`);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setNama(user.nama || user.username);
      setEmail(user.email);
      setNoHp(user.noHp);
      setAvatar(user.avatar);
    }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Foto maksimal 2MB", false);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSimpanProfil(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    const trimmedNama = nama.trim();
    const trimmedNoHp = noHp.trim();

    if (!trimmedNama || !email.trim() || !trimmedNoHp) {
      showToast("Semua field wajib diisi!", false);
      return;
    }
    if (!isValidNoHp(trimmedNoHp)) {
      showToast("Nomor HP harus diawali 08, berisi angka, dan memiliki panjang 10-13 digit", false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/akun/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nama: trimmedNama,
          email: email.trim(),
          noHp: trimmedNoHp,
          avatar: avatar ?? null,
        }),
      });
      const json = await res.json() as { error?: { message?: string } };
      if (!res.ok) {
        showToast(json.error?.message ?? "Gagal menyimpan profil", false);
        return;
      }
      showToast("Profil berhasil disimpan", true);
      setTimeout(() => window.location.reload(), 800);
    } catch {
      showToast("Gagal menyimpan profil", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleGantiPassword(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (pwdBaru.length < 12) {
      showToast("Password baru minimal 12 karakter", false);
      return;
    }
    if (pwdBaru !== pwdKonfirmasi) {
      showToast("Konfirmasi password tidak cocok", false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/akun/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pwdLama, pwdBaru }),
      });
      const json = await res.json() as { error?: { message?: string } };
      if (!res.ok) {
        showToast(json.error?.message ?? "Gagal mengganti password", false);
        return;
      }
      setPwdLama("");
      setPwdBaru("");
      setPwdKonfirmasi("");
      showToast("Password berhasil diganti", true);
    } catch {
      showToast("Gagal mengganti password", false);
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light">
        <div className="text-sm text-brand-black/50">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-brand-krem bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            href="/akun"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-lg font-black text-brand-black">Edit Profil</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-5">
        {/* Avatar block */}
        <section className="rounded-2xl border border-brand-cream bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-cream ring-4 ring-brand-krem">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <UserIcon className="h-10 w-10 text-brand-black/30" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange text-white shadow ring-2 ring-white hover:bg-brand-orange-dark"
                aria-label="Ganti foto"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatar}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-brand-black">
                {user.nama || user.username}
              </p>
              <p className="truncate text-xs text-brand-black/60">{user.email}</p>
              <p className="mt-1 text-[11px] text-brand-black/40">
                Foto maks 2MB • JPG/PNG
              </p>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-2 rounded-xl bg-white p-1 ring-1 ring-brand-krem">
          <button
            onClick={() => setTab("profil")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
              tab === "profil"
                ? "bg-brand-orange text-white shadow"
                : "text-brand-black/60 hover:bg-gray-50"
            }`}
          >
            Data Profil
          </button>
          <button
            onClick={() => setTab("password")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
              tab === "password"
                ? "bg-brand-orange text-white shadow"
                : "text-brand-black/60 hover:bg-gray-50"
            }`}
          >
            Ganti Password
          </button>
        </div>

        {/* Form profil */}
        {tab === "profil" && (
          <form
            onSubmit={handleSimpanProfil}
            className="space-y-4 rounded-2xl border border-brand-cream bg-white p-5 shadow-sm"
          >
            <Field label="Nama Lengkap" icon={<UserIcon className="h-4 w-4" />}>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama lengkap"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
              />
            </Field>
            <Field label="Email" icon={<Mail className="h-4 w-4" />}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
              />
            </Field>
            <Field label="No. HP" icon={<Phone className="h-4 w-4" />}>
              <input
                value={noHp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 13);
                  setNoHp(val);
                }}
                placeholder="08xxx (Maks 13 digit)"
                inputMode="numeric"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
              />
            </Field>
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-orange py-3 text-sm font-black text-white shadow hover:bg-brand-orange-dark disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        )}

        {/* Form password */}
        {tab === "password" && (
          <form
            onSubmit={handleGantiPassword}
            className="space-y-4 rounded-2xl border border-brand-cream bg-white p-5 shadow-sm"
          >
            <Field label="Password Lama" icon={<Lock className="h-4 w-4" />}>
              <PasswordInput
                value={pwdLama}
                onChange={setPwdLama}
                show={showPwd}
                onToggle={() => setShowPwd((v) => !v)}
                placeholder="Password saat ini"
              />
            </Field>
            <Field label="Password Baru (min 12)" icon={<Lock className="h-4 w-4" />}>
              <PasswordInput
                value={pwdBaru}
                onChange={setPwdBaru}
                show={showPwd}
                onToggle={() => setShowPwd((v) => !v)}
                placeholder="Min 12 karakter"
              />
            </Field>
            <Field label="Konfirmasi Password" icon={<Lock className="h-4 w-4" />}>
              <PasswordInput
                value={pwdKonfirmasi}
                onChange={setPwdKonfirmasi}
                show={showPwd}
                onToggle={() => setShowPwd((v) => !v)}
                placeholder="Ulangi password baru"
              />
            </Field>
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-orange py-3 text-sm font-black text-white shadow hover:bg-brand-orange-dark disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Ganti Password"}
            </button>
          </form>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-brand-black/70">
        <span className="text-brand-orange">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand-orange"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-brand-black/50 hover:bg-gray-100"
        aria-label={show ? "Sembunyikan" : "Tampilkan"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
