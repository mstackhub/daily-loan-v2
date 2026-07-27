"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { StatCards } from "@/components/dashboard/StatCards";
import { DailyReport } from "@/components/dashboard/DailyReport";
import { AddDebtorSheet } from "@/components/debtors/AddDebtorSheet";
import { PaymentSheet } from "@/components/payments/PaymentSheet";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { debtors, loans, payments } = useAppStore();
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);

  const stats = useMemo(() => {
    // 1. Expected collection today
    const targetToday = loans
      .filter((l) => l.status === "active")
      .reduce((sum, l) => sum + Math.max(0, l.interest_per_period - (l.guarantee_deduction ?? 0)), 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const monthStr = todayStr.slice(0, 7);

    // Get last month string
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

    // 2. Today collected
    const todayCollected = payments
      .filter((p) => p.status === "active" && p.payment_date.startsWith(todayStr))
      .reduce((sum, p) => sum + p.amount, 0);

    // 3. Total outstanding principal
    const totalRemaining = loans
      .filter((l) => l.status === "active")
      .reduce((sum, l) => sum + l.remaining_principal, 0);

    // 4. Total overdue interest
    const totalOverdue = loans
      .filter((l) => l.status === "active")
      .reduce((sum, loan) => {
        const overdueInfo = getLoanOverdueInfo(loan, payments);
        return sum + overdueInfo.outstandingInterest;
      }, 0);

    // 5. Month interest collected (Actual profit)
    const monthInterestCollected = payments
      .filter((p) => p.status === "active" && p.payment_date.startsWith(monthStr))
      .reduce((sum, p) => sum + p.interest_paid, 0);

    // 6. Last month capital lent
    const lastMonthLent = loans
      .filter((l) => l.loan_date.startsWith(lastMonthStr))
      .reduce((sum, l) => sum + l.principal, 0);

    // 7. Last month profit (interest collected)
    const lastMonthInterestCollected = payments
      .filter((p) => p.status === "active" && p.payment_date.startsWith(lastMonthStr))
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
  }, [loans, payments]);

  const lastMonthThaiName = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString("th-TH", { month: "long", year: "2-digit" });
  }, []);

  return (
    <div className="min-h-dvh bg-slate-50/20">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <p className="text-slate-400 text-sm mb-1">สวัสดี 👋</p>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">DebtFlow</h1>
        <p className="text-slate-400 text-xs mt-0.5">ระบบบริหารลูกหนี้รายวันเวอร์ชันใหม่</p>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* Stat Cards */}
        <StatCards stats={stats} />

        {/* Last Month Summary */}
        <div className="glass-card p-4.5 space-y-3">
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

        {/* Daily Report */}
        <DailyReport onReceivePayment={setPaymentLoanId} />
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
      {paymentLoanId && (
        <PaymentSheet loanId={paymentLoanId} onClose={() => setPaymentLoanId(null)} />
      )}
    </div>
  );
}
