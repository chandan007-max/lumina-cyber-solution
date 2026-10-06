import React, { useState } from 'react';
import {
  KanbanSquare,
  List,
  Search,
  Filter,
  Printer,
  CreditCard,
  RotateCcw,
  ArrowRight,
  Clock,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { Customer, JobItem, JobStatus, ServiceCategory } from '../../types';
import { MessagePreviewModal } from '../communication/MessagePreviewModal';

interface JobBoardViewProps {
  jobs: JobItem[];
  customers: Customer[];
  onUpdateJobStatus: (jobId: string, status: JobStatus) => void;
  onOpenNewJob: () => void;
  onRepeatJob: (job: JobItem) => void;
  onPrintJobToken: (job: JobItem) => void;
  onCollectJobPayment: (job: JobItem) => void;
}

const COLUMNS: { id: JobStatus; title: string; color: string; dotColor: string }[] = [
  { id: 'received', title: 'Received', color: 'border-slate-300 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60', dotColor: 'bg-slate-400' },
  { id: 'designing', title: 'Designing', color: 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30', dotColor: 'bg-indigo-500' },
  { id: 'printing', title: 'Printing', color: 'border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/40 dark:bg-cyan-950/30', dotColor: 'bg-cyan-500' },
  { id: 'ready', title: 'Ready for Delivery', color: 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30', dotColor: 'bg-emerald-500' },
  { id: 'delivered', title: 'Delivered', color: 'border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40', dotColor: 'bg-slate-500' },
];

export const JobBoardView: React.FC<JobBoardViewProps> = ({
  jobs,
  customers,
  onUpdateJobStatus,
  onOpenNewJob,
  onRepeatJob,
  onPrintJobToken,
  onCollectJobPayment,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJobForComm, setSelectedJobForComm] = useState<JobItem | null>(null);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);

  const filteredJobs = jobs.filter((j) => {
    const q = searchQuery.toLowerCase();
    const matchQ =
      !q ||
      j.id.toLowerCase().includes(q) ||
      j.customerName.toLowerCase().includes(q) ||
      j.customerPhone.includes(q) ||
      j.serviceName.toLowerCase().includes(q);

    const matchCat = categoryFilter === 'all' || j.serviceCategory === categoryFilter;
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;

    return matchQ && matchCat && matchStatus;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top action & filter bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KanbanSquare className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table List</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by customer, phone, Job #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none w-56 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Categories</option>
            <option value="Printing">Printing & Flex</option>
            <option value="RestaurantServices">Restaurant Services</option>
            <option value="Cards">Cards & PVC</option>
            <option value="PhotoDesign">Photo & Design</option>
            <option value="DocumentServices">Document & Cyber</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Active Jobs: <span className="font-bold text-slate-900 dark:text-white">{filteredJobs.length}</span>
          </div>

          <button
            onClick={onOpenNewJob}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>+ New Job</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {viewMode === 'kanban' ? (
          /* Kanban Board Columns */
          <div className="flex items-start gap-4 h-full min-w-max pb-4">
            {COLUMNS.map((col) => {
              const columnJobs = filteredJobs.filter((j) => j.status === col.id);
              return (
                <div
                  key={col.id}
                  className={`w-80 flex flex-col max-h-full rounded-xl border ${col.color} shadow-2xs overflow-hidden`}
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`}></span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                        {col.title}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full tabular-nums">
                      {columnJobs.length}
                    </span>
                  </div>

                  {/* Column Card List */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                    {columnJobs.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                        No jobs in {col.title.toLowerCase()}
                      </div>
                    ) : (
                      columnJobs.map((job) => (
                        <div
                          key={job.id}
                          className="bg-white dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all space-y-2.5 group text-slate-900 dark:text-slate-100"
                        >
                          {/* Card Top: Job ID, Priority & Menu */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                {job.id}
                              </span>
                              {job.priority !== 'normal' && (
                                <span
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    job.priority === 'express'
                                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  }`}
                                >
                                  {job.priority}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {new Date(job.createdAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* Customer & Service */}
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                              <span className="truncate">{job.customerName}</span>
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0 ml-1">
                                {job.customerPhone}
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 mt-0.5">
                              {job.serviceName}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                              {job.customSpecsSummary}
                            </div>
                          </div>

                          {/* Promised delivery deadline if any */}
                          {job.deliveryDeadline && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                Ready by: {new Date(job.deliveryDeadline).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}

                          {/* Financials: Total, Advance, Balance */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">Total / Bal</div>
                              <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                                ₹{job.totalAmount}
                                {job.balanceDue > 0 ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-bold ml-1">
                                    (Due ₹{job.balanceDue})
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-medium ml-1">
                                    ✓ Paid
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status Advancement Button */}
                            <div className="flex items-center gap-1">
                              {col.id === 'received' && (
                                <button
                                  onClick={() => onUpdateJobStatus(job.id, 'designing')}
                                  title="Move to Designing"
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>To Design</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                              {col.id === 'designing' && (
                                <button
                                  onClick={() => onUpdateJobStatus(job.id, 'printing')}
                                  title="Move to Printing"
                                  className="px-2 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>To Print</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                              {col.id === 'printing' && (
                                <button
                                  onClick={() => onUpdateJobStatus(job.id, 'ready')}
                                  title="Mark Ready for Pickup"
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Mark Ready</span>
                                </button>
                              )}
                              {col.id === 'ready' && (
                                <button
                                  onClick={() => onUpdateJobStatus(job.id, 'delivered')}
                                  title="Confirm Delivery & Close"
                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>Deliver</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick Card Tooling Bar */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onPrintJobToken(job)}
                                title="Print Job Receipt Token"
                                className="hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Token</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedJobForComm(job);
                                  setIsCommModalOpen(true);
                                }}
                                title="Notify customer via WhatsApp or Email"
                                className="hover:text-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Notify</span>
                              </button>

                              {job.balanceDue > 0 && (
                                <button
                                  onClick={() => onCollectJobPayment(job)}
                                  title="Collect Balance Due"
                                  className="hover:text-rose-600 text-rose-600 font-semibold flex items-center gap-0.5 cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Collect</span>
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => onRepeatJob(job)}
                              title="Clone and Repeat this order for the customer"
                              className="text-slate-500 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer text-[10px] font-semibold"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Repeat Job</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table List View */
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Service & Specifications</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Advance</th>
                  <th className="py-2.5 px-3 text-right">Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-300">
                      {job.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{job.customerName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{job.customerPhone}</div>
                    </td>
                    <td className="py-2.5 px-3 max-w-md">
                      <div className="font-medium text-slate-900 dark:text-white">{job.serviceName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {job.customSpecsSummary}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                      ₹{job.totalAmount}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                      ₹{job.advancePaid}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {job.balanceDue > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">₹{job.balanceDue}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-medium">₹0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <select
                        value={job.status}
                        onChange={(e) => onUpdateJobStatus(job.id, e.target.value as JobStatus)}
                        className="text-[11px] font-bold uppercase px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        <option value="received">Received</option>
                        <option value="designing">Designing</option>
                        <option value="printing">Printing</option>
                        <option value="ready">Ready</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => onPrintJobToken(job)}
                        title="Print Token Slip"
                        className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 inline" />
                      </button>
                      <button
                        onClick={() => onRepeatJob(job)}
                        title="Repeat this job"
                        className="p-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 inline" />
                      </button>
                      {job.balanceDue > 0 && (
                        <button
                          onClick={() => onCollectJobPayment(job)}
                          className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold rounded text-[10px] cursor-pointer"
                        >
                          Collect Due
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedJobForComm && (
        <MessagePreviewModal
          isOpen={isCommModalOpen}
          onClose={() => {
            setIsCommModalOpen(false);
            setSelectedJobForComm(null);
          }}
          initialChannel="WHATSAPP"
          initialType={
            selectedJobForComm.status === 'ready'
              ? 'JOB_READY'
              : selectedJobForComm.status === 'received'
              ? 'JOB_RECEIVED'
              : 'JOB_IN_PROGRESS'
          }
          job={selectedJobForComm}
        />
      )}
    </div>
  );
};
