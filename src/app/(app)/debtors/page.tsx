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
  const { debtors, loans, payments, lenders } = useAppStore();
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectedLenderId, setSelectedLenderId] = useState<string>("all");
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
        if (selectedLenderId === "all") return true;
        const activeLoan = loans.find((l) => l.debtor_id === d.id && l.status === "active")
          ?? loans.filter((l) => l.debtor_id === d.id).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
        
        if (selectedLenderId === "none") {
          return !activeLoan || !activeLoan.lender_id;
        }
        return activeLoan && activeLoan.lender_id === selectedLenderId;
      })
      .filter((d) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          d.full_name.toLowerCase().includes(q) ||
          d.phone.includes(q)
        );
      });
  }, [debtors, loans, search, filterTab, selectedLenderId]);

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

        {/* Lender Filter */}
        <div className="mb-4">
          <label className="text-[10px] text-slate-400 block mb-1 font-bold">กรองตามผู้ให้กู้ (นายทุน)</label>
          <select
            value={selectedLenderId}
            onChange={(e) => setSelectedLenderId(e.target.value)}
            className="input-field py-2 text-xs bg-slate-50 border border-slate-200/50 text-slate-800 rounded-xl"
          >
            <option value="all" className="bg-dark-800 text-white">-- ผู้ให้กู้ทั้งหมด --</option>
            <option value="none" className="bg-dark-800 text-white">ไม่มีรายชื่อผู้กู้</option>
            {lenders.map((l) => (
              <option key={l.id} value={l.id} className="bg-dark-800 text-white">
                {l.name}
              </option>
            ))}
          </select>
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
                    "glass-card p-3.5 space-y-3 active:scale-[0.98] transition-transform rounded-2xl border border-slate-200/60 relative",
                    isOverdue && "border-red-200 bg-red-50/20"
                  )}>
                    <div className="flex gap-2.5 items-center">
                      <DebtorAvatar debtor={debtor} size="sm" className="border border-slate-100 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-800 text-sm font-semibold truncate leading-tight">{debtor.full_name}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={debtor.status === "active" ? "badge-active" : "badge-closed"}>
                            {debtor.status === "active" ? "กู้อยู่" : "ปิดยอด"}
                          </span>
                          {isOverdue && (
                            <span className="badge-overdue flex-shrink-0 text-[9px] px-1.5 py-0.5">
                              เกิน {overdueInfo!.overduePeriods} วัน
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {loan ? (
                      <div className="pt-2.5 border-t border-slate-100/80 flex justify-between items-center text-xs">
                        <span className="text-slate-400">ค้างต้น</span>
                        <span className="text-slate-700 font-bold">{formatCurrency(loan.remaining_principal)}</span>
                      </div>
                    ) : (
                      <div className="pt-2.5 border-t border-slate-100/80 flex justify-between items-center text-xs">
                        <span className="text-slate-400">เบอร์โทร</span>
                        <span className="text-slate-600 font-semibold">{formatPhone(debtor.phone)}</span>
                      </div>
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
                      <p className="text-slate-800 text-sm font-semibold truncate">{debtor.full_name}</p>
                      {debtor.status === "closed" ? (
                        <span className="badge-closed flex-shrink-0 text-[10px] px-2 py-0.5">ปิดยอดแล้ว</span>
                      ) : (
                        isOverdue && (
                          <span className="badge-overdue flex-shrink-0 text-[10px] px-2 py-0.5">
                            เกินกำหนด {overdueInfo!.overduePeriods} วัน
                          </span>
                        )
                      )}
                    </div>
                    {loan ? (
                      <p className="text-slate-500 text-xs mt-0.5">
                        ต้น {formatCurrency(loan.remaining_principal)} | ดอก {formatCurrency(loan.interest_per_period)}
                      </p>
                    ) : (
                      <p className="text-slate-400 text-xs mt-0.5">{formatPhone(debtor.phone)}</p>
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
