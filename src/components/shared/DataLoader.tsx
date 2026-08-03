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

      // Helper to fetch single table with individual timeout and try/catch
      const fetchTable = async (queryPromise: any, fallback: any) => {
        try {
          const res = await Promise.race([
            queryPromise,
            new Promise((resolve) => setTimeout(() => resolve({ data: fallback }), 3500))
          ]);
          return res.data || fallback;
        } catch (err) {
          console.error("Table fetch failed:", err);
          return fallback;
        }
      };

      if (isInitialLoaded || hasData) {
        // Silent background update if we already have data in store
        try {
          const debtorsPromise = fetchTable(supabase.from("debtors").select("*").order("created_at", { ascending: false }), []);
          const loansPromise = fetchTable(supabase.from("loans").select("*").order("created_at", { ascending: false }), []);
          const paymentsPromise = fetchTable(supabase.from("payments").select("*").order("payment_date", { ascending: false }), []);
          const settingsPromise = fetchTable(supabase.from("settings").select("*").limit(1), []);
          const bankAccountsPromise = fetchTable(supabase.from("bank_accounts").select("*").order("sort_order"), []);
          const lendersPromise = fetchTable(supabase.from("lenders").select("*").order("name"), []);

          const [debtors, loans, payments, settingsRows, bankAccounts, lenders] = await Promise.all([
            debtorsPromise,
            loansPromise,
            paymentsPromise,
            settingsPromise,
            bankAccountsPromise,
            lendersPromise,
          ]);

          if (debtors) setDebtors(debtors as Debtor[]);
          if (loans) setLoans(loans as Loan[]);
          if (payments) setPayments(payments as Payment[]);
          if (settingsRows && settingsRows.length > 0) setSettings(settingsRows[0] as Settings);
          if (bankAccounts) setBankAccounts(bankAccounts as BankAccount[]);
          if (lenders) setLenders(lenders as Lender[]);
          isInitialLoaded = true;
        } catch (err) {
          console.error("Background sync failed:", err);
        }
        return;
      }

      setIsLoading(true);
      setLoadingProgress(0);
      try {
        let completed = 0;
        const total = 6;
        const updateProgress = () => {
          completed += 1;
          setLoadingProgress(Math.round((completed / total) * 100));
        };

        const fetchTableWithProgress = async (queryPromise: any, fallback: any) => {
          const data = await fetchTable(queryPromise, fallback);
          updateProgress();
          return data;
        };

        const debtorsPromise = fetchTableWithProgress(supabase.from("debtors").select("*").order("created_at", { ascending: false }), []);
        const loansPromise = fetchTableWithProgress(supabase.from("loans").select("*").order("created_at", { ascending: false }), []);
        const paymentsPromise = fetchTableWithProgress(supabase.from("payments").select("*").order("payment_date", { ascending: false }), []);
        const settingsPromise = fetchTableWithProgress(supabase.from("settings").select("*").limit(1), []);
        const bankAccountsPromise = fetchTableWithProgress(supabase.from("bank_accounts").select("*").order("sort_order"), []);
        const lendersPromise = fetchTableWithProgress(supabase.from("lenders").select("*").order("name"), []);

        const [debtors, loans, payments, settingsRows, bankAccounts, lenders] = await Promise.all([
          debtorsPromise,
          loansPromise,
          paymentsPromise,
          settingsPromise,
          bankAccountsPromise,
          lendersPromise,
        ]);

        if (debtors) setDebtors(debtors as Debtor[]);
        if (loans) setLoans(loans as Loan[]);
        if (payments) setPayments(payments as Payment[]);
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
