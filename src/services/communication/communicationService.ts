/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 12 Unified Communication Service
 * High-level orchestration for WhatsApp, Email, document sharing, and contextual business triggers.
 */

import {
  Customer,
  Invoice,
  JobItem,
  CommunicationChannel,
  CommunicationMessageType,
  CommunicationRecord,
  CommunicationAttachment,
} from '../../types';
import { CommunicationRepository, CommunicationFilter } from '../../repositories/communicationRepository';
import { TemplateRepository } from '../../repositories/templateRepository';
import { TemplateService, TemplateContextData } from './templateService';
import { WhatsAppService, WhatsAppHandoffResult } from './whatsAppService';
import { CommunicationQueueService } from './communicationQueue';
import { BusinessConfigService } from '../businessConfig';
import { BusinessContextService } from '../businessContext';
import { StorageService } from '../storage';

export interface SendMessageOptions {
  businessId?: string;
  channel: CommunicationChannel;
  messageType: CommunicationMessageType;
  recipient: string;
  recipientName: string;
  templateId?: string;
  customMessage?: string;
  customSubject?: string;
  content?: string;
  subject?: string;
  contextData?: TemplateContextData;
  attachments?: CommunicationAttachment[];
  customerId?: string;
  jobId?: string;
  invoiceId?: string;
  paymentId?: string;
  createdBy?: string;
  autoOpenHandoff?: boolean;
}

export interface SendMessageResult {
  success: boolean;
  record: CommunicationRecord;
  whatsappHandoff?: WhatsAppHandoffResult;
  error?: string;
}

export class CommunicationService {
  /**
   * Send or enqueue a message with template resolution and audit logging
   */
  static async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const config = BusinessConfigService.getConfig();
    const businessId = BusinessContextService.getCurrentBusinessId();
    const staff = StorageService.getCurrentStaff();

    // 1. Resolve message text
    let messageText = options.customMessage || options.content || '';
    let subject = options.customSubject || options.subject || '';

    if (options.templateId) {
      const template = TemplateRepository.getTemplateById(options.templateId, options.businessId);
      if (template) {
        const fullContext: TemplateContextData = {
          business: config,
          ...(options.contextData || {}),
        };
        messageText = TemplateService.render(template.bodyTemplate, fullContext);
        if (template.subjectTemplate) {
          subject = TemplateService.render(template.subjectTemplate, fullContext);
        }
      }
    } else if (!messageText) {
      // Find default template for this message type and channel
      const chan = options.channel === 'SMS' ? undefined : options.channel;
      const defaultTpl = TemplateRepository.getTemplateByMessageType(options.messageType, chan, options.businessId);
      if (defaultTpl) {
        const fullContext: TemplateContextData = {
          business: config,
          ...(options.contextData || {}),
        };
        messageText = TemplateService.render(defaultTpl.bodyTemplate, fullContext);
        if (defaultTpl.subjectTemplate) {
          subject = TemplateService.render(defaultTpl.subjectTemplate, fullContext);
        }
      }
    }

    if (!messageText) {
      messageText = `Notification from ${config.businessName}`;
    }

