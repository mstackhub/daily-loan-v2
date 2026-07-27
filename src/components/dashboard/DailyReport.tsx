"use client";

import { useMemo, useState, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { formatCurrency, formatThaiDate, getTodayStr } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";
import { CheckCircle2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Props {
  onReceivePayment: (loanId: string) => void;
}

type DateRangeType = "today" | "week" | "month" | "custom";

export function DailyReport({ onReceivePayment }: Props) {
  const { debtors, loans, payments } = useAppStore();
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid">("unpaid");
  const [dateRange, setDateRange] = useState<DateRangeType>("today");

  const today = getTodayStr();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Automatically update start and end dates when clicking Today/Week/Month presets
  useEffect(() => {
    const baseDate = new Date();
    
    if (dateRange === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (dateRange === "week") {
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const start = new Date(baseDate);
      start.setDate(diff);
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Sunday

      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (dateRange === "month") {
      const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    }
  }, [dateRange, today]);

  const reportItems = useMemo(() => {
    return loans
      .filter((l) => l.status === "active")
      .map((loan) => {
        const debtor = debtors.find((d) => d.id === loan.debtor_id);
        if (!debtor) return null;

        const loanPayments = payments.filter((p) => p.loan_id === loan.id);
        
        // Filter payments that fall inside the selected [startDate, endDate] range
        const paidInRange = loanPayments.some((p) => {
          if (p.status !== "active") return false;
          const payDateStr = p.payment_date.slice(0, 10);
          return payDateStr >= startDate && payDateStr <= endDate;
        });

        const overdueInfo = getLoanOverdueInfo(loan, payments);

        return { loan, debtor, overdueInfo, paidToday: paidInRange };
      })
      .filter(Boolean) as Array<{
        loan: (typeof loans)[0];
        debtor: (typeof debtors)[0];
        overdueInfo: ReturnType<typeof getLoanOverdueInfo>;
        paidToday: boolean;
      }>;
  }, [loans, debtors, payments, startDate, endDate]);

  const unpaidItems = reportItems.filter((i) => !i.paidToday);
  const paidItems = reportItems.filter((i) => i.paidToday);
  const progress = reportItems.length > 0 ? paidItems.length / reportItems.length : 0;

  const displayItems = activeTab === "unpaid" ? unpaidItems : paidItems;

  const formattedLabel = useMemo(() => {
    if (startDate === endDate) {
      return formatThaiDate(startDate);
    }
    const startStr = formatThaiDate(startDate).replace(/ \d{2}$/, ""); // remove year
    const endStr = formatThaiDate(endDate);
    return `${startStr} - ${endStr}`;
  }, [startDate, endDate]);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        {/* Quick Range Selection Tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/40 mb-3.5">
          <button
            onClick={() => setDateRange("today")}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all", dateRange === "today" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            วันนี้
          </button>
          <button
            onClick={() => setDateRange("week")}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all", dateRange === "week" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            สัปดาห์นี้
          </button>
          <button
            onClick={() => setDateRange("month")}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all", dateRange === "month" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            เดือนนี้
          </button>
        </div>

        <div className="flex flex-col gap-2.5 mb-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {dateRange === "today" ? "รายงานเก็บเงินรายวัน" : dateRange === "week" ? "รายงานเก็บเงินรายสัปดาห์" : dateRange === "month" ? "รายงานเก็บเงินรายเดือน" : "รายงานเก็บเงินกำหนดเอง"}
            </h2>
          </div>

          {/* Dynamic Range Pickers: From Date -> To Date */}
          <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/40">
            {/* From Date */}
            <div className="relative flex-1 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors border border-slate-200/60 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase">เริ่มต้น</span>
                <span className="text-[11px] font-bold text-slate-700 truncate">
                  {formatThaiDate(startDate).slice(0, -3)}
                </span>
              </div>
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setStartDate(e.target.value);
                    setDateRange("custom");
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </div>

            <span className="text-slate-400 text-xs font-medium flex-shrink-0">至</span>

            {/* To Date */}
            <div className="relative flex-1 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors border border-slate-200/60 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase">สิ้นสุด</span>
                <span className="text-[11px] font-bold text-slate-700 truncate">
                  {formatThaiDate(endDate).slice(0, -3)}
                </span>
              </div>
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setEndDate(e.target.value);
                    setDateRange("custom");
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </div>
          </div>
        </div>

        {/* Selected Range Display Label */}
        <p className="text-xs text-slate-500 font-semibold mb-3.5">
          📅 {formattedLabel} {startDate === today && dateRange === "today" && <span className="text-primary-500 font-bold ml-1">(วันนี้)</span>}
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
            <div
              className="h-full bg-gradient-success rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-500 flex-shrink-0">
            {paidItems.length}/{reportItems.length} คน
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button
          onClick={() => setActiveTab("unpaid")}
          className={cn("tab-btn flex-1 py-3 text-xs font-bold", activeTab === "unpaid" && "active")}
        >
          ยังไม่จ่าย ({unpaidItems.length})
        </button>
        <button
          onClick={() => setActiveTab("paid")}
          className={cn("tab-btn flex-1 py-3 text-xs font-bold", activeTab === "paid" && "active")}
        >
          จ่ายแล้ว ({paidItems.length})
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100">
        {displayItems.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-slate-400 text-xs font-semibold">
              {activeTab === "unpaid" ? "เก็บเงินครบเรียบร้อยแล้ว!" : "ยังไม่มีรายการชำระเงิน"}
            </p>
          </div>
        ) : (
          displayItems.map(({ loan, debtor, overdueInfo, paidToday }) => (
            <div key={loan.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/40 transition-colors">
              <Link href={`/debtors/${debtor.id}`} className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <DebtorAvatar debtor={debtor} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-sm font-bold truncate">{debtor.full_name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    ค้างต้น {formatCurrency(loan.remaining_principal)} | ดอก {formatCurrency(loan.interest_per_period)}
                  </p>
                  {overdueInfo.isOverdue && dateRange === "today" && (
                    <span className="text-red-500 text-[10px] font-semibold mt-0.5 block">
                      เกินกำหนด {overdueInfo.overduePeriods} วัน
                    </span>
                  )}
                </div>
              </Link>
              {paidToday ? (
                <div className="flex items-center gap-1 text-emerald-500 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[11px] font-bold">ชำระแล้ว</span>
                </div>
              ) : (
                <button
                  onClick={() => onReceivePayment(loan.id)}
                  className="flex-shrink-0 px-3 py-1.5 bg-gradient-primary text-white text-xs font-bold rounded-lg active:scale-95 transition-transform shadow-glow-primary"
                >
                  รับเงิน
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
