"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/fetcher";
import { qk } from "@/lib/api/keys";
import { normalizeNoHp, isValidNoHp } from "@/lib/phone-utils";

/* ============================================================
   PUBLIC TYPES — SAMA seperti versi lama (backwards-compat)
   ============================================================ */
export interface Alamat {
  id: string;
  label: string;
  penerima: string;
  noHp: string;
  provinsi: string;
  kota: string;
  kecamatan: string;
  kodePos: string;
  detail: string;
  isUtama: boolean;
  isToko: boolean;
  isPengembalian: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  nama: string;
  email: string;
  noHp: string;
  avatar?: string;
  provider: "manual" | "google";
  alamatList: Alamat[];
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface RegisterAccountInput {
  username: string;
  noHp: string;
  email: string;
  password: string;
  konfirmasi: string;
  setuju: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (identifier: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => void;

  registerAccount: (input: RegisterAccountInput) => Promise<AuthResult>;
  hasPendingRegister: () => boolean;
  registerComplete: (alamat: Omit<Alamat, "id">) => Promise<AuthResult>;
  cancelPendingRegister: () => void;

  register: (nama: string, email: string, password: string) => Promise<AuthResult>;

  requestResetPassword: (email: string, channel?: "email" | "whatsapp") => Promise<AuthResult>;
  confirmResetPassword: (email: string, token: string, newPassword: string) => Promise<AuthResult>;

  alamatList: Alamat[];
  addAlamat: (a: Omit<Alamat, "id">) => Alamat | null;
  addAlamatAsync: (a: Omit<Alamat, "id">) => Promise<void>;
  updateAlamat: (id: string, patch: Partial<Omit<Alamat, "id">>) => void;
  updateAlamatAsync: (id: string, patch: Partial<Omit<Alamat, "id">>) => Promise<void>;
  removeAlamat: (id: string) => void;
  setUtama: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_PENDING = "jogjadoelan_pending_register";

const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RX_USERNAME = /^[a-zA-Z0-9_.]{3,24}$/;

function validateNoHp(raw: string): string | null {
  const d = normalizeNoHp(raw);
  if (!isValidNoHp(d)) return "Nomor handphone harus diawali 08, hanya berisi angka, dan memiliki panjang 10-13 digit.";
  return null;
}

function validatePassword(pwd: string): string | null {
  if (pwd.length < 12) return "Password minimal 12 karakter";
  if (!/[a-z]/.test(pwd)) return "Password harus ada huruf kecil";
  if (!/[A-Z]/.test(pwd)) return "Password harus ada huruf besar";
  if (!/[0-9]/.test(pwd)) return "Password harus ada angka";
  return null;
}

interface PendingRegister {
  username: string;
  email: string;
  noHp: string;
  password: string;
}

interface MeResponse {
  kind: "user" | "admin";
  id: string;
  username: string;
  nama: string;
  email: string;
  noHp: string;
  avatar?: string;
  provider?: "manual" | "google";
  alamatList?: Alamat[];
  alamat?: Alamat[];
}

/* ============================================================
   PROVIDER
   ============================================================ */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { status, data: session } = useSession();
  const isCustomerSession = !!session?.user && session.user.role === "USER";
  const qc = useQueryClient();

  // Fetch full profil dari /api/auth/me hanya kalau session = USER
  const meQuery = useQuery({
    queryKey: qk.auth.me(),
    queryFn: () => api.get<MeResponse>("/api/auth/me"),
    enabled: isCustomerSession,
    staleTime: 60_000,
  });

  const user: AuthUser | null = useMemo(() => {
    if (!isCustomerSession || !meQuery.data || meQuery.data.kind !== "user") return null;
    const d = meQuery.data;
    return {
      id: d.id,
      username: d.username,
      nama: d.nama,
      email: d.email,
      noHp: d.noHp,
      avatar: d.avatar,
      provider: d.provider ?? "manual",
      alamatList: d.alamatList ?? d.alamat ?? [],
    };
  }, [isCustomerSession, meQuery.data]);

  const isLoading = status === "loading" || (isCustomerSession && meQuery.isPending);

  /* ===== LOGIN ===== */
  const login = useCallback(
    async (identifier: string, password: string): Promise<AuthResult> => {
      if (!identifier || !password)
        return { ok: false, error: "Username/Email dan password wajib diisi" };
      const res = await signIn("user-credentials", {
        identifier: identifier.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!res || res.error) {
        return { ok: false, error: "Username/Email atau password salah" };
      }
      await qc.invalidateQueries({ queryKey: qk.auth.me() });
      return { ok: true };
    },
    [qc],
  );

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      await signIn("google", { redirect: true, callbackUrl: "/akun" });
      return { ok: true };
    } catch {
      return { ok: false, error: "Gagal login dengan Google. Coba lagi." };
    }
  }, []);

