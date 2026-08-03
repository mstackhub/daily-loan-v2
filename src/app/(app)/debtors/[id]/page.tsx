"use client";

import type { Loan, Payment } from "@/types";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { formatCurrency, formatPhone, formatThaiDate, formatThaiDateTime, cn } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";
import { PaymentSheet } from "@/components/payments/PaymentSheet";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, Phone, ShieldAlert, FileText, History, Image as ImageIcon, Trash2, X, Edit2, ChevronDown, ChevronUp, CalendarRange } from "lucide-react";
import Link from "next/link";
import { EditDebtorSheet } from "@/components/debtors/EditDebtorSheet";
import { AddLoanSheet } from "@/components/debtors/AddLoanSheet";

type Tab = "info" | "schedule" | "history";

function getPaymentSchedule(loan: Loan, payments: Payment[]) {
  const schedule = [];
  const startDate = new Date(loan.loan_date + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const freq = loan.payment_frequency ?? "daily";
  const netInterest = Math.max(0, loan.interest_per_period - (loan.guarantee_deduction ?? 0));
  const loanPayments = payments
    .filter((p) => p.loan_id === loan.id && p.status === "active")
    .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

  let currentPrincipal = loan.principal;
  const currentDate = new Date(startDate);
  let periodIndex = 1;

  // Pools for tracking which payment covers which period
  let interestPool = loanPayments.map(p => ({
    date: p.payment_date.split(" ")[0],
    amount: p.interest_paid ?? 0
  })).filter(p => p.amount > 0);

  let paymentMapByDate: Record<string, { principal: number; interest: number }> = {};
  loanPayments.forEach(p => {
    const dStr = p.payment_date.split(" ")[0];
    if (!paymentMapByDate[dStr]) {
      paymentMapByDate[dStr] = { principal: 0, interest: 0 };
    }
    paymentMapByDate[dStr].principal += p.principal_paid ?? 0;
    paymentMapByDate[dStr].interest += p.interest_paid ?? 0;
  });

  while (currentDate <= today || periodIndex <= loan.minimum_periods) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const paidOnThisDate = paymentMapByDate[dateStr] || { principal: 0, interest: 0 };
    
    // Allocate interest needed for this period from the chronological interestPool
    let interestNeeded = netInterest;
    let interestPaidThisPeriod = 0;
    let transactionDates: string[] = [];

    while (interestNeeded > 0 && interestPool.length > 0) {
      const currentPay = interestPool[0];
      const take = Math.min(interestNeeded, currentPay.amount);
      interestNeeded -= take;
      interestPaidThisPeriod += take;
      currentPay.amount -= take;

      if (!transactionDates.includes(currentPay.date)) {
        transactionDates.push(currentPay.date);
      }

      if (currentPay.amount <= 0) {
        interestPool.shift();
      }
    }

    let status: "paid" | "partial" | "unpaid" = "unpaid";
    if (interestPaidThisPeriod >= netInterest) {
      status = "paid";
    } else if (interestPaidThisPeriod > 0) {
      status = "partial";
    }

    const principalPaidOnThisDate = loanPayments
      .filter(p => p.payment_date.split(" ")[0] === dateStr)
      .reduce((sum, p) => sum + (p.principal_paid ?? 0), 0);
    
    currentPrincipal = Math.max(0, currentPrincipal - principalPaidOnThisDate);

    schedule.push({
      period: periodIndex,
      date: dateStr,
      expectedInterest: netInterest,
      interestPaid: interestPaidThisPeriod,
      principalPaid: paidOnThisDate.principal,
      remainingPrincipal: currentPrincipal,
      transactionDate: transactionDates.map(d => formatThaiDate(d)).join(", ") || "-",
      status,
    });

    periodIndex++;
    if (freq === "daily") {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (freq === "weekly") {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (freq === "monthly") {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    if (currentDate > today && periodIndex > loan.minimum_periods) {
      break;
    }
    if (periodIndex > 365) break;
  }

  return schedule;
}

export default function DebtorDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { debtors, setDebtors, loans, setLoans, payments, setPayments, lenders, showToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null);
  const [cancelPaymentId, setCancelPaymentId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [showEditDebtor, setShowEditDebtor] = useState(false);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteLoanId, setDeleteLoanId] = useState<string | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [selectedScheduleLoanId, setSelectedScheduleLoanId] = useState<string | null>(null);

  const debtor = debtors.find((d) => d.id === id);

  async function handleDeleteLoan() {
    if (!deleteLoanId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("loans").delete().eq("id", deleteLoanId);
      if (error) throw error;

      // Update local store state
      setLoans(loans.filter((l) => l.id !== deleteLoanId));
      setPayments(payments.filter((p) => p.loan_id !== deleteLoanId));

      showToast("ลบสัญญากู้ยืมเรียบร้อยแล้ว", "success");
      setDeleteLoanId(null);
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + (err.message || err), "danger");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteDebtor() {
    if (!debtor) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("debtors").delete().eq("id", debtor.id);
      if (error) throw error;

      // Update local store state
      setDebtors(debtors.filter((d) => d.id !== debtor.id));
      setLoans(loans.filter((l) => l.debtor_id !== debtor.id));
      setPayments(payments.filter((p) => p.debtor_id !== debtor.id));

      showToast("ลบข้อมูลลูกหนี้เรียบร้อยแล้ว", "success");
      // Soft navigation — no full page reload
      router.push("/debtors");
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + (err.message || err), "danger");
    } finally {
      setIsDeleting(false);
    }
  }

  const debtorLoans = useMemo(() => {
    return loans
      .filter((l) => l.debtor_id === id)
      .sort((a, b) => new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime());
  }, [loans, id]);

  const activeLoan = useMemo(() => {
    return debtorLoans.find((l) => l.status === "active") || debtorLoans[0] || null;
  }, [debtorLoans]);

  const firstActiveLoanId = useMemo(() => {
    const active = debtorLoans.find((l) => l.status === "active");
    if (active) return active.id;
    return debtorLoans[0]?.id || null;
  }, [debtorLoans]);



  const stats = useMemo(() => {
    const active = debtorLoans.filter((l) => l.status === "active");
    const remaining = active.reduce((sum, l) => sum + l.remaining_principal, 0);
    const debtorPayments = payments.filter((p) => p.debtor_id === id && p.status === "active");
    const principalPaid = debtorPayments.reduce((sum, p) => sum + p.principal_paid, 0);
    const interestPaid = debtorPayments.reduce((sum, p) => sum + p.interest_paid, 0);
    return { remaining, principalPaid, interestPaid };
  }, [debtorLoans, payments, id]);

  const overdueInfo = useMemo(() => {
    if (!activeLoan) return null;
    return getLoanOverdueInfo(activeLoan, payments);
  }, [activeLoan, payments]);

  async function handleCancelPayment() {
    if (!cancelPaymentId || !debtor) return;
    if (!cancelReason.trim()) {
      showToast("กรุณากรอกเหตุผลการยกเลิก", "warning");
      return;
    }

    setIsCancelling(true);
    try {
      const paymentToCancel = payments.find((p) => p.id === cancelPaymentId);
      if (!paymentToCancel) return;

      const targetLoan = loans.find((l) => l.id === paymentToCancel.loan_id);
      if (!targetLoan) return;

      // Update payment status
      const { error: payErr } = await supabase
        .from("payments")
        .update({ status: "cancelled", cancel_reason: cancelReason })
        .eq("id", cancelPaymentId);

      if (payErr) throw payErr;

      // Recalculate remaining principal for the loan
      const targetLoanPayments = payments.filter((p) => p.loan_id === targetLoan.id);
      const otherActivePays = targetLoanPayments.filter((p) => p.id !== cancelPaymentId && p.status !== "cancelled");
      // Bug #2 fix: include principal_discount (matches recalcRemainingPrincipal logic)
      const totalPrincipalPaid = otherActivePays.reduce((sum, p) => sum + (p.principal_paid ?? 0) + (p.principal_discount ?? 0), 0);
      const newRemaining = Math.max(0, targetLoan.principal - totalPrincipalPaid);

      // Re-activate loan and debtor
      await supabase.from("loans").update({ remaining_principal: newRemaining, status: "active" }).eq("id", targetLoan.id);
      await supabase.from("debtors").update({ status: "active" }).eq("id", debtor.id);

      // Update local state
      setPayments(payments.map((p) => p.id === cancelPaymentId ? { ...p, status: "cancelled", cancel_reason: cancelReason } : p));
      setLoans(loans.map((l) => l.id === targetLoan.id ? { ...l, remaining_principal: newRemaining, status: "active" } : l));
      setDebtors(debtors.map((d) => d.id === debtor.id ? { ...d, status: "active" } : d));

      showToast("ยกเลิกรายการชำระเงินสำเร็จ", "success");
      setCancelPaymentId(null);
      setCancelReason("");
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + err.message, "danger");
    } finally {
      setIsCancelling(false);
    }
  }

  if (!debtor) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <p className="text-white/40">ไม่พบข้อมูลลูกหนี้</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* Header Bar */}
      <div className="px-4 pt-12 pb-3 flex items-center gap-3">
        <Link href="/debtors" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-lg font-bold text-white">รายละเอียดลูกหนี้</h1>
      </div>

      {/* Main card */}
      <div className="px-4 space-y-4 pb-8">
        <div className="glass-card p-4 flex flex-col items-center text-center relative">
          {/* Delete Debtor Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="absolute top-4 left-4 p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all border border-red-500/20 text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Edit Debtor Profile Button */}
          <button
            onClick={() => setShowEditDebtor(true)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-95 transition-all border border-slate-200/40"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <DebtorAvatar debtor={debtor} size="lg" className="mb-3 border-2 border-primary-500/20" />
          <h2 className="text-lg font-bold text-slate-800">{debtor.full_name}</h2>
          <div className="flex items-center gap-1.5 text-white/50 text-xs mt-1">
            <Phone className="w-3.5 h-3.5" />
            <a href={`tel:${debtor.phone}`} className="hover:underline">{formatPhone(debtor.phone)}</a>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap justify-center">
            <span className={debtor.status === "active" ? "badge-active" : "badge-closed"}>
              {debtor.status === "active" ? "กำลังกู้" : "ปิดยอดแล้ว"}
            </span>
            {overdueInfo?.isOverdue && (
              <span className="badge-overdue flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> เกินกำหนด {overdueInfo.overduePeriods} วัน
              </span>
            )}
            {debtor.referred_by && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                แนะนำโดย: {debtor.referred_by}
              </span>
            )}
            <button
              onClick={() => setShowAddLoan(true)}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 active:scale-95 transition-all flex items-center gap-0.5"
            >
              + เปิดบิลกู้ใหม่
            </button>
          </div>

          {/* Key values */}
          <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.06] text-center">
            <div>
              <p className="text-white/30 text-[10px]">เงินต้นคงเหลือรวม</p>
              <p className="text-white font-bold text-sm">{formatCurrency(stats.remaining)}</p>
            </div>
            <div>
              <p className="text-white/30 text-[10px]">จ่ายต้นสะสม</p>
              <p className="text-primary-400 font-bold text-sm">{formatCurrency(stats.principalPaid)}</p>
            </div>
            <div>
              <p className="text-white/30 text-[10px]">จ่ายดอกสะสม</p>
              <p className="text-amber-400 font-bold text-sm">{formatCurrency(stats.interestPaid)}</p>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-white/[0.06] text-xs">
          <button onClick={() => setActiveTab("info")} className={cn("tab-btn flex-1 flex items-center justify-center gap-1.5 py-3", activeTab === "info" && "active")}>
            <FileText className="w-3.5 h-3.5" /> สัญญากู้ ({debtorLoans.length})
          </button>
          <button onClick={() => setActiveTab("history")} className={cn("tab-btn flex-1 flex items-center justify-center gap-1.5 py-3", activeTab === "history" && "active")}>
            <History className="w-3.5 h-3.5" /> ประวัติ
          </button>
        </div>

        {/* Tab contents */}
        {activeTab === "info" && (
          <div className="space-y-4">
            {debtorLoans.length === 0 ? (
              <div className="glass-card p-8 text-center text-white/30 text-sm">
                ยังไม่มีสัญญากู้ยืม
              </div>
            ) : (
              <div className="space-y-2">
                {debtorLoans.map((l, index) => {
                  const lender = l.lender_id ? lenders.find((len) => len.id === l.lender_id) : null;
                  const isExpanded = expandedLoanId === l.id;

                  return (
                    <div key={l.id} className="glass-card border border-white/[0.05] overflow-hidden transition-all duration-300">
                      {/* Accordion Header */}
                      <div 
                        onClick={() => setExpandedLoanId(isExpanded ? "" : l.id)}
                        className="p-3.5 flex justify-between items-center cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.04] transition-all select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full shrink-0", 
                            l.status === "active" ? "bg-emerald-500 shadow-glow-emerald" : "bg-white/20"
                          )}></span>
                          <span className="text-sm font-bold text-white">
                            บิล #{debtorLoans.length - index} (กู้ {formatCurrency(l.principal)})
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className={l.status === "active" ? "text-emerald-400 font-bold text-xs" : "text-white/30 text-xs"}>
                            {l.status === "active" ? "กำลังผ่อน" : "ปิดสัญญาแล้ว"}
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => setDeleteLoanId(l.id)}
                            className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all"
                            title="ลบบิลนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedLoanId(isExpanded ? "" : l.id)}
                            className="text-white/40 hover:text-white/60 transition-colors p-1"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Accordion Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.03] animate-fade-in">
                          <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                            <div>
                              <span className="text-white/40 block">ต้นคงเหลือ</span>
                              <span className="text-white font-semibold text-sm">{formatCurrency(l.remaining_principal)}</span>
                            </div>
                            <div>
                              <span className="text-white/40 block">ดอกจริง/งวด</span>
                              <span className="text-emerald-400 font-bold text-sm">
                                {formatCurrency(Math.max(0, l.interest_per_period - (l.guarantee_deduction ?? 0)))}
                              </span>
                            </div>
                            <div>
                              <span className="text-white/40 block">ความถี่การผ่อน</span>
                              <span className="text-white font-medium">
                                {l.payment_frequency === "daily" ? "รายวัน" : l.payment_frequency === "weekly" ? "รายสัปดาห์" : "รายเดือน"}
                              </span>
                            </div>
                            <div>
                              <span className="text-white/40 block">วันที่เริ่มกู้</span>
                              <span className="text-white font-medium">{formatThaiDate(l.loan_date)}</span>
                            </div>
                            {lender && (
                              <div className="col-span-2 pt-1">
                                <span className="text-white/40 block">นายทุนที่ดูแลบิลนี้</span>
                                <span className="text-violet-300 font-bold">{lender.name}</span>
                              </div>
                            )}
                          </div>

                          {l.status === "active" && (
                            <button
                              onClick={() => setPaymentLoanId(l.id)}
                              className="btn-primary w-full py-2 text-xs font-bold mt-2 text-center"
                            >
                              รับชำระเงินบิลนี้
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Debtor details */}
            <div className="glass-card p-4 space-y-3">
              <p className="section-heading">ข้อมูลเพิ่มเติมของลูกหนี้</p>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-white/40 block text-xs">ที่อยู่</span>
                  <span className="text-white">{debtor.address || "-"}</span>
                </div>
                <div>
                  <span className="text-white/40 block text-xs">อาชีพ</span>
                  <span className="text-white">{debtor.occupation || "-"}</span>
                </div>
                <div>
                  <span className="text-white/40 block text-xs">เลขบัตรประชาชน</span>
                  <span className="text-white">{debtor.national_id || "-"}</span>
                </div>
                <div>
                  <span className="text-white/40 block text-xs">บันทึกเพิ่มเติม</span>
                  <span className="text-white/60 text-xs italic">{debtor.note || "-"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-4">
            {debtorLoans.length === 0 ? (
              <div className="glass-card p-8 text-center text-white/30 text-sm">
                ยังไม่มีสัญญากู้ยืม
              </div>
            ) : (
              <div className="glass-card p-4 space-y-4">
                {/* Select dropdown / tab selector if multiple loans */}
                {debtorLoans.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-white/40 text-xs font-semibold block">เลือกสัญญากู้ยืม</label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {debtorLoans.map((l, index) => {
                        const isSelected = (selectedScheduleLoanId || firstActiveLoanId) === l.id;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setSelectedScheduleLoanId(l.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border",
                              isSelected
                                ? "bg-primary-500/20 border-primary-500/40 text-primary-400 font-extrabold"
                                : "bg-white/[0.04] border-white/10 text-white/50"
                            )}
                          >
                            บิล #{debtorLoans.length - index} (กู้ {formatCurrency(l.principal)})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Table display */}
                {(() => {
                  const targetLoan = debtorLoans.find(l => l.id === (selectedScheduleLoanId || firstActiveLoanId)) || debtorLoans[0];
                  if (!targetLoan) return null;
                  const schedule = getPaymentSchedule(targetLoan, payments);
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                        <div>
                          <span className="text-white/40 text-[10px] block">กำลังดูตารางของ</span>
                          <span className="text-white text-xs font-extrabold">เงินกู้ {formatCurrency(targetLoan.principal)} ({targetLoan.payment_frequency === "daily" ? "รายวัน" : targetLoan.payment_frequency === "weekly" ? "รายสัปดาห์" : "รายเดือน"})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-white/40 text-[10px] block">ดอกจริง/งวด</span>
                          <span className="text-emerald-400 font-extrabold text-xs">{formatCurrency(Math.max(0, targetLoan.interest_per_period - (targetLoan.guarantee_deduction ?? 0)))}</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-white/[0.06] rounded-2xl bg-white/[0.01]">
                        <table className="w-full text-xs text-left border-collapse min-w-[650px]">
                          <thead>
                            <tr className="bg-white/[0.04] border-b border-white/[0.06] text-white/40">
                              <th className="p-3 font-semibold">งวดที่</th>
                              <th className="p-3 font-semibold">งวดวันที่ชำระ</th>
                              <th className="p-3 font-semibold">วันที่ทำรายการ</th>
                              <th className="p-3 text-right font-semibold">เรียกเก็บ</th>
                              <th className="p-3 text-right font-semibold">จ่ายดอก</th>
                              <th className="p-3 text-right font-semibold">จ่ายต้น</th>
                              <th className="p-3 text-right font-semibold">ต้นคงเหลือ</th>
                              <th className="p-3 text-center font-semibold">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {schedule.map((row) => (
                              <tr key={row.period} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-3 text-white/50 font-mono">#{row.period}</td>
                                <td className="p-3 text-white/80 font-medium">{formatThaiDate(row.date)}</td>
                                <td className="p-3 text-white/60 text-[11px] font-mono">{row.transactionDate}</td>
                                <td className="p-3 text-right text-white/80 font-mono">{formatCurrency(row.expectedInterest)}</td>
                                <td className="p-3 text-right text-emerald-400 font-extrabold font-mono">{formatCurrency(row.interestPaid)}</td>
                                <td className="p-3 text-right text-primary-400 font-semibold font-mono">{formatCurrency(row.principalPaid)}</td>
                                <td className="p-3 text-right text-white/70 font-bold font-mono">{formatCurrency(row.remainingPrincipal)}</td>
                                <td className="p-3 text-center">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block border",
                                    row.status === "paid" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                                    row.status === "partial" && "bg-amber-500/10 border-amber-500/20 text-amber-400",
                                    row.status === "unpaid" && "bg-red-500/10 border-red-500/20 text-red-400"
                                  )}>
                                    {row.status === "paid" ? "จ่ายครบ" : row.status === "partial" ? "บางส่วน" : "ค้างชำระ"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            {payments.filter((p) => p.debtor_id === id).length === 0 ? (
              <div className="glass-card p-8 text-center text-white/30 text-sm">
                ไม่มีประวัติการชำระเงินสำหรับเงินกู้นี้
              </div>
            ) : (
              payments
                .filter((p) => p.debtor_id === id)
                .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                .map((p) => {
                  const targetLoan = loans.find((l) => l.id === p.loan_id);
                  const billLabel = targetLoan ? ` (บิล ฿${targetLoan.principal})` : "";
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "glass-card p-3 relative overflow-hidden",
                        p.status === "cancelled" && "opacity-50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-semibold text-base">
                            {formatCurrency(p.amount)}
                            <span className="text-xs font-bold text-violet-400 ml-1.5">{billLabel}</span>
                          </p>
                          <p className="text-white/40 text-xs mt-0.5">{formatThaiDateTime(p.payment_date)}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {p.payment_method === "transfer" && p.slip_image_url && (
                            <button
                              onClick={() => setSelectedSlipUrl(p.slip_image_url)}
                              className="p-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                              <ImageIcon className="w-4 h-4 text-white/60" />
                            </button>
                          )}

                          {p.status === "active" && (
                            <button
                              onClick={() => setCancelPaymentId(p.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs text-white/50">
                        <span>หักต้น: {formatCurrency(p.principal_paid)}</span>
                        {p.principal_discount ? (
                          <span className="text-emerald-400">ลดต้นพิเศษ: {formatCurrency(p.principal_discount)}</span>
                        ) : null}
                        <span>หักดอก: {formatCurrency(p.interest_paid)}</span>
                        <span>คงเหลือ: {formatCurrency(p.remaining_principal)}</span>
                      </div>

                      {p.status === "cancelled" && (
                        <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-400 text-[10px]">
                          <span className="font-semibold block">ยกเลิกแล้ว</span>
                          <span>เหตุผล: {p.cancel_reason}</span>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>

      {/* Slip viewer modal */}
      {selectedSlipUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-center items-center p-4">
          <button onClick={() => setSelectedSlipUrl(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-6 h-6 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedSlipUrl} alt="slip" className="max-w-full max-h-[80vh] rounded-xl shadow-glow-primary object-contain" />
        </div>
      )}

      {/* Cancel Payment overlay sheet */}
      {cancelPaymentId && (
        <>
          <div className="sheet-overlay animate-fade-in" onClick={() => setCancelPaymentId(null)} />
          <div className="sheet-container animate-slide-up">
            <div className="sheet-handle" />
            <div className="px-4 space-y-4">
              <h3 className="text-base font-bold text-white">ต้องการยกเลิกรายการนี้?</h3>
              <p className="text-white/50 text-xs">
                ยอดเงินต้นจะกลับไปบวกสะสมเป็นยอดคงค้างเพิ่มขึ้นตามเดิม กรุณาระบุเหตุผลการยกเลิกการชำระเงินนี้
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="ระบุเหตุผลในการยกเลิก..."
                className="input-field min-h-[80px] resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setCancelPaymentId(null)} className="btn-secondary flex-1">
                  ยกเลิก
                </button>
                <button
                  onClick={handleCancelPayment}
                  disabled={isCancelling}
                  className="btn-danger flex-1"
                >
                  {isCancelling ? "กำลังบันทึก..." : "ยืนยันยกเลิก"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {paymentLoanId && <PaymentSheet loanId={paymentLoanId} onClose={() => setPaymentLoanId(null)} />}
      
      {showEditDebtor && (
        <EditDebtorSheet
          debtor={debtor}
          loan={activeLoan}
          onClose={() => setShowEditDebtor(false)}
        />
      )}

      {showAddLoan && (
        <AddLoanSheet
          debtorId={debtor.id}
          onClose={() => setShowAddLoan(false)}
        />
      )}

      {showDeleteConfirm && (
        <>
          <div className="sheet-overlay animate-fade-in" onClick={() => setShowDeleteConfirm(false)} />
          <div className="sheet-container animate-slide-up" style={{ zIndex: 60 }}>
            <div className="sheet-handle" />
            <div className="p-4 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ยืนยันลบลูกหนี้ "{debtor.full_name}"?</h3>
                <p className="text-xs text-red-400 font-medium mt-2">
                  ⚠️ คำเตือน: การลบลูกหนี้รายนี้ จะทำให้สัญญากู้ทั้งหมด ({debtorLoans.length} บิล) และประวัติการรับชำระเงินทั้งหมด ถูกลบออกจากระบบอย่างถาวรทันทีและไม่สามารถกู้คืนได้!
                </p>
              </div>
              <div className="flex gap-2 pt-2 pb-6">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1"
                  disabled={isDeleting}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteDebtor}
                  className="btn-danger flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? "กำลังลบ..." : "ยืนยันลบถาวร"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {deleteLoanId && (
        <>
          <div className="sheet-overlay animate-fade-in" onClick={() => setDeleteLoanId(null)} />
          <div className="sheet-container animate-slide-up" style={{ zIndex: 60 }}>
            <div className="sheet-handle" />
            <div className="p-4 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ยืนยันลบสัญญากู้ยืม (บิลนี้)?</h3>
                <p className="text-xs text-red-400 font-medium mt-2">
                  ⚠️ คำเตือน: การลบบิลนี้ จะทำให้ประวัติการชำระเงินทั้งหมดของบิลนี้ถูกลบออกจากระบบอย่างถาวรทันทีและไม่สามารถกู้คืนได้! (บิลอื่น ๆ ของลูกหนี้รายนี้จะไม่ได้รับผลกระทบ)
                </p>
              </div>
              <div className="flex gap-2 pt-2 pb-6">
                <button
                  type="button"
                  onClick={() => setDeleteLoanId(null)}
                  className="btn-secondary flex-1"
                  disabled={isDeleting}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLoan}
                  className="btn-danger flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? "กำลังลบ..." : "ยืนยันลบถาวร"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
