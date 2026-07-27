"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { formatCurrency, formatPhone, cn } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";
import { AddDebtorSheet } from "@/components/debtors/AddDebtorSheet";
import { PaymentSheet } from "@/components/payments/PaymentSheet";
import { Search, Plus, LayoutGrid, List, ChevronRight, Phone } from "lucide-react";
import Link from "next/link";

type FilterTab = "all" | "active" | "closed";

export default function DebtorsPage() {
  const { debtors, loans, payments } = useAppStore();
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [isGridView, setIsGridView] = useState(false);
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);

  const filteredDebtors = useMemo(() => {
    return debtors
      .filter((d) => {
        if (filterTab === "active") return d.status === "active";
        if (filterTab === "closed") return d.status === "closed";
        return true;
      })
      .filter((d) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          d.full_name.toLowerCase().includes(q) ||
          d.phone.includes(q)
        );
      });
  }, [debtors, loans, search, filterTab]);

  const counts = useMemo(() => ({
    all: debtors.length,
    active: debtors.filter((d) => d.status === "active").length,
    closed: debtors.filter((d) => d.status === "closed").length,
  }), [debtors]);

  function getActiveLoan(debtorId: string) {
    return loans.find((l) => l.debtor_id === debtorId && l.status === "active")
      ?? loans.filter((l) => l.debtor_id === debtorId).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
  }

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="px-4 pt-12 pb-2">
        <h1 className="text-2xl font-bold text-white mb-4">ลูกหนี้</h1>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ หรือเบอร์โทร..."
            className="input-field pl-9 pr-4"
          />
        </div>

        {/* Tabs + View toggle */}
        <div className="flex items-center justify-between">
          <div className="flex">
            {(["all", "active", "closed"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={cn("tab-btn text-sm", filterTab === tab && "active")}
              >
                {tab === "all" ? `ทั้งหมด (${counts.all})` : tab === "active" ? `กู้อยู่ (${counts.active})` : `ปิดยอด (${counts.closed})`}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsGridView(!isGridView)}
            className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            {isGridView ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* List */}
      <div className={cn("px-4 py-3 pb-8", isGridView ? "grid grid-cols-2 gap-3" : "space-y-2")}>
        {filteredDebtors.length === 0 ? (
          <div className="col-span-2 py-16 text-center">
            <p className="text-white/30 text-sm">ไม่พบลูกหนี้</p>
          </div>
        ) : (
          filteredDebtors.map((debtor) => {
            const loan = getActiveLoan(debtor.id);
            const overdueInfo = loan ? getLoanOverdueInfo(loan, payments) : null;
            const isOverdue = overdueInfo?.isOverdue ?? false;

            if (isGridView) {
              return (
                <Link href={`/debtors/${debtor.id}`} key={debtor.id}>
                  <div className={cn(
                    "glass-card p-3 space-y-3 active:scale-[0.98] transition-transform",
                    isOverdue && "border-red-500/30"
                  )}>
                    <div className="flex items-center gap-2">
                      <DebtorAvatar debtor={debtor} size="md" />
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{debtor.full_name}</p>
                        <span className={debtor.status === "active" ? "badge-active" : "badge-closed"}>
                          {debtor.status === "active" ? "กู้อยู่" : "ปิดยอด"}
                        </span>
                      </div>
                    </div>
                    {loan && (
                      <div>
                        <p className="text-white/40 text-xs">ค้างต้น</p>
                        <p className="text-white font-semibold text-sm">{formatCurrency(loan.remaining_principal)}</p>
                      </div>
                    )}
                    {isOverdue && (
                      <span className="badge-overdue">เกิน {overdueInfo!.overduePeriods} วัน</span>
                    )}
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={debtor.id}
                className={cn(
                  "glass-card-sm flex items-center gap-3 p-3",
                  isOverdue && "border-red-500/30"
                )}
              >
                <Link href={`/debtors/${debtor.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <DebtorAvatar debtor={debtor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-semibold truncate">{debtor.full_name}</p>
                      {isOverdue && <span className="badge-overdue flex-shrink-0">เกิน {overdueInfo!.overduePeriods}ว</span>}
                    </div>
                    {loan ? (
                      <p className="text-white/40 text-xs">
                        ต้น {formatCurrency(loan.remaining_principal)} | ดอก {formatCurrency(loan.interest_per_period)}
                      </p>
                    ) : (
                      <p className="text-white/30 text-xs">{formatPhone(debtor.phone)}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                </Link>
                {loan && debtor.status === "active" && (
                  <button
                    onClick={() => setPaymentLoanId(loan.id)}
                    className="flex-shrink-0 px-2.5 py-1.5 bg-gradient-primary text-white text-xs font-semibold rounded-lg active:scale-95 transition-transform shadow-glow-primary"
                  >
                    รับเงิน
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddDebtor(true)}
        className="fixed bottom-[calc(var(--nav-height)+1rem+env(safe-area-inset-bottom,0px))] right-4 z-20
                   w-14 h-14 bg-gradient-primary rounded-2xl shadow-glow-primary
                   flex items-center justify-center text-white
                   transition-transform duration-200 active:scale-95"
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </button>

      {showAddDebtor && <AddDebtorSheet onClose={() => setShowAddDebtor(false)} />}
      {paymentLoanId && <PaymentSheet loanId={paymentLoanId} onClose={() => setPaymentLoanId(null)} />}
    </div>
  );
}
