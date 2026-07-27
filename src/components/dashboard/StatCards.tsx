"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { Users, TrendingUp, Calendar, CalendarDays } from "lucide-react";

interface Props {
  stats: {
    activeDebtors: number;
    totalRemaining: number;
    todayCollected: number;
    monthCollected: number;
  };
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  glow: string;
}

function StatCard({ label, value, sub, icon, gradient, glow }: StatCardProps) {
  return (
    <div className={`glass-card p-4 relative overflow-hidden`}>
      {/* Background glow */}
      <div className={`absolute -top-4 -right-4 w-20 h-20 ${glow} rounded-full blur-2xl opacity-40`} />

      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-white/50 text-xs font-medium mb-1.5 truncate">{label}</p>
          <p className="text-white font-bold text-2xl leading-none">{value}</p>
          {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 ml-2`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function StatCards({ stats }: Props) {
  const cards = [
    {
      label: "ลูกหนี้ที่ยังกู้อยู่",
      value: `${stats.activeDebtors} คน`,
      icon: <Users className="w-5 h-5 text-white" />,
      gradient: "bg-gradient-primary",
      glow: "bg-primary-500",
    },
    {
      label: "เงินต้นคงเหลือรวม",
      value: formatCurrency(stats.totalRemaining),
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      gradient: "bg-gradient-to-br from-indigo-500 to-indigo-700",
      glow: "bg-indigo-500",
    },
    {
      label: "ยอดรับวันนี้",
      value: formatCurrency(stats.todayCollected),
      icon: <Calendar className="w-5 h-5 text-white" />,
      gradient: "bg-gradient-success",
      glow: "bg-emerald-500",
    },
    {
      label: "ยอดรับเดือนนี้",
      value: formatCurrency(stats.monthCollected),
      icon: <CalendarDays className="w-5 h-5 text-white" />,
      gradient: "bg-gradient-to-br from-teal-500 to-cyan-700",
      glow: "bg-teal-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
