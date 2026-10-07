/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Commercial Subscription Lifecycle Engine
 * Phase 14 Commercial Production Readiness
 */

import { getAuthorityDatabase } from '../../server/db';
import { logOperationalAuditEvent } from '../../server/operations';
import { PlanService } from './planService';

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REACTIVATED';

export interface SubscriptionRecord {
  id: string;
  businessId: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  billingInterval: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodEnd: string | null;
  trialEnd: string | null;
  cancelledAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionAccessPolicy {
  canLogin: boolean;
  canAccessPos: boolean;
  canCreateTransactions: boolean;
  canViewReports: boolean;
  canAccessAdmin: boolean;
  canAccessSupport: boolean;
  warningBanner: string | null;
}

export const SUBSCRIPTION_ACCESS_MATRIX: Record<SubscriptionStatus, SubscriptionAccessPolicy> = {
  TRIAL: {
    canLogin: true,
    canAccessPos: true,
    canCreateTransactions: true,
    canViewReports: true,
    canAccessAdmin: true,
    canAccessSupport: true,
    warningBanner: 'Evaluation Trial Active',
  },
  ACTIVE: {
    canLogin: true,
    canAccessPos: true,
    canCreateTransactions: true,
    canViewReports: true,
    canAccessAdmin: true,
    canAccessSupport: true,
    warningBanner: null,
  },
  PAST_DUE: {
    canLogin: true,
    canAccessPos: true,
    canCreateTransactions: false, // Read-only POS
    canViewReports: true,
    canAccessAdmin: true,
    canAccessSupport: true,
    warningBanner: 'Payment past due. Settle outstanding commercial invoice to resume transactions.',
  },
  GRACE_PERIOD: {
    canLogin: true,
    canAccessPos: true,
    canCreateTransactions: true, // Allowed during temporary grace
    canViewReports: true,
    canAccessAdmin: true,
    canAccessSupport: true,
    warningBanner: 'Commercial grace period active. Please renew before grace expiration.',
  },
  SUSPENDED: {
    canLogin: true,
    canAccessPos: false,
    canCreateTransactions: false,
    canViewReports: false,
    canAccessAdmin: true, // Admin can view billing/support
    canAccessSupport: true,
    warningBanner: 'Subscription suspended. Contact support or make payment to reactivate.',
  },
  EXPIRED: {
    canLogin: true,
    canAccessPos: false,
    canCreateTransactions: false,
    canViewReports: false,
    canAccessAdmin: true,
    canAccessSupport: true,
    warningBanner: 'Subscription expired. Please choose a plan to reactivate services.',
  },
  CANCELLED: {
    canLogin: false,
    canAccessPos: false,
    canCreateTransactions: false,
    canViewReports: false,
    canAccessAdmin: false,
    canAccessSupport: true,
    warningBanner: 'Subscription terminated. Account scheduled for offboarding.',
  },
  REACTIVATED: {
    canLogin: true,
    canAccessPos: true,
    canCreateTransactions: true,
    canViewReports: true,
    canAccessAdmin: true,
    canAccessSupport: true,
    warningBanner: 'Subscription successfully restored.',
  },
};

export class SubscriptionService {
  static getAccessPolicy(status: SubscriptionStatus): SubscriptionAccessPolicy {
    return SUBSCRIPTION_ACCESS_MATRIX[status] || SUBSCRIPTION_ACCESS_MATRIX.SUSPENDED;
  }

