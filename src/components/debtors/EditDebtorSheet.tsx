"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/appStore";
import { X, ChevronDown } from "lucide-react";
import { AvatarPicker } from "@/components/shared/AvatarPicker";
import type { Debtor, Loan } from "@/types";

const schema = z.object({
  full_name: z.string().min(1, "กรุณากรอกชื่อ"),
  phone: z.string().min(9, "เบอร์โทรไม่ถูกต้อง"),
  national_id: z.string().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  facebook: z.string().optional(),
  line_id: z.string().optional(),
  note: z.string().optional(),
  profile_image_url: z.string().optional(),
  lender_id: z.string().optional(),
  guarantee_deduction: z.number({ message: "กรุณากรอกตัวเลข" }).min(0).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  debtor: Debtor;
  loan: Loan | null;
  onClose: () => void;
}

export function EditDebtorSheet({ debtor, loan, onClose }: Props) {
  const { debtors, setDebtors, loans, setLoans, lenders, showToast } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(debtor.profile_image_url || "");
  const [showOptional, setShowOptional] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: debtor.full_name,
      phone: debtor.phone,
      national_id: debtor.national_id || "",
      address: debtor.address || "",
      occupation: debtor.occupation || "",
      facebook: debtor.facebook || "",
      line_id: debtor.line_id || "",
      note: debtor.note || "",
      profile_image_url: debtor.profile_image_url || "",
      lender_id: loan?.lender_id || "",
      guarantee_deduction: loan?.guarantee_deduction || 0,
    },
  });

  const profileUrl = watch("profile_image_url") || selectedAvatar;

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      // 1. Update debtor in Supabase
      const { data: updatedDebtor, error: debtorErr } = await supabase
        .from("debtors")
        .update({
          full_name: data.full_name,
          phone: data.phone,
          national_id: data.national_id || "",
          address: data.address || "",
          occupation: data.occupation || "",
          facebook: data.facebook || "",
          line_id: data.line_id || "",
          note: data.note || "",
          profile_image_url: selectedAvatar || data.profile_image_url || "",
        })
        .eq("id", debtor.id)
        .select()
        .single();

      if (debtorErr) throw debtorErr;

      // 2. Update loan lender in Supabase if loan exists
      let updatedLoan = loan;
      if (loan) {
        const { data: newLoan, error: loanErr } = await supabase
          .from("loans")
          .update({
            lender_id: data.lender_id || null,
            guarantee_deduction: data.guarantee_deduction ?? 0,
          })
          .eq("id", loan.id)
          .select()
          .single();

        if (loanErr) throw loanErr;
        updatedLoan = newLoan;
      }

      // 3. Update global state store
      setDebtors(debtors.map((d) => (d.id === debtor.id ? updatedDebtor : d)));
      if (loan && updatedLoan) {
        setLoans(loans.map((l) => (l.id === loan.id ? updatedLoan : l)));
      }

      showToast("แก้ไขข้อมูลลูกหนี้เรียบร้อยแล้ว", "success");
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
      <div className="sheet-container animate-slide-up">
        <div className="sheet-handle" />

        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-bold text-slate-800">แก้ไขข้อมูลลูกหนี้</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
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
              <p className="text-slate-500 text-sm">รูปโปรไฟล์</p>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="text-primary-500 text-xs font-semibold mt-0.5"
              >
                เปลี่ยนอวาตาร์ →
              </button>
            </div>
          </div>

          {/* Required Fields */}
          <div className="space-y-3">
            <p className="section-heading">ข้อมูลหลัก</p>

            <div>
              <label className="input-label">ชื่อ-นามสกุล *</label>
              <input {...register("full_name")} className="input-field" />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="input-label">เบอร์โทรศัพท์ *</label>
              <input {...register("phone")} className="input-field" type="tel" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            {lenders.length > 0 && (
              <div>
                <label className="input-label">ผู้ให้กู้ (นายทุน)</label>
                <select {...register("lender_id")} className="input-field">
                  <option value="" className="bg-dark-800">-- เลือกผู้ให้กู้ --</option>
                  {lenders.map((l) => (
                    <option key={l.id} value={l.id} className="bg-dark-800">{l.name}</option>
                  ))}
                </select>
              </div>
            )}

            {loan && (
              <div>
                <label className="input-label">หักค่าค้ำประกัน/งวด (บาท)</label>
                <input
                  {...register("guarantee_deduction", { valueAsNumber: true })}
                  type="number"
                  className="input-field"
                  placeholder="0"
                />
              </div>
            )}
          </div>

          {/* Optional Fields Toggle */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-2 text-slate-400 text-sm hover:text-slate-600 transition-colors"
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
                <input {...register("occupation")} className="input-field" placeholder="อาชีพ..." />
              </div>
              <div>
                <label className="input-label">ที่อยู่</label>
                <textarea {...register("address")} className="input-field min-h-[80px] resize-none" placeholder="ที่อยู่..." />
              </div>
              <div>
                <label className="input-label">Facebook</label>
                <input {...register("facebook")} className="input-field" />
              </div>
              <div>
                <label className="input-label">Line ID</label>
                <input {...register("line_id")} className="input-field" />
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
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </form>
      </div>

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
