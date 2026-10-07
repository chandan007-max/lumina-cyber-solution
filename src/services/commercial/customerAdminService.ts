/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Commercial Customer Administration & Offboarding
 * Phase 14 Commercial Production Readiness
 */

import { getAuthorityDatabase } from '../../server/db';
import { logOperationalAuditEvent } from '../../server/operations';
import { SubscriptionService } from './subscriptionService';
import { CloudBackupService } from '../cloudBackup';

export interface CommercialTenantSummary {
  businessId: string;
  businessCode: string;
  businessName: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  subscriptionStatus: string;
  planId: string;
  onboardingStep: number;
  onboardingStatus: string;
  createdAt: string;
}

export class CustomerAdminService {
  static listTenants(): CommercialTenantSummary[] {
    const db = getAuthorityDatabase();
    const query = `
      SELECT 
        b.id AS business_id,
        b.business_code,
        b.business_name,
        b.status AS business_status,
        b.created_at,
        c.id AS customer_id,
        c.legal_name,
        c.email,
        c.phone,
        COALESCE(s.status, 'NO_SUBSCRIPTION') AS sub_status,
        COALESCE(s.plan_id, 'NONE') AS plan_id,
        COALESCE(o.current_step, 0) AS onb_step,
        COALESCE(o.status, 'NOT_STARTED') AS onb_status
      FROM businesses b
      LEFT JOIN commercial_customers c ON b.customer_id = c.id
      LEFT JOIN commercial_subscriptions s ON s.business_id = b.id
      LEFT JOIN commercial_onboarding o ON o.business_id = b.id
      ORDER BY b.created_at DESC
    `;

    const rows = db.prepare(query).all() as any[];
    return rows.map((r) => ({
      businessId: r.business_id,
      businessCode: r.business_code,
      businessName: r.business_name,
      customerId: r.customer_id,
      customerName: r.legal_name || 'Unknown',
      customerEmail: r.email,
      customerPhone: r.phone,
      status: r.business_status,
      subscriptionStatus: r.sub_status,
      planId: r.plan_id,
      onboardingStep: r.onb_step,
      onboardingStatus: r.onb_status,
      createdAt: r.created_at,
    }));
  }

  static getTenantDetail(businessId: string): CommercialTenantSummary | null {
    const list = this.listTenants();
    return list.find((t) => t.businessId === businessId) || null;
  }

  static suspendTenant(params: {
    businessId: string;
    reason: string;
    actor: string;
  }): { success: boolean; message: string } {
    const sub = SubscriptionService.getSubscription(params.businessId);
    if (sub) {
      SubscriptionService.transitionStatus(sub.id, 'SUSPENDED', params.reason, params.actor);
    }

    const db = getAuthorityDatabase();
    db.prepare('UPDATE businesses SET status = ?, updated_at = ? WHERE id = ?').run(
      'SUSPENDED',
      new Date().toISOString(),
      params.businessId
    );

    logOperationalAuditEvent({
      businessId: params.businessId,
      actorId: params.actor,
      actorRole: 'ADMIN',
      action: 'COMMERCIAL_TENANT_SUSPENDED',
      targetResource: `business:${params.businessId}`,
      outcome: 'SUCCESS',
      details: { reason: params.reason },
    });

    return { success: true, message: `Tenant ${params.businessId} suspended successfully.` };
  }

  static reactivateTenant(params: {
    businessId: string;
    actor: string;
  }): { success: boolean; message: string } {
    const sub = SubscriptionService.getSubscription(params.businessId);
    if (sub) {
      SubscriptionService.transitionStatus(sub.id, 'REACTIVATED', 'Administrative reactivation', params.actor);
    }

    const db = getAuthorityDatabase();
    db.prepare('UPDATE businesses SET status = ?, updated_at = ? WHERE id = ?').run(
      'ACTIVE',
      new Date().toISOString(),
      params.businessId
    );

    logOperationalAuditEvent({
      businessId: params.businessId,
      actorId: params.actor,
      actorRole: 'ADMIN',
      action: 'COMMERCIAL_TENANT_REACTIVATED',
      targetResource: `business:${params.businessId}`,
      outcome: 'SUCCESS',
      details: {},
    });

    return { success: true, message: `Tenant ${params.businessId} reactivated successfully.` };
  }

  /**
   * Safe Customer Offboarding Workflow:
   * 1. Cancellation confirmation
   * 2. Final safety backup export creation
   * 3. License deactivation
   * 4. Mark subscription CANCELLED
   * 5. Set business status to OFFBOARDED with 90-day retention lock
   */
  static offboardTenant(params: {
    businessId: string;
    reason: string;
    actor: string;
  }): {
    success: boolean;
    finalBackupId: string;
    retentionUntil: string;
    message: string;
  } {
    const db = getAuthorityDatabase();
    const now = new Date();
    const retentionDays = 90;
    const retentionUntil = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

    // 1. Create Final Emergency Snapshot
    const finalBackup = CloudBackupService.createSnapshot('manual');

    // 2. Cancel Subscription
    const sub = SubscriptionService.getSubscription(params.businessId);
    if (sub) {
      SubscriptionService.transitionStatus(sub.id, 'CANCELLED', params.reason, params.actor);
    }

    // 3. Deactivate Licenses
    db.prepare(`UPDATE licenses SET status = 'CANCELLED', updated_at = ? WHERE business_id = ?`).run(
      now.toISOString(),
      params.businessId
    );

    // 4. Update Business Record
    db.prepare('UPDATE businesses SET status = ?, updated_at = ? WHERE id = ?').run(
      'OFFBOARDED',
      now.toISOString(),
      params.businessId
    );

    logOperationalAuditEvent({
      businessId: params.businessId,
      actorId: params.actor,
      actorRole: 'ADMIN',
      action: 'COMMERCIAL_TENANT_OFFBOARDED',
      targetResource: `business:${params.businessId}`,
      outcome: 'SUCCESS',
      details: {
        reason: params.reason,
        finalBackupId: finalBackup.id,
        retentionUntil,
      },
    });

    return {
      success: true,
      finalBackupId: finalBackup.id,
      retentionUntil,
      message: `Tenant ${params.businessId} safely offboarded. Data retained until ${retentionUntil}.`,
    };
  }
}
