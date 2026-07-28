-- ============================================
-- DebtFlow V2 — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: settings
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_interest_per_day  numeric NOT NULL DEFAULT 100,
  default_minimum_days      integer NOT NULL DEFAULT 5,
  pin_code                  text NOT NULL DEFAULT '1234',
  promptpay_id              text DEFAULT '',
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- Insert default settings row if not exists
INSERT INTO settings (default_interest_per_day, default_minimum_days, pin_code, promptpay_id)
SELECT 100, 5, '1234', ''
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);

-- ============================================
-- TABLE: bank_accounts
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL DEFAULT 'Bank',
  bank_name   text NOT NULL,
  acc_no      text NOT NULL,
  acc_name    text NOT NULL,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ============================================
-- TABLE: lenders (นายทุน)
-- ============================================
CREATE TABLE IF NOT EXISTS lenders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text NOT NULL DEFAULT '',
  note        text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Insert a default lender if none exist
INSERT INTO lenders (name, phone)
SELECT 'นายทุนเริ่มต้น', ''
WHERE NOT EXISTS (SELECT 1 FROM lenders LIMIT 1);

-- ============================================
-- TABLE: debtors
-- ============================================
CREATE TABLE IF NOT EXISTS debtors (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             text NOT NULL,
  phone                 text NOT NULL DEFAULT '',
  national_id           text DEFAULT '',
  address               text DEFAULT '',
  occupation            text DEFAULT '',
  facebook              text DEFAULT '',
  line_id               text DEFAULT '',
  google_map            text DEFAULT '',
  note                  text DEFAULT '',
  status                text NOT NULL DEFAULT 'active',
  id_card_image_url     text DEFAULT '',
  house_reg_image_url   text DEFAULT '',
  house_image_url       text DEFAULT '',
  profile_image_url     text DEFAULT '',
  referred_by           text DEFAULT '', -- ผู้แนะนำ
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ============================================
-- TABLE: loans
-- ============================================
CREATE TABLE IF NOT EXISTS loans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debtor_id           uuid NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
  lender_id           uuid REFERENCES lenders(id) ON DELETE SET NULL, -- เชื่อมตารางนายทุน
  loan_date           date NOT NULL,
  principal           numeric NOT NULL,
  remaining_principal numeric NOT NULL,
  interest_per_period numeric NOT NULL,
  guarantee_deduction numeric NOT NULL DEFAULT 0, -- หักค้ำประกัน
  minimum_periods     integer NOT NULL DEFAULT 5,
  status              text NOT NULL DEFAULT 'active',
  payment_frequency   text NOT NULL DEFAULT 'daily',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ============================================
-- TABLE: payments
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id             uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  debtor_id           uuid NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
  payment_date        timestamptz NOT NULL DEFAULT now(),
  amount              numeric NOT NULL,
  interest_paid       numeric NOT NULL DEFAULT 0,
  principal_paid      numeric NOT NULL DEFAULT 0,
  remaining_principal numeric NOT NULL DEFAULT 0,
  payment_method      text NOT NULL DEFAULT 'cash',
  slip_image_url      text DEFAULT '',
  status              text NOT NULL DEFAULT 'active',
  cancel_reason       text DEFAULT '',
  principal_discount  numeric NOT NULL DEFAULT 0, -- ส่วนลดเงินต้น
  created_at          timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_loans_debtor_id ON loans(debtor_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_debtor_id ON payments(debtor_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_debtors_status ON debtors(status);

-- ============================================
-- ROW LEVEL SECURITY (open for now — PIN-based access only)
-- ============================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (app controls access via PIN)
CREATE POLICY "Allow all for anon" ON settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON bank_accounts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lenders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON debtors FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON loans FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON payments FOR ALL TO anon USING (true) WITH CHECK (true);
