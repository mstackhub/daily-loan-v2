"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { calculatePaymentPreview } from "@/lib/business-logic/interest";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency, compressImage } from "@/lib/utils";
import { X, Zap, Banknote, Smartphone, AlertTriangle, CheckCircle2 } from "lucide-react";
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

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || "");
  const [slipFile, setSlipFile] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDate] = useState(currentReportDate);

  const numAmount = parseFloat(amount) || 0;

  const preview = useMemo(() => {
    if (!loan) return null;
    return calculatePaymentPreview(loan, loanPayments, numAmount);
  }, [loan, loanPayments, numAmount]);

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);
  const promptpayId = settings?.promptpay_id || "";

  function setPayoffAmount() {
    if (preview) setAmount(preview.payoffAmount.toString());
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
      showToast(`ยอดน้อยกว่าดอกเบี้ย 1 งวด (${formatCurrency(loan.interest_per_period)})`, "warning");
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
      <div className="sheet-container animate-slide-up">
        <div className="sheet-handle" />

        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-bold text-white">รับชำระเงิน</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="px-4 space-y-4">
          {/* Debtor info */}
          <div className="glass-card-sm p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold">
              {debtor.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{debtor.full_name}</p>
              <p className="text-white/40 text-xs">ค้างต้น {formatCurrency(loan.remaining_principal)} | ดอก {formatCurrency(loan.interest_per_period)}/{loan.payment_frequency === "daily" ? "วัน" : loan.payment_frequency === "weekly" ? "สัปดาห์" : "เดือน"}</p>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="input-label mb-0">จำนวนเงิน (บาท)</label>
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

          {/* Preview */}
          {preview && numAmount > 0 && (
            <div className={cn(
              "glass-card-sm p-3 space-y-2",
              preview.isPayoff && "border-emerald-500/40",
              preview.isUnderpayment && "border-red-500/40"
            )}>
              {preview.warning && (
                <div className="flex items-center gap-2 text-amber-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {preview.warning}
                </div>
              )}
              {preview.isPayoff && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ปิดยอดได้เลย!
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-white/40 text-[10px]">หักดอก</p>
                  <p className="text-amber-400 text-sm font-semibold">{formatCurrency(preview.interestPaid)}</p>
                </div>
                <div>
                  <p className="text-white/40 text-[10px]">ลดต้น</p>
                  <p className="text-primary-400 text-sm font-semibold">{formatCurrency(preview.principalPaid)}</p>
                </div>
                <div>
                  <p className="text-white/40 text-[10px]">ต้นคงเหลือ</p>
                  <p className="text-white text-sm font-semibold">{formatCurrency(preview.newRemainingPrincipal)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment method */}
          <div>
            <label className="input-label">วิธีชำระ</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("cash")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  method === "cash"
                    ? "bg-primary-500/20 border-primary-500/50 text-primary-400"
                    : "bg-white/[0.04] border-white/10 text-white/50"
                )}
              >
                <Banknote className="w-4 h-4" /> เงินสด
              </button>
              <button
                type="button"
                onClick={() => setMethod("transfer")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  method === "transfer"
                    ? "bg-primary-500/20 border-primary-500/50 text-primary-400"
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
                  <label className="input-label">บัญชีรับโอน</label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="input-field"
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
                <div className="flex flex-col items-center p-4 glass-card-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getQrCodeUrl(promptpayId, numAmount, 200)}
                    alt="QR Code"
                    className="w-40 h-40 rounded-xl"
                  />
                  <p className="text-white/40 text-xs mt-2">PromptPay {promptpayId}</p>
                </div>
              )}

              {/* Slip upload */}
              <div>
                <label className="input-label">แนบสลิป (ไม่บังคับ)</label>
                {slipFile ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden">
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
                    <span className="text-white/50 text-sm">📎 เลือกสลิป</span>
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
            className="btn-primary w-full text-center"
          >
            {isSubmitting ? "กำลังบันทึก..." : `รับเงิน ${numAmount > 0 ? formatCurrency(numAmount) : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}
