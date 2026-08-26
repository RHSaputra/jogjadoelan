"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/fetcher";
import { qk } from "@/lib/api/keys";
import type { AdminUser } from "@/lib/admin-constants";

interface AdminAuthContext {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    username: string,
    password: string,
    remember: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (patch: Partial<AdminUser>) => void;
  changePassword: (
    oldPwd: string,
    newPwd: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}

const Ctx = createContext<AdminAuthContext | null>(null);

interface MeAdminResponse {
  kind: "admin";
  id: string;
  username: string;
  nama: string;
  email?: string | null;
  noHp?: string | null;
  foto?: string | null;
  role: "ADMIN" | "SUPER_ADMIN";
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { status, data: session } = useSession();
  const qc = useQueryClient();
  const isAdminSession =
    !!session?.user &&
    (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN");

  const meQuery = useQuery({
    queryKey: qk.auth.me(),
    queryFn: () => api.get<MeAdminResponse>("/api/auth/me"),
    enabled: isAdminSession,
    staleTime: 60_000,
  });

  const admin: AdminUser | null = useMemo(() => {
    if (!isAdminSession || !meQuery.data || meQuery.data.kind !== "admin") return null;
    const d = meQuery.data;
    return {
      username: d.username,
      nama: d.nama,
      email: d.email ?? "",
      noHp: d.noHp ?? "",
      foto: d.foto ?? undefined,
      loggedAt: new Date().toISOString(),
    };
  }, [isAdminSession, meQuery.data]);

  const isLoading = status === "loading" || (isAdminSession && meQuery.isPending);

  const login = useCallback(
    async (username: string, password: string, _remember: boolean) => {
      void _remember;
      const res = await signIn("admin-credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });
      if (!res || res.error) return { ok: false, error: "Username atau password salah" };
      await qc.invalidateQueries({ queryKey: qk.auth.me() });
      return { ok: true };
    },
    [qc],
  );

  const logout = useCallback(() => {
    signOut({ redirect: true, callbackUrl: "/admin/login" }).catch(() => {
      qc.removeQueries({ queryKey: qk.auth.me() });
      qc.clear();
    });
  }, [qc]);

  const updateProfile = useCallback(
    (patch: Partial<AdminUser>) => {
      api
        .patch("/api/admin/auth/update-profile", {
          nama: patch.nama,
          email: patch.email,
          noHp: patch.noHp,
          foto: patch.foto,
        })
        .then(() => qc.invalidateQueries({ queryKey: qk.auth.me() }))
        .catch(() => {});
    },
    [qc],
  );

  const changePassword = useCallback(
    async (
      oldPwd: string,
      newPwd: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!admin) return { ok: false, error: "Tidak ada sesi" };
      if (newPwd.length < 6) return { ok: false, error: "Password baru minimal 6 karakter" };
      try {
        await api.post("/api/admin/auth/change-password", {
          oldPassword: oldPwd,
          newPassword: newPwd,
        });
        return { ok: true };
      } catch (e: unknown) {
        return { ok: false, error: e instanceof Error && e.message ? e.message : "Gagal ganti password" };
      }
    },
    [admin],
  );

  return (
    <Ctx.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdminAuth must be inside AdminAuthProvider");
  return c;
}