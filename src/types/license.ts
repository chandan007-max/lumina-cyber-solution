import { BusinessProfile } from './index';

export type LicenseStatus =
  | 'DEMO_MODE'
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'GRACE_PERIOD'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'LIFETIME';

export type PlanId = 'trial_7' | 'trial_14' | 'monthly_1m' | 'yearly_1y' | 'lifetime';

export interface SignedLicensePayload {
  tokenVersion: string; // e.g. "2.0_ASYMMETRIC"
  issuer: string;       // "LUMINA_LICENSE_AUTHORITY"
  licenseId: string;
  licenseKey: string;
  businessId: string;
  customerId: string;
  planId: PlanId;
  planName: string;
  status: LicenseStatus;
  isTrial: boolean;
  isLifetime: boolean;
  issuedAt: string;
  startDate: string;
  expiryDate: string;
  gracePeriodUntil: string;
  deviceLimit: number;
  userLimit: number;
  featureEntitlements: string[];
  signature: string; // Asymmetric public-key verified signature
}

export interface LicenseAuthorityResponse {
  success: boolean;
  message: string;
  license?: License;
  signedToken?: string;
  serverTime?: string;
  errorCode?: 'BUSINESS_MISMATCH' | 'SIGNATURE_INVALID' | 'EXPIRED' | 'DEVICE_LIMIT_EXCEEDED' | 'INVALID_KEY' | 'CLOCK_TAMPERED' | string;
}

export interface LicensePlan {
  planId: PlanId;
  planName: string;
  description: string;
  durationType: 'days' | 'months' | 'years' | 'unlimited';
  durationValue: number;
  isTrial: boolean;
  isLifetime: boolean;
  price: number;
  currency: string;
  deviceLimit: number;
  userLimit: number;
  featureEntitlements: string[];
  backupLimit: number;
  cloudSyncEnabled: boolean;
  supportLevel: 'community' | 'standard' | 'priority' | '24x7';
  gracePeriodDays: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseDevice {
  deviceId: string;
  businessId: string;
  licenseId: string;
  deviceName: string;
  platform: string;
  appVersion: string;
  activatedAt: string;
  lastSeenAt: string;
  status: 'ACTIVE' | 'REVOKED';
  metadata?: Record<string, any>;
}

export type LicenseEventType =
  | 'LICENSE_CREATED'
  | 'LICENSE_ACTIVATED'
  | 'LICENSE_VALIDATED'
  | 'LICENSE_RENEWED'
  | 'LICENSE_SUSPENDED'
  | 'LICENSE_REACTIVATED'
  | 'LICENSE_CANCELLED'
  | 'LICENSE_EXPIRED'
  | 'DEVICE_ACTIVATED'
  | 'DEVICE_DEACTIVATED'
  | 'PLAN_CHANGED'
  | 'TRIAL_STARTED'
  | 'TRIAL_CONVERTED';

export interface LicenseAuditEvent {
  eventId: string;
  licenseId: string;
  businessId: string;
  customerId: string;
  eventType: LicenseEventType;
  actor: string;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface License {
  licenseId: string;
  licenseKey: string; // e.g. "LCS-8A9F-3B2E-7D4C-9102"
  customerId: string;
  businessId: string;
  planId: PlanId;
  planName: string;
  signedToken: string; // Cryptographic verification token
  status: LicenseStatus;
  isTrial: boolean;
  isLifetime: boolean;
  activatedAt: string;
  startDate: string;
  expiryDate: string;
  gracePeriodUntil: string;
  deviceLimit: number;
  userLimit: number;
  featureEntitlements: string[];
  activationCount: number;
  lastValidationAt: string;
  lastOnlineValidationAt: string;
  devices: LicenseDevice[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface LicenseValidationResult {
  valid: boolean;
  status: LicenseStatus;
  daysRemaining: number;
  isExpired: boolean;
  isGracePeriod: boolean;
  isTampered: boolean;
  message: string;
  license?: License;
}
