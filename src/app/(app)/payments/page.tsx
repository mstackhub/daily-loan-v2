"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo, getPaymentSettledDates } from "@/lib/business-logic/interest";
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";
import { PaymentSheet } from "@/components/payments/PaymentSheet";
import { CheckCircle2, ChevronDown, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PaymentsPage() {
  const { debtors, loans, payments, currentReportDate } = useAppStore();
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid" | "all">("unpaid");
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);
  const [expandedPaidLoanIds, setExpandedPaidLoanIds] = useState<string[]>([]);

  const reportItems = useMemo(() => {
    return loans
      .filter((l) => l.status === "active")
      .map((loan) => {
        const debtor = debtors.find((d) => d.id === loan.debtor_id);
        if (!debtor) return null;

        const loanPayments = payments.filter((p) => p.loan_id === loan.id);
        const overdueInfo = getLoanOverdueInfo(loan, payments, new Date(currentReportDate + "T12:00:00"));

        // Bug #3 fix: normalize payment_date to handle both "2025-07-29 10:30:00" and "2025-07-29T10:30:00Z" formats
        const paidToday = loanPayments.some(
          (p) =>
            p.status === "active" &&
            p.payment_date.replace("T", " ").split(" ")[0] === currentReportDate
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

  const totalCollectedToday = useMemo(() => {
    return payments
      // Bug #3 fix: normalize payment_date to handle both "YYYY-MM-DD HH:MM:SS" and ISO formats
      .filter((p) => p.status === "active" && p.payment_date.replace("T", " ").split(" ")[0] === currentReportDate)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, currentReportDate]);

  const totalTargetToday = useMemo(() => {
    return loans
      .filter((l) => l.status === "active")
      .reduce((sum, l) => sum + Math.max(0, l.interest_per_period - (l.guarantee_deduction ?? 0)), 0);
  }, [loans]);

  const progressPercent = reportItems.length > 0 ? Math.round((paidItems.length / reportItems.length) * 100) : 0;

  const displayItems = useMemo(() => {
    if (activeTab === "unpaid") return unpaidItems;
    if (activeTab === "paid") return paidItems;
    return reportItems;
  }, [activeTab, unpaidItems, paidItems, reportItems]);

  return (
    <div>
      {/* Header & Dashboard Stats */}
      <div className="px-4 pt-12 pb-4 bg-white border-b border-slate-100 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">สรุปยอดเก็บเงินวันนี้</h1>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-5 rounded-2xl text-white shadow-lg shadow-violet-500/15 flex flex-col justify-between min-h-[115px]">
            <div>
              <span className="text-white-force block font-bold text-[10px] opacity-80 uppercase tracking-wider">เก็บเงินสำเร็จวันนี้</span>
              <span className="text-2xl font-extrabold text-white-force block mt-1">{formatCurrency(totalCollectedToday)}</span>
            </div>
            <span className="text-white-force block text-[10px] font-bold opacity-90 mt-2">เป้าเปรียบเทียบ: {formatCurrency(totalTargetToday)}</span>
          </div>

          <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[115px]">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">ความคืบหน้า</span>
              <span className="text-2xl font-extrabold text-slate-800 block mt-1">{progressPercent}%</span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold block mt-2">
              จ่ายแล้ว {paidItems.length} / {reportItems.length} คน
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("unpaid")}
            className={cn(
              "flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all",
              activeTab === "unpaid"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            ยังไม่จ่าย ({unpaidItems.length})
          </button>
          <button
            onClick={() => setActiveTab("paid")}
            className={cn(
              "flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all",
              activeTab === "paid"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            จ่ายแล้ว ({paidItems.length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all",
              activeTab === "all"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            ทั้งหมด ({reportItems.length})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-3 space-y-2 pb-8">
        {displayItems.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 text-sm">ไม่มีข้อมูลในหมวดนี้</p>
          </div>
        ) : (
          displayItems.map(({ loan, debtor, overdueInfo, paidToday }) => {
            const todayPayment = payments.find(
              (p) =>
                p.loan_id === loan.id &&
                p.status === "active" &&
                p.payment_date.replace("T", " ").split(" ")[0] === currentReportDate
            );
            const payTime = todayPayment
              ? new Date(todayPayment.payment_date).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            const activeLoansForThisDebtor = loans
              .filter((l) => l.debtor_id === debtor.id && l.status === "active")
              .sort((a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime());
            const billIndex = activeLoansForThisDebtor.findIndex((l) => l.id === loan.id) + 1;
            const billLabel = activeLoansForThisDebtor.length > 1 ? ` (บิล #${billIndex} - ฿${loan.principal})` : "";

            const isExpanded = expandedPaidLoanIds.includes(loan.id);
            const settledDates = todayPayment ? getPaymentSettledDates(todayPayment) : [];

            return (
              <div
                key={loan.id}
                className={cn(
                  "glass-card-sm p-3.5 transition-all",
                  paidToday && "bg-emerald-50/15 border-emerald-200/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <DebtorAvatar debtor={debtor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-slate-800 text-sm font-semibold truncate">{debtor.full_name}{billLabel}</p>
                      {overdueInfo.isOverdue && !paidToday && (
                        <span className="badge-overdue flex-shrink-0 text-[9px] px-1.5 py-0.5">
                          ค้าง {overdueInfo.overduePeriods} วัน
                        </span>
                      )}
                    </div>
                    {paidToday && todayPayment ? (
                      <p className="text-emerald-600 text-xs font-semibold mt-1">
                        จ่ายแล้วเมื่อ {payTime} น. • {formatCurrency(todayPayment.amount)}
                      </p>
                    ) : (
                      <p className="text-slate-400 text-xs mt-1">
                        ต้น <span className="text-slate-600 font-semibold">{formatCurrency(loan.remaining_principal)}</span> | ดอกจริง <span className="text-violet-600 font-bold">{formatCurrency(Math.max(0, loan.interest_per_period - (loan.guarantee_deduction ?? 0)))}</span>
                      </p>
                    )}
                  </div>
                  {paidToday ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedPaidLoanIds(expandedPaidLoanIds.filter((id) => id !== loan.id));
                        } else {
                          setExpandedPaidLoanIds([...expandedPaidLoanIds, loan.id]);
                        }
                      }}
                      className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-[11px] font-bold">จ่ายแล้ว</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-emerald-600 transition-transform duration-200", isExpanded && "rotate-180")} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setPaymentLoanId(loan.id)}
                      className="flex-shrink-0 px-3 py-1.5 bg-gradient-primary text-white text-xs font-semibold rounded-lg active:scale-95 transition-transform shadow-glow-primary"
                    >
                      รับเงิน
                    </button>
                  )}
                </div>

                {/* EXPANDABLE PAID DETAILS */}
                {paidToday && todayPayment && isExpanded && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/80 space-y-3 text-xs animate-fade-in">
                    <div>
                      <p className="text-slate-700 text-xs font-bold mb-2 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-violet-600" />
                        ชำระสำหรับงวดวันที่ ({settledDates.length > 0 ? `${settledDates.length} วัน` : "คำนวณตามยอด"}):
                      </p>
                      {settledDates.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {settledDates.map((d) => (
                            <span
                              key={d}
                              className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 border border-violet-300 font-bold text-xs shadow-xs"
                            >
                              {formatThaiDate(d)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs">ชำระตามยอดเงินรวม {formatCurrency(todayPayment.amount)}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
                      <div className="space-y-1.5 text-slate-600 font-medium">
                        <div>วิธีชำระ: <span className="font-extrabold text-slate-900 ml-1">{todayPayment.payment_method === "cash" ? "💵 เงินสด" : "📱 โอนเงิน"}</span></div>
                        <div>หักดอกเบี้ย: <span className="font-extrabold text-amber-700 ml-1">{formatCurrency(todayPayment.interest_paid)}</span></div>
                      </div>
                      <div className="space-y-1.5 text-slate-600 font-medium">
                        <div>หักเงินต้น: <span className="font-extrabold text-violet-700 ml-1">{formatCurrency(todayPayment.principal_paid)}</span></div>
                        {todayPayment.principal_discount ? (
                          <div>ส่วนลดต้น: <span className="font-extrabold text-emerald-700 ml-1">{formatCurrency(todayPayment.principal_discount)}</span></div>
                        ) : null}
                        <div>ต้นคงเหลือ: <span className="font-extrabold text-slate-900 ml-1">{formatCurrency(todayPayment.remaining_principal)}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {paymentLoanId && <PaymentSheet loanId={paymentLoanId} onClose={() => setPaymentLoanId(null)} />}
    </div>
  );
}
