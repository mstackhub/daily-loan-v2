"use client";

import { create } from "zustand";
import type { Debtor, Loan, Payment, Settings, BankAccount } from "@/types";

interface AppStore {
  // Data
  debtors: Debtor[];
  loans: Loan[];
  payments: Payment[];
  settings: Settings | null;
  bankAccounts: BankAccount[];

  // UI State
  activeDebtorId: string | null;
  currentReportDate: string;
  isLoading: boolean;
  toast: { message: string; type: "success" | "danger" | "warning" | "info" } | null;

  // Actions
  setDebtors: (d: Debtor[]) => void;
  setLoans: (l: Loan[]) => void;
  setPayments: (p: Payment[]) => void;
  setSettings: (s: Settings) => void;
  setBankAccounts: (b: BankAccount[]) => void;
  setActiveDebtorId: (id: string | null) => void;
  setCurrentReportDate: (date: string) => void;
  setIsLoading: (v: boolean) => void;
  showToast: (message: string, type?: "success" | "danger" | "warning" | "info") => void;
  clearToast: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  debtors: [],
  loans: [],
  payments: [],
  settings: null,
  bankAccounts: [],
  activeDebtorId: null,
  currentReportDate: new Date().toISOString().split("T")[0],
  isLoading: false,
  toast: null,

  setDebtors: (debtors) => set({ debtors }),
  setLoans: (loans) => set({ loans }),
  setPayments: (payments) => set({ payments }),
  setSettings: (settings) => set({ settings }),
  setBankAccounts: (bankAccounts) => set({ bankAccounts }),
  setActiveDebtorId: (activeDebtorId) => set({ activeDebtorId }),
  setCurrentReportDate: (currentReportDate) => set({ currentReportDate }),
  setIsLoading: (isLoading) => set({ isLoading }),
  showToast: (message, type = "success") => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3500);
  },
  clearToast: () => set({ toast: null }),
}));
