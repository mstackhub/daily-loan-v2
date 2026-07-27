"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { formatCurrency } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";
import { PaymentSheet } from "@/components/payments/PaymentSheet";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PaymentsPage() {
  const { debtors, loans, payments, currentReportDate } = useAppStore();
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid" | "all">("unpaid");
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);

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

  const displayItems = useMemo(() => {
    if (activeTab === "unpaid") return unpaidItems;
    if (activeTab === "paid") return paidItems;
    return reportItems;
  }, [activeTab, unpaidItems, paidItems, reportItems]);

  return (
    <div className="min-h-dvh">
      <div className="px-4 pt-12 pb-2">
        <h1 className="text-2xl font-bold text-white mb-4">รับชำระเงินวันนี้</h1>

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
          <button
            onClick={() => setActiveTab("all")}
            className={cn("tab-btn flex-1", activeTab === "all" && "active")}
          >
            ทั้งหมด ({reportItems.length})
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2 pb-8">
        {displayItems.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-white/30 text-sm">ไม่มีข้อมูลในหมวดนี้</p>
          </div>
        ) : (
          displayItems.map(({ loan, debtor, overdueInfo, paidToday }) => (
            <div
              key={loan.id}
              className="glass-card flex items-center gap-3 p-3"
            >
              <DebtorAvatar debtor={debtor} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{debtor.full_name}</p>
                <p className="text-white/40 text-xs">
                  ต้น {formatCurrency(loan.remaining_principal)} | ดอก {formatCurrency(loan.interest_per_period)}
                </p>
              </div>
              {paidToday ? (
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-semibold">จ่ายแล้ว</span>
                </div>
              ) : (
                <button
                  onClick={() => setPaymentLoanId(loan.id)}
                  className="flex-shrink-0 px-3 py-1.5 bg-gradient-primary text-white text-xs font-semibold rounded-lg active:scale-95 transition-transform shadow-glow-primary"
                >
                  รับเงิน
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {paymentLoanId && <PaymentSheet loanId={paymentLoanId} onClose={() => setPaymentLoanId(null)} />}
    </div>
  );
}
