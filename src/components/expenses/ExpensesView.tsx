import React, { useState } from 'react';
import { ArrowDownCircle, Plus, Search, Calendar, DollarSign, Tag, CreditCard, Boxes } from 'lucide-react';
import { ExpenseItem, MaterialItem, PaymentMethod } from '../../types';
import { AddExpenseModal } from './AddExpenseModal';

interface ExpensesViewProps {
  expenses: ExpenseItem[];
  materials?: MaterialItem[];
  onAddExpense: (expense: ExpenseItem) => void;
  onUpdateStock?: (materialId: string, delta: number) => void;
  onAddMaterial?: (material: MaterialItem) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  materials = [],
  onAddExpense,
  onUpdateStock = () => {},
  onAddMaterial,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchQ =
      !q ||
      e.title.toLowerCase().includes(q) ||
      (e.paidTo && e.paidTo.toLowerCase().includes(q)) ||
      (e.materialName && e.materialName.toLowerCase().includes(q));
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    return matchQ && matchCat;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            Shop Expenses & Outflows Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log electricity, raw materials, internet, machine servicing & maintenance
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Total Logged</div>
            <div className="text-base font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
              ₹{totalExpenses.toLocaleString('en-IN')}
            </div>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-rose-300 dark:text-white" />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search expenses or materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none w-64 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Expense Categories</option>
            <option value="Paper & Media">Paper & Media</option>
            <option value="Inks & Toners">Inks & Toners</option>
            <option value="Raw Material & Stock">Raw Material & Stock</option>
            <option value="Electricity">Electricity</option>
            <option value="Internet & Cyber">Internet & Cyber</option>
            <option value="Machine Maintenance">Machine Maintenance</option>
            <option value="Tea & Snacks">Tea & Snacks</option>
            <option value="Rent">Rent</option>
            <option value="Outsourcing">Outsourcing</option>
            <option value="Staff Salary">Staff Salary</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{filteredExpenses.length}</span> entries
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-2.5 px-4">Date</th>
              <th className="py-2.5 px-3">Expense Title / Description</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Paid To</th>
              <th className="py-2.5 px-3">Mode</th>
              <th className="py-2.5 px-4 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredExpenses.map((exp, idx) => (
              <tr key={`exp-row-${exp.id || 'exp'}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{exp.date}</td>
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{exp.title}</span>
                    {exp.materialName && exp.restockQuantity && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                        <Boxes className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>+{exp.restockQuantity} Restocked</span>
                      </span>
                    )}
                  </div>
                  {exp.notes && (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">{exp.notes}</div>
                  )}
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                    {exp.category}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{exp.paidTo || '—'}</td>
                <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">{exp.paymentMethod}</td>
                <td className="py-3 px-4 text-right font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                  ₹{exp.amount.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal with Material & Stock Auto-Restock */}
      <AddExpenseModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        materials={materials}
        onAddExpense={onAddExpense}
        onUpdateStock={onUpdateStock}
        onAddMaterial={onAddMaterial}
      />
    </div>
  );
};
