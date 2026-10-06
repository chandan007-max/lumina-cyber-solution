/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUMINA CYBER SOLUTION — Phase 12 Template Service & Variable Registry
 * Provides deterministic, injection-safe variable substitution for WhatsApp and Email messages.
 */

import {
  BusinessConfig,
  Customer,
  Invoice,
  JobItem,
  CommunicationMessageType,
  CommunicationTemplate,
  TemplateVariableRegistryItem,
} from '../../types';

export const TEMPLATE_VARIABLE_REGISTRY: TemplateVariableRegistryItem[] = [
  // Business Variables
  { key: 'business.name', category: 'business', label: 'Business Name', example: 'NiL Printers' },
  { key: 'business.phone', category: 'business', label: 'Business Phone', example: '9800099934' },
  { key: 'business.email', category: 'business', label: 'Business Email', example: 'nilprinters2026@gmail.com' },
  { key: 'business.address', category: 'business', label: 'Shop Address', example: 'Sabujer Hat, New Digha' },
  { key: 'business.upi_id', category: 'business', label: 'UPI VPA Address', example: '9800099934@upi' },

  // Customer Variables
  { key: 'customer.name', category: 'customer', label: 'Customer Full Name', example: 'Rahul Das' },
  { key: 'customer.phone', category: 'customer', label: 'Customer Mobile', example: '9832011223' },
  { key: 'customer.email', category: 'customer', label: 'Customer Email', example: 'rahul@example.com' },
  { key: 'customer.due_amount', category: 'customer', label: 'Customer Total Outstanding Due', example: '450' },

  // Job Variables
  { key: 'job.job_number', category: 'job', label: 'Job Order Number', example: 'NP-2026-00125' },
  { key: 'job.service_name', category: 'job', label: 'Service / Category Name', example: '8x4 Flex Banner' },
  { key: 'job.status', category: 'job', label: 'Job Current Status', example: 'Ready for Delivery' },
  { key: 'job.total', category: 'job', label: 'Job Order Total Amount', example: '650' },
  { key: 'job.advance_paid', category: 'job', label: 'Job Advance Paid', example: '300' },
  { key: 'job.due_amount', category: 'job', label: 'Job Balance Due', example: '350' },
  { key: 'job.ready_date', category: 'job', label: 'Ready / Delivery Deadline', example: 'Today, 5:00 PM' },

  // Invoice Variables
  { key: 'invoice.number', category: 'invoice', label: 'Invoice Serial Number', example: 'INV-2026-00142' },
  { key: 'invoice.total', category: 'invoice', label: 'Invoice Grand Total', example: '1,250' },
  { key: 'invoice.paid', category: 'invoice', label: 'Invoice Amount Paid', example: '1,250' },
  { key: 'invoice.due', category: 'invoice', label: 'Invoice Balance Due', example: '0' },
  { key: 'invoice.date', category: 'invoice', label: 'Invoice Creation Date', example: '06-Oct-2026' },

  // Payment Variables
  { key: 'payment.amount', category: 'payment', label: 'Payment Transaction Amount', example: '500' },
  { key: 'payment.method', category: 'payment', label: 'Payment Method (UPI/Cash)', example: 'UPI' },
  { key: 'payment.date', category: 'payment', label: 'Payment Date & Time', example: '06-Oct-2026 3:45 PM' },
  { key: 'payment.receipt_no', category: 'payment', label: 'Receipt / Voucher Number', example: 'REC-2026-0089' },

  // Statement Variables
  { key: 'statement.total_billed', category: 'statement', label: 'Lifetime Billed Total', example: '8,400' },
  { key: 'statement.total_paid', category: 'statement', label: 'Lifetime Paid Total', example: '7,200' },
  { key: 'statement.total_due', category: 'statement', label: 'Current Outstanding Balance', example: '1,200' },
  { key: 'statement.date', category: 'statement', label: 'Statement Issue Date', example: '06-Oct-2026' },
];

export interface TemplateContextData {
  business?: Partial<BusinessConfig>;
  customer?: Partial<Customer>;
  job?: Partial<JobItem>;
  invoice?: Partial<Invoice>;
  payment?: {
    amount?: number;
    method?: string;
    date?: string;
    receiptNo?: string;
  };
  statement?: {
    totalBilled?: number;
    totalPaid?: number;
    totalDue?: number;
    date?: string;
  };
}

export interface TemplateValidationResult {
  valid: boolean;
  usedVariables: string[];
  unsupportedVariables: string[];
  warnings: string[];
}

export class TemplateService {
  private static VARIABLE_REGEX = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