    // 2. Handle WhatsApp Channel
    if (options.channel === 'WHATSAPP') {
      const countryCode = config.communication?.whatsapp.defaultCountryCode || '+91';
      const norm = WhatsAppService.normalizePhoneNumber(options.recipient, countryCode);

      if (!norm.valid) {
        const failRecord = CommunicationQueueService.enqueue({
          channel: 'WHATSAPP',
          messageType: options.messageType,
          recipient: options.recipient,
          recipientName: options.recipientName,
          messageText,
          customerId: options.customerId,
          jobId: options.jobId,
          invoiceId: options.invoiceId,
          paymentId: options.paymentId,
          attachments: options.attachments,
        });
        failRecord.status = 'FAILED';
        failRecord.errorMessage = norm.error || 'Invalid phone number';
        CommunicationRepository.saveRecord(failRecord);

        return {
          success: false,
          record: failRecord,
          error: norm.error || 'Invalid phone number format',
        };
      }

      // Generate handoff
      let handoff: WhatsAppHandoffResult;
      if (options.autoOpenHandoff !== false) {
        handoff = WhatsAppService.openWhatsAppWeb(norm.digitsOnly, messageText, countryCode);
      } else {
        handoff = WhatsAppService.generateHandoffUrl(norm.digitsOnly, messageText, countryCode);
      }

      const record = CommunicationQueueService.enqueue({
        channel: 'WHATSAPP',
        messageType: options.messageType,
        recipient: norm.e164,
        recipientName: options.recipientName,
        messageText,
        customerId: options.customerId,
        jobId: options.jobId,
        invoiceId: options.invoiceId,
        paymentId: options.paymentId,
        attachments: options.attachments,
      });

      // Mark as HANDOFF since WhatsApp Web was generated/opened
      record.status = 'HANDOFF';
      CommunicationRepository.saveRecord(record);

      return {
        success: true,
        record,
        whatsappHandoff: handoff,
      };
    }

    // 3. Handle Email Channel
    if (options.channel === 'EMAIL') {
      const record = CommunicationQueueService.enqueue({
        channel: 'EMAIL',
        messageType: options.messageType,
        recipient: options.recipient,
        recipientName: options.recipientName,
        subject: subject || `Notification from ${config.businessName}`,
        messageText,
        customerId: options.customerId,
        jobId: options.jobId,
        invoiceId: options.invoiceId,
        paymentId: options.paymentId,
        attachments: options.attachments,
      });

      // Immediately attempt dispatch via queue
      CommunicationQueueService.processQueue().catch((e) =>
        console.warn('Background email dispatch caught:', e)
      );

      return {
        success: true,
        record,
      };
    }

