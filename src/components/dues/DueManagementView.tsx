import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  AlertCircle,
  Clock,
  Phone,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  TrendingDown,
  Printer,
  History,
  FileCheck,
} from 'lucide-react';
import { Customer, Invoice, JobItem } from '../../types';
import { BusinessConfigService } from '../../services/businessConfig';
import { MessagePreviewModal } from '../communication/MessagePreviewModal';

interface DueManagementViewProps {
  customers: Customer[];
  jobs: JobItem[];
  invoices?: Invoice[];
  onOpenCollectPaymentForCustomer: (customerId: string) => void;
  onOpenCollectPaymentForJob: (job: JobItem) => void;
  onPrintInvoice?: (invoice: Invoice) => void;
}

export const DueManagementView: React.FC<DueManagementViewProps> = ({
  customers,
  jobs,
  invoices = [],
  onOpenCollectPaymentForCustomer,
  onOpenCollectPaymentForJob,
  onPrintInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<'dues' | 'settlements'>('dues');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustForComm, setSelectedCustForComm] = useState<Customer | null>(null);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);

  const customersWithDue = customers.filter((c) => c.totalDueAmount > 0);
  const jobsWithDue = jobs.filter((j) => j.balanceDue > 0);

  const totalReceivable = customers.reduce((sum, c) => sum + c.totalDueAmount, 0);
  
  // Calculate overdue (e.g. jobs created more than 3 days ago with balance)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const overdueJobs = jobsWithDue.filter(
    (j) => new Date(j.createdAt) < threeDaysAgo
  );
  const overdueAmount = overdueJobs.reduce((sum, j) => sum + j.balanceDue, 0);

  const filteredCustomers = customersWithDue.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.businessName && c.businessName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter settled payment receipts / vouchers
  const recordedReceipts = invoices.filter((inv) => {
    const isDueReceipt =
      inv.items.some(
        (it) =>
          it.description.toLowerCase().includes('due payment') ||
          it.description.toLowerCase().includes('settlement') ||
          it.description.toLowerCase().includes('clearance') ||
          (it.category === 'Other' && it.unit === 'payment')
      );

    const q = searchQuery.toLowerCase();
    const match =
      !q ||
      inv.id.toLowerCase().includes(q) ||
      inv.customer.name.toLowerCase().includes(q) ||
      inv.customer.phone.includes(q);

    return isDueReceipt && match;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Due Dashboard KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              TOTAL RECEIVABLES
            </span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
            ₹{totalReceivable.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Across {customersWithDue.length} client accounts & {jobsWithDue.length} active orders
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              AGING OVERDUE (&gt; 3 DAYS)
            </span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
            ₹{overdueAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {overdueJobs.length} orders pending balance settlement
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              COLLECTION RATE
            </span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {totalReceivable === 0
              ? '100%'
              : `${Math.round(
                  (customers.reduce((s, c) => s + c.totalPaidAmount, 0) /
                    (customers.reduce((s, c) => s + c.totalOrdersAmount, 0) || 1)) *
                    100
                )}%`}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Historical payment collection efficiency
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Navigation & Search Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveTab('dues')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'dues'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Outstanding Dues Register ({customersWithDue.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('settlements')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'settlements'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Recorded Payments & Slips ({recordedReceipts.length})</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'dues' ? "Search debtor name or phone..." : "Search receipt #, customer..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none w-64 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {activeTab === 'dues' ? (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Customer Name</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3 text-right">Lifetime Orders</th>
                <th className="py-2.5 px-3 text-right">Lifetime Paid</th>
                <th className="py-2.5 px-3 text-right">Current Due</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    🎉 Fantastic! No pending dues found matching search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => {
                  const customerJobs = jobsWithDue.filter((j) => j.customerId === cust.id);
                  const bConfig = BusinessConfigService.getConfig();
                  const waText = encodeURIComponent(
                    `Namaskar ${cust.name}, this is a gentle reminder from ${bConfig.profile?.displayName || bConfig?.businessName}. Outstanding balance of ₹${cust.totalDueAmount} is pending on your order. Kindly clear via UPI: ${bConfig.payment?.upiId || bConfig?.upiId || ''}. Thank you! - ${bConfig.profile?.ownerName || bConfig?.contactPerson || 'Management'}, ${bConfig.profile?.displayName || bConfig?.businessName}`
                  );

                  return (
                    <tr
                      key={`due-row-${cust.id || 'cust'}-${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div>{cust.name}</div>
                        {cust.businessName && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                            {cust.businessName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-700 dark:text-slate-200">{cust.phone}</div>
                        {cust.address && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-400 truncate max-w-xs">
                            {cust.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-200 tabular-nums">
                        ₹{cust.totalOrdersAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
                        ₹{cust.totalPaidAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-extrabold text-sm text-rose-700 dark:text-rose-400 tabular-nums">
                          ₹{cust.totalDueAmount.toLocaleString('en-IN')}
                        </span>
                        {customerJobs.length > 0 && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-400">
                            across {customerJobs.length} active jobs
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustForComm(cust);
                            setIsCommModalOpen(true);
                          }}
                          title="Send WhatsApp or Email payment reminder"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded font-semibold text-[11px] cursor-pointer transition-colors"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>WhatsApp Reminder</span>
                        </button>

                        <button
                          onClick={() => onOpenCollectPaymentForCustomer(cust.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-2xs text-[11px] cursor-pointer transition-colors"
                        >
                          <CreditCard className="w-3 h-3 text-amber-300" />
                          <span>Collect Payment</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          /* Tab 2: Recorded Settlements & Slips Table */
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Receipt Slip No</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Settlement Description</th>
                <th className="py-2.5 px-3 text-right">Amount Received</th>
                <th className="py-2.5 px-3 text-center">Payment Mode</th>
                <th className="py-2.5 px-4 text-right">Slip Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recordedReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No recorded payment receipts found matching search.
                  </td>
                </tr>
              ) : (
                recordedReceipts.map((inv, idx) => (
                  <tr
                    key={`settlement-row-${inv.id || 'inv'}-${idx}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-300">
                      {inv.id}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {new Date(inv.date).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{inv.customer.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{inv.customer.phone}</div>
                    </td>
                    <td className="py-3 px-3 max-w-xs text-slate-600 dark:text-slate-300">
                      {inv.items.map((i) => i.description).join(' · ')}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">
                      ₹{inv.paid}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {onPrintInvoice && (
                        <button
                          onClick={() => onPrintInvoice(inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
                        >
                          <Printer className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Print Slip</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedCustForComm && (
        <MessagePreviewModal
          isOpen={isCommModalOpen}
          onClose={() => {
            setIsCommModalOpen(false);
            setSelectedCustForComm(null);
          }}
          initialChannel="WHATSAPP"
          initialType="DUE_REMINDER"
          customer={selectedCustForComm}
        />
      )}
    </div>
  );
};
