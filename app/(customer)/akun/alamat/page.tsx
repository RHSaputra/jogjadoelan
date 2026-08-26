"use client"
import { logger } from "@/lib/logger";
;

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useAuth, type Alamat } from "@/lib/auth-context";
import AlamatForm, {
  type AlamatFormValues,
} from "@/components/customer/AlamatForm";
import { toast } from "sonner";

type DialogMode =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; alamat: Alamat };

export default function AkunPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    logout,
    alamatList,
    addAlamatAsync,
    updateAlamatAsync,
    removeAlamat,
    setUtama,
  } = useAuth();

  const [dialog, setDialog] = useState<DialogMode>({ kind: "closed" });
  const [saving, setSaving] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/akun")}`);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

  function handleLogout() {
  logout();

  toast.success("Berhasil keluar dari akun", {
    description: "Sampai jumpa kembali di Jogjadoelan",
  });

  router.replace("/");
}

function handleHapus(a: Alamat) {
  removeAlamat(a.id);

  toast.success("Alamat berhasil dihapus", {
    description: `Alamat "${a.label}" telah dihapus dari daftar.`,
  });
}

  async function handleSubmitAlamat(v: AlamatFormValues) {
    setSaving(true);
    logger.info("[alamat] submitting:", dialog.kind, v);
    try {
      if (dialog.kind === "add") {
        logger.info("[alamat] calling addAlamatAsync...", v);
        await addAlamatAsync(v);
        logger.info("[alamat] addAlamatAsync done");
        toast.success("Alamat berhasil disimpan");
      } else if (dialog.kind === "edit") {
        logger.info("[alamat] calling updateAlamatAsync...", dialog.alamat.id, v);
        await updateAlamatAsync(dialog.alamat.id, v);
        toast.success("Alamat berhasil diperbarui");
      }
      // Tutup dialog setelah berhasil
      setDialog({ kind: "closed" });
    } catch (err) {
      logger.error("[alamat] error:", err);
      toast.error("Gagal menyimpan alamat", {
        description: err instanceof Error ? err.message : "Silakan coba lagi",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || authLoading || !isAuthenticated || !user) {
    return <div className="min-h-screen bg-brand-cream-light" />;
  }

  const displayName = user.username || user.nama || user.email || "U";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      {/* Header profil */}
      <div className="bg-brand-orange/10 px-4 py-6">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange text-2xl font-black text-white shadow-md">
              {initial}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-black text-brand-black">
                {displayName}
              </h1>
              <p className="text-xs text-brand-black/60">{user.email}</p>
              {user.noHp && (
                <p className="text-xs text-brand-black/60">+{user.noHp}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl space-y-4 px-4 py-4">
        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/pesanan"
            className="flex flex-col items-center gap-1 rounded-xl border border-brand-cream bg-white p-3 shadow-sm hover:border-brand-orange"
          >
            <Package className="h-6 w-6 text-brand-orange" />
            <span className="text-xs font-bold text-brand-black">Pesanan</span>
          </Link>
          <Link
            href="/notifikasi"
            className="flex flex-col items-center gap-1 rounded-xl border border-brand-cream bg-white p-3 shadow-sm hover:border-brand-orange"
          >
            <Bell className="h-6 w-6 text-brand-orange" />
            <span className="text-xs font-bold text-brand-black">Notifikasi</span>
          </Link>
          <Link
            href="/chat"
            className="flex flex-col items-center gap-1 rounded-xl border border-brand-cream bg-white p-3 shadow-sm hover:border-brand-orange"
          >
            <MessageCircle className="h-6 w-6 text-brand-orange" />
            <span className="text-xs font-bold text-brand-black">Chat</span>
          </Link>
        </div>

        {/* Alamat saya (preview ringkas — full CRUD di /akun/alamat) */}
        <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-black text-brand-black">
              <MapPin className="h-5 w-5 text-brand-orange" /> Alamat Saya
            </h2>
            <div className="flex items-center gap-1.5">
              <Link
                href="/akun/alamat"
                className="rounded-md border border-brand-cream bg-white px-3 py-1.5 text-xs font-bold text-brand-black hover:border-brand-orange"
              >
                Lihat Semua
              </Link>
              <button
                type="button"
                onClick={() => setDialog({ kind: "add" })}
                className="flex items-center gap-1 rounded-md bg-brand-orange px-3 py-1.5 text-xs font-black text-white hover:bg-brand-orange-dark"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah
              </button>
            </div>
          </div>

          {alamatList.length === 0 ? (
            <p className="mt-3 rounded-md bg-brand-cream-light px-3 py-3 text-xs text-brand-black/60">
              Belum ada alamat tersimpan
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {alamatList.map((a) => (
                <li
                  key={a.id}
                  className={`rounded-lg border-2 p-3 ${
                    a.isUtama
                      ? "border-brand-orange bg-brand-orange/5"
                      : "border-brand-cream bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-brand-cream-light px-2 py-0.5 text-[11px] font-bold text-brand-black">
                          {a.label}
                        </span>
                        {a.isUtama && (
                          <span className="rounded bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-white">
                            UTAMA
                          </span>
                        )}
                        {a.isToko && (
                          <span className="rounded bg-blue-500 px-2 py-0.5 text-[11px] font-bold text-white">
                            TOKO
                          </span>
                        )}
                        {a.isPengembalian && (
                          <span className="rounded bg-purple-500 px-2 py-0.5 text-[11px] font-bold text-white">
                            RETUR
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-bold text-brand-black">
                        {a.penerima}{" "}
                        <span className="font-normal text-brand-black/60">
                          · {a.noHp}
                        </span>
                      </p>
                      <p className="text-xs text-brand-black/70">
                        {a.detail}, {a.kecamatan}, {a.kota}, {a.provinsi}{" "}
                        {a.kodePos}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {!a.isUtama && (
                      <button
                        type="button"
                        onClick={() => setUtama(a.id)}
                        className="rounded border border-brand-cream bg-white px-2 py-1 text-[11px] font-bold text-brand-black hover:border-brand-orange"
                      >
                        Jadikan Utama
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: "edit", alamat: a })}
                      className="flex items-center gap-1 rounded border border-brand-cream bg-white px-2 py-1 text-[11px] font-bold text-brand-black hover:border-brand-orange"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHapus(a)}
                      className="ml-auto flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" /> Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Menu lain */}
        <section className="overflow-hidden rounded-2xl border border-brand-cream bg-white shadow-sm">
          <MenuItem href="/pesanan" icon={<ShoppingBag className="h-5 w-5" />} label="Riwayat Pesanan" />
          <MenuItem href="/akun/wishlist" icon={<Heart className="h-5 w-5" />} label="Wishlist" />
          <MenuItem href="/akun/ulasan" icon={<Star className="h-5 w-5" />} label="Ulasan Saya" />
          <MenuItem href="/akun/alamat" icon={<MapPin className="h-5 w-5" />} label="Daftar Alamat" />
          <MenuItem href="/akun/profil" icon={<UserIcon className="h-5 w-5" />} label="Edit Profil" />
          <MenuItem href="/kontak" icon={<Phone className="h-5 w-5" />} label="Hubungi Kami" />
          <MenuItem href="/bantuan" icon={<HelpCircle className="h-5 w-5" />} label="Bantuan" />
        </section>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-white px-4 py-3 text-sm font-black text-red-600 shadow-sm hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" /> Keluar
        </button>

        <p className="text-center text-[11px] text-brand-black/40">
          Jogjadoelan v1.0 · Yogyakarta
        </p>
      </div>

      {/* Dialog Alamat */}
      {dialog.kind !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 sm:items-center sm:px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDialog({ kind: "closed" });
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <h3 className="text-lg font-black text-brand-black">
              {dialog.kind === "add" ? "Tambah Alamat Baru" : "Edit Alamat"}
            </h3>
            <p className="mt-1 text-xs text-brand-black/60">
              Lengkapi data alamat dengan benar
            </p>
            <div className="mt-4">
              <AlamatForm
                key={dialog.kind === "edit" ? dialog.alamat.id : "add"}
                initial={dialog.kind === "edit" ? dialog.alamat : undefined}
                submitLabel={dialog.kind === "add" ? "Simpan Alamat" : "Update"}
                loading={saving}
                onSubmit={handleSubmitAlamat}
                onCancel={() => setDialog({ kind: "closed" })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-brand-cream px-4 py-3 text-sm font-bold text-brand-black last:border-b-0 hover:bg-brand-cream-light"
    >
      <span className="text-brand-orange">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-brand-black/40" />
    </Link>
  );
}