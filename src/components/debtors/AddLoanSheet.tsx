"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/appStore";
import { getTodayStr } from "@/lib/utils";
import { X } from "lucide-react";

const schema = z.object({
  lender_id: z.string().optional(),
  loan_date: z.string().min(1, "กรุณาเลือกวันที่"),
  payment_frequency: z.enum(["daily", "weekly", "monthly"]),
  principal: z.number({ message: "กรุณากรอกตัวเลข" }).min(1, "กรุณาระบุเงินต้นอย่างน้อย 1 บาท"),
  interest_per_period: z.number({ message: "กรุณากรอกตัวเลข" }).min(1, "กรุณาระบุดอกเบี้ยอย่างน้อย 1 บาท"),
  guarantee_deduction: z.number({ message: "กรุณากรอกตัวเลข" }).min(0, "ค่าค้ำประกันต้องไม่ติดลบ"),
  minimum_periods: z.number({ message: "กรุณากรอกตัวเลข" }).min(1, "งวดขั้นต่ำอย่างน้อย 1 งวด"),
});

type FormData = z.infer<typeof schema>;

const FREQ_OPTIONS = [
  { value: "daily", label: "รายวัน" },
  { value: "weekly", label: "รายสัปดาห์" },
  { value: "monthly", label: "รายเดือน" },
];

interface Props {
  debtorId: string;
  onClose: () => void;
}

export function AddLoanSheet({ debtorId, onClose }: Props) {
  const { loans, setLoans, lenders, settings, showToast } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      loan_date: getTodayStr(),
      payment_frequency: "daily",
      interest_per_period: settings?.default_interest_per_day ?? 100,
      guarantee_deduction: 0,
      minimum_periods: settings?.default_minimum_days ?? 5,
      principal: 0,
    },
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const { data: loan, error: loanErr } = await supabase
        .from("loans")
        .insert({
          debtor_id: debtorId,
          lender_id: data.lender_id || null,
          loan_date: data.loan_date,
          principal: data.principal,
          remaining_principal: data.principal,
          interest_per_period: data.interest_per_period,
          guarantee_deduction: data.guarantee_deduction,
          minimum_periods: data.minimum_periods,
          status: "active",
          payment_frequency: data.payment_frequency,
        })
        .select()
        .single();

      if (loanErr) throw loanErr;

      // Update store
      setLoans([loan, ...loans]);
      showToast("เปิดบิลกู้ยืมใหม่สำเร็จแล้ว 🎉", "success");
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast("เกิดข้อผิดพลาด: " + (err.message || err), "danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="sheet-overlay animate-fade-in" onClick={onClose} />
      <div className="sheet-container animate-slide-up" style={{ zIndex: 50 }}>
        <div className="sheet-handle" />

        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-bold text-white">เปิดบิลกู้ใหม่</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-4 space-y-4 pb-8 overflow-y-auto max-h-[75vh]">
          <div className="space-y-3">
            {lenders.length > 0 && (
              <div>
                <label className="input-label">ผู้ให้กู้ (นายทุน) *</label>
                <select {...register("lender_id")} className="input-field">
                  <option value="" className="bg-dark-800">-- เลือกผู้ให้กู้ --</option>
                  {lenders.map((l) => (
                    <option key={l.id} value={l.id} className="bg-dark-800">{l.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="input-label">วันที่เริ่มกู้ *</label>
              <input {...register("loan_date")} type="date" className="input-field" />
            </div>

            <div>
              <label className="input-label">ความถี่การชำระ *</label>
              <select {...register("payment_frequency")} className="input-field">
                {FREQ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-dark-800">{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">จำนวนเงินกู้ (บาท) *</label>
              <input
                {...register("principal", { valueAsNumber: true })}
                type="number"
                className="input-field text-lg font-bold"
                placeholder="5000"
              />
              {errors.principal && <p className="text-red-400 text-xs mt-1">{errors.principal.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="input-label text-[10px]">ดอกเบี้ย *</label>
                <input
                  {...register("interest_per_period", { valueAsNumber: true })}
                  type="number"
                  className="input-field py-2 text-xs"
                />
                {errors.interest_per_period && <p className="text-red-400 text-xs mt-1">{errors.interest_per_period.message}</p>}
              </div>
              <div>
                <label className="input-label text-[10px]">หักค้ำประกัน</label>
                <input
                  {...register("guarantee_deduction", { valueAsNumber: true })}
                  type="number"
                  className="input-field py-2 text-xs"
                  placeholder="0"
                />
                {errors.guarantee_deduction && <p className="text-red-400 text-xs mt-1">{errors.guarantee_deduction.message}</p>}
              </div>
              <div>
                <label className="input-label text-[10px]">งวดขั้นต่ำ *</label>
                <input
                  {...register("minimum_periods", { valueAsNumber: true })}
                  type="number"
                  className="input-field py-2 text-xs"
                />
                {errors.minimum_periods && <p className="text-red-400 text-xs mt-1">{errors.minimum_periods.message}</p>}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full text-center"
          >
            {isSubmitting ? "กำลังบันทึก..." : "ยืนยันเปิดบิลกู้"}
          </button>
        </form>
      </div>
    </>
  );
}
