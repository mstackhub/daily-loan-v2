// ============================================
// TypeScript Types for DebtFlow V2
// ============================================

export type PaymentFrequency = "daily" | "weekly" | "monthly";
export type PaymentMethod = "cash" | "transfer";
export type DebtorStatus = "active" | "closed";
export type LoanStatus = "active" | "completed";
export type PaymentStatus = "active" | "cancelled";

export interface Settings {
  id: string;
  default_interest_per_day: number;
  default_minimum_days: number;
  pin_code: string;
  promptpay_id: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  type: "PromptPay" | "Bank";
  bank_name: string;
  acc_no: string;
  acc_name: string;
  sort_order: number;
  created_at: string;
}

export interface Debtor {
  id: string;
  full_name: string;
  phone: string;
  national_id: string;
  address: string;
  occupation: string;
  facebook: string;
  line_id: string;
  google_map: string;
  note: string;
  status: DebtorStatus;
  id_card_image_url: string;
  house_reg_image_url: string;
  house_image_url: string;
  profile_image_url: string;
  referred_by?: string;
  created_at: string;
  updated_at: string;
  // Relations (joined)
  loans?: Loan[];
}

export interface Lender {
  id: string;
  name: string;
  phone: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  debtor_id: string;
  lender_id?: string;
  loan_date: string; // "YYYY-MM-DD"
  principal: number;
  remaining_principal: number;
  interest_per_period: number;
  guarantee_deduction?: number;
  minimum_periods: number;
  status: LoanStatus;
  payment_frequency: PaymentFrequency;
  created_at: string;
  updated_at: string;
  // Relations
  debtor?: Debtor;
  lender?: Lender;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  loan_id: string;
  debtor_id: string;
  payment_date: string;
  amount: number;
  interest_paid: number;
  principal_paid: number;
  remaining_principal: number;
  payment_method: PaymentMethod;
  slip_image_url: string;
  status: PaymentStatus;
  cancel_reason: string;
  principal_discount?: number;
  created_at: string;
  // Relations
  debtor?: Debtor;
  loan?: Loan;
}

// ============================================
// Business Logic Types
// ============================================

export interface OverdueInfo {
  isOverdue: boolean;
  overduePeriods: number;
  outstandingInterest: number;
  elapsedPeriods: number;
  expectedInterest: number;
  totalInterestPaid: number;
}

export interface PaymentPreview {
  amount: number;
  interestPaid: number;
  principalPaid: number;
  newRemainingPrincipal: number;
  isPayoff: boolean;
  isOverpayment: boolean;
  isUnderpayment: boolean;
  payoffAmount: number;
  periodInterest: number;
  warning?: string;
}

export interface DashboardStats {
  activeDebtors: number;
  totalRemainingPrincipal: number;
  todayCollected: number;
  monthCollected: number;
}

// ============================================
// Form Types
// ============================================

export interface AddDebtorForm {
  full_name: string;
  phone: string;
  national_id?: string;
  address?: string;
  occupation?: string;
  facebook?: string;
  line_id?: string;
  google_map?: string;
  note?: string;
  profile_image_url?: string;
  // Loan fields
  lender_id?: string;
  loan_date: string;
  payment_frequency: PaymentFrequency;
  principal: number;
  interest_per_period: number;
  minimum_periods: number;
}

export interface ReceivePaymentForm {
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  bank_account_id?: string;
  slip_file?: File;
}

export interface UploadedFile {
  name: string;
  mimeType: string;
  base64: string;
  previewUrl: string;
}
