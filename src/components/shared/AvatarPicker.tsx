"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// 40 High-quality real cat photos served locally from the public/avatars folder
const LOCAL_AVATARS = Array.from({ length: 40 }, (_, i) => `/avatars/cat_avatar_${i + 1}.jpg`);

interface Props {
  selected: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function AvatarPicker({ selected, onSelect, onClose }: Props) {
  return (
    <>
      <div className="sheet-overlay animate-fade-in" onClick={onClose} />
      <div className="sheet-container animate-slide-up" style={{ zIndex: 60 }}>
        <div className="sheet-handle" />
        <div className="flex items-center justify-between px-4 mb-4">
          <h3 className="text-base font-bold text-white">เลือกรูปโปรไฟล์</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
          <p className="section-heading mb-3 text-slate-400">รูปภาพแมวจริง (โหลดไว ไม่ใช้เน็ตนอก) 🐱</p>
          <div className="grid grid-cols-5 gap-2">
            {LOCAL_AVATARS.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => onSelect(url)}
                className={cn(
                  "aspect-square rounded-2xl overflow-hidden border-2 transition-all active:scale-95",
                  selected === url ? "border-primary-500 shadow-glow-primary" : "border-white/10"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="avatar" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
