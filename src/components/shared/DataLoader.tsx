"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/appStore";
import type { Debtor, Loan, Payment, Settings, BankAccount } from "@/types";

// Loads all initial data into Zustand store on mount
export function DataLoader() {
  const { setDebtors, setLoans, setPayments, setSettings, setBankAccounts } = useAppStore();

  useEffect(() => {
    async function loadAll() {
      try {
        const [
          { data: debtors },
          { data: loans },
          { data: payments },
          { data: settingsRows },
          { data: bankAccounts },
        ] = await Promise.all([
          supabase.from("debtors").select("*").order("created_at", { ascending: false }),
          supabase.from("loans").select("*").order("created_at", { ascending: false }),
          supabase.from("payments").select("*").order("payment_date", { ascending: false }),
          supabase.from("settings").select("*").limit(1),
          supabase.from("bank_accounts").select("*").order("sort_order"),
        ]);

        if (debtors) setDebtors(debtors as Debtor[]);
        if (loans) setLoans(loans as Loan[]);
        if (payments) setPayments(payments as Payment[]);
        if (settingsRows && settingsRows.length > 0) setSettings(settingsRows[0] as Settings);
        if (bankAccounts) setBankAccounts(bankAccounts as BankAccount[]);
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    }

    loadAll();
  }, [setDebtors, setLoans, setPayments, setSettings, setBankAccounts]);

  return null;
}
