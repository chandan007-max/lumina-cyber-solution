import {
  BankAccountDetails,
  BillingConfig,
  BusinessConfig,
  BusinessProfile,
  GstConfig,
  PaymentConfig,
  SetupTracker,
} from '../types';
import { INITIAL_BUSINESS_CONFIG } from '../data/initialData';
import { StorageService } from './storage';

export class BusinessConfigService {
  /**
   * Normalize and load current business configuration.
   * Merges legacy flat configuration with new structured white-label fields.
   */
  static getConfig(businessId?: string): BusinessConfig {
    try {
      const raw = StorageService.getConfig(businessId);
      return this.normalizeConfig(raw);
    } catch (err) {
      console.error('Failed to load business configuration:', err);
      return INITIAL_BUSINESS_CONFIG;
    }
  }

  /**
   * Save updated business configuration to storage and keep flat legacy properties synced.
   */
  static saveConfig(updates: Partial<BusinessConfig>): BusinessConfig {
    const current = this.getConfig();
    const merged: BusinessConfig = {
      ...current,
      ...updates,
      profile: { ...current.profile, ...(updates.profile || {}) },
      billing: { ...current.billing, ...(updates.billing || {}) },
      gst: { ...current.gst, ...(updates.gst || {}) },
      payment: { ...current.payment, ...(updates.payment || {}) },
      setup: { ...current.setup, ...(updates.setup || {}) },
      communication: {
        whatsapp: { ...(current.communication?.whatsapp || INITIAL_BUSINESS_CONFIG.communication!.whatsapp), ...(updates.communication?.whatsapp || {}) },
        email: { ...(current.communication?.email || INITIAL_BUSINESS_CONFIG.communication!.email), ...(updates.communication?.email || {}) },
        preferences: { ...(current.communication?.preferences || INITIAL_BUSINESS_CONFIG.communication!.preferences), ...(updates.communication?.preferences || {}) },
      },
    };

    // Keep flat legacy properties in sync with sub-objects
    merged.profile.updatedAt = new Date().toISOString();
    merged.businessName = merged.profile.businessName || merged.businessName;
    merged.tagline = merged.profile.tagline || merged.tagline;
    merged.address =
      [merged.profile.addressLine1, merged.profile.addressLine2, merged.profile.city, merged.profile.state]
        .filter(Boolean)
        .join(', ') || merged.address;
    merged.pincode = merged.profile.pincode || merged.pincode;
    merged.phones = [merged.profile.mobile, merged.profile.alternateMobile].filter(Boolean) as string[];
    merged.contactPerson = merged.profile.contactPerson || merged.profile.ownerName || merged.contactPerson;
    merged.emails = [merged.profile.email, merged.profile.alternateEmail].filter(Boolean) as string[];
    merged.profile.gstin = merged.gst.enabled ? merged.gst.gstin || merged.gstin : undefined;
    merged.gstin = merged.profile.gstin;
    merged.logoUrl = merged.profile.logoUrl || merged.logoUrl;
    merged.upiId = merged.payment.upiId || merged.upiId;
    merged.upiQrName = merged.payment.upiQrName || merged.upiQrName;
    merged.termsAndConditions = merged.billing.termsAndConditions || merged.termsAndConditions;

    StorageService.saveConfig(merged);

    // Audit log setting change
    StorageService.addLog({
      level: 'info',
      category: 'system',
      action: 'BUSINESS_CONFIG_UPDATED',
      actor: StorageService.getCurrentStaff().name,
      message: `Business configuration updated for "${merged.profile.businessName}"`,
      details: {
        businessId: merged.profile.businessId,
        businessName: merged.profile.businessName,
        gstEnabled: merged.gst.enabled,
        invoicePrefix: merged.billing.invoicePrefix,
      },
    });

    return merged;
  }

