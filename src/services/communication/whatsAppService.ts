/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 12 WhatsApp Service
 * Provides phone number normalization, WhatsApp Web operator handoff,
 * and transparent capability distinction between device handoff and official API.
 */

export interface PhoneNormalizationResult {
  valid: boolean;
  isValid: boolean;       // Compatibility alias
  rawInput: string;
  e164: string;           // E.164 formatted string, e.g. "+919800099934"
  normalized: string;     // Compatibility alias
  digitsOnly: string;     // Digits for wa.me URL, e.g. "919800099934"
  countryCode: string;    // e.g. "+91"
  nationalNumber: string; // e.g. "9800099934"
  error?: string;
}

export interface WhatsAppHandoffResult {
  success: boolean;
  url: string;
  recipientE164: string;
  messageText: string;
  mode: 'WEB_MANUAL' | 'BUSINESS_API';
  status: 'HANDOFF' | 'WAITING_FOR_OPERATOR' | 'FAILED';
  error?: string;
}

export class WhatsAppService {
  static normalizeIndianPhone(
    input: string | undefined | null,
    defaultCountryCode = '+91'
  ): { isValid: boolean; normalized: string; digitsOnly: string; error?: string } {
    const res = this.normalizePhoneNumber(input, defaultCountryCode);
    return {
      isValid: res.valid,
      normalized: res.e164,
      digitsOnly: res.digitsOnly,
      error: res.error,
    };
  }

  /**
   * Normalize input phone numbers into canonical E.164 format.
   * Handles Indian formats (10-digit, leading 0, 91 prefix, +91 prefix).
   */
  private static formatResult(
    valid: boolean,
    rawInput: string,
    e164: string,
    digitsOnly: string,
    countryCode: string,
    nationalNumber: string,
    error?: string
  ): PhoneNormalizationResult {
    return {
      valid,
      isValid: valid,
      rawInput,
      e164,
      normalized: e164,
      digitsOnly,
      countryCode,
      nationalNumber,
      error,
    };
  }

  /**
   * Normalize input phone numbers into canonical E.164 format.
   * Handles Indian formats (10-digit, leading 0, 91 prefix, +91 prefix).
   */
  static normalizePhoneNumber(
    input: string | undefined | null,
    defaultCountryCode = '+91'
  ): PhoneNormalizationResult {
    const raw = (input || '').trim();
    if (!raw) {
      return this.formatResult(false, '', '', '', defaultCountryCode, '', 'Phone number is required.');
    }

    // Clean all non-digit characters except leading '+'
    const hasPlus = raw.startsWith('+');
    const digits = raw.replace(/\D/g, '');

    if (!digits || digits.length < 7) {
      return this.formatResult(
        false,
        raw,
        '',
        digits,
        defaultCountryCode,
        digits,
        `Invalid phone number: too short (${digits.length} digits).`
      );
    }

    const cleanDefaultCc = defaultCountryCode.replace(/\D/g, '') || '91';

    // 1. If explicit '+' prefix was present:
    if (hasPlus) {
      return this.formatResult(
        true,
        raw,
        `+${digits}`,
        digits,
        `+${cleanDefaultCc}`,
        digits.slice(cleanDefaultCc.length)
      );
    }

    // 2. Standard 10-digit Indian mobile (e.g. 9800099934)
    if (digits.length === 10) {
      return this.formatResult(
        true,
        raw,
        `+${cleanDefaultCc}${digits}`,
        `${cleanDefaultCc}${digits}`,
        `+${cleanDefaultCc}`,
        digits
      );
    }

    // 3. Indian number with leading 0 (e.g. 09800099934 -> 11 digits)
    if (digits.length === 11 && digits.startsWith('0')) {
      const national = digits.slice(1);
      return this.formatResult(
        true,
        raw,
        `+${cleanDefaultCc}${national}`,
        `${cleanDefaultCc}${national}`,
        `+${cleanDefaultCc}`,
        national
      );
    }

    // 4. Indian number with country code without plus (e.g. 919800099934 -> 12 digits)
    if (digits.length === 12 && digits.startsWith('91')) {
      return this.formatResult(
        true,
        raw,
        `+${digits}`,
        digits,
        '+91',
        digits.slice(2)
      );
    }

    // 5. Standard international fallback for length >= 10
    if (digits.length >= 10 && digits.length <= 15) {
      return this.formatResult(
        true,
        raw,
        `+${digits}`,
        digits,
        defaultCountryCode,
        digits
      );
    }

    return this.formatResult(
      false,
      raw,
      '',
      digits,
      defaultCountryCode,
      digits,
      `Unrecognized phone number format: "${raw}". Expected 10-digit mobile number.`
    );
  }

  /**
   * Generate operator handoff URL for WhatsApp Web / desktop app
   */
  static generateHandoffUrl(
    phoneNumber: string,
    messageText: string,
    defaultCountryCode = '+91'
  ): WhatsAppHandoffResult {
    const norm = this.normalizePhoneNumber(phoneNumber, defaultCountryCode);
    if (!norm.valid) {
      return {
        success: false,
        url: '',
        recipientE164: norm.rawInput,
        messageText,
        mode: 'WEB_MANUAL',
        status: 'FAILED',
        error: norm.error || 'Invalid recipient phone number.',
      };
    }

    const encodedText = encodeURIComponent(messageText);
    const url = `https://wa.me/${norm.digitsOnly}?text=${encodedText}`;

    return {
      success: true,
      url,
      recipientE164: norm.e164,
      messageText,
      mode: 'WEB_MANUAL',
      status: 'HANDOFF',
    };
  }

  /**
   * Execute browser open of WhatsApp Web with fallback link
   */
  static openWhatsAppWeb(
    phoneNumber: string,
    messageText: string,
    defaultCountryCode = '+91'
  ): WhatsAppHandoffResult {
    const handoff = this.generateHandoffUrl(phoneNumber, messageText, defaultCountryCode);
    if (!handoff.success) return handoff;

    try {
      if (typeof window !== 'undefined' && window.open) {
        window.open(handoff.url, '_blank', 'noopener,noreferrer');
      }
    } catch (e: any) {
      console.warn('Could not trigger window.open for WhatsApp:', e);
    }

    return handoff;
  }
}
