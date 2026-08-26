// lib/api/query-client.ts
import { QueryClient } from "@tanstack/react-query";

// Singleton pattern untuk menghindari multiple instances
let queryClient: QueryClient | undefined;

export function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // Data dianggap fresh selama 5 menit
          staleTime: 5 * 60 * 1000, // 5 menit
          // Setelah window focus, refetch data otomatis
          refetchOnWindowFocus: false,
          // Jangan retry terlalu banyak jika error
          retry: 1,
          // Jangan auto refetch setiap interval jika tidak perlu
          refetchInterval: false,
        },
        mutations: {
          // Retry mutation jika gagal
          retry: 1,
        },
      },
    });
  }
  return queryClient;
}