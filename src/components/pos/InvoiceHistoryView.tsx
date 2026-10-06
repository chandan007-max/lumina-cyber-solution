import React, { useState } from 'react';
import { Search, Printer, Receipt, FileText, ArrowUpDown, Calendar, Zap, Briefcase, MessageSquare } from 'lucide-react';
import { Invoice } from '../../types';
import { MessagePreviewModal } from '../communication/MessagePreviewModal';

interface InvoiceHistoryViewProps {
  invoices: Invoice[];
  onPrintInvoice: (invoice: Invoice) => void;
  onOpenQuickBill: () => void;
}

export const InvoiceHistoryView: React.FC<InvoiceHistoryViewProps> = ({
  invoices,
  onPrintInvoice,
  onOpenQuickBill,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'quick' | 'job'>('all');
  const [selectedInvForComm, setSelectedInvForComm] = useState<Invoice | null>(null);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const matchQ =
      !q ||
      inv.id.toLowerCase().includes(q) ||
      inv.customer.name.toLowerCase().includes(q) ||
      inv.customer.phone.includes(q) ||
      inv.items.some((it) => it.description.toLowerCase().includes(q));

    const matchType = typeFilter === 'all' || inv.type === typeFilter;
    return matchQ && matchType;
  });

  const totalBilled = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalCollected = filteredInvoices.reduce((sum, inv) => sum + inv.paid, 0);
  const totalPending = filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header & Stats Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Invoice & Billing Register
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Complete record of walk-in quick bills & full job invoices
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Total Billed</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
              ₹{totalBilled.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-3">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Collected</div>
            <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
              ₹{totalCollected.toLocaleString('en-IN')}
            </div>
          </div>
          {totalPending > 0 && (
            <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-3">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Due Balance</div>
              <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                ₹{totalPending.toLocaleString('en-IN')}
              </div>
            </div>
          )}
          <button
            onClick={onOpenQuickBill}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer ml-2"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>+ Quick Bill</span>
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
              placeholder="Search invoice #, customer, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none w-64 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-850 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Invoices
            </button>
            <button
              onClick={() => setTypeFilter('quick')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                typeFilter === 'quick'
                  ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Quick Bills</span>
            </button>
            <button
              onClick={() => setTypeFilter('job')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                typeFilter === 'job'
                  ? 'bg-white dark:bg-slate-700 text-indigo-800 dark:text-indigo-300 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Job Bills</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-900 dark:text-slate-100">{filteredInvoices.length}</span> records
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Invoice No</th>
              <th className="py-2.5 px-3">Date & Time</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Items Summary</th>
              <th className="py-2.5 px-3 text-right">Total</th>
              <th className="py-2.5 px-3 text-right">Paid</th>
              <th className="py-2.5 px-3 text-right">Balance</th>
              <th className="py-2.5 px-3 text-center">Mode</th>
              <th className="py-2.5 px-3 text-right">Print</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  No invoices found matching criteria.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv, idx) => (
                <tr key={`inv-row-${inv.id || 'inv'}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-300">
                    <div className="flex items-center gap-1.5">
                      {inv.type === 'quick' ? (
                        <span className="p-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                          <Zap className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="p-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800">
                          <Briefcase className="w-3 h-3" />
                        </span>
                      )}
                      <span>{inv.id}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                    {new Date(inv.date).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{inv.customer.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{inv.customer.phone}</div>
                  </td>
                  <td className="py-2.5 px-3 max-w-sm truncate text-slate-600 dark:text-slate-300">
                    {inv.items.map((i) => `${i.description} (${i.qty})`).join(', ')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                    ₹{inv.total}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    ₹{inv.paid}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {inv.balance > 0 ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400">₹{inv.balance}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">₹0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {inv.paymentMethod}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onPrintInvoice(inv)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Printer className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                        <span>Print</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedInvForComm(inv);
                          setIsCommModalOpen(true);
                        }}
                        title="Send Invoice via WhatsApp or Email"
                        className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Share</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedInvForComm && (
        <MessagePreviewModal
          isOpen={isCommModalOpen}
          onClose={() => {
            setIsCommModalOpen(false);
            setSelectedInvForComm(null);
          }}
          initialChannel="WHATSAPP"
          initialType="INVOICE"
          invoice={selectedInvForComm}
        />
      )}
    </div>
  );
};
