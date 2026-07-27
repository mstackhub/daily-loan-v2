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
  const { debtors, loans, payments, lenders } = useAppStore();
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const stats = useMemo(() => {
    // 1. Expected collection on selected date
    const targetToday = loans
      .filter((l) => l.status === "active" && l.loan_date <= selectedDate)
      .reduce((sum, l) => sum + Math.max(0, l.interest_per_period - (l.guarantee_deduction ?? 0)), 0);

    const monthStr = selectedDate.slice(0, 7);

    // Get last month string relative to selectedDate
    const currentMonthDate = new Date(selectedDate + "T12:00:00");
    currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
    const lastMonthStr = currentMonthDate.toISOString().slice(0, 7);

    // 2. Today collected on selected date
    const todayCollected = payments
      .filter((p) => p.status === "active" && p.payment_date.startsWith(selectedDate))
      .reduce((sum, p) => sum + p.amount, 0);

    // 3. Total outstanding principal as of selected date
    const totalRemaining = loans
      .filter((l) => l.loan_date <= selectedDate)
      .reduce((sum, l) => {
        const paidBeforeDate = payments
          .filter((p) => p.loan_id === l.id && p.status === "active" && p.payment_date.split("T")[0] <= selectedDate)
          .reduce((s, p) => s + (p.principal_paid ?? 0), 0);
        return sum + Math.max(0, l.principal - paidBeforeDate);
      }, 0);

    // 4. Total overdue interest as of selected date
    const totalOverdue = loans
      .filter((l) => l.loan_date <= selectedDate && l.status === "active")
      .reduce((sum, loan) => {
        const overdueInfo = getLoanOverdueInfo(loan, payments, new Date(selectedDate + "T23:59:59"));
        return sum + overdueInfo.outstandingInterest;
      }, 0);

    // 5. Month interest collected as of selected date's month
    const monthInterestCollected = payments
      .filter((p) => p.status === "active" && p.payment_date.slice(0, 7) === monthStr)
      .reduce((sum, p) => sum + p.interest_paid, 0);

    // 6. Last month capital lent relative to selectedDate's month
    const lastMonthLent = loans
      .filter((l) => l.loan_date.slice(0, 7) === lastMonthStr)
      .reduce((sum, l) => sum + l.principal, 0);

    // 7. Last month profit (interest collected) relative to selectedDate's month
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
  }, [loans, payments, selectedDate]);

  const lenderStats = useMemo(() => {
    return lenders.map((lender) => {
      const lenderActiveLoans = loans.filter((l) => l.lender_id === lender.id && l.status === "active");
      const outstandingPrincipal = lenderActiveLoans.reduce((sum, l) => sum + l.remaining_principal, 0);

      const todayLenderPayments = payments.filter((p) => {
        const loan = loans.find((l) => l.id === p.loan_id);
        return loan && loan.lender_id === lender.id && p.status === "active" && p.payment_date.startsWith(selectedDate);
      });
      const interestCollectedToday = todayLenderPayments.reduce((sum, p) => sum + p.interest_paid, 0);

      return {
        id: lender.id,
        name: lender.name,
        outstandingPrincipal,
        interestCollectedToday,
      };
    });
  }, [lenders, loans, payments, selectedDate]);

  const lastMonthThaiName = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString("th-TH", { month: "long", year: "2-digit" });
  }, [selectedDate]);

  return (
    <div className="min-h-dvh bg-slate-50/20">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-white border-b border-slate-100/80 shadow-sm flex flex-col gap-3">
        <div>
          <p className="text-slate-400 text-sm mb-1">สวัสดี 👋</p>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">DebtFlow</h1>
          <p className="text-slate-400 text-xs mt-0.5">ระบบบริหารลูกหนี้รายวันเวอร์ชันใหม่</p>
        </div>

        {/* Date Selector */}
        <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/50">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">เลือกวันที่เพื่อตรวจสอบข้อมูล</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field py-2 text-sm bg-white font-medium text-slate-800 border-slate-200"
          />
        </div>
      </div>

      <div className="px-4 space-y-4 py-5 pb-24">
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