  /**
   * Extract all variable keys present in a template string
   */
  static extractVariables(text: string): string[] {
    if (!text) return [];
    const vars: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(this.VARIABLE_REGEX);
    while ((match = regex.exec(text)) !== null) {
      if (!vars.includes(match[1])) {
        vars.push(match[1]);
      }
    }
    return vars;
  }

  /**
   * Validate template syntax against documented variable registry
   */
  static validateTemplate(text: string): TemplateValidationResult {
    const usedVariables = this.extractVariables(text);
    const validKeys = new Set(TEMPLATE_VARIABLE_REGISTRY.map((v) => v.key));
    const unsupportedVariables: string[] = [];
    const warnings: string[] = [];

    for (const v of usedVariables) {
      if (!validKeys.has(v)) {
        unsupportedVariables.push(v);
        warnings.push(`Unknown or unsupported variable: {{${v}}}`);
      }
    }

    return {
      valid: unsupportedVariables.length === 0,
      usedVariables,
      unsupportedVariables,
      warnings,
    };
  }

  static getVariableRegistry(): TemplateVariableRegistryItem[] {
    return TEMPLATE_VARIABLE_REGISTRY;
  }

  static validateSyntax(text: string): {
    isValid: boolean;
    errors: string[];
    hasUnknownVariables: boolean;
    unknownVariables: string[];
  } {
    const res = this.validateTemplate(text);
    return {
      isValid: res.valid,
      errors: res.warnings,
      hasUnknownVariables: res.unsupportedVariables.length > 0,
      unknownVariables: res.unsupportedVariables,
    };
  }

  static buildContext(data: TemplateContextData): TemplateContextData {
    return data;
  }

  /**
   * Flatten context data into key-value map for variable resolution
   */
  static buildValueMap(data: TemplateContextData): Record<string, string> {
    const map: Record<string, string> = {};

    // Business
    const bProfile = data.business?.profile;
    map['business.name'] = (data.business as any)?.name || bProfile?.businessName || data.business?.businessName || 'NiL Printers';
    map['business.phone'] = (data.business as any)?.phone || bProfile?.mobile || (data.business?.phones && data.business.phones[0]) || '';
    map['business.email'] = (data.business as any)?.email || bProfile?.email || (data.business?.emails && data.business.emails[0]) || '';
    map['business.address'] = (data.business as any)?.address || data.business?.address || bProfile?.addressLine1 || '';
    map['business.upi_id'] = (data.business as any)?.upi_id || data.business?.payment?.upiId || data.business?.upiId || '';

    // Customer
    if (data.customer) {
      map['customer.name'] = data.customer.name || 'Valued Customer';
      map['customer.phone'] = data.customer.phone || data.customer.whatsapp || '';
      map['customer.email'] = data.customer.email || '';
      map['customer.due_amount'] = (data.customer.totalDueAmount ?? 0).toLocaleString('en-IN');
    }

    // Job
    if (data.job) {
      const anyJob = data.job as any;
      map['job.job_number'] = anyJob.job_number || anyJob.jobNumber || data.job.id || '';
      map['job.service_name'] = anyJob.service_name || anyJob.serviceName || data.job.customSpecsSummary || 'Job Service';
      map['job.status'] = anyJob.status ? this.formatJobStatus(anyJob.status) : 'Received';
      map['job.total'] = anyJob.total != null ? (typeof anyJob.total === 'number' ? anyJob.total.toLocaleString('en-IN') : String(anyJob.total)) : (data.job.totalAmount ?? 0).toLocaleString('en-IN');
      map['job.advance_paid'] = anyJob.advance_paid != null ? String(anyJob.advance_paid) : (data.job.advancePaid ?? 0).toLocaleString('en-IN');
      map['job.due_amount'] = anyJob.due_amount != null ? (typeof anyJob.due_amount === 'number' ? anyJob.due_amount.toLocaleString('en-IN') : String(anyJob.due_amount)) : (data.job.balanceDue ?? 0).toLocaleString('en-IN');
      map['job.ready_date'] = anyJob.ready_date || data.job.deliveryDeadline || 'Ready Now';
    }

    // Invoice
    if (data.invoice) {
      const anyInv = data.invoice as any;
      map['invoice.number'] = anyInv.number || anyInv.invoiceNumber || data.invoice.id || '';
      map['invoice.total'] = anyInv.total != null ? (typeof anyInv.total === 'number' ? anyInv.total.toLocaleString('en-IN') : String(anyInv.total)) : (data.invoice.total ?? 0).toLocaleString('en-IN');
      map['invoice.paid'] = anyInv.paid != null ? (typeof anyInv.paid === 'number' ? anyInv.paid.toLocaleString('en-IN') : String(anyInv.paid)) : (data.invoice.paid ?? 0).toLocaleString('en-IN');
      map['invoice.due'] = anyInv.due != null ? (typeof anyInv.due === 'number' ? anyInv.due.toLocaleString('en-IN') : String(anyInv.due)) : (data.invoice.balance ?? 0).toLocaleString('en-IN');
      map['invoice.date'] = anyInv.date ? (isNaN(Date.parse(anyInv.date)) ? anyInv.date : new Date(anyInv.date).toLocaleDateString('en-IN')) : '';
    }

    // Payment
    if (data.payment) {
      map['payment.amount'] = (data.payment.amount ?? 0).toLocaleString('en-IN');
      map['payment.method'] = data.payment.method || 'Cash';
      map['payment.date'] = data.payment.date ? new Date(data.payment.date).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
      map['payment.receipt_no'] = data.payment.receiptNo || 'REC-CURRENT';
    }

    // Statement
    if (data.statement) {
      map['statement.total_billed'] = (data.statement.totalBilled ?? 0).toLocaleString('en-IN');
      map['statement.total_paid'] = (data.statement.totalPaid ?? 0).toLocaleString('en-IN');
      map['statement.total_due'] = (data.statement.totalDue ?? 0).toLocaleString('en-IN');
      map['statement.date'] = data.statement.date || new Date().toLocaleDateString('en-IN');
    }

    return map;
  }