  const logout = useCallback(() => {
    signOut({ redirect: true, callbackUrl: "/login" }).catch(() => {
      qc.removeQueries({ queryKey: qk.auth.me() });
      qc.clear();
    });
  }, [qc]);

  /* ===== REGISTER 2-STEP ===== */
  const registerAccount = useCallback(
    async (input: RegisterAccountInput): Promise<AuthResult> => {
      const username = input.username.trim();
      const email = input.email.trim().toLowerCase();
      const noHp = normalizeNoHp(input.noHp);

      if (!input.setuju) return { ok: false, error: "Wajib menyetujui Syarat & Ketentuan" };
      if (!RX_USERNAME.test(username))
        return { ok: false, error: "Username 3–24 karakter (huruf, angka, _ atau .)" };
      if (!RX_EMAIL.test(email)) return { ok: false, error: "Format email tidak valid" };
      const hpErr = validateNoHp(input.noHp);
      if (hpErr) return { ok: false, error: hpErr };
      const pwdErr = validatePassword(input.password);
      if (pwdErr) return { ok: false, error: pwdErr };
      if (input.password !== input.konfirmasi)
        return { ok: false, error: "Konfirmasi password tidak cocok" };

      // Simpan pending ke sessionStorage (step 2 = alamat di page register/alamat)
      const pending: PendingRegister = { username, email, noHp, password: input.password };
      try {
        sessionStorage.setItem(STORAGE_PENDING, JSON.stringify(pending));
      } catch {
        return { ok: false, error: "Gagal menyimpan data sementara" };
      }
      return { ok: true };
    },
    [],
  );

