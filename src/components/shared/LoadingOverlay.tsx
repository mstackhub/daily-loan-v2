"use client";

import { useAppStore } from "@/stores/appStore";

export function LoadingOverlay() {
  const { isLoading } = useAppStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in max-w-lg mx-auto">
      {/* Glow Effect */}
      <div className="absolute w-64 h-64 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
      
      {/* Spinning Loader */}
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-violet-500/10 border-t-violet-500 animate-spin" />
        <span className="absolute text-violet-400 text-xs font-bold animate-pulse">DF</span>
      </div>

      <div className="mt-6 text-center space-y-2 z-10">
        <h3 className="text-white font-bold text-base tracking-wide animate-pulse">กำลังโหลดข้อมูล</h3>
        <p className="text-white/40 text-xs max-w-[280px]">
          กำลังเชื่อมต่อฐานข้อมูล Supabase เพื่อความแม่นยำสูงสุด กรุณารอสักครู่...
        </p>
      </div>
    </div>
  );
}
