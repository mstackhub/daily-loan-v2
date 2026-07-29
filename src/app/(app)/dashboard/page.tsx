"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { StatCards } from "@/components/dashboard/StatCards";
import { DailyReport } from "@/components/dashboard/DailyReport";
import { AddDebtorSheet } from "@/components/debtors/AddDebtorSheet";
import { PaymentSheet } from "@/components/payments/PaymentSheet";
import { Plus } from "lucide-react";
import { formatCurrency, formatPhone, cn } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";

export default function DashboardPage() {
  const { debtors, loans, payments, lenders } = useAppStore();
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [rangeType, setRangeType] = useState<"today" | "week" | "month" | "custom">("today");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const startOfWeekStr = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split("T")[0];
  }, []);

  const startOfMonthStr = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  }, []);

  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  const { startDate, endDate } = useMemo(() => {
    if (rangeType === "today") return { startDate: todayStr, endDate: todayStr };
    if (rangeType === "week") return { startDate: startOfWeekStr, endDate: todayStr };
    if (rangeType === "month") return { startDate: startOfMonthStr, endDate: todayStr };
    return { startDate: customStartDate, endDate: customEndDate };
  }, [rangeType, todayStr, startOfWeekStr, startOfMonthStr, customStartDate, customEndDate]);

  const stats = useMemo(() => {
    // Helper to generate day strings in range
    const getDaysArray = (start: string, end: string) => {
      const arr = [];
      const dt = new Date(start + "T12:00:00");
      const endDt = new Date(end + "T12:00:00");
      while (dt <= endDt) {
        arr.push(new Date(dt).toISOString().split("T")[0]);
        dt.setDate(dt.getDate() + 1);
      }
      return arr;
    };

    const days = getDaysArray(startDate, endDate);

    // 1. Expected collection target in range (calculated day-by-day for accuracy)
    let targetToday = 0;
    for (const day of days) {
      targetToday += loans
        .filter((l) => l.status === "active" && l.loan_date <= day)
        .reduce((sum, l) => sum + Math.max(0, l.interest_per_period - (l.guarantee_deduction ?? 0)), 0);
    }

    // Get last month string relative to endDate
    const currentMonthDate = new Date(endDate + "T12:00:00");
    currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
    const lastMonthStr = currentMonthDate.toISOString().slice(0, 7);

    // 2. Collected in range (principal + interest)
    const todayCollected = payments
      .filter((p) => {
        if (p.status !== "active") return false;
        const pDate = p.payment_date.split("T")[0];
        return pDate >= startDate && pDate <= endDate;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    // 3. Total outstanding principal as of endDate
    const totalRemaining = loans
      .filter((l) => l.loan_date <= endDate)
      .reduce((sum, l) => {
        const paidBeforeDate = payments
          .filter((p) => p.loan_id === l.id && p.status === "active" && p.payment_date.split("T")[0] <= endDate)
          .reduce((s, p) => s + (p.principal_paid ?? 0), 0);
        return sum + Math.max(0, l.principal - paidBeforeDate);
      }, 0);

    // 4. Total overdue interest as of endDate
    const totalOverdue = loans
      .filter((l) => l.loan_date <= endDate && l.status === "active")
      .reduce((sum, loan) => {
        const overdueInfo = getLoanOverdueInfo(loan, payments, new Date(endDate + "T23:59:59"));
        return sum + overdueInfo.outstandingInterest;
      }, 0);

    // 5. Interest collected in range (Actual profit in range)
    const monthInterestCollected = payments
      .filter((p) => {
        if (p.status !== "active") return false;
        const pDate = p.payment_date.split("T")[0];
        return pDate >= startDate && pDate <= endDate;
      })
      .reduce((sum, p) => sum + p.interest_paid, 0);

    // 6. Last month capital lent relative to endDate's month
    const lastMonthLent = loans
      .filter((l) => l.loan_date.slice(0, 7) === lastMonthStr)
      .reduce((sum, l) => sum + l.principal, 0);

    // 7. Last month profit (interest collected) relative to endDate's month
    const lastMonthInterestCollected = payments
      .filter((p) => p.status === "active" && p.payment_date.slice(0, 7) === lastMonthStr)
      .reduce((sum, p) => sum + p.interest_paid, 0);

    return {
      targetToday,
      todayCollected,
      totalRemaining,
      totalOverdue,
      monthInterestCollected,
      lastMonthLent,
      lastMonthInterestCollected,
    };
  }, [loans, payments, startDate, endDate]);

  const lenderStats = useMemo(() => {
    return lenders.map((lender) => {
      const lenderActiveLoans = loans.filter((l) => l.lender_id === lender.id && l.status === "active");
      const outstandingPrincipal = lenderActiveLoans.reduce((sum, l) => sum + l.remaining_principal, 0);

      const lenderPaymentsInRange = payments.filter((p) => {
        const loan = loans.find((l) => l.id === p.loan_id);
        if (!loan || loan.lender_id !== lender.id || p.status !== "active") return false;
        const pDate = p.payment_date.split("T")[0];
        return pDate >= startDate && pDate <= endDate;
      });
      const interestCollectedToday = lenderPaymentsInRange.reduce((sum, p) => sum + p.interest_paid, 0);

      return {
        id: lender.id,
        name: lender.name,
        outstandingPrincipal,
        interestCollectedToday,
      };
    });
  }, [lenders, loans, payments, startDate, endDate]);

  const recentPayments = useMemo(() => {
    return payments
      .filter((p) => p.status === "active")
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 5)
      .map((payment) => {
        const debtor = debtors.find((d) => d.id === payment.debtor_id);
        return { payment, debtor };
      });
  }, [payments, debtors]);

  const topDebtors = useMemo(() => {
    const debtorInterestMap: Record<string, number> = {};
    payments.forEach((p) => {
      if (p.status === "active") {
        debtorInterestMap[p.debtor_id] = (debtorInterestMap[p.debtor_id] || 0) + (p.interest_paid || 0);
      }
    });

    return Object.entries(debtorInterestMap)
      .map(([debtorId, totalInterest]) => {
        const debtor = debtors.find((d) => d.id === debtorId);
        return { debtor, totalInterest };
      })
      .filter((item): item is { debtor: typeof debtors[0]; totalInterest: number } => !!item.debtor)
      .sort((a, b) => b.totalInterest - a.totalInterest)
      .slice(0, 5);
  }, [payments, debtors]);

  const lastMonthThaiName = useMemo(() => {
    const d = new Date(endDate + "T12:00:00");
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString("th-TH", { month: "long", year: "2-digit" });
  }, [endDate]);

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-white border-b border-slate-100/80 shadow-sm flex flex-col gap-3">
        <div>
          <p className="text-slate-400 text-sm mb-1">สวัสดี 👋</p>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">DebtFlow</h1>
          <p className="text-slate-400 text-xs mt-0.5">ระบบบริหารลูกหนี้รายวันเวอร์ชันใหม่</p>
        </div>

        {/* Dynamic Range selector */}
        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/50">
          <div className="flex gap-1 bg-slate-200/60 p-0.5 rounded-lg">
            {(["today", "week", "month", "custom"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRangeType(t)}
                className={cn(
                  "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                  rangeType === t
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t === "today" ? "วันนี้" : t === "week" ? "สัปดาห์นี้" : t === "month" ? "เดือนนี้" : "กำหนดเอง"}
              </button>
            ))}
          </div>

          {rangeType === "custom" ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">เริ่มต้น</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input-field py-1 text-xs bg-white font-medium text-slate-800 border-slate-200"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">สิ้นสุด</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input-field py-1 text-xs bg-white font-medium text-slate-800 border-slate-200"
                />
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 font-semibold px-1 pt-0.5">
              ช่วงวันที่ตรวจสอบ: <span className="text-violet-600 font-bold">{startDate}</span> ถึง <span className="text-violet-600 font-bold">{endDate}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4 py-5 pb-4">
        {/* Stat Cards */}
        <StatCards stats={stats} />

        {/* Last Month Summary */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-800 font-bold text-sm">ผลประกอบการเดือนที่แล้ว ({lastMonthThaiName})</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">ย้อนหลัง 1 เดือน</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs pt-1">
            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-1 font-medium">เงินทุนปล่อยกู้ใหม่</span>
              <span className="text-slate-700 font-extrabold text-base leading-none block mt-0.5">{formatCurrency(stats.lastMonthLent)}</span>
            </div>
            <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-100/50">
              <span className="text-slate-400 block mb-1 font-medium">กำไรดอกเบี้ยที่เก็บได้</span>
              <span className="text-emerald-600 font-extrabold text-base leading-none block mt-0.5">{formatCurrency(stats.lastMonthInterestCollected)}</span>
            </div>
          </div>
        </div>

        {/* Lenders Summary Card */}
        {lenders.length > 0 && (
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-800 font-bold text-sm">ยอดแยกตามทุน (ประจำวัน)</span>
              <span className="text-[10px] bg-violet-50 text-violet-600 font-bold px-2.5 py-0.5 rounded-full border border-violet-100">ผู้ให้กู้ทั้งหมด</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
              {lenderStats.map((l) => (
                <div key={l.id} className="flex justify-between items-center py-2.5 text-xs">
                  <div>
                    <span className="text-slate-800 font-bold block">{l.name}</span>
                    <span className="text-slate-400 text-[10px]">ทุนค้างในตลาด: {formatCurrency(l.outstandingPrincipal)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-600 font-extrabold block text-sm">{formatCurrency(l.interestCollectedToday)}</span>
                    <span className="text-slate-400 text-[10px]">เก็บดอกได้วันนี้</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 5 Customers by Interest Paid */}
        {topDebtors.length > 0 && (
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-800 font-bold text-sm">จัดอันดับลูกค้าชั้นดี (ยอดดอกสะสมสูงสุด) 🏆</span>
              <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2.5 py-0.5 rounded-full border border-amber-100">Top 5 VIP</span>
            </div>
            <div className="divide-y divide-slate-100">
              {topDebtors.map(({ debtor, totalInterest }, idx) => {
                const medals = ["🥇", "🥈", "🥉"];
                const badge = idx < 3 ? medals[idx] : `${idx + 1}`;
                return (
                  <div key={debtor.id} className="flex justify-between items-center py-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 flex items-center justify-center font-bold text-slate-500 text-sm">
                        {badge}
                      </div>
                      <DebtorAvatar debtor={debtor} size="sm" />
                      <div>
                        <span className="text-slate-800 font-bold block">{debtor.full_name}</span>
                        <span className="text-slate-400 text-[10px]">เบอร์โทร: {formatPhone(debtor.phone)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-500 font-extrabold block text-sm">{formatCurrency(totalInterest)}</span>
                      <span className="text-slate-400 text-[9px]">ดอกเบี้ยที่จ่ายทั้งหมด</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Payments Activity */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-800 font-bold text-sm">ประวัติการรับเงินล่าสุด</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2.5 py-0.5 rounded-full border border-emerald-100">ล่าสุด 5 รายการ</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentPayments.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">ยังไม่มีประวัติการรับชำระเงิน</p>
            ) : (
              recentPayments.map(({ payment, debtor }) => {
                if (!debtor) return null;
                const payTime = new Date(payment.payment_date).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const payDate = new Date(payment.payment_date).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                });
                return (
                  <div key={payment.id} className="flex justify-between items-center py-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <DebtorAvatar debtor={debtor} size="sm" />
                      <div>
                        <span className="text-slate-800 font-bold block">{debtor.full_name}</span>
                        <span className="text-slate-400 text-[10px]">{payDate} • {payTime} น.</span>
                      </div>
                    </div>
                    <span className="text-emerald-600 font-extrabold text-sm">+{formatCurrency(payment.amount)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddDebtor(true)}
        className="fixed bottom-[calc(var(--nav-height)+1rem+env(safe-area-inset-bottom,0px))] right-4 z-20
                   w-14 h-14 bg-gradient-primary rounded-2xl shadow-glow-primary
                   flex items-center justify-center text-white
                   transition-transform duration-200 active:scale-95 hover:brightness-110"
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </button>

      {/* Sheets */}
      {showAddDebtor && <AddDebtorSheet onClose={() => setShowAddDebtor(false)} />}
    </div>
  );
}
