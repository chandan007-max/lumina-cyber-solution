import {
  License,
  LicenseAuditEvent,
  LicenseDevice,
  LicensePlan,
  LicenseStatus,
  LicenseValidationResult,
  PlanId,
  SignedLicensePayload,
} from '../types/license';
import { StorageService, safeStorage } from './storage';
import { BusinessConfigService } from './businessConfig';
import { LicenseAuthorityService, LUMINA_PUBLIC_VERIFICATION_KEY_PEM } from './licenseAuthority';

const LICENSE_STORAGE_KEY = 'nil_printer_license';
const LICENSE_EVENTS_STORAGE_KEY = 'nil_printer_license_events';

// Default Configurable Plan Master
export const DEFAULT_PLANS: LicensePlan[] = [
  {
    planId: 'trial_7',
    planName: '7-Day Quick Trial',
    description: 'Full feature evaluation trial for new cyber café setups',
    durationType: 'days',
    durationValue: 7,
    isTrial: true,
    isLifetime: false,
    price: 0,
    currency: '₹',
    deviceLimit: 1,
    userLimit: 2,
    featureEntitlements: ['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup'],
    backupLimit: 10,
    cloudSyncEnabled: true,
    supportLevel: 'community',
    gracePeriodDays: 3,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    planId: 'trial_14',
    planName: '14-Day Extended Trial',
    description: 'Complete 14-day evaluation with multi-device support',
    durationType: 'days',
    durationValue: 14,
    isTrial: true,
    isLifetime: false,
    price: 0,
    currency: '₹',
    deviceLimit: 2,
    userLimit: 3,
    featureEntitlements: ['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup', 'advanced_reports'],
    backupLimit: 20,
    cloudSyncEnabled: true,
    supportLevel: 'standard',
    gracePeriodDays: 5,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    planId: 'monthly_1m',
    planName: 'Professional Monthly',
    description: 'Flexible monthly commercial license for active cyber cafes',
    durationType: 'months',
    durationValue: 1,
    isTrial: false,
    isLifetime: false,
    price: 999,
    currency: '₹',
    deviceLimit: 2,
    userLimit: 5,
    featureEntitlements: ['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup', 'advanced_reports', 'whatsapp', 'email'],
    backupLimit: 50,
    cloudSyncEnabled: true,
    supportLevel: 'standard',
    gracePeriodDays: 7,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    planId: 'yearly_1y',
    planName: 'Professional Annual',
    description: 'Annual license with maximum savings and priority support',
    durationType: 'years',
    durationValue: 1,
    isTrial: false,
    isLifetime: false,
    price: 7999,
    currency: '₹',
    deviceLimit: 3,
    userLimit: 10,
    featureEntitlements: ['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup', 'advanced_reports', 'whatsapp', 'email'],
    backupLimit: 200,
    cloudSyncEnabled: true,
    supportLevel: 'priority',
    gracePeriodDays: 14,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    planId: 'lifetime',
    planName: 'Enterprise Lifetime',
    description: 'Permanent lifetime software license with no recurring fees',
    durationType: 'unlimited',
    durationValue: 999,
    isTrial: false,
    isLifetime: true,
    price: 19999,
    currency: '₹',
    deviceLimit: 10,
    userLimit: 25,
    featureEntitlements: ['pos', 'jobs', 'customers', 'inventory', 'reports', 'gst', 'backup', 'advanced_reports', 'whatsapp', 'email'],
    backupLimit: 1000,
    cloudSyncEnabled: true,
    supportLevel: '24x7',
    gracePeriodDays: 30,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export class LicenseService {
  /**
   * Generate clean license key format e.g. LCS-8A9F-3B2E-7D4C-9102
   */
  public static generateLicenseKey(prefix = 'LCS'): string {
    const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const p3 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const p4 = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${p1}-${p2}-${p3}-${p4}`;
  }

  /**
   * Get device fingerprint / stable browser hardware ID
   */
  public static getDeviceId(): string {
    const nav = typeof window !== 'undefined' ? window.navigator : ({} as any);
    const screen = typeof window !== 'undefined' ? window.screen : ({} as any);
    const raw = `${nav.userAgent || ''}_${nav.platform || ''}_${screen.width || 0}x${screen.height || 0}_${nav.language || ''}`;
    
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `DEV-${Math.abs(hash).toString(36).toUpperCase()}`;
  }

  /**
   * Get current device metadata record
   */
  public static getCurrentDevice(businessId: string, licenseId: string): LicenseDevice {
    const nav = typeof window !== 'undefined' ? window.navigator : ({} as any);
    return {
      deviceId: this.getDeviceId(),
      businessId,
      licenseId,
      deviceName: `${nav.platform || 'Desktop'} Workstation`,
      platform: nav.userAgent || 'Browser Agent',
      appVersion: '2.6.0',
      activatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: 'ACTIVE',
    };
  }

  /**
   * Retrieve all available commercial plans
   */
  public static getPlans(): LicensePlan[] {
    return DEFAULT_PLANS;
  }

  /**
   * Get plan configuration by ID
   */
  public static getPlan(planId: PlanId): LicensePlan {
    return DEFAULT_PLANS.find((p) => p.planId === planId) || DEFAULT_PLANS[1];
  }

  /**
   * Compute license expiry date based on plan
   */
  public static computeExpiryDate(startDate: Date, plan: LicensePlan): Date {
    if (plan.isLifetime) {
      const lifetime = new Date(startDate);
      lifetime.setFullYear(lifetime.getFullYear() + 99); // 99 years
      return lifetime;
    }

    const expiry = new Date(startDate);
    if (plan.durationType === 'days') {
      expiry.setDate(expiry.getDate() + plan.durationValue);
    } else if (plan.durationType === 'months') {
      expiry.setMonth(expiry.getMonth() + plan.durationValue);
    } else if (plan.durationType === 'years') {
      expiry.setFullYear(expiry.getFullYear() + plan.durationValue);
    }
    return expiry;
  }

  /**
   * Read and initialize current license. Guaranteed to return a valid License object.
   */
  public static getLicense(): License {
    try {
      const raw = safeStorage.getItem(LICENSE_STORAGE_KEY);
      if (raw) {
        const parsed: License = JSON.parse(raw);
        if (parsed && parsed.licenseId) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to parse license storage:', err);
    }

    // No existing license found — initialize default 14-Day Trial
    return this.initializeDefaultTrial('trial_14');
  }

  /**
   * Initialize default trial for the software via License Authority Server API
   */
  public static initializeDefaultTrial(planId: PlanId = 'trial_14'): License {
    const config = BusinessConfigService.getConfig();
    const businessId = config.profile?.businessId || 'biz_default_01';
    const plan = this.getPlan(planId);
    const deviceId = this.getDeviceId();

    const now = new Date();
    const startDateIso = now.toISOString();
    const expiryDateObj = this.computeExpiryDate(now, plan);
    const expiryDateIso = expiryDateObj.toISOString();

    const graceObj = new Date(expiryDateObj);
    graceObj.setDate(graceObj.getDate() + plan.gracePeriodDays);
    const graceIso = graceObj.toISOString();

    const licenseId = `LIC-${Date.now().toString(36).toUpperCase()}`;
    const licenseKey = this.generateLicenseKey();

    const fallbackLicense: License = {
      licenseId,
      licenseKey,
      customerId: `CUST-${businessId}`,
      businessId,
      planId: plan.planId,
      planName: `${plan.planName} (Evaluation Demo Mode)`,
      signedToken: JSON.stringify({
        tokenVersion: '3.2_OFFLINE_DEMO',
        issuer: 'LUMINA_LOCAL_DEMO',
        licenseId,
        licenseKey,
        businessId,
        customerId: `CUST-${businessId}`,
        planId: plan.planId,
        status: 'DEMO_MODE',
        expiryDate: expiryDateIso,
        signature: 'DEMO_EVALUATION_TOKEN_LOCAL_ONLY',
      }),
      status: 'DEMO_MODE',
      isTrial: true,
      isLifetime: false,
      activatedAt: startDateIso,
      startDate: startDateIso,
      expiryDate: expiryDateIso,
      gracePeriodUntil: graceIso,
      deviceLimit: 1,
      userLimit: 2,
      featureEntitlements: plan.featureEntitlements,
      activationCount: 1,
      lastValidationAt: startDateIso,
      lastOnlineValidationAt: startDateIso,
      devices: [this.getCurrentDevice(businessId, licenseId)],
      createdAt: startDateIso,
      updatedAt: startDateIso,
      metadata: {
        installer: 'LUMINA_AUTO_PROVISIONER',
        channel: 'OFFLINE_DEMO_FIRST_INSTALL',
      },
    };

    // Register official trial with License Authority Server
    LicenseAuthorityService.startServerTrial(deviceId, config.profile?.businessName, planId)
      .then((res) => {
        if (res.success && res.license) {
          this.saveLicense(res.license, 'TRIAL_STARTED', 'Server-authoritative official trial registered');
        }
      })
      .catch((err) => {
        console.warn('License Authority Server offline, software running in Demo Evaluation mode', err);
      });

    this.saveLicense(fallbackLicense, 'TRIAL_STARTED', 'Local offline evaluation demo initialized');
    return fallbackLicense;
  }

  /**
   * Save license to persistent storage and record audit event
   */
  public static saveLicense(license: License, eventType: LicenseAuditEvent['eventType'] = 'LICENSE_VALIDATED', reason?: string): void {
    license.updatedAt = new Date().toISOString();
    if (!license.lastValidationAt) {
      license.lastValidationAt = new Date().toISOString();
    }

    safeStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license));

    // Add audit event
    this.addAuditEvent({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      licenseId: license.licenseId,
      businessId: license.businessId,
      customerId: license.customerId,
      eventType,
      actor: StorageService.getCurrentStaff()?.name || 'System Operator',
      timestamp: new Date().toISOString(),
      reason: reason || `License status updated to ${license.status}`,
      metadata: {
        planId: license.planId,
        status: license.status,
        expiryDate: license.expiryDate,
      },
    });

    // Also add to system debug log
    StorageService.addLog({
      level: 'info',
      category: 'system',
      action: `LICENSE_${eventType}`,
      actor: StorageService.getCurrentStaff()?.name || 'System Operator',
      message: `Commercial license event: ${eventType} (${license.planName})`,
      details: {
        licenseKey: license.licenseKey,
        status: license.status,
        expiryDate: license.expiryDate,
      },
    });
  }

  /**
   * Validate token signature & tenant business binding for tamper-resistance
   */
  public static verifyTokenSignature(license: License): { valid: boolean; errorCode?: string; message: string } {
    const activeConfig = BusinessConfigService.getConfig();
    const currentBusinessId = activeConfig.profile?.businessId ? (activeConfig.profile.businessId.startsWith('biz_') ? activeConfig.profile.businessId : `biz_${activeConfig.profile.businessId}`) : 'biz_nil_printers_001';

    if (license.status === 'DEMO_MODE') {
      return { valid: true, message: 'Local demo evaluation mode active (connect online to activate commercial license).' };
    }

    if (!license.signedToken) {
      return { valid: false, errorCode: 'SIGNATURE_INVALID', message: 'Missing signed license token.' };
    }

    try {
      // Parse signed payload or check token structure
      let payload: SignedLicensePayload;
      if (license.signedToken.startsWith('{')) {
        payload = JSON.parse(license.signedToken);
      } else {
        // Fallback for legacy simple token
        payload = {
          tokenVersion: '1.0_LEGACY',
          issuer: 'LUMINA_LICENSE_AUTHORITY',
          licenseId: license.licenseId,
          licenseKey: license.licenseKey,
          businessId: license.businessId,
          customerId: license.customerId,
          planId: license.planId,
          planName: license.planName,
          status: license.status,
          isTrial: license.isTrial,
          isLifetime: license.isLifetime,
          issuedAt: license.createdAt,
          startDate: license.startDate,
          expiryDate: license.expiryDate,
          gracePeriodUntil: license.gracePeriodUntil,
          deviceLimit: license.deviceLimit,
          userLimit: license.userLimit,
          featureEntitlements: license.featureEntitlements,
          signature: 'LEGACY_UNVERIFIED_TOKEN',
        };
      }

      return LicenseAuthorityService.verifySignedToken(payload, currentBusinessId);
    } catch (err) {
      return { valid: false, errorCode: 'SIGNATURE_INVALID', message: 'Failed to verify license token signature.' };
    }
  }

  /**
   * Validate license status and return comprehensive validation result
   */
  public static validateLicense(): LicenseValidationResult {
    const license = this.getLicense();
    const now = new Date();
    const nowMs = now.getTime();

    // 1. Signature & Business Tenant Binding Check
    const sigCheck = this.verifyTokenSignature(license);
    if (!sigCheck.valid) {
      return {
        valid: false,
        status: 'SUSPENDED',
        daysRemaining: 0,
        isExpired: true,
        isGracePeriod: false,
        isTampered: true,
        message: sigCheck.message || 'License verification failed — signature or business tenant mismatch.',
        license,
      };
    }

    // 2. Anti-Clock Tampering Check (System clock rewound)
    if (license.lastValidationAt) {
      const lastValMs = new Date(license.lastValidationAt).getTime();
      if (nowMs < lastValMs - 24 * 60 * 60 * 1000) {
        // System clock set backward by > 24 hours
        return {
          valid: false,
          status: 'SUSPENDED',
          daysRemaining: 0,
          isExpired: true,
          isGracePeriod: false,
          isTampered: true,
          message: 'System clock discrepancy detected. Please ensure your computer date and time are accurate.',
          license,
        };
      }
    }

    // 3. Status checks
    if (license.status === 'SUSPENDED' || license.status === 'CANCELLED') {
      return {
        valid: false,
        status: license.status,
        daysRemaining: 0,
        isExpired: true,
        isGracePeriod: false,
        isTampered: false,
        message: `License is ${license.status.toLowerCase()}. Please contact LUMINA support to reactivate.`,
        license,
      };
    }

    if (license.isLifetime || license.status === 'LIFETIME') {
      return {
        valid: true,
        status: 'LIFETIME',
        daysRemaining: 9999,
        isExpired: false,
        isGracePeriod: false,
        isTampered: false,
        message: 'Enterprise Lifetime License Active',
        license,
      };
    }

    // 4. Date calculations
    const expiryMs = new Date(license.expiryDate).getTime();
    const graceMs = new Date(license.gracePeriodUntil).getTime();

    const diffDays = Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24));

    if (nowMs > graceMs) {
      // Completely expired
      if (license.status !== 'EXPIRED') {
        license.status = 'EXPIRED';
        this.saveLicense(license, 'LICENSE_EXPIRED', 'License expired beyond grace period');
      }
      return {
        valid: false,
        status: 'EXPIRED',
        daysRemaining: 0,
        isExpired: true,
        isGracePeriod: false,
        isTampered: false,
        message: 'Software subscription has expired. Please renew your commercial license to continue billing.',
        license,
      };
    }

    if (nowMs > expiryMs) {
      // In Grace Period
      const graceDays = Math.ceil((graceMs - nowMs) / (1000 * 60 * 60 * 24));
      if (license.status !== 'GRACE_PERIOD') {
        license.status = 'GRACE_PERIOD';
        this.saveLicense(license, 'LICENSE_VALIDATED', 'License entered grace period');
      }
      return {
        valid: true,
        status: 'GRACE_PERIOD',
        daysRemaining: graceDays,
        isExpired: false,
        isGracePeriod: true,
        isTampered: false,
        message: `Subscription expired! You are in a ${graceDays}-day grace period. Please renew now.`,
        license,
      };
    }

    // Active or Expiring Soon
    let status: LicenseStatus = license.isTrial ? 'TRIAL' : 'ACTIVE';
    if (diffDays <= 15) {
      status = 'EXPIRING_SOON';
    }

    if (license.status !== status && license.status !== 'TRIAL') {
      license.status = status;
      this.saveLicense(license, 'LICENSE_VALIDATED', `Status set to ${status}`);
    }

    return {
      valid: true,
      status,
      daysRemaining: Math.max(0, diffDays),
      isExpired: false,
      isGracePeriod: false,
      isTampered: false,
      message: `${license.planName} active (${diffDays} days remaining)`,
      license,
    };
  }

  /**
   * Centralized Feature Entitlement Access Check
   */
  public static canUseFeature(featureKey: string): boolean {
    const val = this.validateLicense();
    
    // Unrestricted features that must ALWAYS work even if expired
    const baselineReadFeatures = ['view_records', 'export', 'backup', 'settings', 'license', 'reports'];
    if (baselineReadFeatures.includes(featureKey)) {
      return true;
    }

    // If expired or suspended, block transactional billing
    if (!val.valid) {
      return false;
    }

    const license = val.license;
    if (!license) return true;

    // Check plan feature list
    if (license.featureEntitlements && license.featureEntitlements.length > 0) {
      return license.featureEntitlements.includes(featureKey);
    }

    return true;
  }

  /**
   * Activate or upgrade license using key via License Authority Server API
   */
  public static async activateLicenseKey(
    licenseKey: string,
    targetPlanId?: PlanId
  ): Promise<{ success: boolean; message: string; license?: License }> {
    const cleanKey = licenseKey.trim().toUpperCase();
    if (!cleanKey) {
      return { success: false, message: 'Please enter a valid license key.' };
    }

    const config = BusinessConfigService.getConfig();
    const businessId = config.profile.businessId || 'biz_default_01';
    const deviceId = this.getDeviceId();

    // Call License Authority Server (/api/license/activate)
    const res = await LicenseAuthorityService.activateServerKey(cleanKey, businessId, deviceId, targetPlanId);
    if (res.success && res.license) {
      this.saveLicense(res.license, 'LICENSE_ACTIVATED', `Commercial key activated via License Authority Server`);
      return {
        success: true,
        message: res.message,
        license: res.license,
      };
    }

    return {
      success: false,
      message: res.message || 'Key activation failed.',
    };
  }

  /**
   * Renew current subscription with target plan
   */
  public static renewLicense(planId: PlanId): License {
    const plan = this.getPlan(planId);
    const current = this.getLicense();
    const now = new Date();

    // Extend from current expiry if not already expired, else from today
    let baseDate = new Date();
    if (new Date(current.expiryDate) > now) {
      baseDate = new Date(current.expiryDate);
    }

    const newExpiry = this.computeExpiryDate(baseDate, plan);
    const graceObj = new Date(newExpiry);
    graceObj.setDate(graceObj.getDate() + plan.gracePeriodDays);

    const renewed: License = {
      ...current,
      planId: plan.planId,
      planName: plan.planName,
      status: plan.isLifetime ? 'LIFETIME' : 'ACTIVE',
      isTrial: false,
      isLifetime: plan.isLifetime,
      expiryDate: newExpiry.toISOString(),
      gracePeriodUntil: graceObj.toISOString(),
      deviceLimit: plan.deviceLimit,
      userLimit: plan.userLimit,
      featureEntitlements: plan.featureEntitlements,
      activationCount: current.activationCount + 1,
    };

    this.saveLicense(renewed, 'LICENSE_RENEWED', `License renewed for ${plan.planName}`);
    return renewed;
  }

  /**
   * Administrative Suspension or Cancellation
   */
  public static setLicenseStatus(status: LicenseStatus, reason: string): License {
    const current = this.getLicense();
    current.status = status;
    const eventType: LicenseAuditEvent['eventType'] =
      status === 'SUSPENDED' ? 'LICENSE_SUSPENDED' : status === 'CANCELLED' ? 'LICENSE_CANCELLED' : 'LICENSE_REACTIVATED';
    
    this.saveLicense(current, eventType, reason);
    return current;
  }

  /**
   * Deactivate a bound device
   */
  public static deactivateDevice(deviceId: string): License {
    const current = this.getLicense();
    current.devices = current.devices.filter((d) => d.deviceId !== deviceId);
    this.saveLicense(current, 'DEVICE_DEACTIVATED', `Deactivated device ID ${deviceId}`);
    return current;
  }

  /**
   * Retrieve license audit log events
   */
  public static getAuditEventHistory(): LicenseAuditEvent[] {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(LICENSE_EVENTS_STORAGE_KEY) : null;
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to load license audit events:', err);
    }
    return [];
  }

  private static addAuditEvent(event: LicenseAuditEvent): void {
    const events = this.getAuditEventHistory();
    events.unshift(event);
    const trimmed = events.slice(0, 100); // keep last 100 audit events
    if (typeof window !== 'undefined') {
      localStorage.setItem(LICENSE_EVENTS_STORAGE_KEY, JSON.stringify(trimmed));
    }
  }
}
