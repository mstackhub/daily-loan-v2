// ============================================
// Utility Functions for DebtFlow V2
// ============================================

// Format currency in Thai Baht
export function formatCurrency(amount: number, decimals = 0): string {
  return `฿${amount.toLocaleString("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

// Format date to Thai locale (e.g. "5 ก.ค. 69")
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = (d.getFullYear() + 543).toString().slice(-2);
  return `${day} ${month} ${year}`;
}

export function formatThaiDateTime(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = (d.getFullYear() + 543).toString().slice(-2);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} ${hh}:${mm}`;
}

// Get today as YYYY-MM-DD string
export function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Format phone number 0XX-XXX-XXXX
export function formatPhone(phone: string): string {
  if (!phone) return "-";
  const clean = String(phone).replace(/[-\s]/g, "");
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

// Payment frequency labels
export function freqLabel(freq: string): string {
  if (freq === "weekly") return "สัปดาห์";
  if (freq === "monthly") return "เดือน";
  return "วัน";
}

export function freqInterestLabel(freq: string): string {
  if (freq === "weekly") return "ดอกเบี้ยต่อสัปดาห์";
  if (freq === "monthly") return "ดอกเบี้ยต่อเดือน";
  return "ดอกเบี้ยต่อวัน";
}

// Merge class names
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Compress image file to base64
export async function compressImage(
  file: File,
  maxDim = 1000,
  quality = 0.7
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const mimeType = file.type || "image/jpeg";
        const previewUrl = canvas.toDataURL(mimeType, quality);
        const base64 = previewUrl.split(",")[1];
        resolve({ base64, mimeType, previewUrl });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Generate payment token for customer payment links
export function encodePaymentLink(params: Record<string, string | number>): string {
  return btoa(JSON.stringify(params));
}

export function decodePaymentLink(token: string): Record<string, string | number> | null {
  try {
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}
