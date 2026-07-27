"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/appStore";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  success: CheckCircle,
  danger: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  danger: "border-red-500/50 bg-red-500/10 text-red-400",
  warning: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  info: "border-primary-500/50 bg-primary-500/10 text-primary-400",
};

export function ToastDisplay() {
  const { toast, clearToast } = useAppStore();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (toast) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(clearToast, 3500);
    }
    return () => clearTimeout(timerRef.current);
  }, [toast, clearToast]);

  if (!toast) return null;

  const Icon = ICONS[toast.type];

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center px-4 animate-slide-down">
      <div
        className={cn(
          "flex items-start gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md max-w-sm w-full",
          "shadow-card",
          COLORS[toast.type]
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-medium flex-1 text-white/90">{toast.message}</p>
        <button onClick={clearToast} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
