"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Debtor, Loan, Payment, Settings, BankAccount, Lender } from "@/types";

interface AppStore {
  // Data
  debtors: Debtor[];
  loans: Loan[];
  payments: Payment[];
  settings: Settings | null;
  bankAccounts: BankAccount[];
  lenders: Lender[];

  // UI State
  activeDebtorId: string | null;
  currentReportDate: string;
  isLoading: boolean;
  loadingProgress: number;
  toast: { message: string; type: "success" | "danger" | "warning" | "info" } | null;

  // Actions
  setDebtors: (d: Debtor[]) => void;
  setLoans: (l: Loan[]) => void;
  setPayments: (p: Payment[]) => void;
  setSettings: (s: Settings) => void;
  setBankAccounts: (b: BankAccount[]) => void;
  setLenders: (l: Lender[]) => void;
  setActiveDebtorId: (id: string | null) => void;
  setCurrentReportDate: (date: string) => void;
  setIsLoading: (v: boolean) => void;
  setLoadingProgress: (v: number) => void;
  showToast: (message: string, type?: "success" | "danger" | "warning" | "info") => void;
  clearToast: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      debtors: [],
      loans: [],
      payments: [],
      settings: null,
      bankAccounts: [],
      lenders: [],
      activeDebtorId: null,
      currentReportDate: new Date().toISOString().split("T")[0],
      isLoading: false,
      loadingProgress: 0,
      toast: null,

      setDebtors: (debtors) => set({ debtors }),
      setLoans: (loans) => set({ loans }),
      setPayments: (payments) => set({ payments }),
      setSettings: (settings) => set({ settings }),
      setBankAccounts: (bankAccounts) => set({ bankAccounts }),
      setLenders: (lenders) => set({ lenders }),
      setActiveDebtorId: (activeDebtorId) => set({ activeDebtorId }),
      setCurrentReportDate: (currentReportDate) => set({ currentReportDate }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setLoadingProgress: (loadingProgress) => set({ loadingProgress }),
      showToast: (message, type = "success") => {
        set({ toast: { message, type } });
        setTimeout(() => set({ toast: null }), 3500);
      },
      clearToast: () => set({ toast: null }),
    }),
    {
      name: "debtflow-storage",
      partialize: (state) => ({
        debtors: state.debtors,
        loans: state.loans,
        payments: state.payments,
        settings: state.settings,
        bankAccounts: state.bankAccounts,
        lenders: state.lenders,
        currentReportDate: state.currentReportDate,
      }),
    }
  )
);
