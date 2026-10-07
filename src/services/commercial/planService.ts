/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Commercial Plan Registry & Feature Entitlements
 * Phase 14 Commercial Production Readiness
 */

export interface CommercialPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  billingInterval: 'monthly' | 'yearly' | 'lifetime';
  price: number;
  currency: string;
  trialDays: number;
  maxDevices: number;
  maxUsers: number;
  featureEntitlements: string[];
  supportSlaTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  active: boolean;
  version: number;
}

export const COMMERCIAL_PLANS: CommercialPlan[] = [
  {
    id: 'plan_trial_14d',
    code: 'TRIAL-14D',
    name: '14-Day Free Evaluation Trial',
    description: 'Full evaluation trial for single workstation cyber café / print shop',
    billingInterval: 'monthly',
    price: 0,
    currency: '₹',
    trialDays: 14,
    maxDevices: 1,
    maxUsers: 2,
    featureEntitlements: [
      'core_pos',
      'thermal_print',
      'customer_directory',
      'local_backup',
      'standard_reports',
    ],
    supportSlaTier: 'LOW',
    active: true,
    version: 1,
  },
  {
    id: 'plan_starter_monthly',
    code: 'STARTER-M',
    name: 'Starter Cyber Station (Monthly)',
    description: 'Essential billing, printing, and inventory for single counter shops',
    billingInterval: 'monthly',
    price: 999,
    currency: '₹',
    trialDays: 0,
    maxDevices: 1,
    maxUsers: 3,
    featureEntitlements: [
      'core_pos',
      'thermal_print',
      'customer_directory',
      'local_backup',
      'standard_reports',
      'whatsapp_notifications',
      'expense_tracking',
    ],
    supportSlaTier: 'MEDIUM',
    active: true,
    version: 1,
  },
  {
    id: 'plan_professional_monthly',
    code: 'PRO-M',
    name: 'Professional Multi-Counter (Monthly)',
    description: 'Multi-device capability with automated cloud backup and priority SLA',
    billingInterval: 'monthly',
    price: 1999,
    currency: '₹',
    trialDays: 0,
    maxDevices: 3,
    maxUsers: 8,
    featureEntitlements: [
      'core_pos',
      'thermal_print',
      'customer_directory',
      'local_backup',
      'cloud_backup_sync',
      'advanced_analytics',
      'whatsapp_notifications',
      'email_gateway',
      'multi_counter_sync',
      'expense_tracking',
      'priority_support',
    ],
    supportSlaTier: 'HIGH',
    active: true,
    version: 1,
  },
  {
    id: 'plan_enterprise_yearly',
    code: 'ENT-Y',
    name: 'Enterprise Commercial Suite (Annual)',
    description: 'Unlimited volume, 10 devices, dedicated support SLA and compliance audit trail',
    billingInterval: 'yearly',
    price: 19999,
    currency: '₹',
    trialDays: 0,
    maxDevices: 10,
    maxUsers: 25,
    featureEntitlements: [
      'core_pos',
      'thermal_print',
      'customer_directory',
      'local_backup',
      'cloud_backup_sync',
      'advanced_analytics',
      'whatsapp_notifications',
      'email_gateway',
      'multi_counter_sync',
      'expense_tracking',
      'priority_support',
      'audit_log_export',
      'dedicated_sla',
    ],
    supportSlaTier: 'CRITICAL',
    active: true,
    version: 1,
  },
];

export class PlanService {
  static getPlans(): CommercialPlan[] {
    return COMMERCIAL_PLANS.filter((p) => p.active);
  }

  static getPlanById(id: string): CommercialPlan | undefined {
    return COMMERCIAL_PLANS.find((p) => p.id === id || p.code === id);
  }

  static hasEntitlement(planId: string, entitlement: string): boolean {
    const plan = this.getPlanById(planId);
    if (!plan) return false;
    return plan.featureEntitlements.includes(entitlement);
  }
}
