"use client";

import { useAppStore } from "@/stores/appStore";

export function LoadingOverlay() {
  const { isLoading, loadingProgress } = useAppStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-lg animate-fade-in max-w-lg mx-auto">
      {/* Ambient Pulsing Glow */}
      <div className="absolute w-72 h-72 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
      
      {/* Spinning Loader Logo */}
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-20 h-20 rounded-full border-4 border-violet-500/10 border-t-violet-500 animate-spin" />
        <span className="absolute text-violet-400 text-sm font-bold tracking-wider animate-pulse">DF</span>
      </div>

      <div className="text-center space-y-4 z-10 w-full px-8">
        <div className="space-y-1">
          <h3 className="text-white font-bold text-lg tracking-wide">กำลังเชื่อมต่อข้อมูล</h3>
          <p className="text-white/40 text-xs">
            กำลังดาวน์โหลดฐานข้อมูลจาก Supabase
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-2 max-w-[280px] mx-auto">
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/[0.03] relative">
            {/* The actual progress fill */}
            <div 
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 rounded-full transition-all duration-300 ease-out shadow-glow-primary"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-white/50 px-1 font-mono">
            <span>กำลังเรียกตาราง...</span>
            <span className="text-violet-400 font-bold">{loadingProgress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
