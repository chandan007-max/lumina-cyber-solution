/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 12 Communication Repository
 * Multi-tenant durable persistence for communication records, queue state, and history.
 */

import { CommunicationRecord, CommunicationStatus, CommunicationChannel, CommunicationMessageType } from '../types';
import { safeStorage } from '../services/storage';
import { BusinessContextService } from '../services/businessContext';

const STORAGE_KEY = 'nil_comm_records';

export interface CommunicationFilter {
  channel?: CommunicationChannel | 'all';
  status?: CommunicationStatus | 'all';
  messageType?: CommunicationMessageType | 'all';
  customerId?: string;
  jobId?: string;
  invoiceId?: string;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export class CommunicationRepository {
  private static getAllFromStorage(): CommunicationRecord[] {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (_) {
      return [];
    }
  }

  private static saveAllToStorage(records: CommunicationRecord[]): void {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  /**
   * Multi-tenant scoped getter
   */
  static getRecords(filter?: CommunicationFilter, businessIdOverride?: string): CommunicationRecord[] {
    const activeBusinessId = businessIdOverride || BusinessContextService.getCurrentBusinessId();
    const all = this.getAllFromStorage();
    let tenantRecords = all.filter((r) => r.businessId === activeBusinessId);

    if (!filter) {
      return tenantRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filter.channel && filter.channel !== 'all') {
      tenantRecords = tenantRecords.filter((r) => r.channel === filter.channel);
    }
    if (filter.status && filter.status !== 'all') {
      tenantRecords = tenantRecords.filter((r) => r.status === filter.status);
    }
    if (filter.messageType && filter.messageType !== 'all') {
      tenantRecords = tenantRecords.filter((r) => r.messageType === filter.messageType);
    }
    if (filter.customerId) {
      tenantRecords = tenantRecords.filter((r) => r.customerId === filter.customerId);
    }
    if (filter.jobId) {
      tenantRecords = tenantRecords.filter((r) => r.jobId === filter.jobId);
    }
    if (filter.invoiceId) {
      tenantRecords = tenantRecords.filter((r) => r.invoiceId === filter.invoiceId);
    }
    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      tenantRecords = tenantRecords.filter(
        (r) =>
          r.recipient.toLowerCase().includes(q) ||
          r.recipientName.toLowerCase().includes(q) ||
          (r.subject && r.subject.toLowerCase().includes(q)) ||
          r.messagePreview.toLowerCase().includes(q) ||
          (r.jobId && r.jobId.toLowerCase().includes(q)) ||
          (r.invoiceId && r.invoiceId.toLowerCase().includes(q))
      );
    }
    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      tenantRecords = tenantRecords.filter((r) => new Date(r.createdAt).getTime() >= start);
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime();
      tenantRecords = tenantRecords.filter((r) => new Date(r.createdAt).getTime() <= end);
    }

    return tenantRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Retrieve single record by ID with strict tenant boundary check
   */
  static getRecordById(id: string, businessIdOverride?: string): CommunicationRecord | null {
    const activeBusinessId = businessIdOverride || BusinessContextService.getCurrentBusinessId();
    const all = this.getAllFromStorage();
    const found = all.find((r) => r.id === id && r.businessId === activeBusinessId);
    return found || null;
  }

  /**
   * Save or update communication record
   */
  static saveRecord(record: CommunicationRecord): void {
    const activeBusinessId = record.businessId || BusinessContextService.getCurrentBusinessId();
    const stampedRecord: CommunicationRecord = {
      ...record,
      businessId: activeBusinessId,
    };

    const all = this.getAllFromStorage();
    const index = all.findIndex((r) => r.id === stampedRecord.id);

    if (index >= 0) {
      // Security: Prevent cross-tenant record hijacking
      if (all[index].businessId !== activeBusinessId) {
        throw new Error('Tenant boundary violation: cannot modify foreign communication record.');
      }
      all[index] = stampedRecord;
    } else {
      all.push(stampedRecord);
    }

    this.saveAllToStorage(all);
  }

  /**
   * Delete communication record strictly within active tenant
   */
  static deleteRecord(id: string): boolean {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const all = this.getAllFromStorage();
    const target = all.find((r) => r.id === id);

    if (!target) return false;
    if (target.businessId !== activeBusinessId) {
      throw new Error('Tenant boundary violation: cannot delete foreign communication record.');
    }

    const filtered = all.filter((r) => r.id !== id);
    this.saveAllToStorage(filtered);
    return true;
  }

  /**
   * Retrieve active pending queue for current tenant
   */
  static getQueue(): CommunicationRecord[] {
    const records = this.getRecords();
    return records.filter((r) =>
      r.status === 'QUEUED' ||
      r.status === 'RETRY_PENDING' ||
      r.status === 'WAITING_FOR_OPERATOR' ||
      r.status === 'PROCESSING'
    );
  }

  /**
   * Check for duplicate requests using idempotency key
   */
  static findByIdempotencyKey(key: string, businessIdOverride?: string): CommunicationRecord | null {
    if (!key) return null;
    const all = this.getAllFromStorage();
    if (businessIdOverride) {
      return all.find((r) => r.idempotencyKey === key && r.businessId === businessIdOverride) || null;
    }
    return all.find((r) => r.idempotencyKey === key) || null;
  }

  /**
   * Purge records for a specific business (used in tests/teardown)
   */
  static clearTenantRecords(businessId?: string): void {
    const bId = businessId || BusinessContextService.getCurrentBusinessId();
    const all = this.getAllFromStorage();
    const remaining = all.filter((r) => r.businessId !== bId);
    this.saveAllToStorage(remaining);
  }

  static getAll(businessIdOverride?: string): CommunicationRecord[] {
    return this.getRecords(undefined, businessIdOverride);
  }

  static getById(businessId: string, id: string): CommunicationRecord | null {
    return this.getRecordById(id, businessId);
  }

  static create(businessId: string, data: Partial<CommunicationRecord>): CommunicationRecord {
    const now = new Date().toISOString();
    const id = data.id || `comm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newRecord: CommunicationRecord = {
      id,
      businessId,
      channel: data.channel || 'WHATSAPP',
      messageType: data.messageType || 'GENERAL_MESSAGE',
      recipient: data.recipient || '',
      recipientName: data.recipientName || 'Customer',
      subject: data.subject,
      messagePreview: data.messagePreview || (data.fullMessage ? data.fullMessage.slice(0, 120) : ''),
      fullMessage: data.fullMessage || data.messagePreview || '',
      templateId: data.templateId,
      documentId: data.documentId,
      status: data.status || 'QUEUED',
      provider: data.provider || (data.channel === 'EMAIL' ? 'SMTP' : 'WHATSAPP_WEB'),
      providerMessageId: data.providerMessageId,
      idempotencyKey: data.idempotencyKey,
      retryCount: data.retryCount ?? 0,
      maxRetries: data.maxRetries ?? 3,
      createdAt: data.createdAt || now,
      queuedAt: data.queuedAt || (data.status === 'QUEUED' ? now : undefined),
      sentAt: data.sentAt,
      failedAt: data.failedAt,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      createdBy: data.createdBy || 'System',
      customerId: data.customerId,
      jobId: data.jobId,
      invoiceId: data.invoiceId,
      paymentId: data.paymentId,
      attachments: data.attachments,
    };
    this.saveRecord(newRecord);
    return newRecord;
  }

  static search(businessId: string, query: string): CommunicationRecord[] {
    return this.getRecords({ searchQuery: query }, businessId);
  }

  static delete(businessId: string, id: string): boolean {
    const all = this.getAllFromStorage();
    const target = all.find((r) => r.id === id);
    if (!target) return false;
    if (target.businessId !== businessId) {
      return false; // Cross-tenant delete rejected
    }
    const remaining = all.filter((r) => r.id !== id);
    this.saveAllToStorage(remaining);
    return true;
  }

  static updateStatus(
    arg1: string,
    arg2: any,
    arg3?: any,
    arg4?: any
  ): CommunicationRecord | null {
    let businessId: string | undefined;
    let id: string;
    let status: CommunicationStatus;
    let extra: Partial<CommunicationRecord> | undefined;

    // Check if called as updateStatus(businessId, id, status, extra)
    // or updateStatus(id, status, businessIdOverride, extra)
    if (typeof arg3 === 'string' && (arg3 === 'QUEUED' || arg3 === 'SENT' || arg3 === 'FAILED' || arg3 === 'HANDOFF' || arg3 === 'CANCELLED' || arg3 === 'RETRY_PENDING' || arg3 === 'PROCESSING' || arg3 === 'WAITING_FOR_OPERATOR' || arg3 === 'DRAFT')) {
      businessId = arg1;
      id = arg2;
      status = arg3 as CommunicationStatus;
      extra = arg4;
    } else {
      id = arg1;
      status = arg2 as CommunicationStatus;
      businessId = arg3;
      extra = arg4;
    }

    const rec = this.getRecordById(id, businessId);
    if (!rec) return null;
    if (businessId && rec.businessId !== businessId) return null;

    const updated: CommunicationRecord = {
      ...rec,
      status,
      ...(extra || {}),
      sentAt: status === 'SENT' ? new Date().toISOString() : rec.sentAt,
      failedAt: status === 'FAILED' ? new Date().toISOString() : rec.failedAt,
    };

    this.saveRecord(updated);
    return updated;
  }
}
