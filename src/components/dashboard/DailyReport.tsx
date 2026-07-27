"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { formatCurrency, formatThaiDate, freqInterestLabel, getTodayStr } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onReceivePayment: (loanId: string) => void;
}

export function DailyReport({ onReceivePayment }: Props) {
  const { debtors, loans, payments, currentReportDate, setCurrentReportDate } = useAppStore();
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid">("unpaid");

  // Date navigation
  function changeDate(delta: number) {
    const d = new Date(currentReportDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setCurrentReportDate(d.toISOString().split("T")[0]);
  }

  const today = getTodayStr();
  const isToday = currentReportDate === today;

  const reportItems = useMemo(() => {
    return loans
      .filter((l) => l.status === "active")
      .map((loan) => {
        const debtor = debtors.find((d) => d.id === loan.debtor_id);
        if (!debtor) return null;

        const loanPayments = payments.filter((p) => p.loan_id === loan.id);
        const overdueInfo = getLoanOverdueInfo(loan, payments, new Date(currentReportDate + "T12:00:00"));

        const paidToday = loanPayments.some(
          (p) =>
            p.status === "active" &&
            p.payment_date.startsWith(currentReportDate)
        );

        return { loan, debtor, overdueInfo, paidToday };
      })
      .filter(Boolean) as Array<{
        loan: (typeof loans)[0];
        debtor: (typeof debtors)[0];
        overdueInfo: ReturnType<typeof getLoanOverdueInfo>;
        paidToday: boolean;
      }>;
  }, [loans, debtors, payments, currentReportDate]);

  const unpaidItems = reportItems.filter((i) => !i.paidToday);
  const paidItems = reportItems.filter((i) => i.paidToday);
  const progress = reportItems.length > 0 ? paidItems.length / reportItems.length : 0;

  const displayItems = activeTab === "unpaid" ? unpaidItems : paidItems;

  // Thai date display
  const dateObj = new Date(currentReportDate + "T12:00:00");
  const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const dayLabel = DAYS[dateObj.getDay()];
  const dateLabel = formatThaiDate(currentReportDate);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">รายงานเก็บเงินรายวัน</h2>
          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDate(-1)}
              className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-white/60" />
            </button>
            <div className="text-center min-w-[5rem]">
              <p className="text-white text-xs font-semibold">{dayLabel} {dateLabel}</p>
              {isToday && (
                <span className="text-[10px] text-primary-400 font-medium">วันนี้</span>
              )}
            </div>
            <button
              onClick={() => changeDate(1)}
              disabled={isToday}
              className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-success rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-white/60 flex-shrink-0">
            {paidItems.length}/{reportItems.length} คน
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab("unpaid")}
          className={cn("tab-btn flex-1", activeTab === "unpaid" && "active")}
        >
          ยังไม่จ่าย ({unpaidItems.length})
        </button>
        <button
          onClick={() => setActiveTab("paid")}
          className={cn("tab-btn flex-1", activeTab === "paid" && "active")}
        >
          จ่ายแล้ว ({paidItems.length})
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-white/[0.04]">
        {displayItems.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-white/30 text-sm">
              {activeTab === "unpaid" ? "🎉 เก็บเงินครบทุกคนแล้ว!" : "ยังไม่มีการชำระเงิน"}
            </p>
          </div>
        ) : (
          displayItems.map(({ loan, debtor, overdueInfo, paidToday }) => (
            <div key={loan.id} className="flex items-center gap-3 px-4 py-3">
              <DebtorAvatar debtor={debtor} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{debtor.full_name}</p>
                <p className="text-white/40 text-xs">
                  ค้างต้น {formatCurrency(loan.remaining_principal)} | ดอก {formatCurrency(loan.interest_per_period)}
                </p>
                {overdueInfo.isOverdue && (
                  <span className="text-red-400 text-[10px] font-medium">
                    เกิน {overdueInfo.overduePeriods} วัน
                  </span>
                )}
              </div>
              {paidToday ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              ) : (
                <button
                  onClick={() => onReceivePayment(loan.id)}
                  className="flex-shrink-0 px-3 py-1.5 bg-gradient-primary text-white text-xs font-semibold rounded-lg active:scale-95 transition-transform shadow-glow-primary"
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
