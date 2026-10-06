import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  DollarSign,
  Briefcase,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Users,
  Zap,
  PlusCircle,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Clock,
  Printer,
  Boxes,
  Receipt,
} from 'lucide-react';
import { Customer, Invoice, JobItem, JobStatus, MaterialItem } from '../../types';

interface DashboardViewProps {
  jobs: JobItem[];
  customers: Customer[];
  invoices: Invoice[];
  materials: MaterialItem[];
  onOpenQuickBill: () => void;
  onOpenNewJob: () => void;
  onOpenCollectPayment: () => void;
  onOpenAddExpense?: () => void;
  onSelectJob: (job: JobItem) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  jobs,
  customers,
  invoices,
  materials,
  onOpenQuickBill,
  onOpenNewJob,
  onOpenCollectPayment,
  onOpenAddExpense,
  onSelectJob,
  onNavigateToTab,
}) => {
  // Today's date calculations
  const todayStr = new Date().toISOString().split('T')[0];

  const todayInvoices = invoices.filter((i) => i.date.startsWith(todayStr));
  const todayJobs = jobs.filter((j) => j.createdAt.startsWith(todayStr));

  const todaySales =
    todayInvoices.reduce((sum, inv) => sum + inv.paid, 0) +
    todayJobs.reduce((sum, j) => sum + j.advancePaid, 0);

  const pendingJobs = jobs.filter((j) => j.status !== 'delivered' && j.status !== 'ready');
  const readyJobs = jobs.filter((j) => j.status === 'ready');
  const totalDueAmount = customers.reduce((sum, c) => sum + c.totalDueAmount, 0);
  const lowStockItems = materials.filter((m) => m.currentStock <= m.minStockLevel);

  // Current Month Daily Sales Revenue Calculation for Recharts
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthName = now.toLocaleString('en-US', { month: 'long' });

  const dailySalesData = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const datePrefix = `${currentYear}-${monthStr}-${dayStr}`;

    const dayInvoices = invoices.filter((i) => i.date && i.date.startsWith(datePrefix));
    const dayJobs = jobs.filter((j) => j.createdAt && j.createdAt.startsWith(datePrefix));

    const invoiceRevenue = dayInvoices.reduce((sum, inv) => sum + (inv.paid || 0), 0);
    const jobAdvanceRevenue = dayJobs.reduce((sum, j) => sum + (j.advancePaid || 0), 0);
    const totalRevenue = invoiceRevenue + jobAdvanceRevenue;

    return {
      day: `${day} ${now.toLocaleString('en-US', { month: 'short' })}`,
      dayNum: day,
      revenue: totalRevenue,
      invoiceCount: dayInvoices.length,
      jobCount: dayJobs.length,
      isToday: day === currentDay,
      isFuture: day > currentDay,
    };
  });

  const monthTotalRevenue = dailySalesData.reduce((sum, d) => sum + d.revenue, 0);
  const avgDailyRevenue = Math.round(monthTotalRevenue / Math.max(1, currentDay));

  // Quick stat cards
  const statCards = [
    {
      title: "TODAY'S SALES",
      value: `₹${todaySales.toLocaleString('en-IN')}`,
      subtext: `${todayInvoices.length + todayJobs.length} receipts generated`,
      icon: DollarSign,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'PENDING JOBS',
      value: pendingJobs.length.toString(),
      subtext: `${jobs.filter((j) => j.priority === 'urgent' || j.priority === 'express').length} urgent / express`,
      icon: Clock,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      action: () => onNavigateToTab('jobs'),
    },
    {
      title: 'READY JOBS',
      value: readyJobs.length.toString(),
      subtext: 'Awaiting customer pickup',
      icon: CheckCircle,
      color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
      action: () => onNavigateToTab('jobs'),
    },
    {
      title: 'DUE AMOUNT',
      value: `₹${totalDueAmount.toLocaleString('en-IN')}`,
      subtext: `${customers.filter((c) => c.totalDueAmount > 0).length} customers with balance`,
      icon: AlertCircle,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      action: onOpenCollectPayment,
    },
    {
      title: 'TOTAL JOBS LOGGED',
      value: jobs.length.toString(),
      subtext: `${jobs.filter((j) => j.status === 'delivered').length} successfully delivered`,
      icon: ShoppingBag,
      color: 'text-slate-800 bg-slate-100 border-slate-200',
    },
    {
      title: 'ACTIVE CUSTOMERS',
      value: customers.length.toString(),
      subtext: 'Regulars & Digha restaurants',
      icon: Users,
      color: 'text-violet-700 bg-violet-50 border-violet-200',
      action: () => onNavigateToTab('customers'),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Low Stock Warning Banner if any */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-2xs">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">Inventory Low Stock Alert: </span>
              <span className="text-amber-800 dark:text-amber-300">
                {lowStockItems.map((m, idx) => (
                  <span key={`low-stock-${m.id || m.name || idx}`}>
                    {idx > 0 && ' · '}
                    {m.name} ({m.currentStock} {m.unit} left)
                  </span>
                ))}
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('inventory')}
            className="px-3 py-1 bg-amber-200 dark:bg-amber-800/80 hover:bg-amber-300 dark:hover:bg-amber-700 font-bold text-amber-950 dark:text-amber-100 rounded-lg cursor-pointer transition-colors shadow-2xs"
          >
            Review Stock
          </button>
        </div>
      )}

      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={`stat-card-${card.title.replace(/\s+/g, '-').toLowerCase()}-${idx}`}
              onClick={card.action}
              className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/90 shadow-2xs transition-all card-hover ${
                card.action ? 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600' : ''
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div className={`p-1 rounded-md border ${card.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {card.value}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate font-medium">
                {card.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Month Daily Sales Revenue Line Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 lg:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Daily Sales Revenue — {monthName} {currentYear}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track daily cash receipts & advance job deposits across current month
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 font-normal">Month Total: </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm tabular-nums">
                ₹{monthTotalRevenue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hidden sm:block">
              <span className="text-slate-500 dark:text-slate-400 font-normal">Daily Avg: </span>
              <span className="text-slate-900 dark:text-slate-100 font-extrabold tabular-nums">
                ₹{avgDailyRevenue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Recharts Responsive Container */}
        <div className="h-64 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailySalesData}
              margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="dayNum"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                tickFormatter={(val) => (val >= 1000 ? `₹${(val / 1000).toFixed(1)}k` : `₹${val}`)}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1 animate-in fade-in zoom-in-95">
                        <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
                          <span>{data.day} {currentYear}</span>
                          {data.isToday && (
                            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-mono uppercase font-bold">Today</span>
                          )}
                        </div>
                        <div className="text-emerald-400 font-extrabold text-sm tabular-nums">
                          ₹{data.revenue.toLocaleString('en-IN')} Revenue
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          {data.invoiceCount} receipt(s) · {data.jobCount} job booking(s)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#059669"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy) return null;
                  if (payload.isToday) {
                    return (
                      <circle
                        key={`dot-today-${payload.dayNum}`}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    );
                  }
                  return (
                    <circle
                      key={`dot-${payload.dayNum}`}
                      cx={cx}
                      cy={cy}
                      r={3.5}
                      fill={payload.revenue > 0 ? '#059669' : '#cbd5e1'}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 7, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Section: Today's Jobs Queue + Quick Workstation Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Jobs Table (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Live Job Workstation Queue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Jobs currently progressing across Designing, Printing & Delivery
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('jobs')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({jobs.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Service & Specs</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {jobs.slice(0, 6).map((job, idx) => (
                  <tr
                    key={`live-job-${job.id || 'job'}-${idx}`}
                    onClick={() => onSelectJob(job)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                      {job.id}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="truncate max-w-[130px]">{job.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{job.customerPhone}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{job.serviceName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {job.customSpecsSummary}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      ₹{job.totalAmount}
                      {job.balanceDue > 0 && (
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                          Due: ₹{job.balanceDue}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          job.status === 'ready'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : job.status === 'printing'
                            ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300'
                            : job.status === 'designing'
                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                            : job.status === 'delivered'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                        Open Job →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Fast Launchpad & Customer Dues Snapshot (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Action Box */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Operator Fast Triggers
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={onOpenQuickBill}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-200" />
                  <span>Start Quick Bill</span>
                </div>
                <kbd className="font-mono text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded">
                  F1
                </kbd>
              </button>

              <button
                onClick={onOpenNewJob}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-indigo-200" />
                  <span>New Custom Job Order</span>
                </div>
                <kbd className="font-mono text-[10px] bg-indigo-700/80 px-1.5 py-0.5 rounded">
                  F2
                </kbd>
              </button>

              <button
                onClick={onOpenCollectPayment}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Collect Due Payment</span>
                </div>
                <kbd className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">
                  F4
                </kbd>
              </button>

              {/* Add Expense (Auto Material & Stock Restock) */}
              <button
                onClick={onOpenAddExpense}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                title="Log shop expense or purchase raw materials with automatic stock quantity update"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-200" />
                  <div className="text-left">
                    <span>Add Expense</span>
                    <span className="block text-[9.5px] text-amber-100 font-normal">
                      Auto-updates Material Stock
                    </span>
                  </div>
                </div>
                <kbd className="font-mono text-[10px] bg-amber-700/90 px-1.5 py-0.5 rounded text-white font-bold">
                  F5
                </kbd>
              </button>
            </div>
          </div>

          {/* Dues Alert Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Top Outstanding Dues
              </h4>
              <button
                onClick={() => onNavigateToTab('dues')}
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Due Ledger →
              </button>
            </div>

            <div className="space-y-2">
              {customers
                .filter((c) => c.totalDueAmount > 0)
                .slice(0, 3)
                .map((cust, idx) => (
                  <div
                    key={`due-cust-${cust.id || 'cust'}-${idx}`}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-xs border border-slate-100 dark:border-slate-700"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{cust.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{cust.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                        ₹{cust.totalDueAmount.toLocaleString('en-IN')}
                      </div>
                      <button
                        onClick={onOpenCollectPayment}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        Collect Now
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
