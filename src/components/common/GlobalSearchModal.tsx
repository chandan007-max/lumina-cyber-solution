import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Briefcase, Receipt, ArrowRight, Phone } from 'lucide-react';
import { Customer, Invoice, JobItem } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  jobs: JobItem[];
  invoices: Invoice[];
  onSelectJob: (job: JobItem) => void;
  onSelectCustomer: (customer: Customer) => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  customers,
  jobs,
  invoices,
  onSelectJob,
  onSelectCustomer,
  onSelectInvoice,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cleanQ = query.trim().toLowerCase();

  const filteredCustomers = cleanQ
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(cleanQ) ||
          c.phone.includes(cleanQ) ||
          (c.businessName && c.businessName.toLowerCase().includes(cleanQ))
      ).slice(0, 4)
    : [];

  const filteredJobs = cleanQ
    ? jobs.filter(
        (j) =>
          j.id.toLowerCase().includes(cleanQ) ||
          j.customerName.toLowerCase().includes(cleanQ) ||
          j.serviceName.toLowerCase().includes(cleanQ) ||
          j.customerPhone.includes(cleanQ)
      ).slice(0, 4)
    : [];

  const filteredInvoices = cleanQ
    ? invoices.filter(
        (inv) =>
          inv.id.toLowerCase().includes(cleanQ) ||
          inv.customer.name.toLowerCase().includes(cleanQ) ||
          inv.customer.phone.includes(cleanQ)
      ).slice(0, 4)
    : [];

  const totalResults =
    filteredCustomers.length + filteredJobs.length + filteredInvoices.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 px-4">
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type customer name, mobile (e.g. 9800099934), Job # (NP...), or Invoice #..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
            className="w-full text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {cleanQ.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Search anything across your business: Customers, Phones, Jobs, Invoices.
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  F1 Quick Bill
                </span>
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  F2 New Job
                </span>
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  ESC Close
                </span>
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching customer, job, or invoice found for "{query}".
            </div>
          ) : (
            <>
              {/* Jobs section */}
              {filteredJobs.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    Jobs ({filteredJobs.length})
                  </div>
                  <div className="space-y-1">
                    {filteredJobs.map((j) => (
                      <button
                        key={j.id}
                        onClick={() => {
                          onSelectJob(j);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors text-left cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                              {j.id}
                            </span>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {j.customerName}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">· {j.serviceName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {j.customSpecsSummary}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              ₹{j.totalAmount.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                              {j.status}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers section */}
              {filteredCustomers.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    Customers ({filteredCustomers.length})
                  </div>
                  <div className="space-y-1">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectCustomer(c);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors text-left cursor-pointer group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {c.name}
                            </span>
                            {c.businessName && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                ({c.businessName})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>{c.phone}</span>
                            {c.address && <span>· {c.address}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div>
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                              {c.jobCount} Orders
                            </div>
                            {c.totalDueAmount > 0 && (
                              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                Due: ₹{c.totalDueAmount.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices section */}
              {filteredInvoices.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-amber-500" />
                    Invoices ({filteredInvoices.length})
                  </div>
                  <div className="space-y-1">
                    {filteredInvoices.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => {
                          onSelectInvoice(inv);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors text-left cursor-pointer group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              {inv.id}
                            </span>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {inv.customer.name}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              ({inv.type === 'quick' ? 'Quick POS' : 'Job Invoice'})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {inv.items.map((i) => i.description).join(', ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              ₹{inv.total.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              {new Date(inv.date).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Use ⌕ search anytime with F3</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
            ESC to close
          </kbd>
        </div>
      </div>
    </div>
  );
};