  /**
   * Deterministically render a template with given context.
   * Safe data substitution — zero code execution!
   */
  static render(template: string, data: TemplateContextData): string {
    if (!template) return '';
    const valueMap = this.buildValueMap(data);

    return template.replace(this.VARIABLE_REGEX, (_, key: string) => {
      if (Object.prototype.hasOwnProperty.call(valueMap, key)) {
        return valueMap[key] !== undefined && valueMap[key] !== null ? String(valueMap[key]) : '';
      }
      // If variable is unknown or missing from context, return clean empty or placeholder
      return ``;
    });
  }

  private static formatJobStatus(status: string): string {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'received': return 'Order Received';
      case 'designing': return 'In Designing';
      case 'printing': return 'Printing in Progress';
      case 'ready': return 'Ready for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  /**
   * Generate pre-packaged standard templates for Indian cyber café & printing shops
   */
  static getDefaultTemplates(businessId: string): CommunicationTemplate[] {
    const now = new Date().toISOString();
    return [
      {
        id: `tpl_def_job_ready_${businessId}`,
        businessId,
        name: 'Job Ready for Collection',
        channel: 'BOTH',
        messageType: 'JOB_READY',
        subjectTemplate: 'Your Job {{job.job_number}} is Ready — {{business.name}}',
        bodyTemplate:
          'Namaste {{customer.name}},\n\nYour job order *{{job.job_number}}* ({{job.service_name}}) is now *READY FOR COLLECTION* at {{business.name}}.\n\nTotal: ₹{{job.total}}\nBalance Due: ₹{{job.due_amount}}\n\nPlease visit our shop to collect your prints. Thank you!\n— {{business.name}} (Ph: {{business.phone}})',
        variables: ['customer.name', 'job.job_number', 'job.service_name', 'business.name', 'job.total', 'job.due_amount', 'business.phone'],
        isDefault: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `tpl_def_invoice_${businessId}`,
        businessId,
        name: 'Tax Invoice & Bill Summary',
        channel: 'BOTH',
        messageType: 'INVOICE',
        subjectTemplate: 'Invoice {{invoice.number}} from {{business.name}}',
        bodyTemplate:
          'Dear {{customer.name}},\n\nThank you for choosing {{business.name}}! Please find your invoice details below:\n\nInvoice: *{{invoice.number}}*\nDate: {{invoice.date}}\nInvoice Total: ₹{{invoice.total}}\nAmount Paid: ₹{{invoice.paid}}\nBalance Due: ₹{{invoice.due}}\n\nUPI Payment ID: {{business.upi_id}}\n\nThank you for your business!\n— {{business.name}} (Ph: {{business.phone}})',
        variables: ['customer.name', 'business.name', 'invoice.number', 'invoice.date', 'invoice.total', 'invoice.paid', 'invoice.due', 'business.upi_id', 'business.phone'],
        isDefault: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `tpl_def_receipt_${businessId}`,
        businessId,
        name: 'Payment Receipt Confirmation',
        channel: 'BOTH',
        messageType: 'PAYMENT_RECEIPT',
        subjectTemplate: 'Payment Receipt — {{business.name}}',
        bodyTemplate:
          'Dear {{customer.name}},\n\nWe have received payment of *₹{{payment.amount}}* via *{{payment.method}}* on {{payment.date}}.\n\nRemaining Account Balance: ₹{{customer.due_amount}}\n\nThank you for prompt payment!\n— {{business.name}} (Ph: {{business.phone}})',
        variables: ['customer.name', 'payment.amount', 'payment.method', 'payment.date', 'customer.due_amount', 'business.name', 'business.phone'],
        isDefault: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `tpl_def_due_reminder_${businessId}`,
        businessId,
        name: 'Friendly Due Balance Reminder',
        channel: 'BOTH',
        messageType: 'DUE_REMINDER',
        subjectTemplate: 'Friendly Balance Reminder — {{business.name}}',
        bodyTemplate:
          'Namaste {{customer.name}},\n\nThis is a gentle reminder from {{business.name}} regarding the outstanding balance of *₹{{customer.due_amount}}* on your account.\n\nYou can pay directly via UPI: *{{business.upi_id}}* or visit our shop at {{business.address}}.\n\nIf you have already paid, please ignore this message. Thank you!\n— {{business.name}} (Ph: {{business.phone}})',
        variables: ['customer.name', 'business.name', 'customer.due_amount', 'business.upi_id', 'business.address', 'business.phone'],
        isDefault: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `tpl_def_job_received_${businessId}`,
        businessId,
        name: 'Job Order Received Confirmation',
        channel: 'BOTH',
        messageType: 'JOB_RECEIVED',
        subjectTemplate: 'Job Order #{{job.job_number}} Received — {{business.name}}',
        bodyTemplate:
          'Hello {{customer.name}},\n\nYour job order *{{job.job_number}}* for *{{job.service_name}}* has been received at {{business.name}}.\n\nEstimated completion: {{job.ready_date}}\nAdvance Paid: ₹{{job.advance_paid}}\nBalance Due: ₹{{job.due_amount}}\n\nWe will notify you once ready!\n— {{business.name}} (Ph: {{business.phone}})',
        variables: ['customer.name', 'job.job_number', 'job.service_name', 'business.name', 'job.ready_date', 'job.advance_paid', 'job.due_amount', 'business.phone'],
        isDefault: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `tpl_def_quotation_${businessId}`,
        businessId,
        name: 'Price Quotation / Estimate',
        channel: 'BOTH',
        messageType: 'QUOTATION',
        subjectTemplate: 'Quotation for {{job.service_name}} — {{business.name}}',
        bodyTemplate:
          'Hello {{customer.name}},\n\nPlease find your requested price quotation for *{{job.service_name}}*:\n\nEstimated Total: *₹{{job.total}}*\n\nPlease confirm if you would like us to proceed with printing.\n\nThank you,\n— {{business.name}} (Ph: {{business.phone}})',
        variables: ['customer.name', 'job.service_name', 'job.total', 'business.name', 'business.phone'],
        isDefault: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `tpl_def_statement_${businessId}`,
        businessId,
        name: 'Customer Account Statement',
        channel: 'BOTH',
        messageType: 'CUSTOMER_STATEMENT',
        subjectTemplate: 'Account Statement as of {{statement.date}} — {{business.name}}',
        bodyTemplate:
          'Dear {{customer.name}},\n\nAccount summary statement from {{business.name}} as of {{statement.date}}:\n\nTotal Billed: ₹{{statement.total_billed}}\nTotal Paid: ₹{{statement.total_paid}}\nOutstanding Due: *₹{{statement.total_due}}*\n\nFor any queries, please call us at {{business.phone}}.\n— {{business.name}}',
        variables: ['customer.name', 'business.name', 'statement.date', 'statement.total_billed', 'statement.total_paid', 'statement.total_due', 'business.phone'],
        isDefault: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `tpl_def_welcome_${businessId}`,
        businessId,
        name: 'Welcome to Shop',
        channel: 'BOTH',
        messageType: 'WELCOME_MESSAGE',
        subjectTemplate: 'Welcome to {{business.name}}!',
        bodyTemplate:
          'Namaste {{customer.name}},\n\nWelcome to {{business.name}}! We specialize in High-Quality Printing, Photo Framing, Xerox, Flex Banners, and Online Digital Govt Services.\n\nAddress: {{business.address}}\nContact: {{business.phone}}\n\nWe look forward to serving you!',
        variables: ['customer.name', 'business.name', 'business.address', 'business.phone'],
        isDefault: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
