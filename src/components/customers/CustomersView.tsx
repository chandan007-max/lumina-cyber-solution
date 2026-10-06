import React, { useState } from 'react';
import {
  Users,
  Search,
  Phone,
  MessageSquare,
  RotateCcw,
  Plus,
  Briefcase,
  ExternalLink,
  Receipt,
  FileSpreadsheet,
  Mail,
} from 'lucide-react';
import { Customer, JobItem } from '../../types';
import { MessagePreviewModal } from '../communication/MessagePreviewModal';

interface CustomersViewProps {
  customers: Customer[];
  jobs: JobItem[];
  onOpenNewJobForCustomer: (customer: Customer) => void;
  onRepeatJob: (job: JobItem) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  jobs,
  onOpenNewJobForCustomer,
  onRepeatJob,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers[0]?.id || ''
  );
  const [commModal, setCommModal] = useState<{
    isOpen: boolean;
    channel: 'WHATSAPP' | 'EMAIL';
  }>({ isOpen: false, channel: 'WHATSAPP' });

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.businessName && c.businessName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) || filteredCustomers[0];

  const customerJobs = selectedCustomer
    ? jobs.filter((j) => j.customerId === selectedCustomer.id)
    : [];

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Left List (5 cols) */}
      <div className="w-80 md:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Customer Accounts ({customers.length})
            </h3>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, hotel, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none w-full text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredCustomers.map((cust, idx) => {
            const isSelected = selectedCustomer?.id === cust.id;
            return (
              <div
                key={`cust-card-${cust.id || 'cust'}-${idx}`}
                onClick={() => setSelectedCustomerId(cust.id)}
                className={`p-3 cursor-pointer transition-colors text-xs ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/60 border-l-4 border-indigo-600'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-850/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{cust.name}</span>
                  {cust.totalDueAmount > 0 && (
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-800">
                      Due: ₹{cust.totalDueAmount}
                    </span>
                  )}
                </div>
                {cust.businessName && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{cust.businessName}</div>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400 mt-1">
                  <span>{cust.phone}</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                    {cust.jobCount} Orders
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Detail Pane (7 cols) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {selectedCustomer ? (
          <>
            {/* Customer Header Profile Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {selectedCustomer.name}
                    </h2>
                    {selectedCustomer.businessName && (
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 font-semibold px-2 py-0.5 rounded text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {selectedCustomer.businessName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-200">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedCustomer.phone}
                    </span>
                    {selectedCustomer.email && <span>· {selectedCustomer.email}</span>}
                    {selectedCustomer.address && <span>· {selectedCustomer.address}</span>}
                    {selectedCustomer.gstin && (
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        · GSTIN: {selectedCustomer.gstin}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCommModal({ isOpen: true, channel: 'WHATSAPP' })}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setCommModal({ isOpen: true, channel: 'EMAIL' })}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Email</span>
                  </button>

                  <button
                    onClick={() => onOpenNewJobForCustomer(selectedCustomer)}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    <span>+ New Job Order</span>
                  </button>
                </div>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Total Order Volume
                  </div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                    ₹{selectedCustomer.totalOrdersAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-emerald-50/50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/60">
                  <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                    Total Paid
                  </div>
                  <div className="text-base font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums mt-0.5">
                    ₹{selectedCustomer.totalPaidAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-rose-50/50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-100 dark:border-rose-800/60">
                  <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">
                    Pending Due Balance
                  </div>
                  <div className="text-base font-extrabold text-rose-700 dark:text-rose-400 tabular-nums mt-0.5">
                    ₹{selectedCustomer.totalDueAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Jobs & Repeat Order Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Job History & Quick Re-Orders
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click "Repeat Job" to automatically pre-fill identical specifications & print rates
                  </p>
                </div>
              </div>

              {customerJobs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No previous job orders logged for this client yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {customerJobs.map((j, idx) => (
                    <div
                      key={`cust-job-${j.id || 'job'}-${idx}`}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            {j.id}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{j.serviceName}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                            ({j.status})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          {j.customSpecsSummary}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Ordered: {new Date(j.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                            ₹{j.totalAmount}
                          </div>
                          {j.balanceDue > 0 && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                              Due: ₹{j.balanceDue}
                            </div>
                          )}
                        </div>

                        {/* Repeat Order Action */}
                        <button
                          onClick={() => onRepeatJob(j)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:border-indigo-400 font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Repeat Job</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-20 text-center text-xs text-slate-400">
            Select a customer from the left list to review history and orders.
          </div>
        )}
      </div>

      {selectedCustomer && (
        <MessagePreviewModal
          isOpen={commModal.isOpen}
          onClose={() => setCommModal((prev) => ({ ...prev, isOpen: false }))}
          initialChannel={commModal.channel}
          initialType="GENERAL_MESSAGE"
          customer={selectedCustomer}
        />
      )}
    </div>
  );
};
