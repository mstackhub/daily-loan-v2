"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { getLoanOverdueInfo } from "@/lib/business-logic/interest";
import { formatCurrency, formatPhone, cn } from "@/lib/utils";
import { DebtorAvatar } from "@/components/debtors/DebtorAvatar";
import { AddDebtorSheet } from "@/components/debtors/AddDebtorSheet";
import { Search, Plus, LayoutGrid, List, ChevronRight, Phone } from "lucide-react";
import Link from "next/link";

type FilterTab = "all" | "active" | "unpaid" | "overdue" | "closed";

export default function DebtorsPage() {
  const { debtors, loans, payments, lenders, currentReportDate } = useAppStore();
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectedLenderId, setSelectedLenderId] = useState<string>("all");
  const [isGridView, setIsGridView] = useState(false);
  const [showAddDebtor, setShowAddDebtor] = useState(false);

  const filteredDebtors = useMemo(() => {
    return debtors
      .filter((d) => {
        if (filterTab === "active") return d.status === "active";
        if (filterTab === "closed") return d.status === "closed";
        if (filterTab === "unpaid") {
          if (d.status !== "active") return false;
          const hasPaidToday = payments.some(
            (p) => p.debtor_id === d.id && p.status === "active" && p.payment_date.startsWith(currentReportDate)
          );
          return !hasPaidToday;
        }
        if (filterTab === "overdue") {
          if (d.status !== "active") return false;
          const loan = loans.find((l) => l.debtor_id === d.id && l.status === "active");
          if (!loan) return false;
          const overdueInfo = getLoanOverdueInfo(loan, payments);
          return overdueInfo.isOverdue;
        }
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
  }, [debtors, loans, payments, currentReportDate, search, filterTab, selectedLenderId]);

  const counts = useMemo(() => {
    let unpaidCount = 0;
    let overdueCount = 0;

    debtors.forEach((d) => {
      if (d.status === "active") {
        const loan = loans.find((l) => l.debtor_id === d.id && l.status === "active");
        if (loan) {
          const overdueInfo = getLoanOverdueInfo(loan, payments);
          if (overdueInfo.isOverdue) overdueCount++;

          const hasPaidToday = payments.some(
            (p) => p.debtor_id === d.id && p.status === "active" && p.payment_date.startsWith(currentReportDate)
          );
          if (!hasPaidToday) unpaidCount++;
        }
      }
    });

    return {
      all: debtors.length,
      active: debtors.filter((d) => d.status === "active").length,
      unpaid: unpaidCount,
      overdue: overdueCount,
      closed: debtors.filter((d) => d.status === "closed").length,
    };
  }, [debtors, loans, payments, currentReportDate]);

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
          <label className="text-[10px] text-slate-400 block mb-1.5 font-bold">กรองตามผู้ให้กู้ (นายทุน)</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
            <button
              onClick={() => setSelectedLenderId("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 flex-shrink-0",
                selectedLenderId === "all"
                  ? "bg-violet-600 border-violet-600 text-white-force shadow-sm shadow-violet-500/20"
                  : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100"
              )}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setSelectedLenderId("none")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 flex-shrink-0",
                selectedLenderId === "none"
                  ? "bg-violet-600 border-violet-600 text-white-force shadow-sm shadow-violet-500/20"
                  : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100"
              )}
            >
              ไม่มีรายชื่อผู้กู้
            </button>
            {lenders.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLenderId(l.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 flex-shrink-0",
                  selectedLenderId === l.id
                    ? "bg-violet-600 border-violet-600 text-white-force shadow-sm shadow-violet-500/20"
                    : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100"
                )}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs + View toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex overflow-x-auto no-scrollbar gap-1 flex-1 py-1">
            {(["all", "active", "unpaid", "overdue", "closed"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={cn("tab-btn text-xs whitespace-nowrap px-3 py-1.5", filterTab === tab && "active")}
              >
                {tab === "all"
                  ? `ทั้งหมด (${counts.all})`
                  : tab === "active"
                  ? `กู้อยู่ (${counts.active})`
                  : tab === "unpaid"
                  ? `ค้างชำระ (${counts.unpaid})`
                  : tab === "overdue"
                  ? `เกินกำหนด (${counts.overdue})`
                  : `ปิดยอด (${counts.closed})`}
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
            const activeLoans = loans.filter((l) => l.debtor_id === debtor.id && l.status === "active");
            const loan = getActiveLoan(debtor.id);
            const overdueInfo = loan ? getLoanOverdueInfo(loan, payments) : null;
            const isOverdue = overdueInfo?.isOverdue ?? false;

            const lender = loan && loan.lender_id ? lenders.find((l) => l.id === loan.lender_id) : null;
            const lenderName = lender ? lender.name : "ไม่มีรายชื่อผู้กู้";

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

                    {activeLoans.length > 0 ? (
                      <div className="pt-2.5 border-t border-slate-100/80 space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">ค้างต้นรวม</span>
                          <span className="text-slate-700 font-bold">{formatCurrency(activeLoans.reduce((sum, l) => sum + l.remaining_principal, 0))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">ดอกจริงรวม</span>
                          <span className="text-emerald-600 font-bold">
                            {formatCurrency(activeLoans.reduce((sum, l) => sum + Math.max(0, l.interest_per_period - (l.guarantee_deduction ?? 0)), 0))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">สัญญาค้าง</span>
                          <span className="text-slate-600 font-medium truncate max-w-[80px]">{activeLoans.length} บิล</span>
                        </div>
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

            const activeLoansForThisDebtor = loans.filter((l) => l.debtor_id === debtor.id && l.status === "active");
            const totalRemainingPrincipal = activeLoansForThisDebtor.reduce((sum, l) => sum + l.remaining_principal, 0);

            return (
              <div
                key={debtor.id}
                className={cn(
                  "glass-card-sm flex items-center gap-3 p-3.5 hover:bg-slate-50/50 transition-colors",
                  isOverdue && "border-red-500/30"
                )}
              >
                <Link href={`/debtors/${debtor.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <DebtorAvatar debtor={debtor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                      {lender && (
                        <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded-md text-[9px] font-bold border border-violet-100 flex-shrink-0">
                          ทุน: {lender.name}
                        </span>
                      )}
                    </div>
                    {activeLoansForThisDebtor.length > 0 ? (
                      <p className="text-slate-400 text-xs mt-1">
                        กู้อยู่ <span className="text-slate-700 font-semibold">{activeLoansForThisDebtor.length} บิล</span> | ค้างต้น <span className="text-violet-600 font-bold">{formatCurrency(totalRemainingPrincipal)}</span> | ดอกจริง <span className="text-emerald-600 font-bold">{formatCurrency(activeLoansForThisDebtor.reduce((sum, l) => sum + Math.max(0, l.interest_per_period - (l.guarantee_deduction ?? 0)), 0))}</span>
                      </p>
                    ) : (
                      <p className="text-slate-400 text-xs mt-1">{formatPhone(debtor.phone)}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                </Link>
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
    </div>
  );
}
