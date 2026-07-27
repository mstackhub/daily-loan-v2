"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { formatCurrency, formatThaiDate, getTodayStr } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";
import { ChevronLeft, ChevronRight, CheckCircle2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onReceivePayment: (loanId: string) => void;
}

type DateRange = "today" | "week" | "month";

export function DailyReport({ onReceivePayment }: Props) {
  const { debtors, loans, payments, currentReportDate, setCurrentReportDate } = useAppStore();
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid">("unpaid");
  const [dateRange, setDateRange] = useState<DateRange>("today");

  // Date helpers
  const today = getTodayStr();
  const isToday = currentReportDate === today;

  function changeDate(delta: number) {
    const d = new Date(currentReportDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setCurrentReportDate(d.toISOString().split("T")[0]);
    setDateRange("today"); // reset to day mode when navigating
  }

  // Check if a payment falls in the same week as the selected date
  function isSameWeek(dateStr: string, baseDateStr: string): boolean {
    const date = new Date(dateStr.slice(0, 10));
    const base = new Date(baseDateStr + "T12:00:00");
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const start = new Date(base);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return date >= start && date <= end;
  }

  // Check if a payment falls in the same month as the selected date
  function isSameMonth(dateStr: string, baseDateStr: string): boolean {
    return dateStr.slice(0, 7) === baseDateStr.slice(0, 7);
  }

  const reportItems = useMemo(() => {
    return loans
      .filter((l) => l.status === "active")
      .map((loan) => {
        const debtor = debtors.find((d) => d.id === loan.debtor_id);
        if (!debtor) return null;

        const loanPayments = payments.filter((p) => p.loan_id === loan.id);
        
        // Calculate status depending on range filter
        let paidInRange = false;
        if (dateRange === "today") {
          paidInRange = loanPayments.some(
            (p) => p.status === "active" && p.payment_date.startsWith(currentReportDate)
          );
        } else if (dateRange === "week") {
          paidInRange = loanPayments.some(
            (p) => p.status === "active" && isSameWeek(p.payment_date, currentReportDate)
          );
        } else if (dateRange === "month") {
          paidInRange = loanPayments.some(
            (p) => p.status === "active" && isSameMonth(p.payment_date, currentReportDate)
          );
        }

        const overdueInfo = getLoanOverdueInfo(loan, payments, new Date(currentReportDate + "T12:00:00"));

        return { loan, debtor, overdueInfo, paidToday: paidInRange };
      })
      .filter(Boolean) as Array<{
        loan: (typeof loans)[0];
        debtor: (typeof debtors)[0];
        overdueInfo: ReturnType<typeof getLoanOverdueInfo>;
        paidToday: boolean;
      }>;
  }, [loans, debtors, payments, currentReportDate, dateRange]);

  const unpaidItems = reportItems.filter((i) => !i.paidToday);
  const paidItems = reportItems.filter((i) => i.paidToday);
  const progress = reportItems.length > 0 ? paidItems.length / reportItems.length : 0;

  const displayItems = activeTab === "unpaid" ? unpaidItems : paidItems;

  // Thai date and label formatting
  const dateObj = new Date(currentReportDate + "T12:00:00");
  const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const dayLabel = DAYS[dateObj.getDay()];
  
  const formattedLabel = useMemo(() => {
    if (dateRange === "today") {
      return `${dayLabel} ${formatThaiDate(currentReportDate)}`;
    }
    if (dateRange === "week") {
      // Find start and end of week
      const day = dateObj.getDay();
      const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(dateObj);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const startStr = formatThaiDate(start.toISOString().split("T")[0]).replace(/ \d{2}$/, ""); // remove year
      const endStr = formatThaiDate(end.toISOString().split("T")[0]);
      return `สัปดาห์: ${startStr} - ${endStr}`;
    }
    if (dateRange === "month") {
      const THAI_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
      return `เดือน: ${THAI_MONTHS_FULL[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;
    }
    return "";
  }, [currentReportDate, dateRange, dayLabel]);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        {/* Quick Range Selection Tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/40 mb-3.5">
          <button
            onClick={() => setDateRange("today")}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all", dateRange === "today" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >
            วันนี้
          </button>
          <button
            onClick={() => setDateRange("week")}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all", dateRange === "week" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >
            สัปดาห์นี้
          </button>
          <button
            onClick={() => setDateRange("month")}
            className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all", dateRange === "month" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
          >
            เดือนนี้
          </button>
        </div>

        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold text-slate-800">
            {dateRange === "today" ? "รายงานเก็บเงินรายวัน" : dateRange === "week" ? "รายงานเก็บเงินรายสัปดาห์" : "รายงานเก็บเงินรายเดือน"}
          </h2>

          {/* Dynamic Date Picker & Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => changeDate(-1)}
              className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200/80 transition-colors active:scale-95 border border-slate-200/50"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>

            {/* Dynamic Date input wrapped in styled box */}
            <div className="relative flex items-center bg-slate-100 hover:bg-slate-200/80 transition-colors border border-slate-200/50 rounded-lg px-2.5 py-1.5 cursor-pointer gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap min-w-[70px] text-center">
                {dateRange === "today" ? `${dayLabel} ${formatThaiDate(currentReportDate).slice(0, -3)}` : "เลือกวันที่"}
              </span>
              <input
                type="date"
                value={currentReportDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setCurrentReportDate(e.target.value);
                    setDateRange("today");
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </div>

            <button
              onClick={() => changeDate(1)}
              disabled={isToday}
              className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200/80 transition-colors active:scale-95 disabled:opacity-30 border border-slate-200/50"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Selected Range Display Label */}
        <p className="text-xs text-slate-500 font-medium mb-3">
          {formattedLabel} {isToday && dateRange === "today" && <span className="text-primary-500 font-semibold">(วันนี้)</span>}
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
            <div
              className="h-full bg-gradient-success rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 flex-shrink-0">
            {paidItems.length}/{reportItems.length} คน
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button
          onClick={() => setActiveTab("unpaid")}
          className={cn("tab-btn flex-1 py-3 text-xs font-semibold", activeTab === "unpaid" && "active")}
        >
          ยังไม่จ่าย ({unpaidItems.length})
        </button>
        <button
          onClick={() => setActiveTab("paid")}
          className={cn("tab-btn flex-1 py-3 text-xs font-semibold", activeTab === "paid" && "active")}
        >
          จ่ายแล้ว ({paidItems.length})
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100">
        {displayItems.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-slate-400 text-xs font-medium">
              {activeTab === "unpaid" ? "เก็บเงินครบเรียบร้อยแล้ว!" : "ยังไม่มีรายการชำระเงิน"}
            </p>
          </div>
        ) : (
          displayItems.map(({ loan, debtor, overdueInfo, paidToday }) => (
            <div key={loan.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/40 transition-colors">
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
