/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 12 Email Service & Provider Abstraction
 * Provider-independent email delivery architecture supporting SMTP & Development modes.
 */

import { EmailConfig, CommunicationAttachment } from '../../types';
import { CredentialService } from './credentialService';
import { BusinessContextService } from '../businessContext';

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  bodyText?: string;
  textBody?: string;
  bodyHtml?: string;
  htmlBody?: string;
  attachments?: CommunicationAttachment[];
  config?: EmailConfig;
  businessId?: string;
  idempotencyKey?: string;
}

export interface EmailSendResult {
  success: boolean;
  provider: 'SMTP' | 'DEVELOPMENT_MOCK' | 'DEVELOPMENT';
  messageId?: string;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<EmailSendResult>;
  testConnection(config: EmailConfig, password?: string): Promise<{ success: boolean; message: string; errorCode?: string }>;
  validateConfiguration(config: EmailConfig): { valid: boolean; errors: string[] };
}

/**
 * Development & Test Mock Provider (safe offline unit test support)
 */
export class DevelopmentEmailProvider implements EmailProvider {
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const timestamp = new Date().toISOString();
    // Validate minimal email format
    if (!options.to || !options.to.includes('@')) {
      return {
        success: false,
        provider: 'DEVELOPMENT',
        errorCode: 'INVALID_RECIPIENT',
        errorMessage: `Invalid recipient email address: "${options.to}"`,
        timestamp,
      };
    }

    const msgId = `dev_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      provider: 'DEVELOPMENT',
      messageId: msgId,
      providerMessageId: msgId,
      timestamp,
    };
  }

  async testConnection(config: EmailConfig): Promise<{ success: boolean; message: string }> {
    const val = this.validateConfiguration(config);
    if (!val.valid) {
      return { success: false, message: val.errors.join(' ') };
    }
    return { success: true, message: 'Development Email connection verified successfully.' };
  }

  validateConfiguration(config: EmailConfig): { valid: boolean; errors: string[] } {
    return SMTPEmailProvider.validateConfigHelper(config);
  }
}

/**
 * Standard SMTP Email Provider (delegates to server-side transactional gateway)
 */
export class SMTPEmailProvider implements EmailProvider {
  private static BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3000';

  static validateConfigHelper(config: EmailConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.senderEmail || !config.senderEmail.includes('@')) {
      errors.push('Valid Sender Email is required.');
    }
    if (!config.smtpHost || config.smtpHost.trim().length === 0) {
      errors.push('SMTP Host (e.g. smtp.gmail.com) is required.');
    }
    if (!config.smtpPort || config.smtpPort <= 0 || config.smtpPort > 65535) {
      errors.push('Valid SMTP Port (587 or 465) is required.');
    }
    if (!config.username || config.username.trim().length === 0) {
      errors.push('SMTP Username is required.');
    }
    return { valid: errors.length === 0, errors };
  }

  validateConfiguration(config: EmailConfig): { valid: boolean; errors: string[] } {
    return SMTPEmailProvider.validateConfigHelper(config);
  }

  async testConnection(
    config: EmailConfig,
    passwordOverride?: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    const val = this.validateConfiguration(config);
    if (!val.valid) {
      return { success: false, message: val.errors.join(' ') };
    }

    const password = passwordOverride || CredentialService.getSmtpPassword() || '';
    if (!password) {
      return {
        success: false,
        errorCode: 'MISSING_PASSWORD',
        message: 'SMTP Password / App Password is required to test connection.',
      };
    }

    try {
      const bId = BusinessContextService.getCurrentBusinessId();
      const res = await fetch(`${SMTPEmailProvider.BASE_URL}/api/communication/test-smtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': bId,
          'x-staff-role': 'OWNER',
        },
        body: JSON.stringify({
          businessId: bId,
          host: config.smtpHost,
          port: config.smtpPort,
          security: config.security,
          username: config.username,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message || 'SMTP Connection established successfully.' };
      }
      return {
        success: false,
        errorCode: data.errorCode || 'SMTP_TEST_FAILED',
        message: data.message || 'Could not connect to SMTP server. Verify host, port, and credentials.',
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: `Network error connecting to Email Authority Gateway: ${err.message}`,
      };
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const timestamp = new Date().toISOString();
    const bId = options.businessId || BusinessContextService.getCurrentBusinessId();
    const password = CredentialService.getSmtpPassword(bId) || '';

    // If no config or offline/dev fallback requested:
    if (!options.config?.smtpHost || !password) {
      // In development fallback:
      const devProvider = new DevelopmentEmailProvider();
      return devProvider.sendEmail(options);
    }

    try {
      const res = await fetch(`${SMTPEmailProvider.BASE_URL}/api/communication/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': bId,
          'x-staff-role': 'OWNER',
          ...(options.idempotencyKey ? { 'idempotency-key': options.idempotencyKey } : {}),
        },
        body: JSON.stringify({
          businessId: bId,
          smtp: {
            host: options.config.smtpHost,
            port: options.config.smtpPort,
            security: options.config.security,
            username: options.config.username,
            password,
            senderName: options.config.senderName,
            senderEmail: options.config.senderEmail,
            replyTo: options.config.replyTo,
          },
          message: {
            to: options.to,
            toName: options.toName,
            subject: options.subject,
            text: options.bodyText,
            html: options.bodyHtml,
            attachments: options.attachments?.map((a) => ({
              filename: a.name,
              contentType: a.mimeType,
              contentBase64: a.dataBase64,
            })),
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          provider: 'SMTP',
          messageId: data.messageId || `smtp_${Date.now()}`,
          timestamp,
        };
      }

      return {
        success: false,
        provider: 'SMTP',
        errorCode: data.errorCode || 'SEND_FAILED',
        errorMessage: data.message || 'Email delivery failed at SMTP gateway.',
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'SMTP',
        errorCode: 'GATEWAY_ERROR',
        errorMessage: `Failed to reach email gateway: ${err.message}`,
        timestamp,
      };
    }
  }
}

export class EmailService {
  private static provider: EmailProvider = new SMTPEmailProvider();

  static setProvider(provider: EmailProvider): void {
    this.provider = provider;
  }

  static getProvider(type?: 'SMTP' | 'DEV'): EmailProvider {
    if (type === 'DEV') {
      return new DevelopmentEmailProvider();
    }
    if (type === 'SMTP') {
      return new SMTPEmailProvider();
    }
    return this.provider;
  }

  static async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    return this.provider.sendEmail(options);
  }

  static async testConnection(
    config: EmailConfig,
    passwordOverride?: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    return this.provider.testConnection(config, passwordOverride);
  }

  static validateConfiguration(config: EmailConfig): { valid: boolean; errors: string[] } {
    return this.provider.validateConfiguration(config);
  }
}
