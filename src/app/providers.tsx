"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastDisplay } from "@/components/shared/Toast";
import { DataLoader } from "@/components/shared/DataLoader";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DataLoader />
      {children}
      <ToastDisplay />
    </QueryClientProvider>
  );
}
