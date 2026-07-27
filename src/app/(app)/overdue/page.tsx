"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { formatCurrency, formatPhone, cn } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";
import { PaymentSheet } from "@/components/payments/PaymentSheet";
import { Search, AlertTriangle } from "lucide-react";

type FilterLevel = "all" | "3" | "7" | "15";

export default function OverduePage() {
  const { debtors, loans, payments } = useAppStore();
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<FilterLevel>("all");
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);

  const overdueItems = useMemo(() => {
    return loans
      .filter((l) => l.status === "active")
      .map((loan) => {
        const debtor = debtors.find((d) => d.id === loan.debtor_id);
        if (!debtor) return null;
        const overdueInfo = getLoanOverdueInfo(loan, payments);
        if (!overdueInfo.isOverdue) return null;
        return { loan, debtor, overdueInfo };
      })
      .filter(Boolean) as Array<{
        loan: (typeof loans)[0];
        debtor: (typeof debtors)[0];
        overdueInfo: ReturnType<typeof getLoanOverdueInfo>;
      }>;
  }, [loans, debtors, payments]);

  const filtered = useMemo(() => {
    return overdueItems
      .filter(({ overdueInfo }) => {
        if (filterLevel === "3") return overdueInfo.overduePeriods > 3;
        if (filterLevel === "7") return overdueInfo.overduePeriods > 7;
        if (filterLevel === "15") return overdueInfo.overduePeriods > 15;
        return true;
      })
      .filter(({ debtor }) => {
        if (!search) return true;
        return debtor.full_name.toLowerCase().includes(search.toLowerCase()) || debtor.phone.includes(search);
      })
      .sort((a, b) => b.overdueInfo.overduePeriods - a.overdueInfo.overduePeriods);
  }, [overdueItems, filterLevel, search]);

  const counts = {
    all: overdueItems.length,
    "3": overdueItems.filter((i) => i.overdueInfo.overduePeriods > 3).length,
    "7": overdueItems.filter((i) => i.overdueInfo.overduePeriods > 7).length,
    "15": overdueItems.filter((i) => i.overdueInfo.overduePeriods > 15).length,
  };

  return (
    <div className="min-h-dvh">
      <div className="px-4 pt-12 pb-2">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h1 className="text-2xl font-bold text-white">ค้างชำระ</h1>
          {overdueItems.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30">
              {overdueItems.length}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา..."
            className="input-field pl-9"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "3", "7", "15"] as FilterLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                filterLevel === level
                  ? "bg-red-500/20 border-red-500/50 text-red-400"
                  : "bg-white/[0.04] border-white/10 text-white/40"
              )}
            >
              {level === "all"
                ? `ทั้งหมด (${counts.all})`
                : `เกิน ${level} วัน (${counts[level]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2 pb-8">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-white/50 font-medium">ไม่มีลูกหนี้ค้างชำระ!</p>
          </div>
        ) : (
          filtered.map(({ loan, debtor, overdueInfo }) => (
            <div
              key={loan.id}
              className="glass-card p-4 border-l-4 border-l-red-500/60"
            >
              <div className="flex items-center gap-3">
                <DebtorAvatar debtor={debtor} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm">{debtor.full_name}</p>
                    <span className="badge-overdue">เกิน {overdueInfo.overduePeriods} งวด</span>
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">
                    ค้างต้น {formatCurrency(loan.remaining_principal)}
                  </p>
                </div>
                <button
                  onClick={() => setPaymentLoanId(loan.id)}
                  className="flex-shrink-0 px-3 py-2 bg-gradient-danger text-white text-xs font-semibold rounded-xl active:scale-95 transition-transform shadow-glow-danger"
                >
                  รับเงิน
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-white/30 text-[10px]">ดอกค้างชำระ</p>
                  <p className="text-red-400 text-sm font-semibold">{formatCurrency(overdueInfo.outstandingInterest)}</p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px]">ดอก/งวด</p>
                  <p className="text-white text-sm font-semibold">{formatCurrency(loan.interest_per_period)}</p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px]">ผ่านมาแล้ว</p>
                  <p className="text-white text-sm font-semibold">{overdueInfo.elapsedPeriods} งวด</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {paymentLoanId && <PaymentSheet loanId={paymentLoanId} onClose={() => setPaymentLoanId(null)} />}
    </div>
  );
}
