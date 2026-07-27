"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { formatCurrency, formatPhone, formatThaiDate, formatThaiDateTime, cn } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";
import { PaymentSheet } from "@/components/payments/PaymentSheet";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, Phone, ShieldAlert, FileText, History, Image as ImageIcon, Trash2, X, Edit2 } from "lucide-react";
import Link from "next/link";
import { EditDebtorSheet } from "@/components/debtors/EditDebtorSheet";

type Tab = "info" | "history" | "docs";

export default function DebtorDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { debtors, setDebtors, loans, setLoans, payments, setPayments, lenders, showToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null);
  const [cancelPaymentId, setCancelPaymentId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [showEditDebtor, setShowEditDebtor] = useState(false);

  const debtor = debtors.find((d) => d.id === id);
  const loan = loans.find((l) => l.debtor_id === id && l.status === "active")
    ?? loans.filter((l) => l.debtor_id === id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const loanLender = useMemo(() => {
    if (!loan || !loan.lender_id) return null;
    return lenders.find((l) => l.id === loan.lender_id);
  }, [loan, lenders]);

  const loanPayments = useMemo(() => {
    if (!loan) return [];
    return payments.filter((p) => p.loan_id === loan.id);
  }, [payments, loan]);

  const stats = useMemo(() => {
    if (!loan) return { remaining: 0, principalPaid: 0, interestPaid: 0 };
    const remaining = loan.remaining_principal;
    const activePays = loanPayments.filter((p) => p.status === "active");
    const principalPaid = activePays.reduce((sum, p) => sum + p.principal_paid, 0);
    const interestPaid = activePays.reduce((sum, p) => sum + p.interest_paid, 0);
    return { remaining, principalPaid, interestPaid };
  }, [loan, loanPayments]);

  const overdueInfo = useMemo(() => {
    if (!loan) return null;
    return getLoanOverdueInfo(loan, payments);
  }, [loan, payments]);

  async function handleCancelPayment() {
    if (!cancelPaymentId || !loan || !debtor) return;
    if (!cancelReason.trim()) {
      showToast("กรุณากรอกเหตุผลการยกเลิก", "warning");
      return;
    }

    setIsCancelling(true);
    try {
      const paymentToCancel = payments.find((p) => p.id === cancelPaymentId);
      if (!paymentToCancel) return;

      // Update payment status
      const { error: payErr } = await supabase
        .from("payments")
        .update({ status: "cancelled", cancel_reason: cancelReason })
        .eq("id", cancelPaymentId);

      if (payErr) throw payErr;

      // Recalculate remaining principal for the loan
      const otherActivePays = loanPayments.filter((p) => p.id !== cancelPaymentId && p.status !== "cancelled");
      const totalPrincipalPaid = otherActivePays.reduce((sum, p) => sum + p.principal_paid, 0);
      const newRemaining = Math.max(0, loan.principal - totalPrincipalPaid);

      // Re-activate loan and debtor
      await supabase.from("loans").update({ remaining_principal: newRemaining, status: "active" }).eq("id", loan.id);
      await supabase.from("debtors").update({ status: "active" }).eq("id", debtor.id);

      // Update local state
      setPayments(payments.map((p) => p.id === cancelPaymentId ? { ...p, status: "cancelled", cancel_reason: cancelReason } : p));
      setLoans(loans.map((l) => l.id === loan.id ? { ...l, remaining_principal: newRemaining, status: "active" } : l));
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

          <div className="flex gap-2 mt-3">
            <span className={debtor.status === "active" ? "badge-active" : "badge-closed"}>
              {debtor.status === "active" ? "กำลังกู้" : "ปิดยอดแล้ว"}
            </span>
            {overdueInfo?.isOverdue && (
              <span className="badge-overdue flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> เกินกำหนด {overdueInfo.overduePeriods} วัน
              </span>
            )}
          </div>

          {/* Key values */}
          <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.06] text-center">
            <div>
              <p className="text-white/30 text-[10px]">เงินต้นคงเหลือ</p>
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
        <div className="flex border-b border-white/[0.06]">
          <button onClick={() => setActiveTab("info")} className={cn("tab-btn flex-1 flex items-center justify-center gap-2", activeTab === "info" && "active")}>
            <FileText className="w-4 h-4" /> ข้อมูลกู้ยืม
          </button>
          <button onClick={() => setActiveTab("history")} className={cn("tab-btn flex-1 flex items-center justify-center gap-2", activeTab === "history" && "active")}>
            <History className="w-4 h-4" /> ประวัติชำระ
          </button>
        </div>

        {/* Tab contents */}
        {activeTab === "info" && (
          <div className="glass-card p-4 space-y-4">
            {loan ? (
              <div className="space-y-3">
                <p className="section-heading">เงื่อนไขสัญญา</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-white/40 block text-xs">เงินกู้ทั้งหมด</span>
                    <span className="text-white font-medium">{formatCurrency(loan.principal)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-xs">ดอกเบี้ย/งวด</span>
                    <span className="text-white font-medium">{formatCurrency(loan.interest_per_period)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-xs">หักค้ำประกัน/งวด</span>
                    <span className="text-white font-medium">{formatCurrency(loan.guarantee_deduction ?? 0)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-xs">ดอกเบี้ยจริง/งวด</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(Math.max(0, loan.interest_per_period - (loan.guarantee_deduction ?? 0)))}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-xs">ความถี่ชำระเงิน</span>
                    <span className="text-white font-medium">{loan.payment_frequency === "daily" ? "รายวัน" : "รายสัปดาห์"}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-xs">จำนวนงวดขั้นต่ำ</span>
                    <span className="text-white font-medium">{loan.minimum_periods} งวด</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-xs">วันที่เริ่มกู้</span>
                    <span className="text-white font-medium">{formatThaiDate(loan.loan_date)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-xs">ผู้ให้กู้ (นายทุน)</span>
                    <span className="text-white font-medium">{loanLender ? loanLender.name : "ไม่มีรายชื่อผู้กู้"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center py-4">ไม่มีข้อมูลเงินกู้ที่กู้อยู่</p>
            )}

            {/* Debtor details */}
            <div className="space-y-3 pt-2">
              <p className="section-heading">ข้อมูลเพิ่มเติม</p>
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

            {/* Quick Actions */}
            {loan && loan.status === "active" && (
              <button
                onClick={() => setPaymentLoanId(loan.id)}
                className="btn-primary w-full text-center"
              >
                รับชำระเงินงวดใหม่
              </button>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            {loanPayments.length === 0 ? (
              <div className="glass-card p-8 text-center text-white/30 text-sm">
                ไม่มีประวัติการชำระเงินสำหรับเงินกู้นี้
              </div>
            ) : (
              loanPayments.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "glass-card p-3 relative overflow-hidden",
                    p.status === "cancelled" && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-semibold text-base">{formatCurrency(p.amount)}</p>
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
              ))
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
          loan={loan}
          onClose={() => setShowEditDebtor(false)}
        />
      )}
    </div>
  );
}
