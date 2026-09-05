"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Plus, Trash2, Key, Check, Download, Smartphone, Share2, PlusSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

const BANK_OPTIONS = [
  { value: "PromptPay", label: "PromptPay" },
  { value: "KBANK", label: "กสิกรไทย (KBANK)" },
  { value: "SCB", label: "ไทยพาณิชย์ (SCB)" },
  { value: "BBL", label: "กรุงเทพ (BBL)" },
  { value: "KTB", label: "กรุงไทย (KTB)" },
  { value: "TTB", label: "ทีทีบี (TTB)" },
  { value: "BAY", label: "กรุงศรี (BAY)" },
  { value: "GSB", label: "ออมสิน (GSB)" },
];

export default function SettingsPage() {
  const { settings, setSettings, bankAccounts, setBankAccounts, lenders, setLenders, showToast } = useAppStore();

  const [pinOld, setPinOld] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [ppId, setPpId] = useState(settings?.promptpay_id || "");
  const [defaultInterest, setDefaultInterest] = useState(settings?.default_interest_per_day?.toString() || "100");
  const [defaultMinDays, setDefaultMinDays] = useState(settings?.default_minimum_days?.toString() || "5");

  // PWA state
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    const handlePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  async function handleInstallPwa() {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    if (isIos || !deferredPrompt) {
      setShowIosGuide(true);
      return;
    }
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setIsStandalone(true);
      showToast("ติดตั้งแอปเรียบร้อยแล้ว 🎉", "success");
    }
  }

  // Bank account form
  const [bankType, setBankType] = useState<"PromptPay" | "Bank">("Bank");
  const [bankName, setBankName] = useState(BANK_OPTIONS[1].value);
  const [accNo, setAccNo] = useState("");
  const [accName, setAccName] = useState("");
  const [isAddingAcc, setIsAddingAcc] = useState(false);

  // Lender state
  const [lenderName, setLenderName] = useState("");
  const [lenderPhone, setLenderPhone] = useState("");
  const [lenderNote, setLenderNote] = useState("");
  const [isAddingLender, setIsAddingLender] = useState(false);
  const [editingLenderId, setEditingLenderId] = useState<string | null>(null);

  async function handleSaveSettings() {
    if (!settings) return;
    try {
      const { error } = await supabase
        .from("settings")
        .update({
          promptpay_id: ppId,
          default_interest_per_day: parseFloat(defaultInterest) || 100,
          default_minimum_days: parseInt(defaultMinDays) || 5,
        })
        .eq("id", settings.id);

      if (error) throw error;

      setSettings({
        ...settings,
        promptpay_id: ppId,
        default_interest_per_day: parseFloat(defaultInterest) || 100,
        default_minimum_days: parseInt(defaultMinDays) || 5,
      });

      showToast("บันทึกการตั้งค่าสำเร็จ", "success");
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + err.message, "danger");
    }
  }

  async function handleUpdatePin() {
    if (!settings) return;
    if (settings.pin_code !== pinOld) {
      showToast("รหัส PIN เดิมไม่ถูกต้อง", "danger");
      return;
    }
    if (pinNew.length !== 4 || isNaN(parseInt(pinNew))) {
      showToast("รหัส PIN ใหม่ต้องเป็นตัวเลข 4 หลัก", "warning");
      return;
    }

    try {
      const { error } = await supabase
        .from("settings")
        .update({ pin_code: pinNew })
        .eq("id", settings.id);

      if (error) throw error;

      setSettings({ ...settings, pin_code: pinNew });
      setPinOld("");
      setPinNew("");
      showToast("เปลี่ยนรหัส PIN สำเร็จ", "success");
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + err.message, "danger");
    }
  }

  async function handleAddBankAccount() {
    if (!accNo || !accName) {
      showToast("กรุณากรอกข้อมูลบัญชีให้ครบถ้วน", "warning");
      return;
    }

    try {
      const { data: newAcc, error } = await supabase
        .from("bank_accounts")
        .insert({
          type: bankType,
          bank_name: bankType === "PromptPay" ? "PromptPay" : bankName,
          acc_no: accNo,
          acc_name: accName,
          sort_order: bankAccounts.length,
        })
        .select()
        .single();

      if (error) throw error;

      setBankAccounts([...bankAccounts, newAcc]);
      setAccNo("");
      setAccName("");
      setIsAddingAcc(false);
      showToast("เพิ่มบัญชีธนาคารสำเร็จ", "success");
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + err.message, "danger");
    }
  }

  async function handleDeleteBankAccount(id: string) {
    try {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;

      setBankAccounts(bankAccounts.filter((b) => b.id !== id));
      showToast("ลบบัญชีธนาคารเรียบร้อยแล้ว", "success");
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + err.message, "danger");
    }
  }

  async function handleAddOrUpdateLender() {
    if (!lenderName) {
      showToast("กรุณากรอกชื่อผู้ให้กู้", "warning");
      return;
    }

    try {
      if (editingLenderId) {
        const { data, error } = await supabase
          .from("lenders")
          .update({
            name: lenderName,
            phone: lenderPhone,
            note: lenderNote,
          })
          .eq("id", editingLenderId)
          .select()
          .single();

        if (error) throw error;

        setLenders(lenders.map((l) => (l.id === editingLenderId ? data : l)));
        showToast("แก้ไขข้อมูลผู้ให้กู้สำเร็จ", "success");
      } else {
        const { data, error } = await supabase
          .from("lenders")
          .insert({
            name: lenderName,
            phone: lenderPhone,
            note: lenderNote,
          })
          .select()
          .single();

        if (error) throw error;

        setLenders([data, ...lenders]);
        showToast("เพิ่มผู้ให้กู้สำเร็จ", "success");
      }

      setLenderName("");
      setLenderPhone("");
      setLenderNote("");
      setIsAddingLender(false);
      setEditingLenderId(null);
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + err.message, "danger");
    }
  }

  async function handleDeleteLender(id: string) {
    if (!confirm("คุณต้องการลบรายชื่อผู้ให้กู้รายนี้ใช่หรือไม่?")) return;

    try {
      const { error } = await supabase.from("lenders").delete().eq("id", id);
      if (error) throw error;

      setLenders(lenders.filter((l) => l.id !== id));
      showToast("ลบรายชื่อผู้ให้กู้สำเร็จ", "success");
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + err.message, "danger");
    }
  }

  function startEditLender(lender: any) {
    setEditingLenderId(lender.id);
    setLenderName(lender.name);
    setLenderPhone(lender.phone);
    setLenderNote(lender.note);
    setIsAddingLender(true);
  }

  return (
    <div className="min-h-dvh px-4 pt-12 pb-8 space-y-5">
      <h1 className="text-2xl font-bold text-white mb-2">ตั้งค่า</h1>

      {/* Defaults settings */}
      <div className="glass-card p-4 space-y-3">
        <p className="section-heading">ค่าเริ่มต้นเงินกู้</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">ดอกเบี้ยเริ่มต้น (/วัน)</label>
            <input
              type="number"
              value={defaultInterest}
              onChange={(e) => setDefaultInterest(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">จำนวนงวดขั้นต่ำ</label>
            <input
              type="number"
              value={defaultMinDays}
              onChange={(e) => setDefaultMinDays(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        <div>
          <label className="input-label">PromptPay ID หลัก (รับเงินโอน)</label>
          <input
            type="text"
            value={ppId}
            onChange={(e) => setPpId(e.target.value)}
            className="input-field"
            placeholder="เบอร์โทร หรือเลขบัตร"
          />
        </div>
        <button onClick={handleSaveSettings} className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> บันทึกการตั้งค่า
        </button>
      </div>

      {/* Bank Accounts */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="section-heading mb-0">บัญชีรับชำระเงิน ({bankAccounts.length})</p>
          <button
            onClick={() => setIsAddingAcc(!isAddingAcc)}
            className="text-primary-400 text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มบัญชี
          </button>
        </div>

        {/* Add Account Form */}
        {isAddingAcc && (
          <div className="glass-card-sm p-3 space-y-3 border border-primary-500/20">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBankType("Bank")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all",
                  bankType === "Bank" ? "bg-primary-500/20 border-primary-500/30 text-primary-400" : "bg-white/[0.04] border-white/10 text-white/50"
                )}
              >
                บัญชีธนาคาร
              </button>
              <button
                type="button"
                onClick={() => {
                  setBankType("PromptPay");
                  setBankName("PromptPay");
                }}
                className={cn(
                  "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all",
                  bankType === "PromptPay" ? "bg-primary-500/20 border-primary-500/30 text-primary-400" : "bg-white/[0.04] border-white/10 text-white/50"
                )}
              >
                พร้อมเพย์
              </button>
            </div>

            {bankType === "Bank" && (
              <div>
                <label className="input-label text-[10px]">เลือกธนาคาร</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="input-field py-2 text-xs"
                >
                  {BANK_OPTIONS.filter((o) => o.value !== "PromptPay").map((o) => (
                    <option key={o.value} value={o.value} className="bg-dark-800">{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="input-label text-[10px]">{bankType === "PromptPay" ? "หมายเลขพร้อมเพย์" : "เลขบัญชีธนาคาร"}</label>
              <input
                type="text"
                value={accNo}
                onChange={(e) => setAccNo(e.target.value)}
                className="input-field py-2 text-xs"
                placeholder={bankType === "PromptPay" ? "08xxxxxxx" : "xxxxxxxxx"}
              />
            </div>

            <div>
              <label className="input-label text-[10px]">ชื่อเจ้าของบัญชี</label>
              <input
                type="text"
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                className="input-field py-2 text-xs"
                placeholder="ชื่อเจ้าของบัญชี..."
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setIsAddingAcc(false)} className="btn-secondary flex-1 py-2 text-xs">
                ยกเลิก
              </button>
              <button onClick={handleAddBankAccount} className="btn-primary flex-1 py-2 text-xs">
                บันทึกบัญชี
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {bankAccounts.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-3 glass-card-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white/50" />
                </div>
                <div>
                  <p className="text-white font-medium text-xs">
                    {b.type === "PromptPay" ? "PromptPay" : b.bank_name}
                  </p>
                  <p className="text-white/40 text-[10px]">{b.acc_no} ({b.acc_name})</p>
                </div>
              </div>
              <button onClick={() => handleDeleteBankAccount(b.id)} className="p-2 text-white/20 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Lenders configuration */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="section-heading mb-0">รายชื่อผู้ให้กู้ (นายทุน)</p>
          {!isAddingLender && (
            <button
              onClick={() => {
                setEditingLenderId(null);
                setLenderName("");
                setLenderPhone("");
                setLenderNote("");
                setIsAddingLender(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-primary rounded-xl text-xs font-bold text-white shadow-glow-primary active:scale-95 transition-transform"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มผู้ให้กู้
            </button>
          )}
        </div>

        {isAddingLender && (
          <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-3">
            <p className="text-xs font-bold text-slate-800">
              {editingLenderId ? "แก้ไขข้อมูลผู้ให้กู้" : "กรอกข้อมูลผู้ให้กู้ใหม่"}
            </p>

            <div>
              <label className="input-label text-[10px]">ชื่อ-นามสกุล *</label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="input-field py-2 text-xs"
                placeholder="ชื่อนายทุน..."
              />
            </div>

            <div>
              <label className="input-label text-[10px]">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={lenderPhone}
                onChange={(e) => setLenderPhone(e.target.value)}
                className="input-field py-2 text-xs"
                placeholder="08xxxxxxxx"
              />
            </div>

            <div>
              <label className="input-label text-[10px]">หมายเหตุเพิ่มเติม</label>
              <input
                type="text"
                value={lenderNote}
                onChange={(e) => setLenderNote(e.target.value)}
                className="input-field py-2 text-xs"
                placeholder="หมายเหตุ..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsAddingLender(false);
                  setEditingLenderId(null);
                }}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                ยกเลิก
              </button>
              <button onClick={handleAddOrUpdateLender} className="btn-primary flex-1 py-2 text-xs">
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {lenders.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">ยังไม่มีข้อมูลรายชื่อผู้ให้กู้</p>
          ) : (
            lenders.map((l) => (
              <div
                key={l.id}
                onClick={() => startEditLender(l)}
                className="flex items-center justify-between p-3 glass-card-sm cursor-pointer hover:bg-slate-50/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-slate-800 font-bold text-xs">{l.name}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    {l.phone ? `โทร: ${l.phone}` : "ไม่มีเบอร์โทร"} {l.note ? `| ${l.note}` : ""}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLender(l.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PIN configuration */}
      <div className="glass-card p-4 space-y-3">
        <p className="section-heading">เปลี่ยนรหัส PIN เข้าแอป</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">รหัส PIN เดิม</label>
            <input
              type="password"
              maxLength={4}
              value={pinOld}
              onChange={(e) => setPinOld(e.target.value)}
              className="input-field text-center font-bold"
              placeholder="••••"
            />
          </div>
          <div>
            <label className="input-label">รหัส PIN ใหม่</label>
            <input
              type="password"
              maxLength={4}
              value={pinNew}
              onChange={(e) => setPinNew(e.target.value)}
              className="input-field text-center font-bold"
              placeholder="••••"
            />
          </div>
        </div>
        <button onClick={handleUpdatePin} className="btn-secondary w-full py-2 text-sm flex items-center justify-center gap-2">
          <Key className="w-4 h-4" /> อัปเดตรหัส PIN
        </button>
      </div>

      {/* PWA App Installation Card */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm shadow-violet-500/25">
              <Smartphone className="w-5 h-5 text-white-force" />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-sm">การติดตั้งแอป (PWA)</p>
              <p className="text-slate-400 text-xs">ใช้งานได้เหมือนแอปจริงบนมือถือ</p>
            </div>
          </div>
          {isStandalone ? (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              ✅ ติดตั้งแล้ว
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 text-xs font-bold">
              พร้อมติดตั้ง
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          ติดตั้ง DebtFlow ลงบนหน้าจอมือถือ (iOS / Android) หรือคอมพิวเตอร์ เพื่อเปิดใช้งานได้รวดเร็วทันใจ เต็มหน้าจอ ไม่มีแถบเบราว์เซอร์กวนใจ
        </p>

        {!isStandalone ? (
          <button
            type="button"
            onClick={handleInstallPwa}
            className="btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 text-white-force"
          >
            <Download className="w-4 h-4" /> ติดตั้งแอป DebtFlow ลงเครื่อง
          </button>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center">
            🎉 แอปพลิเคชันถูกติดตั้งลงบนเครื่องนี้เรียบร้อยแล้ว
          </div>
        )}
      </div>

      {/* iOS Installation Guide Modal */}
      {showIosGuide && (
        <>
          <div className="sheet-overlay animate-fade-in" onClick={() => setShowIosGuide(false)} />
          <div className="sheet-container animate-slide-up max-w-md mx-auto bg-white rounded-t-3xl p-5 shadow-2xl text-slate-800 z-50">
            <div className="sheet-handle bg-slate-300 mb-3" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm">
                  <Smartphone className="w-5 h-5 text-white-force" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">วิธีติดตั้งแอปบนหน้าจอ</h3>
                  <p className="text-xs text-slate-400">สำหรับ iPhone / iPad (Safari)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    แตะที่ปุ่ม <Share2 className="w-4 h-4 text-blue-500" /> <span className="text-blue-600">แชร์ (Share)</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">ที่แถบเมนูด้านล่างสุดของ Safari</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    เลือก <PlusSquare className="w-4 h-4 text-violet-600" /> <span className="text-violet-700">เพิ่มไปยังหน้าจอโฮม</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">(Add to Home Screen)</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    แตะ <span className="font-extrabold text-blue-600">"เพิ่ม" (Add)</span> ที่มุมขวาบน
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">แอปจะไปปรากฏเป็นไอคอนบนหน้าจอมือถือทันที!</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
            >
              เข้าใจแล้ว ปิดหน้าต่างนี้
            </button>
          </div>
        </>
      )}
    </div>
  );
}