  const hasPendingRegister = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    return !!sessionStorage.getItem(STORAGE_PENDING);
  }, []);

  const cancelPendingRegister = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(STORAGE_PENDING);
  }, []);

  const registerComplete = useCallback(
    async (alamat: Omit<Alamat, "id">): Promise<AuthResult> => {
      let pending: PendingRegister | null = null;
      try {
        const raw = sessionStorage.getItem(STORAGE_PENDING);
        if (raw) pending = JSON.parse(raw) as PendingRegister;
      } catch {}
      if (!pending)
        return { ok: false, error: "Sesi pendaftaran kadaluarsa, silakan ulangi dari awal" };

      try {
        await api.post("/api/auth/register", {
          username: pending.username,
          email: pending.email,
          noHp: pending.noHp,
          password: pending.password,
          alamat: {
            label: alamat.label,
            penerima: alamat.penerima,
            noHp: alamat.noHp,
            provinsi: alamat.provinsi,
            kota: alamat.kota,
            kecamatan: alamat.kecamatan,
            kodePos: alamat.kodePos,
            detail: alamat.detail,
          },
        });
      } catch (err: unknown) {
        return { ok: false, error: err instanceof Error && err.message ? err.message : "Gagal mendaftar" };
      }

      sessionStorage.removeItem(STORAGE_PENDING);

      // Auto-login setelah register
      const loginRes = await signIn("user-credentials", {
        identifier: pending.username,
        password: pending.password,
        redirect: false,
      });
      if (loginRes?.error) return { ok: false, error: "Berhasil daftar tapi gagal auto-login" };
      await qc.invalidateQueries({ queryKey: qk.auth.me() });
      return { ok: true };
    },
    [qc],
  );

  const register = useCallback(
    async (nama: string, email: string, password: string): Promise<AuthResult> => {
      const username = nama.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "_");
      const padded = password.length < 12 ? password.padEnd(12, "X1") : password;
      const r1 = await registerAccount({
        username,
        noHp: "08123456789",
        email,
        password: padded,
        konfirmasi: padded,
        setuju: true,
      });
      if (!r1.ok) return r1;
      return registerComplete({
        label: "Rumah",
        penerima: nama,
        noHp: "08123456789",
        provinsi: "DI Yogyakarta",
        kota: "Yogyakarta",
        kecamatan: "-",
        kodePos: "55000",
        detail: "-",
        isUtama: true,
        isToko: false,
        isPengembalian: false,
      });
    },
    [registerAccount, registerComplete],
  );

  /* ===== LUPA PASSWORD ===== */
  const requestResetPassword = useCallback(
    async (email: string, channel: "email" | "whatsapp" = "email"): Promise<AuthResult> => {
      const e = email.trim().toLowerCase();
      if (!RX_EMAIL.test(e)) return { ok: false, error: "Format email tidak valid" };
      try {
        await api.post("/api/auth/forgot-password", { email: e, channel });
        return { ok: true };
      } catch (err: unknown) {
        return { ok: false, error: err instanceof Error && err.message ? err.message : "Email belum terdaftar" };
      }
    },
    [],
  );

  const confirmResetPassword = useCallback(
    async (email: string, token: string, newPassword: string): Promise<AuthResult> => {
      const pwdErr = validatePassword(newPassword);
      if (pwdErr) return { ok: false, error: pwdErr };
      if (!token.trim()) return { ok: false, error: "Token reset password diperlukan" };
      try {
        await api.post("/api/auth/reset-password", { email: email.trim().toLowerCase(), token: token.trim(), newPassword });
        return { ok: true };
      } catch (err: unknown) {
        return { ok: false, error: err instanceof Error && err.message ? err.message : "Gagal reset password" };
      }
    },
    [],
  );

  /* ===== ALAMAT (optimistic — UI sync, mutation async) ===== */
  const alamatList: Alamat[] = user?.alamatList ?? [];

  const createMut = useMutation({
    mutationFn: (a: Omit<Alamat, "id">) => api.post<Alamat>("/api/akun/alamat", a),
    onError: (err) => {
      console.error("[addAlamat error]", err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.auth.me() }),
  });
  const patchMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Alamat> }) =>
      api.patch<Alamat>(`/api/akun/alamat/${id}`, patch),
    onError: (err) => {
      console.error("[updateAlamat error]", err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.auth.me() }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/akun/alamat/${id}`),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.auth.me() }),
  });

  const addAlamat = useCallback(
    (a: Omit<Alamat, "id">): Alamat | null => {
      if (!user) return null;
      const tempId = `tmp_${Date.now()}`;
      const optimistic: Alamat = { ...a, id: tempId };
      createMut.mutate(a);
      return optimistic;
    },
    [user, createMut],
  );

  // Varian async — return Promise supaya caller bisa await
  const addAlamatAsync = useCallback(
    async (a: Omit<Alamat, "id">): Promise<void> => {
      if (!user) throw new Error("Belum login");
      await createMut.mutateAsync(a);
      await qc.invalidateQueries({ queryKey: qk.auth.me() });
    },
    [user, createMut, qc],
  );

  const updateAlamat = useCallback(
    (id: string, patch: Partial<Omit<Alamat, "id">>) => {
      patchMut.mutate({ id, patch });
    },
    [patchMut],
  );

  // Varian async — return Promise supaya caller bisa await
  const updateAlamatAsync = useCallback(
    async (id: string, patch: Partial<Omit<Alamat, "id">>): Promise<void> => {
      if (!user) throw new Error("Belum login");
      await patchMut.mutateAsync({ id, patch });
      await qc.invalidateQueries({ queryKey: qk.auth.me() });
    },
    [user, patchMut, qc],
  );

  const removeAlamat = useCallback(
    (id: string) => {
      delMut.mutate(id);
    },
    [delMut],
  );

  const setUtama = useCallback(
    (id: string) => {
      patchMut.mutate({ id, patch: { isUtama: true } });
    },
    [patchMut],
  );

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    logout,
    registerAccount,
    hasPendingRegister,
    registerComplete,
    cancelPendingRegister,
    register,
    requestResetPassword,
    confirmResetPassword,
    alamatList,
    addAlamat,
    addAlamatAsync,
    updateAlamat,
    updateAlamatAsync,
    removeAlamat,
    setUtama,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}