  static getSubscription(businessId: string): SubscriptionRecord | null {
    const db = getAuthorityDatabase();
    const row = db
      .prepare('SELECT * FROM commercial_subscriptions WHERE business_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(businessId) as any;

    if (!row) return null;
    return {
      id: row.id,
      businessId: row.business_id,
      customerId: row.customer_id,
      planId: row.plan_id,
      status: row.status as SubscriptionStatus,
      billingInterval: row.billing_interval,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      gracePeriodEnd: row.grace_period_end,
      trialEnd: row.trial_end,
      cancelledAt: row.cancelled_at,
      suspendedAt: row.suspended_at,
      suspensionReason: row.suspension_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static createTrialSubscription(params: {
    businessId: string;
    customerId: string;
    planId?: string;
    trialDays?: number;
  }): SubscriptionRecord {
    const db = getAuthorityDatabase();
    const subId = `sub_trial_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const trialDays = params.trialDays || 14;
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const record: SubscriptionRecord = {
      id: subId,
      businessId: params.businessId,
      customerId: params.customerId,
      planId: params.planId || 'plan_trial_14d',
      status: 'TRIAL',
      billingInterval: 'monthly',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: trialEnd.toISOString(),
      gracePeriodEnd: null,
      trialEnd: trialEnd.toISOString(),
      cancelledAt: null,
      suspendedAt: null,
      suspensionReason: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    db.prepare(`
      INSERT INTO commercial_subscriptions (
        id, business_id, customer_id, plan_id, status, billing_interval,
        current_period_start, current_period_end, trial_end, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.businessId,
      record.customerId,
      record.planId,
      record.status,
      record.billingInterval,
      record.currentPeriodStart,
      record.currentPeriodEnd,
      record.trialEnd,
      record.createdAt,
      record.updatedAt
    );

    logOperationalAuditEvent({
      businessId: params.businessId,
      actorId: 'system',
      actorRole: 'SYSTEM',
      action: 'SUBSCRIPTION_TRIAL_STARTED',
      targetResource: `subscription:${subId}`,
      outcome: 'SUCCESS',
      details: { planId: record.planId, trialDays },
    });

    return record;
  }

  static transitionStatus(
    subscriptionId: string,
    newStatus: SubscriptionStatus,
    reason?: string,
    actor: string = 'operator'
  ): SubscriptionRecord {
    const db = getAuthorityDatabase();
    const row = db.prepare('SELECT * FROM commercial_subscriptions WHERE id = ?').get(subscriptionId) as any;
    if (!row) throw new Error(`Subscription ${subscriptionId} not found.`);

    const currentStatus = row.status as SubscriptionStatus;
    const now = new Date().toISOString();

    // Validate legal transitions
    const invalidTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
      CANCELLED: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'GRACE_PERIOD'], // Can only be offboarded
      EXPIRED: ['TRIAL'],
      TRIAL: ['REACTIVATED'],
      ACTIVE: ['TRIAL', 'REACTIVATED'],
      PAST_DUE: ['TRIAL'],
      GRACE_PERIOD: ['TRIAL'],
      SUSPENDED: ['TRIAL'],
      REACTIVATED: ['TRIAL'],
    };

    if (invalidTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Illegal subscription transition from ${currentStatus} to ${newStatus}.`);
    }

    let suspendedAt = row.suspended_at;
    let suspensionReason = row.suspension_reason;
    let cancelledAt = row.cancelled_at;

    if (newStatus === 'SUSPENDED') {
      suspendedAt = now;
      suspensionReason = reason || 'Administrative suspension';
    } else if (newStatus === 'REACTIVATED' || newStatus === 'ACTIVE') {
      suspendedAt = null;
      suspensionReason = null;
    } else if (newStatus === 'CANCELLED') {
      cancelledAt = now;
    }

    db.prepare(`
      UPDATE commercial_subscriptions
      SET status = ?, suspended_at = ?, suspension_reason = ?, cancelled_at = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, suspendedAt, suspensionReason, cancelledAt, now, subscriptionId);

    logOperationalAuditEvent({
      businessId: row.business_id,
      actorId: actor,
      actorRole: 'ADMIN',
      action: `SUBSCRIPTION_TRANSITION_${newStatus}`,
      targetResource: `subscription:${subscriptionId}`,
      outcome: 'SUCCESS',
      details: { fromStatus: currentStatus, toStatus: newStatus, reason },
    });

    return this.getSubscription(row.business_id)!;
  }
}
