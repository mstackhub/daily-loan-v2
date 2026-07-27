"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/appStore";
import { getTodayStr } from "@/lib/utils";
import { X, ChevronDown } from "lucide-react";
import { AvatarPicker } from "@/components/shared/AvatarPicker";

const schema = z.object({
  full_name: z.string().min(1, "กรุณากรอกชื่อ"),
  phone: z.string().min(9, "เบอร์โทรไม่ถูกต้อง"),
  national_id: z.string().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  facebook: z.string().optional(),
  line_id: z.string().optional(),
  google_map: z.string().optional(),
  note: z.string().optional(),
  profile_image_url: z.string().optional(),
  lender_id: z.string().optional(),
  loan_date: z.string().min(1, "กรุณาเลือกวันที่"),
  payment_frequency: z.enum(["daily", "weekly", "monthly"]),
  principal: z.number({ message: "กรุณากรอกตัวเลข" }).min(1),
  interest_per_period: z.number({ message: "กรุณากรอกตัวเลข" }).min(1),
  guarantee_deduction: z.number({ message: "กรุณากรอกตัวเลข" }).min(0),
  minimum_periods: z.number({ message: "กรุณากรอกตัวเลข" }).min(1),
});

type FormData = z.infer<typeof schema>;

const FREQ_OPTIONS = [
  { value: "daily", label: "รายวัน" },
  { value: "weekly", label: "รายสัปดาห์" },
  { value: "monthly", label: "รายเดือน" },
];

interface Props {
  onClose: () => void;
}

export function AddDebtorSheet({ onClose }: Props) {
  const { debtors, setDebtors, loans, setLoans, lenders, settings, showToast } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
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
      // Insert debtor
      const { data: debtor, error: debtorErr } = await supabase
        .from("debtors")
        .insert({
          full_name: data.full_name,
          phone: data.phone,
          national_id: data.national_id || "",
          address: data.address || "",
          occupation: data.occupation || "",
          facebook: data.facebook || "",
          line_id: data.line_id || "",
          google_map: data.google_map || "",
          note: data.note || "",
          status: "active",
          profile_image_url: selectedAvatar || data.profile_image_url || "",
        })
        .select()
        .single();

      if (debtorErr) throw debtorErr;

      // Insert loan
      const { data: loan, error: loanErr } = await supabase
        .from("loans")
        .insert({
          debtor_id: debtor.id,
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
      setDebtors([debtor, ...debtors]);
      setLoans([loan, ...loans]);
      showToast("เพิ่มลูกหนี้เรียบร้อยแล้ว", "success");
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
      {/* Overlay */}
      <div className="sheet-overlay animate-fade-in" onClick={onClose} />

      {/* Sheet */}
      <div className="sheet-container animate-slide-up">
        <div className="sheet-handle" />

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-bold text-white">เพิ่มลูกหนี้ใหม่</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-4 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => setShowAvatarPicker(true)}
              className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center overflow-hidden cursor-pointer relative border-2 border-primary-500/30 hover:border-primary-400/60 transition-colors"
            >
              {selectedAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedAvatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/50 text-sm">รูป</span>
              )}
            </div>
            <div>
              <p className="text-white/60 text-sm">รูปโปรไฟล์</p>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="text-primary-400 text-xs font-medium mt-0.5"
              >
                เลือกอวาตาร์ →
              </button>
            </div>
          </div>

          {/* Required fields */}
          <div className="space-y-3">
            <p className="section-heading">ข้อมูลลูกหนี้</p>

            <div>
              <label className="input-label">ชื่อ-นามสกุล *</label>
              <input {...register("full_name")} className="input-field" placeholder="นายสมชาย ใจดี" />
              {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="input-label">เบอร์โทรศัพท์ *</label>
              <input {...register("phone")} className="input-field" placeholder="0812345678" type="tel" />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          {/* Loan fields */}
          <div className="space-y-3">
            <p className="section-heading">ข้อมูลการกู้</p>

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
                className="input-field"
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
              </div>
              <div>
                <label className="input-label text-[10px]">หักค้ำประกัน</label>
                <input
                  {...register("guarantee_deduction", { valueAsNumber: true })}
                  type="number"
                  className="input-field py-2 text-xs"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="input-label text-[10px]">งวดขั้นต่ำ *</label>
                <input
                  {...register("minimum_periods", { valueAsNumber: true })}
                  type="number"
                  className="input-field py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Optional fields toggle */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-2 text-white/40 text-sm hover:text-white/70 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showOptional ? "rotate-180" : ""}`} />
            ข้อมูลเพิ่มเติม (ไม่บังคับ)
          </button>

          {showOptional && (
            <div className="space-y-3">
              <div>
                <label className="input-label">เลขบัตรประชาชน</label>
                <input {...register("national_id")} className="input-field" placeholder="1234567890123" />
              </div>
              <div>
                <label className="input-label">อาชีพ</label>
                <input {...register("occupation")} className="input-field" placeholder="ค้าขาย" />
              </div>
              <div>
                <label className="input-label">ที่อยู่</label>
                <textarea {...register("address")} className="input-field min-h-[80px] resize-none" placeholder="ที่อยู่..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Facebook</label>
                  <input {...register("facebook")} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Line ID</label>
                  <input {...register("line_id")} className="input-field" />
                </div>
              </div>
              <div>
                <label className="input-label">หมายเหตุ</label>
                <textarea {...register("note")} className="input-field min-h-[60px] resize-none" />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full text-center"
          >
            {isSubmitting ? "กำลังบันทึก..." : "เพิ่มลูกหนี้"}
          </button>
        </form>
      </div>

      {/* Avatar picker */}
      {showAvatarPicker && (
        <AvatarPicker
          selected={selectedAvatar}
          onSelect={(url) => {
            setSelectedAvatar(url);
            setValue("profile_image_url", url);
            setShowAvatarPicker(false);
          }}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </>
  );
}
