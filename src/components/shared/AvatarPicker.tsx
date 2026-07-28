"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const UNSPLASH_AVATARS = [
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1561948955-570b270e7c36?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1472491235688-bdc81a63246e?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1608848461950-0fe51dfc41cb?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1557246565-8a3d3ab5d7f6?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1569591159212-b02ea8a9f239?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1568043210943-0e8aac4b9734?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1598136490941-30d885318abd?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1577023311546-cdc07a8454d9?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1501820030011-90bc8d30bb8b?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1593487568522-746db8894941?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1583795128480-474d4000455b?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1535268647977-a403b69fc757?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1574231162430-f1ad69041d26?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1586289883499-f11d28aaf52f?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1571151598711-93a0179ec212?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1533749007666-80f907d3778a?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1574063413132-355dbfd83e9a?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1500259783852-0ca9ce6a64dd?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1568307970720-a8c55b766834?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1572491235688-bdc81a63246e?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1591871937573-74dbba515c4c?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1503431128947-66528f86e15e?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1491485880348-85d48a9e5312?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1516280030429-27679b3dc9d8?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1517331156688-bdc81a63246e?w=150&h=150&fit=crop&auto=format&q=80",
];

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
          <p className="section-heading mb-3 text-slate-400">รูปภาพแมวจริง (Unsplash) 🐱</p>
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
    </>
  );
}
