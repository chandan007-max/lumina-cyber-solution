/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Commercial API Routes
 * Phase 14 Commercial Production Readiness
 */

import { Express, Request, Response, NextFunction } from 'express';
import { PlanService } from '../services/commercial/planService';
import { SubscriptionService } from '../services/commercial/subscriptionService';
import { OnboardingService } from '../services/commercial/onboardingService';
import { CommercialBillingService } from '../services/commercial/billingService';
import { SupportService } from '../services/commercial/supportService';
import { CustomerAdminService } from '../services/commercial/customerAdminService';
import { getAuthorityDatabase, getMigrationStatus } from './db';
import { requireOperationsAuth } from './operations';

export function mountCommercialRoutes(app: Express): void {
  // 1. Commercial Plans (Public)
  app.get('/api/commercial/plans', (_req: Request, res: Response) => {
    res.json({
      success: true,
      plans: PlanService.getPlans(),
    });
  });

  // 2. Migration Status (Authenticated Admin)
  app.get('/api/commercial/migrations', requireOperationsAuth, (_req: Request, res: Response) => {
    const db = getAuthorityDatabase();
    res.json({
      success: true,
      migrations: getMigrationStatus(db),
    });
  });

  // 3. Customer Onboarding
  app.post('/api/commercial/onboarding/start', (req: Request, res: Response) => {
    try {
      const { businessName, contactName, phone, email, address, planId } = req.body || {};
      if (!businessName || !contactName || !phone || !email) {
        res.status(400).json({
          success: false,
          errorCode: 'INVALID_PARAMETERS',
          message: 'Missing mandatory onboarding fields (businessName, contactName, phone, email).',
        });
        return;
      }

      const result = OnboardingService.createTenantTransactional({
        businessName,
        contactName,
        phone,
        email,
        address,
        planId,
      });

      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        errorCode: 'ONBOARDING_FAILED',
        message: err.message,
      });
    }
  });

  app.get('/api/commercial/onboarding/:businessId', (req: Request, res: Response) => {
    const state = OnboardingService.getOnboardingState(req.params.businessId);
    if (!state) {
      res.status(404).json({ success: false, message: 'Onboarding record not found.' });
      return;
    }
    res.json({ success: true, onboarding: state });
  });

  // 4. Commercial Subscription & Access Policy
  app.get('/api/commercial/subscription/:businessId', (req: Request, res: Response) => {
    const sub = SubscriptionService.getSubscription(req.params.businessId);
    if (!sub) {
      res.status(404).json({ success: false, message: 'No subscription record found for business.' });
      return;
    }
    const policy = SubscriptionService.getAccessPolicy(sub.status);
    res.json({
      success: true,
      subscription: sub,
      accessPolicy: policy,
    });
  });

  app.post('/api/commercial/subscription/transition', requireOperationsAuth, (req: Request, res: Response) => {
    try {
      const { subscriptionId, newStatus, reason } = req.body || {};
      const actor = (req.headers['x-staff-id'] as string) || 'operator';
      const updated = SubscriptionService.transitionStatus(subscriptionId, newStatus, reason, actor);
      res.json({ success: true, subscription: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // 5. Invoicing & Manual Payments
  app.get('/api/commercial/invoices/:businessId', requireOperationsAuth, (req: Request, res: Response) => {
    const invoices = CommercialBillingService.getInvoicesForBusiness(req.params.businessId);
    res.json({ success: true, invoices });
  });

  app.post('/api/commercial/invoices', requireOperationsAuth, (req: Request, res: Response) => {
    try {
      const { subscriptionId, businessId, amount, currency, notes } = req.body || {};
      const invoice = CommercialBillingService.createInvoice({
        subscriptionId,
        businessId,
        amount,
        currency,
        notes,
      });
      res.status(201).json({ success: true, invoice });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.post('/api/commercial/payments/manual', requireOperationsAuth, (req: Request, res: Response) => {
    try {
      const { invoiceId, amount, paymentMethod, transactionReference, notes } = req.body || {};
      const actor = (req.headers['x-staff-id'] as string) || 'billing_staff';
      const payment = CommercialBillingService.recordManualPayment({
        invoiceId,
        amount,
        paymentMethod,
        transactionReference,
        notes,
        recordedBy: actor,
      });
      res.status(201).json({ success: true, payment });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // 6. Support Ticketing Center
  app.get('/api/commercial/support/tickets/:businessId', requireOperationsAuth, (req: Request, res: Response) => {
    const tickets = SupportService.getTicketsForBusiness(req.params.businessId);
    res.json({ success: true, tickets });
  });

  app.post('/api/commercial/support/tickets', requireOperationsAuth, (req: Request, res: Response) => {
    try {
      const { businessId, title, description, category, priority, rawDiagnosticData } = req.body || {};
      const actorId = (req.headers['x-staff-id'] as string) || 'operator';
      const ticket = SupportService.createTicket({
        businessId,
        title,
        description,
        category,
        priority,
        rawDiagnosticData,
        actorId,
      });
      res.status(201).json({ success: true, ticket });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // 7. Customer Administration Console & Offboarding
  app.get('/api/commercial/admin/tenants', requireOperationsAuth, (_req: Request, res: Response) => {
    const tenants = CustomerAdminService.listTenants();
    res.json({ success: true, count: tenants.length, tenants });
  });

  app.post('/api/commercial/admin/tenants/suspend', requireOperationsAuth, (req: Request, res: Response) => {
    const { businessId, reason } = req.body || {};
    const actor = (req.headers['x-staff-id'] as string) || 'admin';
    const result = CustomerAdminService.suspendTenant({ businessId, reason, actor });
    res.json(result);
  });

  app.post('/api/commercial/admin/tenants/reactivate', requireOperationsAuth, (req: Request, res: Response) => {
    const { businessId } = req.body || {};
    const actor = (req.headers['x-staff-id'] as string) || 'admin';
    const result = CustomerAdminService.reactivateTenant({ businessId, actor });
    res.json(result);
  });

  app.post('/api/commercial/admin/tenants/offboard', requireOperationsAuth, (req: Request, res: Response) => {
    const { businessId, reason } = req.body || {};
    const actor = (req.headers['x-staff-id'] as string) || 'admin';
    const result = CustomerAdminService.offboardTenant({ businessId, reason, actor });
    res.json(result);
  });
}
