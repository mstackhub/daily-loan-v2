"use client";

import { useEffect, useState } from "react";
import { X, Download, Share2, PlusSquare, CheckCircle2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 3. Check dismissal in localStorage
    const dismissedTime = localStorage.getItem("pwa_install_dismissed");
    const isRecentlyDismissed =
      dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 3 * 24 * 60 * 60 * 1000; // 3 days

    // 4. Capture native beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isRecentlyDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // On iOS, show banner if not recently dismissed
    if (isIosDevice && !isRecentlyDismissed) {
      // Delay slightly for smooth page load
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  }

  async function handleInstallClick() {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback for browsers that don't support beforeinstallprompt
      setShowIosModal(true);
      return;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  }

  if (isStandalone || !showBanner) return null;

  return (
    <>
      {/* Floating Bottom Installation Banner */}
      <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto animate-slide-up">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/25 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="DebtFlow" className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-900 font-extrabold text-sm leading-tight">ติดตั้งแอป DebtFlow</p>
              <p className="text-slate-500 text-xs mt-0.5">เปิดใช้งานไว ใช้งานได้เหมือนแอปจริง</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-violet-500/25 active:scale-95 transition-transform flex items-center gap-1.5 text-white-force"
            >
              <Download className="w-3.5 h-3.5" />
              ติดตั้ง
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Step-by-Step Installation Modal */}
      {showIosModal && (
        <>
          <div className="sheet-overlay animate-fade-in" onClick={() => setShowIosModal(false)} />
          <div className="sheet-container animate-slide-up max-w-md mx-auto bg-white rounded-t-3xl p-5 shadow-2xl text-slate-800 z-50">
            <div className="sheet-handle bg-slate-300 mb-3" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm">
                  <Smartphone className="w-5 h-5 text-white-force" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">วิธีติดตั้งแอปบนหน้าจอ</h3>
                  <p className="text-xs text-slate-400">สำหรับ iPhone / iPad (Safari)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    แตะที่ปุ่ม <Share2 className="w-4 h-4 text-blue-500" /> <span className="text-blue-600">แชร์ (Share)</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">ที่แถบเมนูด้านล่างสุดของ Safari</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    เลือก <PlusSquare className="w-4 h-4 text-violet-600" /> <span className="text-violet-700">เพิ่มไปยังหน้าจอโฮม</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">(Add to Home Screen)</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    แตะ <span className="font-extrabold text-blue-600">"เพิ่ม" (Add)</span> ที่มุมขวาบน
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">แอปจะไปปรากฏเป็นไอคอนบนหน้าจอมือถือของคุณทันที!</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
            >
              เข้าใจแล้ว ปิดหน้าต่างนี้
            </button>
          </div>
        </>
      )}
    </>
  );
}
