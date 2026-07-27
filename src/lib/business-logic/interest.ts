import { type Loan, type Payment, type OverdueInfo, type PaymentPreview } from "@/types";

// ============================================
// DATE HELPERS
// ============================================

export function parseLocalDate(dateStr: string): Date {
  const parts = String(dateStr).split("T")[0].split("-");
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return new Date(dateStr);
}

export function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// ============================================
// OVERDUE / ELAPSED PERIODS CALCULATION
// ============================================

export function getLoanOverdueInfo(
  loan: Loan,
  payments: Payment[],
  asOfDate?: Date
): OverdueInfo {
  if (!loan || loan.status !== "active") {
    return { isOverdue: false, overduePeriods: 0, outstandingInterest: 0, elapsedPeriods: 0, expectedInterest: 0, totalInterestPaid: 0 };
  }

  const today = asOfDate ?? todayLocal();
  const loanStart = parseLocalDate(loan.loan_date);
  const freq = loan.payment_frequency ?? "daily";

  let elapsedPeriods = 0;

  if (today > loanStart) {
    const diffMs = today.getTime() - loanStart.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (freq === "daily") {
      elapsedPeriods = diffDays;
    } else if (freq === "weekly") {
      elapsedPeriods = Math.floor(diffDays / 7);
    } else if (freq === "monthly") {
      let months =
        (today.getFullYear() - loanStart.getFullYear()) * 12 +
        (today.getMonth() - loanStart.getMonth());
      // If not yet reached the same day-of-month, subtract 1
      if (today.getDate() < loanStart.getDate()) {
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        if (today.getDate() !== lastDay || loanStart.getDate() <= lastDay) {
          months -= 1;
        }
      }
      elapsedPeriods = Math.max(0, months);
    }
  }

  const activePayments = payments.filter(
    (p) => p.loan_id === loan.id && p.status !== "cancelled"
  );
  const totalInterestPaid = activePayments.reduce(
    (sum, p) => sum + (p.interest_paid ?? 0), 0
  );

  const expectedInterest = elapsedPeriods * loan.interest_per_period;
  const outstandingInterest = Math.max(0, expectedInterest - totalInterestPaid);
  const overduePeriods = Math.ceil(outstandingInterest / loan.interest_per_period);

  return {
    isOverdue: outstandingInterest > 0,
    overduePeriods,
    outstandingInterest,
    elapsedPeriods,
    expectedInterest,
    totalInterestPaid,
  };
}

// ============================================
// PAYMENT PREVIEW CALCULATION
// ============================================

export function calculatePaymentPreview(
  loan: Loan,
  payments: Payment[],
  inputAmount: number,
  asOfDate?: Date
): PaymentPreview {
  const overdueInfo = getLoanOverdueInfo(loan, payments, asOfDate);
  const { outstandingInterest, totalInterestPaid } = overdueInfo;

  const ip = loan.interest_per_period;
  const minPeriods = loan.minimum_periods;
  const remaining = loan.remaining_principal;

  // Outstanding interest is at least one period
  const periodInterest = Math.max(outstandingInterest, ip);

  // Minimum interest guarantee (based on min periods)
  const minTotalInterest = ip * minPeriods;
  const remainingMinInterest = Math.max(0, minTotalInterest - totalInterestPaid);
  const requiredInterest = Math.max(periodInterest, remainingMinInterest);

  // Payoff amount = remaining principal + required interest
  const payoffAmount = remaining + requiredInterest;

  const isOverpayment = inputAmount > payoffAmount;
  const effectiveAmount = isOverpayment ? payoffAmount : inputAmount;
  const isUnderpayment = effectiveAmount < ip && effectiveAmount < payoffAmount;

  let interestPaid = 0;
  let principalPaid = 0;
  let isPayoff = false;

  if (effectiveAmount >= payoffAmount) {
    // Full payoff
    interestPaid = requiredInterest;
    principalPaid = remaining;
    isPayoff = true;
  } else {
    interestPaid = Math.min(effectiveAmount, periodInterest);
    principalPaid = effectiveAmount - interestPaid;

    // Prevent full principal payoff without proper interest settlement
    if (principalPaid >= remaining) {
      principalPaid = remaining - 1;
      interestPaid = effectiveAmount - principalPaid;
    }
  }

  const newRemainingPrincipal = Math.max(0, remaining - principalPaid);

  return {
    amount: effectiveAmount,
    interestPaid: Math.round(interestPaid * 100) / 100,
    principalPaid: Math.round(principalPaid * 100) / 100,
    newRemainingPrincipal: Math.round(newRemainingPrincipal * 100) / 100,
    isPayoff,
    isOverpayment,
    isUnderpayment,
    payoffAmount: Math.round(payoffAmount * 100) / 100,
    periodInterest,
    warning: isUnderpayment
      ? `ยอดชำระขั้นต่ำ ฿${ip.toLocaleString()} (ดอกเบี้ย 1 งวด)`
      : isOverpayment
      ? `เกินยอดปิด ปรับเป็น ฿${payoffAmount.toLocaleString()}`
      : undefined,
  };
}

// ============================================
// RECALCULATE REMAINING PRINCIPAL FROM PAYMENTS
// ============================================

export function recalcRemainingPrincipal(loan: Loan, payments: Payment[]): number {
  const activePayments = payments.filter(
    (p) => p.loan_id === loan.id && p.status !== "cancelled"
  );
  const totalPrincipalPaid = activePayments.reduce(
    (sum, p) => sum + (p.principal_paid ?? 0), 0
  );
  return Math.max(0, loan.principal - totalPrincipalPaid);
}
