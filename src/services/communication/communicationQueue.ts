/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 12 Communication Queue & Retry Engine
 * Handles offline-first enqueuing, controlled retries with exponential backoff,
 * idempotency checks, and transparent operator handoffs.
 */

import {
  CommunicationRecord,
  CommunicationStatus,
  CommunicationChannel,
  CommunicationMessageType,
  CommunicationAttachment,
  BusinessConfig,
} from '../../types';
import { CommunicationRepository } from '../../repositories/communicationRepository';
import { BusinessContextService } from '../businessContext';
import { BusinessConfigService } from '../businessConfig';
import { EmailService } from './emailService';
import { WhatsAppService } from './whatsAppService';
import { StorageService } from '../storage';

export interface EnqueueOptions {
  businessId?: string;
  channel: CommunicationChannel;
  messageType: CommunicationMessageType;
  recipient: string;
  recipientName?: string;
  subject?: string;
  messageText?: string;
  messagePreview?: string;
  templateId?: string;
  documentId?: string;
  attachments?: CommunicationAttachment[];
  customerId?: string;
  jobId?: string;
  invoiceId?: string;
  paymentId?: string;
  idempotencyKey?: string;
  createdBy?: string;
}

export class CommunicationQueueService {
  private static processingState = false;

  static isProcessing(): boolean {
    return this.processingState;
  }

  static generateIdempotencyKey(
    businessId: string,
    messageType: string,
    documentId: string,
    recipient: string
  ): string {
    return `${businessId}:${messageType}:${documentId || recipient}`;
  }

  static checkDuplicate(businessId: string, idempotencyKey: string): boolean {
    if (!idempotencyKey) return false;
    const existing = CommunicationRepository.findByIdempotencyKey(idempotencyKey);
    return existing !== null && existing.businessId === businessId;
  }

  static getQueue(businessId?: string): CommunicationRecord[] {
    const records = CommunicationRepository.getRecords(undefined, businessId);
    return records.filter((r) =>
      r.status === 'QUEUED' ||
      r.status === 'RETRY_PENDING' ||
      r.status === 'WAITING_FOR_OPERATOR' ||
      r.status === 'PROCESSING'
    );
  }

  /**
   * Enqueue a communication request into durable queue
   */
  static enqueue(
    arg1: string | EnqueueOptions,
    arg2?: Partial<EnqueueOptions>
  ): CommunicationRecord {
    let businessId: string;
    let options: Partial<EnqueueOptions>;

    if (typeof arg1 === 'string') {
      businessId = arg1;
      options = arg2 || {};
    } else {
      options = arg1;
      businessId = options.businessId || BusinessContextService.getCurrentBusinessId();
    }

    const config = BusinessConfigService.getConfig(businessId);
    let staffName = 'System Operator';
    try {
      const staff = StorageService.getCurrentStaff();
      if (staff && staff.name) staffName = staff.name;
    } catch (_) {}

    const now = new Date().toISOString();
    const msgText = options.messageText || options.messagePreview || '';

    // 1. Idempotency Check
    const idemKey =
      options.idempotencyKey ||
      this.generateIdempotencyKey(businessId, options.messageType || 'GENERAL_MESSAGE', options.documentId || '', options.recipient || '');

    const existing = CommunicationRepository.findByIdempotencyKey(idemKey);
    if (existing && (existing.status === 'SENT' || existing.status === 'HANDOFF')) {
      console.warn(`Idempotent request duplicate detected: ${idemKey}`);
      return existing;
    }

    // 2. Determine initial status based on channel
    let initialStatus: CommunicationStatus = 'QUEUED';
    if (options.channel === 'WHATSAPP') {
      // WhatsApp Web requires manual operator interaction
      initialStatus = 'WAITING_FOR_OPERATOR';
    }

    const recordId = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const record: CommunicationRecord = {
      id: recordId,
      businessId,
      customerId: options.customerId,
      jobId: options.jobId,
      invoiceId: options.invoiceId,
      paymentId: options.paymentId,
      channel: options.channel || 'WHATSAPP',
      messageType: options.messageType || 'GENERAL_MESSAGE',
      recipient: options.recipient || '',
      recipientName: options.recipientName || 'Valued Customer',
      subject: options.subject,
      messagePreview: (options.messagePreview || msgText).slice(0, 120),
      fullMessage: msgText,
      templateId: options.templateId,
      documentId: options.documentId,
      attachments: options.attachments,
      status: initialStatus,
      provider: options.channel === 'WHATSAPP' ? 'WHATSAPP_WEB' : 'SMTP',
      createdAt: now,
      queuedAt: now,
      retryCount: 0,
      maxRetries: config.communication?.preferences?.maxQueueRetries || 3,
      idempotencyKey: idemKey,
      createdBy: options.createdBy || staffName,
    };

    CommunicationRepository.saveRecord(record);

    // Audit log enqueue
    try {
      StorageService.addLog({
        level: 'info',
        category: 'system',
        action: 'COMMUNICATION_ENQUEUED',
        actor: record.createdBy,
        message: `${record.channel} message enqueued for ${record.recipientName} (${record.recipient})`,
        details: {
          recordId: record.id,
          channel: record.channel,
          type: record.messageType,
          recipient: record.recipient,
        },
      });
    } catch (_) {}

    return record;
  }

