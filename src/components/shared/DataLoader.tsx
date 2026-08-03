"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/appStore";
import type { Debtor, Loan, Payment, Settings, BankAccount, Lender } from "@/types";

let isInitialLoaded = false;

// Loads all initial data into Zustand store on mount
export function DataLoader() {
  const { setDebtors, setLoans, setPayments, setSettings, setBankAccounts, setLenders, setIsLoading, setLoadingProgress } = useAppStore();

  useEffect(() => {
    async function loadAll() {
      const state = useAppStore.getState();
      const hasData = state.debtors.length > 0;

      if (isInitialLoaded || hasData) {
        // ── Silent background refresh ──────────────────────────────────
        // IMPORTANT: only update the store if the fetch actually returned data.
        // Never overwrite cached data with an empty array caused by a timeout
        // or network error (that was the root cause of "payments disappeared").
        try {
          const [
            { data: debtors, error: e1 },
            { data: loans, error: e2 },
            { data: payments, error: e3 },
            { data: settingsRows, error: e4 },
            { data: bankAccounts, error: e5 },
            { data: lenders, error: e6 },
          ] = await Promise.all([
            supabase.from("debtors").select("*").order("created_at", { ascending: false }),
            supabase.from("loans").select("*").order("created_at", { ascending: false }),
            supabase.from("payments").select("*").order("payment_date", { ascending: false }),
            supabase.from("settings").select("*").limit(1),
            supabase.from("bank_accounts").select("*").order("sort_order"),
            supabase.from("lenders").select("*").order("name"),
          ]);

          // Only commit to store if there was no error AND data was returned
          if (!e1 && debtors) setDebtors(debtors as Debtor[]);
          if (!e2 && loans) setLoans(loans as Loan[]);
          // payments can legitimately be empty for a brand-new user — but only
          // update when the response is error-free so we never wipe real data
          if (!e3 && payments !== null) setPayments(payments as Payment[]);
          if (!e4 && settingsRows && settingsRows.length > 0) setSettings(settingsRows[0] as Settings);
          if (!e5 && bankAccounts) setBankAccounts(bankAccounts as BankAccount[]);
          if (!e6 && lenders) setLenders(lenders as Lender[]);

          isInitialLoaded = true;
        } catch (err) {
          console.error("Background sync failed:", err);
        }
        return;
      }

      // ── First-time full load with progress bar ─────────────────────
      setIsLoading(true);
      setLoadingProgress(0);
      try {
        let completed = 0;
        const total = 6;
        const tick = () => {
          completed += 1;
          setLoadingProgress(Math.round((completed / total) * 100));
        };

        const [
          { data: debtors },
          { data: loans },
          { data: payments },
          { data: settingsRows },
          { data: bankAccounts },
          { data: lenders },
        ] = await Promise.all([
          supabase.from("debtors").select("*").order("created_at", { ascending: false }).then((r) => { tick(); return r; }),
          supabase.from("loans").select("*").order("created_at", { ascending: false }).then((r) => { tick(); return r; }),
          supabase.from("payments").select("*").order("payment_date", { ascending: false }).then((r) => { tick(); return r; }),
          supabase.from("settings").select("*").limit(1).then((r) => { tick(); return r; }),
          supabase.from("bank_accounts").select("*").order("sort_order").then((r) => { tick(); return r; }),
          supabase.from("lenders").select("*").order("name").then((r) => { tick(); return r; }),
        ]);

        if (debtors) setDebtors(debtors as Debtor[]);
        if (loans) setLoans(loans as Loan[]);
        if (payments !== null) setPayments(payments as Payment[]);
        if (settingsRows && settingsRows.length > 0) setSettings(settingsRows[0] as Settings);
        if (bankAccounts) setBankAccounts(bankAccounts as BankAccount[]);
        if (lenders) setLenders(lenders as Lender[]);

        setLoadingProgress(100);
        isInitialLoaded = true;
        await new Promise((resolve) => setTimeout(resolve, 400));
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAll();
  }, [setDebtors, setLoans, setPayments, setSettings, setBankAccounts, setLenders, setIsLoading]);

  return null;
}
