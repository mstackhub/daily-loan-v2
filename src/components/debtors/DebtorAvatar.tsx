"use client";

import { cn } from "@/lib/utils";
import type { Debtor } from "@/types";

const DEFAULT_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.8} className="w-[55%] h-[55%]">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

interface Props {
  debtor: Pick<Debtor, "full_name" | "profile_image_url">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-9 h-9 rounded-xl text-sm",
  md: "w-12 h-12 rounded-2xl text-base",
  lg: "w-20 h-20 rounded-3xl text-2xl",
};

export function DebtorAvatar({ debtor, size = "md", className }: Props) {
  const sizeClass = SIZE_CLASSES[size];
  const hasImage =
    debtor.profile_image_url &&
    (debtor.profile_image_url.startsWith("http") ||
      debtor.profile_image_url.startsWith("data:image"));

  const initials = debtor.full_name
    ? debtor.full_name.trim().split(" ")[0].charAt(0).toUpperCase()
    : "?";

  return (
    <div
      className={cn(
        "flex-shrink-0 flex items-center justify-center overflow-hidden bg-gradient-primary",
        sizeClass,
        className
      )}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={debtor.profile_image_url}
          alt={debtor.full_name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white font-bold">{initials}</span>
      )}
    </div>
  );
}
