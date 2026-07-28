"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/appStore";
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
  referred_by: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
}

export function AddDebtorSheet({ onClose }: Props) {
  const { debtors, setDebtors, showToast } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      referred_by: "",
    },
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      // Insert debtor only
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
          referred_by: data.referred_by || "",
        })
        .select()
        .single();

      if (debtorErr) throw debtorErr;

      // Update store
      setDebtors([debtor, ...debtors]);
      showToast("เพิ่มประวัติลูกหนี้ใหม่เรียบร้อยแล้ว", "success");
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
          <h2 className="text-lg font-bold text-white">เพิ่มประวัติลูกหนี้ใหม่</h2>
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
            <p className="section-heading">ข้อมูลลูกหนี้หลัก</p>

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

            <div>
              <label className="input-label">ผู้แนะนำ (ถ้ามี)</label>
              <input {...register("referred_by")} className="input-field" placeholder="ชื่อผู้แนะนำ..." />
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
            {isSubmitting ? "กำลังบันทึก..." : "เพิ่มประวัติลูกหนี้"}
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
