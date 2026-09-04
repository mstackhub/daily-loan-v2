"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { calculatePaymentPreview, getUnpaidDateItems } from "@/lib/business-logic/interest";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency, compressImage } from "@/lib/utils";
import { X, Zap, Banknote, Smartphone, AlertTriangle, CheckCircle2, CalendarDays, CheckCircle, Circle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { getQrCodeUrl } from "@/lib/business-logic/promptpay";

interface Props {
  loanId: string;
  onClose: () => void;
}

export function PaymentSheet({ loanId, onClose }: Props) {
  const { loans, setLoans, debtors, setDebtors, payments, setPayments, settings, bankAccounts, currentReportDate, showToast } = useAppStore();

  const loan = loans.find((l) => l.id === loanId);
  const debtor = loan ? debtors.find((d) => d.id === loan.debtor_id) : null;
  const loanPayments = payments.filter((p) => p.loan_id === loanId);

  // Mode: "dates" (Checkbox per unpaid date) vs "custom" (Raw amount input)
  const [paymentMode, setPaymentMode] = useState<"dates" | "custom">("dates");

  // Unpaid dates calculation
  const unpaidDates = useMemo(() => {
    if (!loan) return [];
    return getUnpaidDateItems(loan, loanPayments);
  }, [loan, loanPayments]);

  // Initial selection: Select overdue dates and today on mount
  const [selectedDateKeys, setSelectedDateKeys] = useState<string[]>(() => {
    if (!loan) return [];
    const dates = getUnpaidDateItems(loan, loanPayments);
    const initial = dates.filter((u) => u.isOverdue || u.isToday).map((u) => u.dateStr);
    if (initial.length > 0) return initial;
    if (dates[0]) return [dates[0].dateStr];
    return [];
  });
  const [extraPrincipal, setExtraPrincipal] = useState("");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || "");
  const [slipFile, setSlipFile] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDate, setPaymentDate] = useState(currentReportDate);

  const netInterest = useMemo(() => {
    if (!loan) return 0;
    return Math.max(0, loan.interest_per_period - (loan.guarantee_deduction ?? 0));
  }, [loan]);

  // Calculate totals for "dates" mode
  const selectedInterestTotal = useMemo(() => {
    return selectedDateKeys.length * netInterest;
  }, [selectedDateKeys, netInterest]);

  const numExtraPrincipal = parseFloat(extraPrincipal) || 0;
  const numDiscount = parseFloat(discount) || 0;

  // Effective amount and preview
  const numAmount = useMemo(() => {
    if (paymentMode === "dates") {
      return selectedInterestTotal + numExtraPrincipal;
    }
    return parseFloat(amount) || 0;
  }, [paymentMode, selectedInterestTotal, numExtraPrincipal, amount]);

  const preview = useMemo(() => {
    if (!loan) return null;

    if (paymentMode === "dates") {
      const isPayoff = (loan.remaining_principal - numExtraPrincipal - numDiscount) <= 0;
      const newRemaining = Math.max(0, loan.remaining_principal - numExtraPrincipal - numDiscount);
      const payoffAmount = loan.remaining_principal + selectedInterestTotal;

      return {
        amount: numAmount,
        interestPaid: selectedInterestTotal,
        principalPaid: numExtraPrincipal,
        newRemainingPrincipal: newRemaining,
        isPayoff,
        isOverpayment: false,
        isUnderpayment: numAmount < netInterest && !isPayoff && selectedDateKeys.length === 0,
        payoffAmount,
        periodInterest: netInterest,
        warning: undefined,
      };
    }

    // Custom Mode
    const asOf = paymentDate ? new Date(paymentDate + "T12:00:00") : undefined;
    const p = calculatePaymentPreview(loan, loanPayments, numAmount, asOf);
    if (p) {
      p.newRemainingPrincipal = Math.max(0, p.newRemainingPrincipal - numDiscount);
      if (p.newRemainingPrincipal === 0) {
        p.isPayoff = true;
      }
    }
    return p;
  }, [loan, loanPayments, paymentMode, numAmount, selectedInterestTotal, numExtraPrincipal, numDiscount, netInterest, paymentDate, selectedDateKeys.length]);

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);
  const promptpayId = settings?.promptpay_id || "";

  // Date selection helpers
  function toggleDate(dateStr: string) {
    if (selectedDateKeys.includes(dateStr)) {
      setSelectedDateKeys(selectedDateKeys.filter((k) => k !== dateStr));
    } else {
      setSelectedDateKeys([...selectedDateKeys, dateStr]);
    }
  }

  function selectAllDates() {
    setSelectedDateKeys(unpaidDates.map((u) => u.dateStr));
  }

  function selectOverdueDatesOnly() {
    setSelectedDateKeys(unpaidDates.filter((u) => u.isOverdue || u.isToday).map((u) => u.dateStr));
  }

  function clearDateSelection() {
    setSelectedDateKeys([]);
  }

  function setPayoffAmount() {
    if (!loan) return;
    if (paymentMode === "dates") {
      selectAllDates();
      setExtraPrincipal(loan.remaining_principal.toString());
    } else if (preview) {
      setAmount(preview.payoffAmount.toString());
    }
  }

  async function handleSlipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 800, 0.7);
      setSlipFile(compressed);
    } catch {
      showToast("ไม่สามารถโหลดรูปสลิปได้", "danger");
    }
    e.target.value = "";
  }

  async function handleSubmit() {
    if (!loan || !debtor || !preview || numAmount <= 0) return;
    if (preview.isUnderpayment) {
      showToast(`กรุณาเลือกอย่างน้อย 1 วัน หรือระบุยอดชำระขั้นต่ำ (${formatCurrency(netInterest)})`, "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      let slipImageUrl = "";

      // Upload slip if provided
      if (slipFile && method === "transfer") {
        const fileName = `slips/${loan.id}_${Date.now()}.jpg`;
        const byteChars = atob(slipFile.base64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArr], { type: slipFile.mimeType });
        const { data: uploadData } = await supabase.storage.from("documents").upload(fileName, blob, { upsert: true });
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(uploadData.path);
          slipImageUrl = publicUrl;
        }
      }

      const newRemaining = preview.newRemainingPrincipal;
      const isPayoff = preview.isPayoff;
      const settledDatesStr = paymentMode === "dates" && selectedDateKeys.length > 0
        ? `DATES:${selectedDateKeys.join(",")}`
        : "";

      // Insert payment
      const { data: payment, error: payErr } = await supabase
        .from("payments")
        .insert({
          loan_id: loan.id,
          debtor_id: debtor.id,
          payment_date: paymentDate + " " + new Date().toTimeString().slice(0, 8),
          amount: preview.amount,
          interest_paid: preview.interestPaid,
          principal_paid: preview.principalPaid,
          remaining_principal: newRemaining,
          payment_method: method,
          slip_image_url: slipImageUrl,
          status: "active",
          cancel_reason: settledDatesStr,
          principal_discount: numDiscount,
        })
        .select()
        .single();

      if (payErr) throw payErr;

      // Update loan
      const loanUpdates: Record<string, unknown> = {
        remaining_principal: newRemaining,
        status: isPayoff ? "completed" : "active",
        updated_at: new Date().toISOString(),
      };
      await supabase.from("loans").update(loanUpdates).eq("id", loan.id);

      // Update debtor if loan completed
      let debtorStatus = debtor.status;
      if (isPayoff) {
        const hasOtherActive = loans.some((l) => l.id !== loan.id && l.debtor_id === debtor.id && l.status === "active");
        if (!hasOtherActive) {
          await supabase.from("debtors").update({ status: "closed" }).eq("id", debtor.id);
          debtorStatus = "closed";
        }
      }

      // Update local store
      setPayments([payment, ...payments]);
      setLoans(loans.map((l) =>
        l.id === loan.id
          ? { ...l, remaining_principal: newRemaining, status: isPayoff ? "completed" : "active" }
          : l
      ));
      if (debtorStatus !== debtor.status) {
        setDebtors(debtors.map((d) => d.id === debtor.id ? { ...d, status: debtorStatus as "active" | "closed" } : d));
      }

      showToast(isPayoff ? "ปิดยอดเรียบร้อยแล้ว 🎉" : "รับชำระเงินเรียบร้อย", "success");
      onClose();
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + (err.message || err), "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!loan || !debtor) return null;

  return (
    <>
      <div className="sheet-overlay animate-fade-in" onClick={onClose} />
      <div className="sheet-container animate-slide-up max-h-[92vh] flex flex-col bg-white text-slate-800 shadow-2xl rounded-t-3xl">
        <div className="sheet-handle bg-slate-300" />

        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">รับชำระเงิน</h2>
            <p className="text-xs text-slate-400">บันทึกดอกเบี้ยและยอดผ่อนชำระ</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 space-y-4 overflow-y-auto py-4 pb-8 no-scrollbar">
          {/* Debtor Profile Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-violet-500/30">
                {debtor.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-slate-900 font-bold text-sm leading-tight">{debtor.full_name}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  ค้างต้น <span className="font-bold text-slate-900">{formatCurrency(loan.remaining_principal)}</span> | ดอก <span className="font-bold text-violet-600">{formatCurrency(netInterest)}</span>/วัน
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={setPayoffAmount}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-600" />
              ปิดยอด
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 border border-slate-200/60 rounded-xl">
            <button
              type="button"
              onClick={() => setPaymentMode("dates")}
              className={cn(
                "py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                paymentMode === "dates"
                  ? "bg-white text-violet-700 shadow-sm border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              เลือกวันที่ค้าง ({unpaidDates.length})
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode("custom")}
              className={cn(
                "py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                paymentMode === "custom"
                  ? "bg-white text-violet-700 shadow-sm border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              กรอกยอดเงินเอง
            </button>
          </div>

          {/* MODE 1: CHECKBOX UNPAID DATES */}
          {paymentMode === "dates" && (
            <div className="space-y-3">
              {/* Quick Actions Bar */}
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="text-slate-600 font-medium">
                  เลือกแล้ว: <span className="text-violet-700 font-extrabold text-sm">{selectedDateKeys.length}</span> วัน <span className="font-bold text-slate-800">({formatCurrency(selectedInterestTotal)})</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={selectAllDates}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                  >
                    เลือกหมด
                  </button>
                  <button
                    type="button"
                    onClick={selectOverdueDatesOnly}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-[11px] transition-colors"
                  >
                    เฉพาะที่ค้าง
                  </button>
                  <button
                    type="button"
                    onClick={clearDateSelection}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-semibold text-[11px] transition-colors"
                  >
                    ล้าง
                  </button>
                </div>
              </div>

              {/* Dates Checklist Box */}
              <div className="max-h-64 overflow-y-auto space-y-2 p-2 border border-slate-200 rounded-2xl bg-slate-50/70 no-scrollbar">
                {unpaidDates.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    ไม่มีวันที่ค้างชำระ (ชำระดอกเบี้ยครบถ้วนแล้ว)
                  </div>
                ) : (
                  unpaidDates.map((item) => {
                    const isSelected = selectedDateKeys.includes(item.dateStr);
                    return (
                      <div
                        key={item.dateStr}
                        onClick={() => toggleDate(item.dateStr)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all duration-150 active:scale-[0.99]",
                          isSelected
                            ? "date-card-selected bg-violet-600 border-violet-600 shadow-md shadow-violet-500/25 text-white-force"
                            : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center">
                            {isSelected ? (
                              <CheckCircle className="w-5 h-5 text-white-force fill-white/20" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={cn("text-sm font-bold", isSelected ? "text-white-force" : "text-slate-800")}>
                                {item.displayDate}
                              </span>
                              <span className={cn("text-xs font-medium", isSelected ? "text-white-force opacity-90" : "text-slate-400")}>
                                ({item.dayName})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {item.isOverdue && (
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                  isSelected ? "bg-white/25 text-white-force border border-white/30" : "bg-rose-50 text-rose-600 border border-rose-200"
                                )}>
                                  ค้างชำระ
                                </span>
                              )}
                              {item.isToday && (
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                  isSelected ? "bg-amber-300 text-slate-900 border border-amber-400" : "bg-amber-50 text-amber-700 border border-amber-200"
                                )}>
                                  วันนี้
                                </span>
                              )}
                              {!item.isOverdue && !item.isToday && (
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                  isSelected ? "bg-white/25 text-white-force border border-white/30" : "bg-slate-100 text-slate-500"
                                )}>
                                  ล่วงหน้า
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={cn("text-sm font-extrabold", isSelected ? "text-white-force" : "text-slate-800")}>
                            {formatCurrency(item.interestAmount)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Extra Principal & Discount */}
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">ลดเงินต้นเพิ่ม (บาท)</label>
                  <input
                    type="number"
                    value={extraPrincipal}
                    onChange={(e) => setExtraPrincipal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 placeholder:text-slate-300"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">ส่วนลดต้นพิเศษ (บาท)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 placeholder:text-slate-300"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: RAW AMOUNT INPUT */}
          {paymentMode === "custom" && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">จำนวนเงินรวม (บาท)</label>
                  <button
                    type="button"
                    onClick={setPayoffAmount}
                    className="flex items-center gap-1 text-violet-600 font-bold text-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    ปิดยอด {preview ? formatCurrency(preview.payoffAmount) : ""}
                  </button>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xl font-extrabold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ส่วนลดเงินต้นลดต้นพิเศษ (บาท)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 placeholder:text-slate-300"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Date of payment */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">วันที่บันทึกชำระเงิน</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
            />
          </div>

          {/* Summary Preview Card */}
          {preview && numAmount > 0 && (
            <div className={cn(
              "p-3.5 rounded-2xl border space-y-2.5 transition-all shadow-xs",
              preview.isPayoff 
                ? "bg-emerald-50/80 border-emerald-300" 
                : "bg-gradient-to-br from-slate-50 to-slate-100/80 border-slate-200"
            )}>
              {preview.isPayoff && (
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ปิดยอดหนี้สัญญานี้สำเร็จ! 🎉
                </div>
              )}
              {preview.warning && (
                <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {preview.warning}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-xs">
                  <p className="text-amber-800 text-[10px] font-bold">หักดอก</p>
                  <p className="text-amber-600 text-base font-extrabold">{formatCurrency(preview.interestPaid)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-violet-200/80 shadow-xs">
                  <p className="text-violet-800 text-[10px] font-bold">ลดต้น</p>
                  <p className="text-violet-600 text-base font-extrabold">{formatCurrency(preview.principalPaid)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold">ต้นคงเหลือ</p>
                  <p className="text-slate-900 text-base font-extrabold">{formatCurrency(preview.newRemainingPrincipal)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">วิธีชำระ</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("cash")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-xs",
                  method === "cash"
                    ? "bg-violet-600 border-violet-600 text-white-force shadow-violet-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Banknote className="w-4 h-4" /> เงินสด
              </button>
              <button
                type="button"
                onClick={() => setMethod("transfer")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-xs",
                  method === "transfer"
                    ? "bg-violet-600 border-violet-600 text-white-force shadow-violet-500/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Smartphone className="w-4 h-4" /> โอนเงิน
              </button>
            </div>
          </div>

          {/* Transfer Details */}
          {method === "transfer" && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              {bankAccounts.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">บัญชีรับโอน</label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:border-violet-500"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name} — {b.acc_no} ({b.acc_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* QR Code */}
              {selectedBank?.type === "PromptPay" && numAmount > 0 && promptpayId && (
                <div className="flex flex-col items-center p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getQrCodeUrl(promptpayId, numAmount, 200)}
                    alt="QR Code"
                    className="w-36 h-36 rounded-xl"
                  />
                  <p className="text-slate-500 text-[11px] font-semibold mt-1.5">PromptPay {promptpayId}</p>
                </div>
              )}

              {/* Slip Upload */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">แนบสลิป (ไม่บังคับ)</label>
                {slipFile ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slipFile.previewUrl} alt="slip" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setSlipFile(null)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white-force rounded-full flex items-center justify-center hover:bg-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors shadow-xs">
                    <span className="text-slate-600 text-xs font-medium">📎 เลือกรูปสลิป</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSlipUpload} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || numAmount <= 0}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white-force font-bold text-sm shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-all"
          >
            {isSubmitting ? "กำลังบันทึก..." : `รับเงิน ${numAmount > 0 ? formatCurrency(numAmount) : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}
