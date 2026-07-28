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
  "https://images.unsplash.com/photo-1513360309081-36f5e878fc11?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1561948955-570b270e7c36?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1472491235688-bdc81a63246e?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1511044568932-338cfa0ad80a?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1574158622643-69d34d72650a?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1532386236358-a33d8a9434e3?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1570018144715-43110363d906?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1494256997604-768d1f608cad?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1506891536236-3e058ffdc956?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1571566882372-1598d83abb84?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1608848461950-0fe51dfc41cb?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1508280756771-34abc5b68f59?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1533038590840-1cde6b66b706?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1557246565-8a3d3ab5d7f6?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1569591159212-b02ea8a9f239?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1520315342629-6ea920342047?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1535268647977-a403b69fc757?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1568043210943-0e8aac4b9734?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1574231162430-f1ad69041d26?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1598136490941-30d885318abd?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1577023311546-cdc07a8454d9?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1501820030011-90bc8d30bb8b?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1593487568522-746db8894941?w=150&h=150&fit=crop&auto=format&q=80",
  "https://images.unsplash.com/photo-1606214174585-fe31582d6fc4?w=150&h=150&fit=crop&auto=format&q=80",
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
