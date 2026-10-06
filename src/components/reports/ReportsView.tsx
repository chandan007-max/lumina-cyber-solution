import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { Customer, ExpenseItem, Invoice, JobItem, MaterialItem } from '../../types';

interface ReportsViewProps {
  invoices: Invoice[];
  jobs: JobItem[];
  expenses: ExpenseItem[];
  customers: Customer[];
  materials: MaterialItem[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  invoices,
  jobs,
  expenses,
  customers,
  materials,
}) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const filterByDate = (dateStr: string) => {
    if (period === 'all') return true;
    if (period === 'today') return dateStr.startsWith(todayStr);
    const d = new Date(dateStr);
    if (period === 'week') return d >= weekAgo;
    if (period === 'month') return d >= monthAgo;
    return true;
  };

  const periodInvoices = invoices.filter((i) => filterByDate(i.date));
  const periodJobs = jobs.filter((j) => filterByDate(j.createdAt));
  const periodExpenses = expenses.filter((e) => filterByDate(e.date));

  // Calculations
  const invoiceRevenue = periodInvoices.reduce((sum, inv) => sum + inv.paid, 0);
  const jobAdvanceRevenue = periodJobs.reduce((sum, j) => sum + j.advancePaid, 0);
  const totalRevenue = invoiceRevenue + jobAdvanceRevenue;

  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Approximate material consumption cost (~25% of print revenue)
  const estimatedMaterialCost = Math.round(totalRevenue * 0.28);
  const estimatedGrossProfit = totalRevenue - estimatedMaterialCost;
  const estimatedNetProfit = estimatedGrossProfit - totalExpenses;

  // Category breakdown
  const categoryStats: Record<string, number> = {
    Printing: 0,
    RestaurantServices: 0,
    Cards: 0,
    PhotoDesign: 0,
    DocumentServices: 0,
    Other: 0,
  };

  periodJobs.forEach((j) => {
    categoryStats[j.serviceCategory] =
      (categoryStats[j.serviceCategory] || 0) + j.totalAmount;
  });

  periodInvoices.forEach((inv) => {
    inv.items.forEach((it) => {
      categoryStats[it.category] = (categoryStats[it.category] || 0) + it.total;
    });
  });

  // Payment method breakdown
  const paymentStats: Record<string, number> = {
    Cash: 0,
    UPI: 0,
    Card: 0,
    Due: 0,
  };

  periodInvoices.forEach((inv) => {
    paymentStats[inv.paymentMethod] = (paymentStats[inv.paymentMethod] || 0) + inv.paid;
    if (inv.balance > 0) {
      paymentStats['Due'] = (paymentStats['Due'] || 0) + inv.balance;
    }
  });

  periodJobs.forEach((j) => {
    j.paymentHistory.forEach((p) => {
      paymentStats[p.method] = (paymentStats[p.method] || 0) + p.amount;
    });
    if (j.balanceDue > 0) {
      paymentStats['Due'] = (paymentStats['Due'] || 0) + j.balanceDue;
    }
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header & Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Business Reports & Profit Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sales analytics, material cost deductions, and net bottom-line performance
          </p>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as any)}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                period === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Revenue Collected
            </span>
            <div className="p-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-400 tabular-nums">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Cash, UPI & Advance collections
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Est. Material & Media Cost
            </span>
            <div className="p-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-800 dark:text-amber-400 tabular-nums">
            ₹{estimatedMaterialCost.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Flex rolls, ink, paper, boards & pouches
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Operating Expenses
            </span>
            <div className="p-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Electricity, broadband & shop maintenance
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
              ESTIMATED NET PROFIT
            </span>
            <div className="p-1 bg-indigo-600 text-white rounded">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-extrabold tabular-nums ${
              estimatedNetProfit >= 0 ? 'text-indigo-900 dark:text-indigo-300' : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            ₹{estimatedNetProfit.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold mt-1">
            Revenue − Materials − Shop Expenses
          </div>
        </div>
      </div>

      {/* Breakdowns: Service Categories + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Category Performance */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Service-Wise Revenue Distribution
          </h3>

          <div className="space-y-3 text-xs">
            {[
              { label: '🖨 Printing & Flex', key: 'Printing', color: 'bg-indigo-600 dark:bg-indigo-500' },
              { label: '🏪 Restaurant Services', key: 'RestaurantServices', color: 'bg-cyan-500' },
              { label: '💳 PVC & Visiting Cards', key: 'Cards', color: 'bg-amber-500' },
              { label: '📸 Photo & Design', key: 'PhotoDesign', color: 'bg-pink-500' },
              { label: '📄 Document & Cyber Desk', key: 'DocumentServices', color: 'bg-emerald-500' },
            ].map((cat) => {
              const amount = categoryStats[cat.key] || 0;
              const maxVal = Math.max(...Object.values(categoryStats), 1);
              const percentage = Math.round((amount / maxVal) * 100);

              return (
                <div key={cat.key} className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                    <span>{cat.label}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                      ₹{amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${cat.color} rounded-full transition-all duration-300`}
                      style={{ width: `${Math.max(percentage, amount > 0 ? 5 : 0)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Channels Split */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Payment Channel Split
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
              <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Cash at Desk</div>
              <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 tabular-nums mt-1">
                ₹{paymentStats['Cash'].toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-cyan-50/60 dark:bg-cyan-950/40 p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800/80">
              <div className="text-[10px] font-bold text-cyan-800 dark:text-cyan-300 uppercase">UPI Digital Scan</div>
              <div className="text-xl font-extrabold text-cyan-900 dark:text-cyan-200 tabular-nums mt-1">
                ₹{paymentStats['UPI'].toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/80">
              <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">POS Card / Bank</div>
              <div className="text-xl font-extrabold text-amber-900 dark:text-amber-200 tabular-nums mt-1">
                ₹{paymentStats['Card'].toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/40 p-3.5 rounded-xl border border-rose-200 dark:border-rose-800/80">
              <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">Outstanding Dues</div>
              <div className="text-xl font-extrabold text-rose-900 dark:text-rose-200 tabular-nums mt-1">
                ₹{paymentStats['Due'].toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
