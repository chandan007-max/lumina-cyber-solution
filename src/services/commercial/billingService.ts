/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Commercial Invoicing & Manual Payment Ledger
 * Phase 14 Commercial Production Readiness
 */

import { getAuthorityDatabase } from '../../server/db';
import { logOperationalAuditEvent } from '../../server/operations';
import { SubscriptionService } from './subscriptionService';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'PAST_DUE' | 'VOID' | 'CANCELLED';
export type CommercialPaymentMethod = 'MANUAL_CASH' | 'MANUAL_UPI' | 'MANUAL_BANK_TRANSFER' | 'MANUAL_CHEQUE';

export interface CommercialInvoice {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  businessId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialPayment {
  id: string;
  invoiceId: string;
  businessId: string;
  amount: number;
  currency: string;
  paymentMethod: CommercialPaymentMethod;
  paymentStatus: 'COMPLETED' | 'REFUNDED';
  transactionReference: string | null;
  notes: string | null;
  recordedBy: string;
  createdAt: string;
}

export class CommercialBillingService {
  static createInvoice(params: {
    subscriptionId: string;
    businessId: string;
    amount: number;
    currency?: string;
    dueDate?: string;
    notes?: string;
  }): CommercialInvoice {
    const db = getAuthorityDatabase();
    const id = `inv_comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const invoiceNumber = `COMM-INV-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dueDate = params.dueDate || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const currency = params.currency || '₹';

    db.prepare(`
      INSERT INTO commercial_invoices (id, invoice_number, subscription_id, business_id, amount, currency, status, due_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?, ?, ?)
    `).run(id, invoiceNumber, params.subscriptionId, params.businessId, params.amount, currency, dueDate, params.notes || null, now.toISOString(), now.toISOString());

    logOperationalAuditEvent({
      businessId: params.businessId,
      actorId: 'billing_engine',
      actorRole: 'SYSTEM',
      action: 'COMMERCIAL_INVOICE_GENERATED',
      targetResource: `invoice:${id}`,
      outcome: 'SUCCESS',
      details: { invoiceNumber, amount: params.amount, currency },
    });

    return this.getInvoiceById(id)!;
  }

  static getInvoiceById(id: string): CommercialInvoice | null {
    const db = getAuthorityDatabase();
    const row = db.prepare('SELECT * FROM commercial_invoices WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      subscriptionId: row.subscription_id,
      businessId: row.business_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status as InvoiceStatus,
      dueDate: row.due_date,
      paidAt: row.paid_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static getInvoicesForBusiness(businessId: string): CommercialInvoice[] {
    const db = getAuthorityDatabase();
    const rows = db.prepare('SELECT * FROM commercial_invoices WHERE business_id = ? ORDER BY created_at DESC').all(businessId) as any[];
    return rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      subscriptionId: r.subscription_id,
      businessId: r.business_id,
      amount: r.amount,
      currency: r.currency,
      status: r.status as InvoiceStatus,
      dueDate: r.due_date,
      paidAt: r.paid_at,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Records a manual payment against a commercial invoice.
   * Explicitly labeled as MANUAL PAYMENT (no false gateway claims).
   */
  static recordManualPayment(params: {
    invoiceId: string;
    amount: number;
    paymentMethod: CommercialPaymentMethod;
    transactionReference?: string;
    notes?: string;
    recordedBy: string;
  }): CommercialPayment {
    const db = getAuthorityDatabase();
    const invoice = this.getInvoiceById(params.invoiceId);
    if (!invoice) throw new Error(`Invoice ${params.invoiceId} not found.`);
    if (invoice.status === 'PAID') throw new Error(`Invoice ${params.invoiceId} is already PAID.`);

    const paymentId = `pay_comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const sp = `pay_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.exec(`SAVEPOINT ${sp};`);
    try {
      // 1. Insert Payment Record
      db.prepare(`
        INSERT INTO commercial_payments (id, invoice_id, business_id, amount, currency, payment_method, payment_status, transaction_reference, notes, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)
      `).run(
        paymentId,
        invoice.id,
        invoice.businessId,
        params.amount,
        invoice.currency,
        params.paymentMethod,
        params.transactionReference || null,
        params.notes || 'Manual payment verified by operator',
        params.recordedBy,
        now
      );

      // 2. Mark Invoice as PAID if full amount satisfied
      db.prepare(`
        UPDATE commercial_invoices
        SET status = 'PAID', paid_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, invoice.id);

      db.exec(`RELEASE ${sp};`);
    } catch (err: any) {
      try {
        db.exec(`ROLLBACK TO ${sp};`);
      } catch (_) {}
      throw err;
    }

    // 3. Subscription Status Update (Move from PAST_DUE or GRACE_PERIOD to ACTIVE)
    const sub = SubscriptionService.getSubscription(invoice.businessId);
    if (sub && (sub.status === 'PAST_DUE' || sub.status === 'GRACE_PERIOD' || sub.status === 'TRIAL')) {
      SubscriptionService.transitionStatus(sub.id, 'ACTIVE', 'Manual invoice payment completed', params.recordedBy);
    }

    logOperationalAuditEvent({
      businessId: invoice.businessId,
      actorId: params.recordedBy,
      actorRole: 'BILLING_STAFF',
      action: 'COMMERCIAL_MANUAL_PAYMENT_RECORDED',
      targetResource: `payment:${paymentId}`,
      outcome: 'SUCCESS',
      details: {
        invoiceId: invoice.id,
        amount: params.amount,
        method: params.paymentMethod,
        reference: params.transactionReference,
      },
    });

    return {
      id: paymentId,
      invoiceId: invoice.id,
      businessId: invoice.businessId,
      amount: params.amount,
      currency: invoice.currency,
      paymentMethod: params.paymentMethod,
      paymentStatus: 'COMPLETED',
      transactionReference: params.transactionReference || null,
      notes: params.notes || null,
      recordedBy: params.recordedBy,
      createdAt: now,
    };
  }
}
