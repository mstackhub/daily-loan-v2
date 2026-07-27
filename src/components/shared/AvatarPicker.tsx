"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const UNSPLASH_AVATARS = [
  "https://loremflickr.com/150/150/cat?lock=1",
  "https://loremflickr.com/150/150/cat?lock=2",
  "https://loremflickr.com/150/150/cat?lock=3",
  "https://loremflickr.com/150/150/cat?lock=4",
  "https://loremflickr.com/150/150/cat?lock=5",
  "https://loremflickr.com/150/150/cat?lock=6",
  "https://loremflickr.com/150/150/cat?lock=7",
  "https://loremflickr.com/150/150/cat?lock=8",
  "https://loremflickr.com/150/150/cat?lock=9",
  "https://loremflickr.com/150/150/cat?lock=10",
  "https://loremflickr.com/150/150/cat?lock=11",
  "https://loremflickr.com/150/150/cat?lock=12",
  "https://loremflickr.com/150/150/cat?lock=13",
  "https://loremflickr.com/150/150/cat?lock=14",
  "https://loremflickr.com/150/150/cat?lock=15",
  "https://loremflickr.com/150/150/cat?lock=16",
  "https://loremflickr.com/150/150/cat?lock=17",
  "https://loremflickr.com/150/150/cat?lock=18",
  "https://loremflickr.com/150/150/cat?lock=19",
  "https://loremflickr.com/150/150/cat?lock=20",
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
