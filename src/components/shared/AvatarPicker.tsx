"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const UNSPLASH_AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
];

const LOCAL_AVATARS = Array.from({ length: 10 }, (_, i) => `/avatars/cat_avatar_${i + 11}.png`);

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

        <div className="px-4 space-y-4 pb-4">
          <div>
            <p className="section-heading">แมวน่ารัก 🐱</p>
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

          <div>
            <p className="section-heading">อื่นๆ</p>
            <div className="grid grid-cols-5 gap-2">
              {UNSPLASH_AVATARS.map((url) => (
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
      </div>
    </>
  );
}
