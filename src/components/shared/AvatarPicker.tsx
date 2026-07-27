"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const UNSPLASH_AVATARS = [
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&h=150&fit=crop&q=80",
  "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=150&h=150&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=150&h=150&fit=crop&q=80",
  "https://images.unsplash.com/photo-1561948955-570b270e7c36?w=150&h=150&fit=crop&q=80",
  "https://images.unsplash.com/photo-1513360309081-36f5e878fc9e?w=150&h=150&fit=crop&q=80",
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&h=150&fit=crop&q=80",
  "https://images.unsplash.com/photo-1492370284958-c20b1596ee74?w=150&h=150&fit=crop&q=80",
  "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=150&h=150&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=150&h=150&fit=crop&q=80",
  "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=150&h=150&fit=crop&q=80",
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
