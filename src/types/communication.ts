/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 12 Communication Center Types
 */

export type CommunicationChannel = 'WHATSAPP' | 'EMAIL' | 'SMS';

export type CommunicationMessageType =
  | 'GENERAL_MESSAGE'
  | 'QUOTATION'
  | 'JOB_RECEIVED'
  | 'JOB_IN_PROGRESS'
  | 'JOB_READY'
  | 'JOB_DELIVERED'
  | 'INVOICE'
  | 'PAYMENT_RECEIPT'
  | 'PAYMENT_CONFIRMATION'
  | 'DUE_REMINDER'
  | 'CUSTOMER_STATEMENT'
  | 'REFUND'
  | 'CANCELLATION'
  | 'WELCOME_MESSAGE';

export type CommunicationStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'PROCESSING'
  | 'WAITING_FOR_OPERATOR' // WhatsApp Web / manual operator step
  | 'HANDOFF'              // WhatsApp Web opened by operator
  | 'SENT_BY_OPERATOR'     // Operator confirmed sent in WhatsApp Web
  | 'SENT'                 // Successfully sent via provider / SMTP
  | 'FAILED'
  | 'RETRY_PENDING'
  | 'CANCELLED';

export type CommunicationProviderType =
  | 'WHATSAPP_WEB'
  | 'WHATSAPP_BUSINESS_API'
  | 'SMTP'
  | 'DEVELOPMENT_MOCK';

export interface CommunicationAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  dataBase64?: string;
  documentType?: 'invoice' | 'job_token' | 'receipt' | 'statement' | 'quotation';
  documentId?: string;
}

export interface CommunicationRecord {
  id: string;
  businessId: string;
  customerId?: string;
  jobId?: string;
  quotationId?: string;
  invoiceId?: string;
  paymentId?: string;

  channel: CommunicationChannel;
  messageType: CommunicationMessageType;

  recipient: string; // phone or email
  recipientName: string;

  subject?: string;
  messagePreview: string;
  fullMessage: string;

  templateId?: string;
  documentId?: string;
  attachments?: CommunicationAttachment[];

  status: CommunicationStatus;
  provider: CommunicationProviderType;
  providerMessageId?: string;

  createdAt: string;
  queuedAt?: string;
  sentAt?: string;
  failedAt?: string;

  errorCode?: string;
  errorMessage?: string;

  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;

  idempotencyKey?: string;
  createdBy: string; // Staff member name or 'System'
}

export interface CommunicationTemplate {
  id: string;
  businessId: string;
  name: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
  messageType: CommunicationMessageType;
  subjectTemplate?: string;
  bodyTemplate: string;
  variables: string[]; // e.g. ['customer.name', 'job.job_number', 'invoice.total']
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConfig {
  enabled: boolean;
  defaultCountryCode: string; // e.g. '+91'
  mode: 'WEB_MANUAL' | 'BUSINESS_API';
  apiEndpoint?: string;
  apiKeyConfigured?: boolean; // Secrets stored separately in CredentialService
}

export interface EmailConfig {
  enabled: boolean;
  senderName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  security: 'TLS' | 'STARTTLS' | 'NONE';
  username: string;
  hasPassword: boolean; // True if password stored in CredentialService
  replyTo?: string;
}

export interface CommunicationPreferences {
  transactionalEnabled: boolean;
  marketingEnabled: boolean;
  whatsappConsentRequired: boolean;
  emailConsentRequired: boolean;
  defaultChannel: 'WHATSAPP' | 'EMAIL';
  maxQueueRetries: number;
}

export interface BusinessCommunicationConfig {
  whatsapp: WhatsAppConfig;
  email: EmailConfig;
  preferences: CommunicationPreferences;
}

export interface CustomerCommunicationPreference {
  whatsapp: boolean;
  email: boolean;
  sms: boolean;
  transactional: boolean;
  marketing: boolean;
}

export interface TemplateVariableRegistryItem {
  key: string;
  category: 'business' | 'customer' | 'job' | 'invoice' | 'payment' | 'statement';
  label: string;
  example: string;
}
