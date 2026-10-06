import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  History,
  FileCheck,
  ChevronRight,
  User,
} from 'lucide-react';
import { Customer, Invoice, JobItem, PaymentMethod, StaffUser } from '../../types';
import { StorageService } from '../../services/storage';

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  jobs: JobItem[];
  invoices?: Invoice[];
  currentStaff: StaffUser;
  preSelectedCustomerId?: string;
  preSelectedJobId?: string;
  onPaymentRecorded: (
    job?: JobItem,
    customer?: Customer,
    shouldPrint?: boolean,
    receiptInvoice?: Invoice
  ) => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  onClose,
  customers,
  jobs,
  invoices,
  currentStaff,
  preSelectedCustomerId,
  preSelectedJobId,
  onPaymentRecorded,
}) => {
  const [activeTab, setActiveTab] = useState<'collect' | 'history'>('collect');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [note, setNote] = useState('Due payment received at counter');
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    amount: number;
    receiptId: string;
    invoice: Invoice;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const initializedRef = useRef(false);

  // Sync state whenever modal opens or explicit pre-selection changes
  useEffect(() => {
    if (isOpen) {
      if (!initializedRef.current) {
        initializedRef.current = true;
        setFormError(null);
        setSuccessInfo(null);
        setIsSubmitting(false);
        setActiveTab('collect');

        if (preSelectedJobId) {
          setSelectedJobId(preSelectedJobId);
          const j = jobs.find((x) => x.id === preSelectedJobId);
          if (j) {
            setSelectedCustomerId(j.customerId);
            setAmount(j.balanceDue > 0 ? j.balanceDue.toString() : '');
            return;
          }
        }

        if (preSelectedCustomerId) {
          setSelectedCustomerId(preSelectedCustomerId);
          setSelectedJobId('');
          const c = customers.find((x) => x.id === preSelectedCustomerId);
          if (c) {
            setAmount(c.totalDueAmount > 0 ? c.totalDueAmount.toString() : '');
          }
          return;
        }

        // If neither pre-selected, but customers with dues exist, pick first customer with due
        const custWithDue = customers.find((c) => c.totalDueAmount > 0);
        if (custWithDue) {
          setSelectedCustomerId(custWithDue.id);
          setSelectedJobId('');
          setAmount(custWithDue.totalDueAmount.toString());
        } else if (customers.length > 0) {
          setSelectedCustomerId(customers[0].id);
          setSelectedJobId('');
          setAmount(customers[0].totalDueAmount > 0 ? customers[0].totalDueAmount.toString() : '');
        } else {
          setSelectedCustomerId('');
          setSelectedJobId('');
          setAmount('');
        }
      }
    } else {
      initializedRef.current = false;
    }
  }, [isOpen, preSelectedCustomerId, preSelectedJobId]);

  // Load recorded invoices / payment receipts
  const allInvoices = useMemo(() => {
    return invoices && invoices.length > 0 ? invoices : StorageService.getInvoices();
  }, [invoices, isOpen, successInfo]);

  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const customerPendingJobs = useMemo(() => {
    return jobs.filter(
      (j) =>
        (!selectedCustomerId || j.customerId === selectedCustomerId) &&
        j.balanceDue > 0
    );
  }, [jobs, selectedCustomerId]);

  const activeJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId);
  }, [jobs, selectedJobId]);

  // Customer's recorded receipts
  const customerRecordedReceipts = useMemo(() => {
    if (!selectedCustomerId) return [];
    return allInvoices.filter(
      (inv) =>
        inv.customer.id === selectedCustomerId ||
        (activeCustomer?.phone && inv.customer.phone === activeCustomer.phone)
    );
  }, [allInvoices, selectedCustomerId, activeCustomer]);

  if (!isOpen) return null;

  const handleCustomerChange = (cId: string) => {
    setSelectedCustomerId(cId);
    setSelectedJobId('');
    setFormError(null);
    setSuccessInfo(null);
    const c = customers.find((x) => x.id === cId);
    if (c) {
      setAmount(c.totalDueAmount > 0 ? c.totalDueAmount.toString() : '');
    }
  };

  const handleJobChange = (jId: string) => {
    setSelectedJobId(jId);
    setFormError(null);
    setSuccessInfo(null);
    if (jId) {
      const j = jobs.find((x) => x.id === jId);
      if (j) {
        setAmount(j.balanceDue > 0 ? j.balanceDue.toString() : '');
        if (!selectedCustomerId) {
          setSelectedCustomerId(j.customerId);
        }
      }
    } else {
      if (activeCustomer) {
        setAmount(activeCustomer.totalDueAmount > 0 ? activeCustomer.totalDueAmount.toString() : '');
      }
    }
  };

  const handleSave = async (shouldPrint: boolean) => {
    setFormError(null);
    setSuccessInfo(null);

    if (!selectedCustomerId) {
      setFormError('Please select a customer.');
      return;
    }

    const payNum = parseFloat(amount);
    if (!payNum || isNaN(payNum) || payNum <= 0) {
      setFormError('Please enter a valid payment amount greater than ₹0.');
      const amountInput = document.getElementById('collect-payment-amount-input');
      if (amountInput) amountInput.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const staffName = currentStaff?.name || StorageService.getCurrentStaff()?.name || 'Sumit';
      let updatedJob: JobItem | undefined;

      if (selectedJobId) {
        updatedJob = StorageService.addJobPayment(
          selectedJobId,
          payNum,
          method,
          note,
          staffName
        );
      } else if (selectedCustomerId) {
        // Allocate payment to customer's oldest pending jobs
        let remaining = payNum;
        for (const j of customerPendingJobs) {
          if (remaining <= 0) break;
          const toPay = Math.min(remaining, j.balanceDue);
          updatedJob = StorageService.addJobPayment(
            j.id,
            toPay,
            method,
            `Bulk due payment: ${note || 'Settlement'}`,
            staffName
          );
          remaining -= toPay;
        }

        // If amount remaining beyond pending jobs (or customer had pure ledger due), record against customer balance
        if (remaining > 0 || customerPendingJobs.length === 0) {
          StorageService.recordCustomerPayment(
            selectedCustomerId,
            remaining > 0 ? remaining : payNum,
            method,
            note,
            staffName
          );
        }
      }

      const updatedCustomer = selectedCustomerId
        ? StorageService.getCustomerById(selectedCustomerId)
        : undefined;

      // Calculate accurate remaining balance
      const previousTotalDue = activeJob
        ? activeJob.balanceDue
        : (activeCustomer?.totalDueAmount || 0);
      const remainingBalance = Math.max(0, previousTotalDue - payNum);

      // Create verified Money Receipt / Payment Voucher
      const receiptInvoice: Invoice = {
        id: StorageService.generateNextInvoiceId(),
        date: new Date().toISOString(),
        type: 'quick',
        customer: {
          id: updatedCustomer?.id || selectedCustomerId,
          name: updatedCustomer?.name || activeCustomer?.name || 'Valued Customer',
          phone: updatedCustomer?.phone || activeCustomer?.phone || '9800000000',
          address: updatedCustomer?.address || activeCustomer?.address,
        },
        items: [
          {
            description: selectedJobId
              ? `Due Payment Settlement - Job Order #${selectedJobId}`
              : `Customer Account Due Clearance / Settlement`,
            category: 'Other',
            details: `Received via ${method}. ${note ? `Ref: ${note}` : ''}`,
            qty: 1,
            unit: 'payment',
            unitPrice: payNum,
            total: payNum,
          },
        ],
        subtotal: payNum,
        discount: 0,
        tax: 0,
        total: payNum,
        paid: payNum,
        balance: remainingBalance,
        paymentMethod: method,
        notes: note || `Payment of ₹${payNum} received by ${staffName}`,
        staff: staffName,
      };

      StorageService.addInvoice(receiptInvoice);

      // Trigger global state sync
      onPaymentRecorded(updatedJob, updatedCustomer, shouldPrint, receiptInvoice);

      if (shouldPrint) {
        onClose();
      } else {
        setSuccessInfo({
          amount: payNum,
          receiptId: receiptInvoice.id,
          invoice: receiptInvoice,
        });
        // Clear amount field so duplicate payment isn't accidentally clicked
        setAmount('');
      }
    } catch (err: any) {
      console.error('Failed to collect payment:', err);
      setFormError(err?.message || 'Failed to save payment. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const customersList = showAllCustomers
    ? customers
    : customers.filter((c) => c.totalDueAmount > 0 || c.id === selectedCustomerId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-2xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Collect Customer Due Payment</h3>
                {activeCustomer && (
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono font-bold">
                    Due: ₹{activeCustomer.totalDueAmount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                Settle outstanding balances, log audit history & generate printed payment receipts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg font-medium">
            <button
              onClick={() => setActiveTab('collect')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'collect'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Collect Payment</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Recorded Slips ({customerRecordedReceipts.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAllCustomers}
                onChange={(e) => setShowAllCustomers(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span>Show all clients</span>
            </label>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Success Banner if payment was just recorded */}
          {successInfo && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2 text-emerald-900 dark:text-emerald-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Payment Recorded Successfully!</span>
                </div>
                <span className="font-mono font-bold text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">
                  Slip #{successInfo.receiptId}
                </span>
              </div>
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                Amount: <strong className="font-bold">₹{successInfo.amount}</strong> received via{' '}
                <strong>{method}</strong>. Balance has been settled and updated in customer accounts.
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onPaymentRecorded(undefined, activeCustomer, true, successInfo.invoice);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg flex items-center gap-1.5 text-xs shadow-2xs cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>Print Slip Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer"
                >
                  View in Recorded Slips
                </button>
              </div>
            </div>
          )}

          {activeTab === 'collect' ? (
            <>
              {/* Customer picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 dark:text-slate-200 font-bold">
                    Select Customer <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  {activeCustomer && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Phone: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{activeCustomer.phone}</span>
                    </span>
                  )}
                </div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-900 dark:text-slate-100 focus:border-indigo-500"
                >
                  {[
                    <option key="empty-customer-option" value="">-- Choose Customer --</option>,
                    ...customersList.map((c, idx) => (
                      <option key={`due-cust-opt-${c.id || 'cust'}-${idx}`} value={c.id}>
                        {c.name} {c.businessName ? `(${c.businessName})` : ''} — Due: ₹
                        {c.totalDueAmount.toLocaleString('en-IN')} {c.totalDueAmount === 0 ? '(Clear)' : ''}
                      </option>
                    )),
                  ]}
                </select>
              </div>

              {/* Pending Job Link (Optional) */}
              {customerPendingJobs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-600 dark:text-slate-300 font-semibold">
                      Link to Specific Job Order (Optional)
                    </label>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      {customerPendingJobs.length} active pending jobs
                    </span>
                  </div>
                  <select
                    value={selectedJobId}
                    onChange={(e) => handleJobChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-900 dark:text-slate-100 focus:border-indigo-500"
                  >
                    {[
                      <option key="all-jobs-option" value="">Apply across all pending dues (recommended)</option>,
                      ...customerPendingJobs.map((j, idx) => (
                        <option key={`due-job-opt-${j.id || 'job'}-${idx}`} value={j.id}>
                          {j.id} · {j.serviceName} ({j.customSpecsSummary}) — Due: ₹{j.balanceDue}
                        </option>
                      )),
                    ]}
                  </select>
                </div>
              )}

              {/* Amount to collect */}
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-bold mb-1">
                  Amount to Collect (₹) <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    id="collect-payment-amount-input"
                    type="number"
                    min="1"
                    placeholder="e.g. 1500"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className={`w-full pl-8 pr-3 py-2 text-base font-extrabold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border rounded-lg outline-none tabular-nums transition-colors ${
                      formError && (!amount || parseFloat(amount) <= 0)
                        ? 'border-rose-400 ring-2 ring-rose-100 dark:ring-rose-950 focus:border-rose-500'
                        : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {activeCustomer && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between font-medium">
                    <span>Outstanding Due Balance:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      ₹{activeCustomer.totalDueAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Cash', 'UPI', 'Card', 'Bank Transfer'] as PaymentMethod[]).map((m) => (
                    <button
                      key={`pay-method-opt-${m}`}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                        method === m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      {m === 'Cash' && <Banknote className="w-3.5 h-3.5 text-emerald-400" />}
                      {m === 'UPI' && <Smartphone className="w-3.5 h-3.5 text-cyan-400" />}
                      {m === 'Card' && <CreditCard className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Remarks / Transaction Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google Pay Ref #98762 or Counter Cash settlement"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </>
          ) : (
            /* Tab 2: Recorded Payments & Slips */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white">
                  Payment Slips for {activeCustomer?.name || 'Selected Client'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {customerRecordedReceipts.length} recorded slips
                </div>
              </div>

              {customerRecordedReceipts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-1">
                  <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p>No recorded payment receipts found for this customer yet.</p>
                  <p className="text-[11px]">Save a payment from the "Collect Payment" tab to generate a slip.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerRecordedReceipts.map((inv, idx) => (
                    <div
                      key={`receipt-slip-row-${inv.id || 'inv'}-${idx}`}
                      className="p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            {inv.id}
                          </span>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-800">
                            Paid via {inv.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                          {inv.items.map((i) => i.description).join(' · ')}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{new Date(inv.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span>·</span>
                          <span>Staff: {inv.staff || 'Sumit'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1.5">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                          ₹{inv.paid}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onPaymentRecorded(undefined, activeCustomer, true, inv);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Printer className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Print Slip</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Error Banner */}
        {formError && (
          <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-t border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-2 shrink-0">
          <div>
            {successInfo ? (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved & Synced</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Staff: <span className="font-semibold text-slate-600 dark:text-slate-300">{currentStaff?.name || 'Sumit (Owner)'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              {successInfo ? 'Close' : 'Cancel'}
            </button>

            {activeTab === 'collect' && (
              <>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-60 rounded-lg shadow-2xs cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Payment'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5 text-amber-300" />
                      <span>Save & Print Slip</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