  /**
   * Process all eligible queued items (e.g. on network restore or manual trigger)
   */
  static async processQueue(businessId?: string): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.processingState) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.processingState = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const queue = this.getQueue(businessId);
      const config = BusinessConfigService.getConfig(businessId);
      const now = Date.now();

      for (const record of queue) {
        // Skip items that are waiting for operator manual click (WhatsApp Web)
        if (record.status === 'WAITING_FOR_OPERATOR') {
          continue;
        }

        // Check if backoff window has passed for retry pending
        if (record.status === 'RETRY_PENDING' && record.nextRetryAt) {
          if (new Date(record.nextRetryAt).getTime() > now) {
            continue; // Not ready yet
          }
        }

        // Process Email items automatically
        if (record.channel === 'EMAIL') {
          processed++;
          record.status = 'PROCESSING';
          CommunicationRepository.saveRecord(record);

          try {
            const sendResult = await EmailService.sendEmail({
              to: record.recipient,
              toName: record.recipientName,
              subject: record.subject || 'Notification from ' + config.businessName,
              bodyText: record.fullMessage,
              attachments: record.attachments,
              config: config.communication?.email,
              businessId: record.businessId,
              idempotencyKey: record.idempotencyKey,
            });

            if (sendResult.success) {
              succeeded++;
              record.status = 'SENT';
              record.sentAt = new Date().toISOString();
              record.providerMessageId = sendResult.messageId;
              delete record.errorCode;
              delete record.errorMessage;
            } else {
              failed++;
              this.handleFailure(record, sendResult.errorMessage || 'Send failed', sendResult.errorCode);
            }
          } catch (err: any) {
            failed++;
            this.handleFailure(record, err.message || 'Unexpected queue processing error', 'UNKNOWN_ERROR');
          }

          CommunicationRepository.saveRecord(record);
        }
      }
    } finally {
      this.processingState = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Handle controlled failure and exponential backoff
   */
  private static handleFailure(record: CommunicationRecord, errorMsg: string, errorCode?: string): void {
    record.retryCount++;
    record.failedAt = new Date().toISOString();
    record.errorCode = errorCode || 'DELIVERY_FAILED';
    record.errorMessage = errorMsg;

    const max = record.maxRetries || 3;
    if (record.retryCount >= max) {
      record.status = 'FAILED';
      delete record.nextRetryAt;
    } else {
      record.status = 'RETRY_PENDING';
      // Exponential backoff: 30s * 2^(retryCount-1)
      const delayMs = Math.min(30000 * Math.pow(2, record.retryCount - 1), 3600000);
      record.nextRetryAt = new Date(Date.now() + delayMs).toISOString();
    }
  }

  static recordFailure(
    businessId: string,
    recordId: string,
    errorMsg: string,
    errorCode?: string
  ): CommunicationRecord | null {
    const record = CommunicationRepository.getRecordById(recordId, businessId);
    if (!record) return null;
    this.handleFailure(record, errorMsg, errorCode);
    CommunicationRepository.saveRecord(record);
    return record;
  }

  static cancelItem(businessId: string, recordId: string): CommunicationRecord | null {
    const record = CommunicationRepository.getRecordById(recordId, businessId);
    if (!record) return null;
    record.status = 'CANCELLED';
    CommunicationRepository.saveRecord(record);
    return record;
  }

  /**
   * Manually retry a failed or queued communication
   */
  static async retry(recordId: string, businessId?: string): Promise<boolean> {
    const record = CommunicationRepository.getRecordById(recordId, businessId);
    if (!record) return false;

    if (record.channel === 'WHATSAPP') {
      // Re-trigger handoff
      record.status = 'WAITING_FOR_OPERATOR';
      CommunicationRepository.saveRecord(record);
      return true;
    }

    if (record.channel === 'EMAIL') {
      record.status = 'QUEUED';
      record.retryCount = 0;
      delete record.nextRetryAt;
      CommunicationRepository.saveRecord(record);
      await this.processQueue(record.businessId);
      const updated = CommunicationRepository.getRecordById(recordId, record.businessId);
      return updated?.status === 'SENT';
    }

    return false;
  }

  /**
   * Cancel a queued or pending communication
   */
  static cancel(recordId: string, businessId?: string): boolean {
    const record = CommunicationRepository.getRecordById(recordId, businessId);
    if (!record) return false;
    record.status = 'CANCELLED';
    CommunicationRepository.saveRecord(record);
    return true;
  }

  /**
   * Operator confirms they have sent the message via WhatsApp Web
   */
  static markOperatorSent(recordId: string, businessId?: string): boolean {
    const record = CommunicationRepository.getRecordById(recordId, businessId);
    if (!record) return false;
    record.status = 'SENT_BY_OPERATOR';
    record.sentAt = new Date().toISOString();
    CommunicationRepository.saveRecord(record);
    return true;
  }
}
