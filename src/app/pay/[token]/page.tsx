"use client";

import { useMemo, useState } from "react";
import { decodePaymentLink, formatCurrency } from "@/lib/utils";
import { getQrCodeUrl } from "@/lib/business-logic/promptpay";
import { CreditCard, CheckCircle2, ChevronRight, Copy, Download } from "lucide-react";

export default function CustomerPayPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [copied, setCopied] = useState(false);

  const payload = useMemo(() => {
    return decodePaymentLink(token);
  }, [token]);

  function handleCopyAcc(accNo: string) {
    navigator.clipboard.writeText(accNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!payload) {
    return (
      <div className="min-h-dvh bg-gradient-dark flex items-center justify-center p-4">
        <div className="glass-card p-6 text-center max-w-sm w-full">
          <p className="text-red-400 text-sm font-semibold">⚠️ ลิงก์ชำระเงินไม่ถูกต้องหรือหมดอายุ</p>
        </div>
      </div>
    );
  }

  const { name, amount, pp, bank, accNo, accName } = payload;
  const numAmount = parseFloat(amount as string) || 0;

  return (
    <div className="min-h-dvh bg-gradient-dark flex items-center justify-center p-4 max-w-lg mx-auto">
      <div className="glass-card p-5 space-y-5 w-full">
        {/* Header */}
        <div className="text-center">
          <p className="text-white/40 text-xs">รายการรับชำระเงิน</p>
          <h2 className="text-white font-bold text-lg mt-1">{name}</h2>
          <p className="text-primary-400 font-bold text-3xl mt-2">{formatCurrency(numAmount)}</p>
        </div>

        {/* PromptPay QR */}
        {pp && numAmount > 0 && (
          <div className="flex flex-col items-center p-4 bg-white rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getQrCodeUrl(pp as string, numAmount, 220)}
              alt="QR Code"
              className="w-48 h-48 rounded-xl"
            />
            <div className="text-center mt-3 text-black">
              <p className="text-xs font-semibold">แสกนคิวอาร์โค้ดเพื่อชำระเงิน</p>
              <p className="text-[10px] text-gray-500 mt-0.5">พร้อมเพย์: {pp}</p>
            </div>
          </div>
        )}

        {/* Bank account details */}
        {bank && accNo && (
          <div className="glass-card-sm p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-white/50">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium">{bank}</p>
                <p className="text-white/40 text-[10px] truncate">{accName}</p>
                <p className="text-white font-semibold text-sm mt-0.5">{accNo}</p>
              </div>
              <button
                onClick={() => handleCopyAcc(accNo as string)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center text-white/60 active:scale-95"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && <p className="text-[10px] text-emerald-400 text-center">คัดลอกเลขบัญชีแล้ว</p>}
          </div>
        )}

        <div className="text-center text-white/30 text-[10px] space-y-1">
          <p>กรุณาแคปรูปภาพสลิปใบเสร็จส่งยืนยันให้ผู้จัดเก็บทาง LINE</p>
          <p>© DebtFlow Security Payment Gateway</p>
        </div>
      </div>
    </div>
  );
}
