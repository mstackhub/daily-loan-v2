import { type Loan, type Payment, type OverdueInfo, type PaymentPreview, type UnpaidDateItem } from "@/types";
import { formatThaiDate } from "@/lib/utils";

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
// UNPAID DATE ITEMS GENERATOR (CHECKBOX LIST)
// ============================================

const THAI_DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

export function getUnpaidDateItems(
  loan: Loan,
  payments: Payment[],
  asOfDate?: Date
): UnpaidDateItem[] {
  if (!loan || loan.status !== "active") return [];

  const today = asOfDate ?? todayLocal();
  const loanStart = parseLocalDate(loan.loan_date);
  const freq = loan.payment_frequency ?? "daily";

  const activePayments = payments.filter(
    (p) => p.loan_id === loan.id && p.status === "active"
  );
  const totalInterestPaid = activePayments.reduce(
    (sum, p) => sum + (p.interest_paid ?? 0), 0
  );

  const netInterest = Math.max(0, loan.interest_per_period - (loan.guarantee_deduction ?? 0));
  const periodsPaidCount = netInterest > 0 ? Math.floor(totalInterestPaid / netInterest) : 0;

  const items: UnpaidDateItem[] = [];
  let currentIndex = 1;
  let currentDate = new Date(loanStart.getFullYear(), loanStart.getMonth(), loanStart.getDate());

  while (true) {
    if (freq === "daily") {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (freq === "weekly") {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (freq === "monthly") {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const itemDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const isPast = itemDate.getTime() < today.getTime();
    const isToday = itemDate.getTime() === today.getTime();

    if (currentIndex > periodsPaidCount) {
      const y = itemDate.getFullYear();
      const m = (itemDate.getMonth() + 1).toString().padStart(2, "0");
      const d = itemDate.getDate().toString().padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      items.push({
        periodIndex: currentIndex,
        dateStr,
        displayDate: formatThaiDate(dateStr),
        dayName: THAI_DAY_NAMES[itemDate.getDay()],
        interestAmount: netInterest,
        isOverdue: isPast,
        isToday: isToday,
      });
    }

    currentIndex++;

    if (itemDate.getTime() >= today.getTime()) {
      // If debtor is up to date, provide 3 upcoming future dates
      if (items.length === 0) {
        for (let next = 0; next < 3; next++) {
          if (freq === "daily") currentDate.setDate(currentDate.getDate() + 1);
          else if (freq === "weekly") currentDate.setDate(currentDate.getDate() + 7);
          else if (freq === "monthly") currentDate.setMonth(currentDate.getMonth() + 1);

          const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
          const ny = nextDate.getFullYear();
          const nm = (nextDate.getMonth() + 1).toString().padStart(2, "0");
          const nd = nextDate.getDate().toString().padStart(2, "0");
          const nextDateStr = `${ny}-${nm}-${nd}`;

          items.push({
            periodIndex: currentIndex++,
            dateStr: nextDateStr,
            displayDate: formatThaiDate(nextDateStr),
            dayName: THAI_DAY_NAMES[nextDate.getDay()],
            interestAmount: netInterest,
            isOverdue: false,
            isToday: false,
          });
        }
      }
      break;
    }

    if (currentIndex > 365) break;
  }

  return items;
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
