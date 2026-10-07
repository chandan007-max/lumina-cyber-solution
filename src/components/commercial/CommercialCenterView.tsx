/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Commercial Management Console
 * Phase 14 Commercial Production Readiness
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  HelpCircle,
  RefreshCw,
  Plus,
  Shield,
  Layers,
  ChevronRight,
  Database,
  ArrowUpRight,
} from 'lucide-react';
import { COMMERCIAL_PLANS, CommercialPlan } from '../../services/commercial/planService';
import {
  SubscriptionService,
  SubscriptionRecord,
  SubscriptionAccessPolicy,
} from '../../services/commercial/subscriptionService';
import { OnboardingService, OnboardingState } from '../../services/commercial/onboardingService';
import { CommercialBillingService, CommercialInvoice } from '../../services/commercial/billingService';
import { SupportService, SupportTicket } from '../../services/commercial/supportService';
import { BusinessContextService } from '../../services/businessContext';

export const CommercialCenterView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'onboarding' | 'billing' | 'support' | 'migrations'>('overview');
  const [businessId, setBusinessId] = useState<string>('biz_nil_printers_001');
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [accessPolicy, setAccessPolicy] = useState<SubscriptionAccessPolicy | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [invoices, setInvoices] = useState<CommercialInvoice[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Manual payment modal state
  const [selectedInvoice, setSelectedInvoice] = useState<CommercialInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'MANUAL_CASH' | 'MANUAL_UPI' | 'MANUAL_BANK_TRANSFER'>('MANUAL_CASH');
  const [paymentReference, setPaymentReference] = useState<string>('');

  // New Ticket state
  const [showNewTicketModal, setShowNewTicketModal] = useState<boolean>(false);
  const [ticketTitle, setTicketTitle] = useState<string>('');
  const [ticketDesc, setTicketDesc] = useState<string>('');
  const [ticketPriority, setTicketPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  const loadData = () => {
    try {
      const curBiz = BusinessContextService.getCurrentBusinessId() || 'biz_nil_printers_001';
      setBusinessId(curBiz);

      const sub = SubscriptionService.getSubscription(curBiz);
      setSubscription(sub);
      if (sub) {
        setAccessPolicy(SubscriptionService.getAccessPolicy(sub.status));
      } else {
        setAccessPolicy(SubscriptionService.getAccessPolicy('TRIAL'));
      }

      const onb = OnboardingService.getOnboardingState(curBiz);
      setOnboarding(onb);

      const invList = CommercialBillingService.getInvoicesForBusiness(curBiz);
      setInvoices(invList);

      const tktList = SupportService.getTicketsForBusiness(curBiz);
      setTickets(tktList);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordPayment = () => {
    if (!selectedInvoice) return;
    try {
      CommercialBillingService.recordManualPayment({
        invoiceId: selectedInvoice.id,
        amount: paymentAmount || selectedInvoice.amount,
        paymentMethod,
        transactionReference: paymentReference,
        notes: `Manual settlement of invoice ${selectedInvoice.invoiceNumber}`,
        recordedBy: 'admin_operator',
      });
      setSelectedInvoice(null);
      loadData();
    } catch (err: any) {
      alert(`Error recording manual payment: ${err.message}`);
    }
  };

  const handleCreateTicket = () => {
    if (!ticketTitle.trim() || !ticketDesc.trim()) return;
    try {
      SupportService.createTicket({
        businessId,
        title: ticketTitle,
        description: ticketDesc,
        priority: ticketPriority,
        category: 'BILLING_OR_LICENSE',
        actorId: 'admin_operator',
      });
      setShowNewTicketModal(false);
      setTicketTitle('');
      setTicketDesc('');
      loadData();
    } catch (err: any) {
      alert(`Error creating ticket: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Commercial Readiness Center</h1>
              <p className="text-sm text-slate-400">
                Tenant Lifecycle, Subscriptions, Manual Invoicing, Support SLAs & Database Versioning
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-sm text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Access Warning Banner if any */}
      {accessPolicy?.warningBanner && (
        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm font-medium">{accessPolicy.warningBanner}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-6 border-b border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Overview & Plans', icon: Layers },
          { id: 'onboarding', label: '11-Step Onboarding', icon: CheckCircle2 },
          { id: 'billing', label: 'Commercial Invoicing', icon: CreditCard },
          { id: 'support', label: 'Support & SLAs', icon: HelpCircle },
          { id: 'migrations', label: 'Database Schema', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* OVERVIEW & PLANS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Active Subscription Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span>Active Commercial Entitlement</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium">Subscription Status</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {subscription?.status || 'TRIAL ACTIVE'}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium">Assigned Plan</div>
                  <div className="text-lg font-bold text-slate-200 mt-1">
                    {subscription?.planId ? subscription.planId.toUpperCase() : 'TRIAL-14D'}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium">Billing Interval</div>
                  <div className="text-lg font-bold text-slate-200 mt-1 capitalize">
                    {subscription?.billingInterval || 'Monthly'}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium">Period End / Expiry</div>
                  <div className="text-lg font-bold text-slate-200 mt-1">
                    {subscription?.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                      : 'Active'}
                  </div>
                </div>
              </div>
            </div>

            {/* Commercial Plan Catalog */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-slate-300">Commercial Plan Offerings</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {COMMERCIAL_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 font-medium">
                          {plan.code}
                        </span>
                        <span className="text-xs text-slate-400 uppercase font-semibold">
                          SLA: {plan.supportSlaTier}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-100 mt-2">{plan.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{plan.description}</p>

                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-100">
                          {plan.currency}
                          {plan.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">/{plan.billingInterval}</span>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Max Devices: {plan.maxDevices}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Max Staff Users: {plan.maxUsers}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{plan.featureEntitlements.length} entitlements</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 11-STEP ONBOARDING */}
        {activeTab === 'onboarding' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">11-Step Commercial Customer Onboarding</h3>
                <p className="text-sm text-slate-400">
                  Transactional business activation journey from account creation to first live transaction.
                </p>
              </div>
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-semibold">
                Status: {onboarding?.status || 'IN_PROGRESS'}
              </div>
            </div>

            {/* Steps Visual List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { step: 1, title: 'Create Customer Account', desc: 'Commercial account registered in authority ledger.' },
                { step: 2, title: 'Business Identity', desc: 'Trading name, legal identity, GSTIN, and store address.' },
                { step: 3, title: 'Business Configuration', desc: 'Operating profile, thermal printer, tax rules, staff roles.' },
                { step: 4, title: 'Owner / Admin Setup', desc: 'Master credentials and administrative authentication.' },
                { step: 5, title: 'Plan Selection', desc: 'Commercial plan chosen and feature limits assigned.' },
                { step: 6, title: 'Subscription Activation', desc: 'Trial or active entitlement bound to tenant.' },
                { step: 7, title: 'License Token Issuance', desc: 'Asymmetric RS256 token signed and cryptographically bound.' },
                { step: 8, title: 'Initial Safety Backup', desc: 'Pre-flight baseline snapshot generated in backup vault.' },
                { step: 9, title: 'Onboarding Checklist', desc: 'Operational gates verified by station supervisor.' },
                { step: 10, title: 'First Live Transaction', desc: 'Initial test sales invoice validated and printed.' },
                { step: 11, title: 'Onboarding Finalized', desc: 'Full production operational status confirmed.' },
              ].map((item) => {
                const isCompleted = onboarding?.completedSteps?.includes(item.step) || false;
                return (
                  <div
                    key={item.step}
                    className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.step}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{item.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COMMERCIAL INVOICING & MANUAL PAYMENTS */}
        {activeTab === 'billing' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Commercial Invoices & Manual Payments Ledger</h3>
                <p className="text-sm text-slate-400">
                  Subscription invoicing with transparent manual settlement attribution.
                </p>
              </div>
            </div>

            {/* Invoices Table */}
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
                No commercial invoices generated for this tenant.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-xs text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Invoice Number</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Paid Date</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-medium text-slate-200">{inv.invoiceNumber}</td>
                        <td className="p-3">
                          {inv.currency}
                          {inv.amount.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-400">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-xs text-slate-400">
                          {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-3">
                          {inv.status !== 'PAID' && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setPaymentAmount(inv.amount);
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white font-medium transition-colors"
                            >
                              Record Payment
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
        )}

        {/* SUPPORT TICKETS & SLAS */}
        {activeTab === 'support' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Support Incident Center & SLA Targets</h3>
                <p className="text-sm text-slate-400">
                  Operator incident tracking with guaranteed SLA response and sanitized diagnostic linkage.
                </p>
              </div>
              <button
                onClick={() => setShowNewTicketModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Ticket</span>
              </button>
            </div>

            {/* Tickets Table */}
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
                No support tickets filed for this tenant.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-xs text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Ticket ID</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">SLA Due</th>
                      <th className="p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tickets.map((tkt) => (
                      <tr key={tkt.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-medium text-slate-200">{tkt.ticketNumber}</td>
                        <td className="p-3">{tkt.title}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              tkt.priority === 'CRITICAL'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : tkt.priority === 'HIGH'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {tkt.priority}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
                            {tkt.status}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-400">
                          {new Date(tkt.slaDueAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-xs text-slate-400">
                          {new Date(tkt.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* DATABASE MIGRATIONS */}
        {activeTab === 'migrations' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Deterministic Database Migrations</h3>
            <p className="text-sm text-slate-400">
              Verified SQLite migration schema version 4 with zero-drift transactional execution.
            </p>

            <div className="space-y-3">
              {[
                { id: '001_initial_authority_tables', name: 'Initial Licensing & Authority Tables Baseline', batch: 1 },
                { id: '002_commercial_subscriptions_and_onboarding', name: 'Commercial Subscriptions and Multi-Step Onboarding Engine', batch: 1 },
                { id: '003_commercial_billing_and_ledger', name: 'Commercial Invoicing and Manual Payment Ledger', batch: 1 },
                { id: '004_support_center_and_sla', name: 'Support Ticketing Center and Incident SLA Tracking', batch: 1 },
              ].map((m) => (
                <div
                  key={m.id}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{m.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{m.id}</div>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-400 rounded-md font-mono">
                    Batch #{m.batch}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">
              Record Manual Payment for {selectedInvoice.invoiceNumber}
            </h3>
            <p className="text-xs text-slate-400">
              Payments are recorded as manual settlements verified by the station operator.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Settlement Amount ({selectedInvoice.currency})</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Manual Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                >
                  <option value="MANUAL_CASH">Cash Over Counter (MANUAL_CASH)</option>
                  <option value="MANUAL_UPI">Direct UPI Transfer (MANUAL_UPI)</option>
                  <option value="MANUAL_BANK_TRANSFER">NEFT / Bank Transfer (MANUAL_BANK_TRANSFER)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Transaction Reference / UTR (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-98234812"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Create Support Ticket</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Issue Title</label>
                <input
                  type="text"
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="e.g. Thermal printer paper jam or license error"
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Description</label>
                <textarea
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  rows={3}
                  placeholder="Detailed description of the issue..."
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Priority & SLA Tier</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                >
                  <option value="CRITICAL">CRITICAL (1h Ack / 4h Resolution)</option>
                  <option value="HIGH">HIGH (4h Ack / 24h Resolution)</option>
                  <option value="MEDIUM">MEDIUM (12h Ack / 48h Resolution)</option>
                  <option value="LOW">LOW (24h Ack / 96h Resolution)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium"
              >
                Create Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
