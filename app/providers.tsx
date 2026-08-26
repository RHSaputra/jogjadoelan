"use client";

import { type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { getQueryClient } from "@/lib/api/query-client";
import { AuthProvider } from "@/lib/auth-context";

/**
 * Provider root global — flattened structure.
 *
 * Dependency chain:
 *   QueryClientProvider → SessionProvider → AuthProvider
 */
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider
        refetchOnWindowFocus={false}
        refetchInterval={5 * 60}
        refetchWhenOffline={false}
        basePath="/api/auth"
      >
        <AuthProvider>{children}</AuthProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}