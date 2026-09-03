"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { calculatePaymentPreview, getUnpaidDateItems } from "@/lib/business-logic/interest";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency, compressImage, formatThaiDate } from "@/lib/utils";
import { X, Zap, Banknote, Smartphone, AlertTriangle, CheckCircle2, CalendarDays, CheckSquare, Square, Layers } from "lucide-react";
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

  const [selectedDateKeys, setSelectedDateKeys] = useState<string[]>([]);
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

  // Initial selection: Select overdue dates and today if available
  useEffect(() => {
    if (unpaidDates.length > 0 && selectedDateKeys.length === 0) {
      // By default, select all overdue dates + today (or the first 1 date if none overdue)
      const initial = unpaidDates.filter((u) => u.isOverdue || u.isToday).map((u) => u.dateStr);
      if (initial.length > 0) {
        setSelectedDateKeys(initial);
      } else if (unpaidDates[0]) {
        setSelectedDateKeys([unpaidDates[0].dateStr]);
      }
    }
  }, [unpaidDates]);

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
        isUnderpayment: numAmount < netInterest && !isPayoff,
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
  }, [loan, loanPayments, paymentMode, numAmount, selectedInterestTotal, numExtraPrincipal, numDiscount, netInterest, paymentDate]);

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
      // Select all unpaid dates and set extra principal to full remaining
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
      showToast(`ยอดน้อยกว่าดอกเบี้ย 1 งวด (${formatCurrency(netInterest)})`, "warning");
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
      <div className="sheet-container animate-slide-up max-h-[92vh] flex flex-col">
        <div className="sheet-handle" />

        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-lg font-bold text-white">รับชำระเงิน</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="px-4 space-y-4 overflow-y-auto pb-6">
          {/* Debtor info card */}
          <div className="glass-card-sm p-3 flex items-center gap-3 bg-white/[0.03] border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold">
              {debtor.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{debtor.full_name}</p>
              <p className="text-white/40 text-xs">
                ค้างต้น <span className="text-white font-bold">{formatCurrency(loan.remaining_principal)}</span> | ดอก <span className="text-violet-400 font-bold">{formatCurrency(netInterest)}</span>/วัน
              </p>
            </div>
            <button
              type="button"
              onClick={setPayoffAmount}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1 hover:bg-emerald-500/20 active:scale-95 transition-all"
            >
              <Zap className="w-3 h-3" />
              ปิดยอด
            </button>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => setPaymentMode("dates")}
              className={cn(
                "py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                paymentMode === "dates"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              เลือกวันที่ค้าง ({unpaidDates.length})
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode("custom")}
              className={cn(
                "py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                paymentMode === "custom"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
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
              <div className="flex items-center justify-between gap-1 text-xs">
                <span className="text-white/60 font-medium">
                  เลือกแล้ว: <span className="text-violet-400 font-bold">{selectedDateKeys.length}</span> วัน ({formatCurrency(selectedInterestTotal)})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllDates}
                    className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white/70 text-[11px] transition-colors"
                  >
                    เลือกหมด
                  </button>
                  <button
                    type="button"
                    onClick={selectOverdueDatesOnly}
                    className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-amber-400 text-[11px] transition-colors"
                  >
                    เฉพาะที่ค้าง
                  </button>
                  <button
                    type="button"
                    onClick={clearDateSelection}
                    className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white/40 text-[11px] transition-colors"
                  >
                    ล้าง
                  </button>
                </div>
              </div>

              {/* Dates Checklist Box */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 border border-white/10 rounded-xl bg-black/20 no-scrollbar">
                {unpaidDates.length === 0 ? (
                  <div className="py-6 text-center text-white/30 text-xs">
                    ไม่มีวันที่ค้างชำระ (ชำระครบถ้วนแล้ว)
                  </div>
                ) : (
                  unpaidDates.map((item) => {
                    const isSelected = selectedDateKeys.includes(item.dateStr);
                    return (
                      <div
                        key={item.dateStr}
                        onClick={() => toggleDate(item.dateStr)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer select-none transition-all active:scale-[0.99]",
                          isSelected
                            ? "bg-violet-600/20 border-violet-500/60 shadow-sm"
                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center transition-colors",
                            isSelected ? "text-violet-400" : "text-white/20"
                          )}>
                            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white text-xs font-semibold">{item.displayDate}</span>
                              <span className="text-white/40 text-[10px]">({item.dayName})</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {item.isOverdue && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-medium">
                                  ค้างชำระ
                                </span>
                              )}
                              {item.isToday && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium">
                                  วันนี้
                                </span>
                              )}
                              {!item.isOverdue && !item.isToday && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-500/20 text-slate-300">
                                  ล่วงหน้า
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-white">
                            {formatCurrency(item.interestAmount)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Extra Principal & Discount */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="input-label text-xs">ลดเงินต้นเพิ่ม (บาท)</label>
                  <input
                    type="number"
                    value={extraPrincipal}
                    onChange={(e) => setExtraPrincipal(e.target.value)}
                    className="input-field py-2 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="input-label text-xs">ส่วนลดต้นพิเศษ (บาท)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="input-field py-2 text-sm"
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="input-label mb-0">จำนวนเงินรวม (บาท)</label>
                  <button
                    type="button"
                    onClick={setPayoffAmount}
                    className="flex items-center gap-1 text-primary-400 text-xs font-medium"
                  >
                    <Zap className="w-3 h-3" />
                    ปิดยอด {preview ? formatCurrency(preview.payoffAmount) : ""}
                  </button>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field text-xl font-bold"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="input-label">ส่วนลดเงินต้นลดต้นพิเศษ (บาท)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="input-field"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Date of payment */}
          <div>
            <label className="input-label text-xs">วันที่บันทึกชำระเงิน</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="input-field py-2 text-sm"
            />
          </div>

          {/* Summary Preview Card */}
          {preview && numAmount > 0 && (
            <div className={cn(
              "glass-card-sm p-3 space-y-2 border",
              preview.isPayoff ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-white/[0.03]"
            )}>
              {preview.isPayoff && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  ปิดยอดหนี้สัญญานี้สำเร็จ! 🎉
                </div>
              )}
              {preview.warning && (
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  {preview.warning}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-black/20">
                  <p className="text-white/40 text-[10px]">หักดอก</p>
                  <p className="text-amber-400 text-sm font-bold">{formatCurrency(preview.interestPaid)}</p>
                </div>
                <div className="p-2 rounded-lg bg-black/20">
                  <p className="text-white/40 text-[10px]">ลดต้น</p>
                  <p className="text-primary-400 text-sm font-bold">{formatCurrency(preview.principalPaid)}</p>
                </div>
                <div className="p-2 rounded-lg bg-black/20">
                  <p className="text-white/40 text-[10px]">ต้นคงเหลือ</p>
                  <p className="text-white text-sm font-bold">{formatCurrency(preview.newRemainingPrincipal)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment method */}
          <div>
            <label className="input-label text-xs">วิธีชำระ</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("cash")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all",
                  method === "cash"
                    ? "bg-primary-500/20 border-primary-500/50 text-primary-400 font-bold"
                    : "bg-white/[0.04] border-white/10 text-white/50"
                )}
              >
                <Banknote className="w-4 h-4" /> เงินสด
              </button>
              <button
                type="button"
                onClick={() => setMethod("transfer")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all",
                  method === "transfer"
                    ? "bg-primary-500/20 border-primary-500/50 text-primary-400 font-bold"
                    : "bg-white/[0.04] border-white/10 text-white/50"
                )}
              >
                <Smartphone className="w-4 h-4" /> โอนเงิน
              </button>
            </div>
          </div>

          {/* Transfer details */}
          {method === "transfer" && (
            <div className="space-y-3">
              {bankAccounts.length > 0 && (
                <div>
                  <label className="input-label text-xs">บัญชีรับโอน</label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="input-field text-xs py-2"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id} className="bg-dark-800">
                        {b.bank_name} — {b.acc_no} ({b.acc_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* QR Code */}
              {selectedBank?.type === "PromptPay" && numAmount > 0 && promptpayId && (
                <div className="flex flex-col items-center p-3 glass-card-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getQrCodeUrl(promptpayId, numAmount, 200)}
                    alt="QR Code"
                    className="w-36 h-36 rounded-xl"
                  />
                  <p className="text-white/40 text-[10px] mt-1.5">PromptPay {promptpayId}</p>
                </div>
              )}

              {/* Slip upload */}
              <div>
                <label className="input-label text-xs">แนบสลิป (ไม่บังคับ)</label>
                {slipFile ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slipFile.previewUrl} alt="slip" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setSlipFile(null)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2.5 glass-card-sm cursor-pointer hover:bg-white/10 transition-colors">
                    <span className="text-white/50 text-xs">📎 เลือกรูปสลิป</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSlipUpload} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || numAmount <= 0}
            className="btn-primary w-full text-center py-3 text-sm font-bold shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-transform"
          >
            {isSubmitting ? "กำลังบันทึก..." : `รับเงิน ${numAmount > 0 ? formatCurrency(numAmount) : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}