    throw new Error(`Unsupported communication channel: ${options.channel}`);
  }

  /**
   * Contextual Action: Send Invoice
   */
  static async sendInvoice(
    invoice: Invoice,
    customer: Customer,
    channel: CommunicationChannel,
    pdfBase64?: string
  ): Promise<SendMessageResult> {
    const attachments: CommunicationAttachment[] = pdfBase64
      ? [
          {
            id: `att_${invoice.id}`,
            name: `${invoice.id}.pdf`,
            mimeType: 'application/pdf',
            dataBase64: pdfBase64,
            documentType: 'invoice',
            documentId: invoice.id,
          },
        ]
      : [];

    return this.sendMessage({
      channel,
      messageType: 'INVOICE',
      recipient: channel === 'WHATSAPP' ? customer.whatsapp || customer.phone : customer.email || '',
      recipientName: customer.name,
      invoiceId: invoice.id,
      customerId: customer.id,
      attachments,
      contextData: {
        customer,
        invoice,
      },
    });
  }

  /**
   * Contextual Action: Send Job Ready Notification
   */
  static async sendJobReady(
    job: JobItem,
    customer: Customer,
    channel: CommunicationChannel
  ): Promise<SendMessageResult> {
    return this.sendMessage({
      channel,
      messageType: 'JOB_READY',
      recipient: channel === 'WHATSAPP' ? customer.whatsapp || customer.phone : customer.email || '',
      recipientName: customer.name,
      jobId: job.id,
      customerId: customer.id,
      contextData: {
        customer,
        job,
      },
    });
  }

  /**
   * Contextual Action: Send Payment Receipt
   */
  static async sendPaymentReceipt(
    payment: { amount: number; method: string; date?: string; receiptNo?: string },
    invoice: Invoice | undefined,
    customer: Customer,
    channel: CommunicationChannel,
    pdfBase64?: string
  ): Promise<SendMessageResult> {
    const attachments: CommunicationAttachment[] = pdfBase64
      ? [
          {
            id: `att_rec_${Date.now()}`,
            name: `Receipt_${payment.receiptNo || 'voucher'}.pdf`,
            mimeType: 'application/pdf',
            dataBase64: pdfBase64,
            documentType: 'receipt',
          },
        ]
      : [];

    return this.sendMessage({
      channel,
      messageType: 'PAYMENT_RECEIPT',
      recipient: channel === 'WHATSAPP' ? customer.whatsapp || customer.phone : customer.email || '',
      recipientName: customer.name,
      invoiceId: invoice?.id,
      customerId: customer.id,
      attachments,
      contextData: {
        customer,
        invoice,
        payment,
      },
    });
  }

  /**
   * Contextual Action: Send Due Balance Reminder
   */
  static async sendDueReminder(
    customer: Customer,
    channel: CommunicationChannel
  ): Promise<SendMessageResult> {
    return this.sendMessage({
      channel,
      messageType: 'DUE_REMINDER',
      recipient: channel === 'WHATSAPP' ? customer.whatsapp || customer.phone : customer.email || '',
      recipientName: customer.name,
      customerId: customer.id,
      contextData: {
        customer,
      },
    });
  }

  /**
   * Compute real metrics for Communication Center Dashboard
   */
  static getDashboardMetrics(businessId?: string): {
    todayTotal: number;
    todayWhatsApp: number;
    todayEmail: number;
    todaySuccessful: number;
    todayFailed: number;
    pendingCount: number;
    failedCount: number;
  } {
    const records = CommunicationRepository.getRecords(undefined, businessId);
    const todayStr = new Date().toISOString().slice(0, 10);

    const todayRecords = records.filter((r) => r.createdAt.slice(0, 10) === todayStr);

    const todayWhatsApp = todayRecords.filter((r) => r.channel === 'WHATSAPP').length;
    const todayEmail = todayRecords.filter((r) => r.channel === 'EMAIL').length;

    const todaySuccessful = todayRecords.filter(
      (r) => r.status === 'SENT' || r.status === 'HANDOFF' || r.status === 'SENT_BY_OPERATOR'
    ).length;

    const todayFailed = todayRecords.filter((r) => r.status === 'FAILED').length;
    const pendingQueue = records.filter((r) =>
      ['QUEUED', 'PROCESSING', 'RETRY_PENDING', 'WAITING_FOR_OPERATOR'].includes(r.status)
    ).length;

    return {
      todayTotal: todayRecords.length,
      todayWhatsApp,
      todayEmail,
      todaySuccessful,
      todayFailed,
      pendingCount: pendingQueue,
      failedCount: todayFailed,
    };
  }

  static async processQueue(_businessId?: string): Promise<any> {
    return CommunicationQueueService.processQueue();
  }

  /**
   * Retry an existing communication request.
   * Retains the SAME communicationRequestId, SAME logical send, and SAME idempotency key.
   */
  static async retry(recordId: string, _businessId?: string): Promise<any> {
    return CommunicationQueueService.retry(recordId);
  }

  /**
   * Resend an existing communication request as an intentional NEW send event.
   * Unlike retry() which preserves the existing communicationRequestId and idempotency key,
   * resend() creates a brand new communicationRequestId, a fresh idempotency identity,
   * resets retryCount to 0, and records a distinct audit event.
   */
  static async resend(recordId: string, businessId?: string): Promise<CommunicationRecord | null> {
    const bId = businessId || BusinessContextService.getCurrentBusinessId();
    const original = CommunicationRepository.getRecordById(recordId, bId);
    if (!original) return null;

    // Allocate a brand-new communicationRequestId and distinct idempotency key
    const newIdempotencyKey = `${original.idempotencyKey || original.id}:resend:${Date.now()}`;
    const newRecord = CommunicationQueueService.enqueue({
      businessId: original.businessId,
      channel: original.channel,
      messageType: original.messageType,
      recipient: original.recipient,
      recipientName: original.recipientName,
      subject: original.subject,
      messageText: original.fullMessage,
      messagePreview: original.messagePreview,
      templateId: original.templateId,
      documentId: original.documentId,
      attachments: original.attachments,
      customerId: original.customerId,
      jobId: original.jobId,
      invoiceId: original.invoiceId,
      paymentId: original.paymentId,
      idempotencyKey: newIdempotencyKey,
      createdBy: original.createdBy,
    });

    return newRecord;
  }
}

