import { type Loan, type Payment, type OverdueInfo, type PaymentPreview } from "@/types";

// ============================================
// DATE HELPERS
// ============================================

export function parseLocalDate(dateStr: string): Date {
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return d;
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
  const overdueAsOf = new Date(today.getTime() - 24 * 60 * 60 * 1000); // Only past days count as overdue
  const loanStart = parseLocalDate(loan.loan_date);
  const freq = loan.payment_frequency ?? "daily";

  let elapsedPeriods = 0;

  if (overdueAsOf > loanStart) {
    const diffMs = overdueAsOf.getTime() - loanStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (freq === "daily") {
      elapsedPeriods = diffDays;
    } else if (freq === "weekly") {
      elapsedPeriods = Math.floor(diffDays / 7);
    } else if (freq === "monthly") {
      let months =
        (overdueAsOf.getFullYear() - loanStart.getFullYear()) * 12 +
        (overdueAsOf.getMonth() - loanStart.getMonth());
      // If not yet reached the same day-of-month, subtract 1
      if (overdueAsOf.getDate() < loanStart.getDate()) {
        const lastDay = new Date(overdueAsOf.getFullYear(), overdueAsOf.getMonth() + 1, 0).getDate();
        if (overdueAsOf.getDate() !== lastDay || loanStart.getDate() <= lastDay) {
          months -= 1;
        }
      }
      elapsedPeriods = Math.max(0, months);
    }
  }

  // Bug #4 fix: standardized to status === "active" for consistency across codebase
  const activePayments = payments.filter(
    (p) => p.loan_id === loan.id && p.status === "active"
  );
  const totalInterestPaid = activePayments.reduce(
    (sum, p) => sum + (p.interest_paid ?? 0), 0
  );

  const netInterest = Math.max(0, loan.interest_per_period - (loan.guarantee_deduction ?? 0));
  const expectedInterest = elapsedPeriods * netInterest;
  const outstandingInterest = Math.max(0, expectedInterest - totalInterestPaid);
  const overduePeriods = netInterest > 0 ? Math.ceil(outstandingInterest / netInterest) : 0;

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
  const netInterest = Math.max(0, loan.interest_per_period - (loan.guarantee_deduction ?? 0));
  const ip = netInterest;
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
  // Bug #4 fix: standardized to status === "active" for consistency across codebase
  const activePayments = payments.filter(
    (p) => p.loan_id === loan.id && p.status === "active"
  );
  const totalPrincipalPaid = activePayments.reduce(
    (sum, p) => sum + (p.principal_paid ?? 0) + (p.principal_discount ?? 0), 0
  );
  return Math.max(0, loan.principal - totalPrincipalPaid);
}
