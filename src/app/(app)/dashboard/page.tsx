"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { StatCards } from "@/components/dashboard/StatCards";
import { DailyReport } from "@/components/dashboard/DailyReport";
import { AddDebtorSheet } from "@/components/debtors/AddDebtorSheet";
import { PaymentSheet } from "@/components/payments/PaymentSheet";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  const { debtors, loans, payments } = useAppStore();
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);

  const stats = useMemo(() => {
    // 1. Expected collection today
    const targetToday = loans
      .filter((l) => l.status === "active")
      .reduce((sum, l) => sum + l.interest_per_period, 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const monthStr = todayStr.slice(0, 7);

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

    return {
      targetToday,
      todayCollected,
      totalRemaining,
      totalOverdue,
      monthInterestCollected,
    };
  }, [loans, payments]);

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <p className="text-slate-400 text-sm mb-1">สวัสดี 👋</p>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">DebtFlow</h1>
        <p className="text-slate-400 text-xs mt-0.5">ระบบบริหารลูกหนี้รายวันเวอร์ชันใหม่</p>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* Stat Cards */}
        <StatCards stats={stats} />

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
