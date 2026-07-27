// ============================================
// V1 to V2 Migration Script for DebtFlow
// Run this locally to migrate all Google Sheets data to Supabase
// ============================================

import { createClient } from "@supabase/supabase-js";

const V1_API_URL = "https://script.google.com/macros/s/AKfycbx7c5MqimQb-J5RCBTHbiqWGuaBrdKDE7pxm_axEh_tDjzMR9xCUDiAo793zlcnX_tEEw/exec";
const SUPABASE_URL = "https://wothbxlykxslueihlcir.supabase.co";
// Must use service role key to bypass RLS during migration
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdGhieGx5a3hzbHVlaWhsY2lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTEyNDkwMCwiZXhwIjoyMTAwNzAwOTAwfQ.waVHpR3WlmUmsbpmzqH2I01N5J6TsC4WgAEXRvknX3k";

globalThis.WebSocket = class {};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  console.log("🚀 Starting migration from V1 (Google Sheets) to V2 (Supabase)...");

  try {
    // 1. Fetch data from V1
    console.log("📥 Fetching initial data from Google Sheets API...");
    const response = await fetch(V1_API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getInitialData", data: {} }),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result || !result.success) {
      throw new Error("Failed to load V1 data or success flag is false");
    }

    const { debtors, loans, payments, settings } = result.data;
    console.log(`✅ Loaded: ${debtors.length} debtors, ${loans.length} loans, ${payments.length} payments`);

    // Clear existing data for clean import
    console.log("🧹 Clearing existing V2 data...");
    await supabase.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("loans").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("debtors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("settings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Migrate settings
    if (settings) {
      console.log("⚙️ Migrating settings...");
      const { error: setErr } = await supabase
        .from("settings")
        .insert({
          default_interest_per_day: settings.defaultInterestPerDay || 100,
          default_minimum_days: settings.defaultMinimumDays || 5,
          pin_code: settings.pinCode || '1234',
          promptpay_id: settings.promptpayId || '',
        });
      if (setErr) console.error("⚠️ Settings insert warning:", setErr);
    }

    // 3. Migrate Debtors
    console.log("👥 Migrating debtors...");
    const debtorIdMap = new Map(); // Maps V1 string id to V2 UUID

    for (const d of debtors) {
      const { data: insertedDebtor, error: debtorErr } = await supabase
        .from("debtors")
        .insert({
          full_name: d.fullName,
          phone: d.phone || "",
          national_id: d.nationalId || "",
          address: d.address || "",
          occupation: d.occupation || "",
          facebook: d.facebook || "",
          line_id: d.lineId || "",
          google_map: d.googleMap || "",
          note: d.note || "",
          status: d.status || "active",
          id_card_image_url: d.idCardImage || "",
          house_reg_image_url: d.houseRegistrationImage || "",
          house_image_url: d.houseImage || "",
          profile_image_url: d.profileImage || "",
          created_at: d.createdAt || new Date().toISOString(),
        })
        .select()
        .single();

      if (debtorErr) {
        console.error(`❌ Failed to insert debtor ${d.fullName}:`, debtorErr);
        continue;
      }

      debtorIdMap.set(d.debtorId, insertedDebtor.id);
    }

    // 4. Migrate Loans
    console.log("💰 Migrating loans...");
    const loanIdMap = new Map(); // Maps V1 string id to V2 UUID

    for (const l of loans) {
      const v2DebtorId = debtorIdMap.get(l.debtorId);
      if (!v2DebtorId) {
        console.warn(`⚠️ Skipping loan ${l.loanId} because parent debtor ${l.debtorId} was not migrated.`);
        continue;
      }

      const { data: insertedLoan, error: loanErr } = await supabase
        .from("loans")
        .insert({
          debtor_id: v2DebtorId,
          loan_date: l.loanDate,
          principal: parseFloat(l.principal),
          remaining_principal: parseFloat(l.remainingPrincipal),
          interest_per_period: parseFloat(l.interestPerDay),
          minimum_periods: parseInt(l.minimumDays),
          status: l.status || "active",
          payment_frequency: l.paymentFrequency || "daily",
          created_at: l.createdAt || new Date().toISOString(),
        })
        .select()
        .single();

      if (loanErr) {
        console.error(`❌ Failed to insert loan ${l.loanId}:`, loanErr);
        continue;
      }

      loanIdMap.set(l.loanId, insertedLoan.id);
    }

    // 5. Migrate Payments
    console.log("💳 Migrating payments...");
    if (payments.length > 0) {
      console.log("Sample payment object keys:", Object.keys(payments[0]));
      console.log("Sample payment values:", {
        paymentId: payments[0].paymentId,
        loanId: payments[0].loanId,
        debtorId: payments[0].debtorId,
        p_loanId: payments[0].loan_id,
        p_debtorId: payments[0].debtor_id
      });
      console.log("Maps sizes:", { debtorIdMap: debtorIdMap.size, loanIdMap: loanIdMap.size });
    }
    let payCount = 0;
    for (const p of payments) {
      // Resolve debtorId from the parent loan in V1 since payments table does not contain debtorId column
      const v1Loan = loans.find(l => l.loanId === p.loanId);
      const v1DebtorId = v1Loan ? v1Loan.debtorId : undefined;

      const v2LoanId = loanIdMap.get(p.loanId);
      const v2DebtorId = debtorIdMap.get(v1DebtorId);

      if (!v2LoanId || !v2DebtorId) {
        console.warn(`⚠️ Skipping payment ${p.paymentId} due to missing related loan/debtor mapping. LoanID: ${p.loanId}, DebtorID: ${v1DebtorId}`);
        continue;
      }

      const { error: payErr } = await supabase
        .from("payments")
        .insert({
          loan_id: v2LoanId,
          debtor_id: v2DebtorId,
          payment_date: p.paymentDate.includes(" ") ? p.paymentDate.replace(" ", "T") + "+07:00" : p.paymentDate,
          amount: parseFloat(p.amount),
          interest_paid: parseFloat(p.interestPaid || 0),
          principal_paid: parseFloat(p.principalPaid || 0),
          remaining_principal: parseFloat(p.remainingPrincipal || 0),
          payment_method: p.paymentMethod || "cash",
          slip_image_url: p.slipImage || "",
          status: p.status || "active",
          cancel_reason: p.cancelReason || "",
          created_at: p.createdAt || new Date().toISOString(),
        });

      if (payErr) {
        console.error(`❌ Failed to insert payment ${p.paymentId}:`, payErr);
      } else {
        payCount++;
      }
    }

    console.log(`\n🎉 Migration successfully completed! Migrated ${debtorIdMap.size} debtors, ${loanIdMap.size} loans, and ${payCount} payments.`);
  } catch (error) {
    console.error("💥 Migration crashed with error:", error);
  }
}

migrate();
