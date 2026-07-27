"use client";

import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Calendar, AlertTriangle, Landmark } from "lucide-react";

interface Props {
  stats: {
    targetToday: number;
    todayCollected: number;
    totalRemaining: number;
    totalOverdue: number;
    monthInterestCollected: number;
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
    <div className="glass-card p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className={`absolute -top-4 -right-4 w-20 h-20 ${glow} rounded-full blur-2xl opacity-15`} />

      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-slate-500 text-xs font-semibold mb-1.5 truncate">{label}</p>
          <p className="text-slate-800 font-extrabold text-xl leading-none">{value}</p>
          {sub && <p className="text-slate-400 text-[10px] font-medium mt-1.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 ml-2`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function StatCards({ stats }: Props) {
  const collectionRate = stats.targetToday > 0 
    ? Math.round((stats.todayCollected / stats.targetToday) * 100) 
    : 0;

  const cards = [
    {
      label: "เก็บเงินวันนี้",
      value: `${formatCurrency(stats.todayCollected)}`,
      sub: `เป้าเก็บวันนี้: ${formatCurrency(stats.targetToday)} (${collectionRate}%)`,
      icon: <Calendar className="w-4.5 h-4.5 text-white" />,
      gradient: "bg-gradient-primary",
      glow: "bg-primary-500",
    },
    {
      label: "เงินลงทุนคงเหลือ",
      value: formatCurrency(stats.totalRemaining),
      sub: "เงินต้นคงค้างในตลาด",
      icon: <Landmark className="w-4.5 h-4.5 text-white" />,
      gradient: "bg-gradient-to-br from-indigo-500 to-indigo-700",
      glow: "bg-indigo-500",
    },
    {
      label: "ดอกเบี้ยค้างชำระ",
      value: formatCurrency(stats.totalOverdue),
      sub: "ความเสี่ยงค้างสะสม",
      icon: <AlertTriangle className="w-4.5 h-4.5 text-white" />,
      gradient: "bg-gradient-danger",
      glow: "bg-red-500",
    },
    {
      label: "กำไรสะสมเดือนนี้",
      value: formatCurrency(stats.monthInterestCollected),
      sub: "ส่วนดอกเบี้ยที่เก็บได้",
      icon: <TrendingUp className="w-4.5 h-4.5 text-white" />,
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