  /**
   * Normalize missing or partial configuration objects from old localStorage versions.
   */
  public static normalizeConfig(raw: any): BusinessConfig {
    if (!raw) return INITIAL_BUSINESS_CONFIG;

    const base = { ...INITIAL_BUSINESS_CONFIG, ...raw };

    const profile: BusinessProfile = {
      ...INITIAL_BUSINESS_CONFIG.profile,
      ...(raw.profile || {}),
      businessName: raw.profile?.businessName || raw.businessName || INITIAL_BUSINESS_CONFIG.profile.businessName,
      displayName: raw.profile?.displayName || raw.profile?.businessName || raw.businessName || INITIAL_BUSINESS_CONFIG.profile.displayName,
      tagline: raw.profile?.tagline || raw.tagline || INITIAL_BUSINESS_CONFIG.profile.tagline,
      logoUrl: raw.profile?.logoUrl || raw.logoUrl || INITIAL_BUSINESS_CONFIG.profile.logoUrl,
      mobile: raw.profile?.mobile || (raw.phones && raw.phones[0]) || INITIAL_BUSINESS_CONFIG.profile.mobile,
      email: raw.profile?.email || (raw.emails && raw.emails[0]) || INITIAL_BUSINESS_CONFIG.profile.email,
      pincode: raw.profile?.pincode || raw.pincode || INITIAL_BUSINESS_CONFIG.profile.pincode,
    };

    const billing: BillingConfig = {
      ...INITIAL_BUSINESS_CONFIG.billing,
      ...(raw.billing || {}),
      termsAndConditions: raw.billing?.termsAndConditions || raw.termsAndConditions || INITIAL_BUSINESS_CONFIG.billing.termsAndConditions,
    };

    const gst: GstConfig = {
      ...INITIAL_BUSINESS_CONFIG.gst,
      ...(raw.gst || {}),
      gstin: raw.gst?.gstin || raw.gstin || INITIAL_BUSINESS_CONFIG.gst.gstin,
      enabled: typeof raw.gst?.enabled === 'boolean' ? raw.gst.enabled : Boolean(raw.gstin || raw.gst?.gstin),
    };

    const payment: PaymentConfig = {
      ...INITIAL_BUSINESS_CONFIG.payment,
      ...(raw.payment || {}),
      upiId: raw.payment?.upiId || raw.upiId || INITIAL_BUSINESS_CONFIG.payment.upiId,
      upiQrName: raw.payment?.upiQrName || raw.upiQrName || INITIAL_BUSINESS_CONFIG.payment.upiQrName,
    };

    const setup: SetupTracker = {
      ...INITIAL_BUSINESS_CONFIG.setup,
      ...(raw.setup || {}),
    };

    const communication = {
      whatsapp: {
        ...INITIAL_BUSINESS_CONFIG.communication!.whatsapp,
        ...(raw.communication?.whatsapp || {}),
      },
      email: {
        ...INITIAL_BUSINESS_CONFIG.communication!.email,
        ...(raw.communication?.email || {}),
      },
      preferences: {
        ...INITIAL_BUSINESS_CONFIG.communication!.preferences,
        ...(raw.communication?.preferences || {}),
      },
    };

    return {
      ...base,
      configVersion: 1,
      profile,
      billing,
      gst,
      payment,
      setup,
      communication,
      businessName: profile.businessName,
      tagline: profile.tagline,
      address: [profile.addressLine1, profile.addressLine2, profile.city, profile.state].filter(Boolean).join(', '),
      pincode: profile.pincode,
      phones: [profile.mobile, profile.alternateMobile].filter(Boolean) as string[],
      contactPerson: profile.contactPerson || profile.ownerName,
      emails: [profile.email, profile.alternateEmail].filter(Boolean) as string[],
      gstin: gst.enabled ? gst.gstin : undefined,
      logoUrl: profile.logoUrl,
      upiId: payment.upiId,
      upiQrName: payment.upiQrName,
      termsAndConditions: billing.termsAndConditions,
    };
  }

  /**
   * Transaction-safe invoice numbering engine.
   * Generates next sequence number based on configurable prefix and start sequence.
   */
  static getNextInvoiceNumber(peekOnly = false): string {
    const config = this.getConfig();
    const prefix = config.billing.invoicePrefix || 'INV-2026-';
    const seq = config.billing.currentSequence || config.billing.invoiceStartNumber || 101;
    const formattedNum = String(seq).padStart(6, '0');
    const invoiceId = `${prefix}${formattedNum}`;

    if (!peekOnly) {
      // Increment sequence in storage
      config.billing.currentSequence = seq + 1;
      this.saveConfig(config);
    }

    return invoiceId;
  }

  /**
   * Validate and resize uploaded logo image to safe Base64 size.
   */
  static validateAndOptimizeLogo(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        return reject(new Error('Selected file is not an image (PNG, JPG, WebP allowed).'));
      }
      if (file.size > 2 * 1024 * 1024) {
        return reject(new Error('Image file is too large (Maximum 2MB allowed).'));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400; // max 400px width/height for logo
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL('image/png', 0.9);
            resolve(base64);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image file.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Calculate business setup completion percentage.
   */
  static calculateSetupCompletion(): { percentage: number; checklist: { key: string; label: string; done: boolean }[] } {
    const config = this.getConfig();
    const p = config.profile;
    const b = config.billing;
    const g = config.gst;
    const pay = config.payment;

    const checklist = [
      { key: 'name', label: 'Business Identity Name', done: Boolean(p.businessName && p.businessName !== 'New Cyber Cafe') },
      { key: 'contact', label: 'Mobile & Contact Details', done: Boolean(p.mobile && p.mobile.length >= 10) },
      { key: 'address', label: 'Shop Address & Pincode', done: Boolean(p.addressLine1 && p.pincode) },
      { key: 'logo', label: 'Business Brand Logo', done: Boolean(p.logoUrl) },
      { key: 'billing', label: 'Invoice Prefix & Sequence', done: Boolean(b.invoicePrefix && b.invoiceTitle) },
      { key: 'gst', label: 'GST Tax Information', done: Boolean(!g.enabled || (g.enabled && g.gstin)) },
      { key: 'upi', label: 'UPI VPA Payment ID', done: Boolean(pay.upiId && pay.upiId.includes('@')) },
      { key: 'terms', label: 'Terms & Conditions', done: Boolean(b.termsAndConditions && b.termsAndConditions.length > 0) },
    ];

    const completed = checklist.filter((item) => item.done).length;
    const percentage = Math.round((completed / checklist.length) * 100);

    return { percentage, checklist };
  }
}
