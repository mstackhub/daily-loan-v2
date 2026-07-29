"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ToastDisplay } from "@/components/shared/Toast";
import { DataLoader } from "@/components/shared/DataLoader";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";

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

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("Service Worker registered successfully:", reg.scope))
          .catch((err) => console.error("Service Worker registration failed:", err));
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DataLoader />
      <LoadingOverlay />
      {children}
      <ToastDisplay />
    </QueryClientProvider>
  );
}
