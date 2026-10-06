import {
  BusinessConfig,
  Customer,
  DebugLog,
  ExpenseItem,
  Invoice,
  JobItem,
  JobStatus,
  MaterialItem,
  PaymentMethod,
  ServiceItem,
  StaffUser,
} from '../types';
import { BusinessConfigService } from './businessConfig';
import { BusinessContextService } from './businessContext';
import {
  INITIAL_BUSINESS_CONFIG,
  INITIAL_CUSTOMERS,
  INITIAL_DEBUG_LOGS,
  INITIAL_EXPENSES,
  INITIAL_INVOICES,
  INITIAL_JOBS,
  INITIAL_MATERIALS,
  INITIAL_SERVICES,
  INITIAL_STAFF,
} from '../data/initialData';

const DB_PREFIX = 'nil_printers_pos_';
const KEYS = {
  CONFIG: `${DB_PREFIX}config`,
  STAFF: `${DB_PREFIX}staff`,
  SERVICES: `${DB_PREFIX}services`,
  CUSTOMERS: `${DB_PREFIX}customers`,
  JOBS: `${DB_PREFIX}jobs`,
  INVOICES: `${DB_PREFIX}invoices`,
  MATERIALS: `${DB_PREFIX}materials`,
  EXPENSES: `${DB_PREFIX}expenses`,
  CURRENT_STAFF_ID: `${DB_PREFIX}current_staff_id`,
  DEBUG_LOGS: `${DB_PREFIX}debug_logs`,
};

const memoryStore = new Map<string, string>();
export const safeStorage = {
  getItem: (k: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(k);
      }
    } catch (_) {}
    return memoryStore.get(k) || null;
  },
  setItem: (k: string, v: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(k, v);
      }
    } catch (_) {}
    memoryStore.set(k, v);
  },
  removeItem: (k: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(k);
      }
    } catch (_) {}
    memoryStore.delete(k);
  },
  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (_) {}
    memoryStore.clear();
  },
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = safeStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Failed to parse ${key} from storage:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    safeStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to write ${key} to storage:`, err);
  }
}

export class StorageService {
  /**
   * Helper: Multi-tenant safe storage merger.
   * Saves records for the active tenant while preserving other tenants' records.
   */
  private static saveTenantEntities<T extends { businessId?: string; id?: string }>(
    key: string,
    tenantItems: T[],
    initialDefaults: T[] = []
  ): void {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const all = getItem<T[]>(key, initialDefaults);
    // Retain items belonging to other tenants
    const otherTenantsItems = all.filter(
      (item) => item.businessId && item.businessId !== activeBusinessId
    );
    // Stamp all tenant items with current active business ID
    const taggedTenantItems = tenantItems.map((item) => ({
      ...item,
      businessId: activeBusinessId,
    }));
    setItem(key, [...taggedTenantItems, ...otherTenantsItems]);
  }

  // Config
  static getConfig(businessIdOverride?: string): BusinessConfig {
    const raw = getItem<BusinessConfig>(KEYS.CONFIG, INITIAL_BUSINESS_CONFIG);
    return BusinessConfigService.normalizeConfig(raw);
  }

  static saveConfig(config: BusinessConfig): void {
    setItem(KEYS.CONFIG, config);
  }

  // Staff
  static getStaff(): StaffUser[] {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const all = getItem<StaffUser[]>(KEYS.STAFF, INITIAL_STAFF).map((s) => ({
      ...s,
      businessId: s.businessId || 'biz_nil_printers_001',
    }));
    return all.filter((s) => s.businessId === activeBusinessId);
  }

  static getCurrentStaff(): StaffUser {
    const staffList = this.getStaff();
    const currentId = typeof window !== 'undefined' ? localStorage.getItem(KEYS.CURRENT_STAFF_ID) : null;
    const found = staffList.find((s) => s.id === currentId);
    return found || staffList[0] || { id: 'st-def', name: 'Operator', role: 'Admin', phone: '9800099934' };
  }

  static setCurrentStaffId(id: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEYS.CURRENT_STAFF_ID, id);
    }
  }

  static saveStaff(staffList: StaffUser[]): void {
    this.saveTenantEntities(KEYS.STAFF, staffList, INITIAL_STAFF);
  }

  // Services
  static getServices(): ServiceItem[] {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const all = getItem<ServiceItem[]>(KEYS.SERVICES, INITIAL_SERVICES).map((srv) => ({
      ...srv,
      businessId: srv.businessId || 'biz_nil_printers_001',
    }));
    return all.filter((s) => s.businessId === activeBusinessId);
  }

  static saveServices(services: ServiceItem[]): void {
    this.saveTenantEntities(KEYS.SERVICES, services, INITIAL_SERVICES);
  }

  static updateService(service: ServiceItem): void {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    service.businessId = activeBusinessId;
    const all = this.getServices();
    const idx = all.findIndex((s) => s.id === service.id);
    if (idx >= 0) {
      all[idx] = service;
    } else {
      all.push(service);
    }
    this.saveServices(all);
  }

  // Customers
  static getCustomers(): Customer[] {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const list = getItem<Customer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    let modified = false;
    const sanitized = list.map((c, idx) => {
      let changed = false;
      if (!c.id) {
        c.id = `cust-${Date.now()}-${idx}`;
        changed = true;
      }
      if (!c.businessId) {
        c.businessId = 'biz_nil_printers_001';
        changed = true;
      }
      if (changed) modified = true;
      return c;
    });
    if (modified) {
      setItem(KEYS.CUSTOMERS, sanitized);
    }
    return sanitized.filter((c) => c.businessId === activeBusinessId);
  }

  static saveCustomers(customers: Customer[]): void {
    this.saveTenantEntities(KEYS.CUSTOMERS, customers, INITIAL_CUSTOMERS);
  }

  static getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  static findCustomerByPhone(phone: string): Customer | undefined {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone) return undefined;
    return this.getCustomers().find((c) => c.phone.replace(/\D/g, '').includes(cleanPhone));
  }

  static upsertCustomer(customerData: Partial<Customer> & { name: string; phone: string }): Customer {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const customers = this.getCustomers();
    const existingIndex = customers.findIndex(
      (c) => (customerData.id && c.id === customerData.id) || (customerData.phone && c.phone === customerData.phone)
    );

    if (existingIndex >= 0) {
      const existing = customers[existingIndex];
      const updated: Customer = {
        ...existing,
        ...customerData,
        id: existing.id || customerData.id || `cust-${Date.now()}`,
        businessId: activeBusinessId,
      };
      customers[existingIndex] = updated;
      this.saveCustomers(customers);
      return updated;
    } else {
      const newCust: Customer = {
        id: customerData.id || `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        businessId: activeBusinessId,
        name: customerData.name,
        phone: customerData.phone,
        whatsapp: customerData.whatsapp || customerData.phone,
        email: customerData.email,
        address: customerData.address,
        businessName: customerData.businessName,
        gstin: customerData.gstin,
        totalOrdersAmount: customerData.totalOrdersAmount || 0,
        totalPaidAmount: customerData.totalPaidAmount || 0,
        totalDueAmount: customerData.totalDueAmount || 0,
        jobCount: customerData.jobCount || 0,
        notes: customerData.notes,
        createdAt: customerData.createdAt || new Date().toISOString(),
      };
      customers.unshift(newCust);
      this.saveCustomers(customers);
      return newCust;
    }
  }

  // Jobs
  static getJobs(): JobItem[] {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const all = getItem<JobItem[]>(KEYS.JOBS, INITIAL_JOBS).map((j) => ({
      ...j,
      businessId: j.businessId || 'biz_nil_printers_001',
    }));
    return all.filter((j) => j.businessId === activeBusinessId);
  }

  static saveJobs(jobs: JobItem[]): void {
    this.saveTenantEntities(KEYS.JOBS, jobs, INITIAL_JOBS);
  }

  static generateNextJobId(): string {
    const jobs = this.getJobs();
    const prefix = 'NP-2026-';
    let maxNum = 129;
    jobs.forEach((j) => {
      const parts = j.id.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `${prefix}${String(maxNum + 1).padStart(5, '0')}`;
  }

  static addJob(job: JobItem): JobItem {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const config = BusinessConfigService.getConfig();
    if (!job.businessProfileSnapshot) {
      job.businessProfileSnapshot = { ...config.profile };
    }
    job.businessId = activeBusinessId;
    const jobs = this.getJobs();
    jobs.unshift(job);
    this.saveJobs(jobs);

    // Update customer stats
    this.recalculateCustomerStats(job.customerId);
    return job;
  }

  static updateJobStatus(jobId: string, status: JobStatus): JobItem | undefined {
    const jobs = this.getJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return undefined;

    job.status = status;
    this.saveJobs(jobs);
    return job;
  }

  static addJobPayment(
    jobId: string,
    amount: number,
    method: PaymentMethod,
    note?: string,
    staffName?: string
  ): JobItem | undefined {
    const jobs = this.getJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return undefined;

    const paymentEntry = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString(),
      amount,
      method,
      note: note || 'Due payment received',
      staff: staffName || this.getCurrentStaff()?.name || 'Sumit',
    };

    job.paymentHistory = job.paymentHistory || [];
    job.paymentHistory.push(paymentEntry);
    job.advancePaid = (job.advancePaid || 0) + amount;
    job.balanceDue = Math.max(0, job.totalAmount - job.advancePaid);

    this.saveJobs(jobs);

    // Update customer ledger
    if (job.customerId) {
      const customers = this.getCustomers();
      const customer = customers.find((c) => c.id === job.customerId);
      if (customer) {
        customer.totalPaidAmount = (customer.totalPaidAmount || 0) + amount;
        customer.totalDueAmount = Math.max(0, (customer.totalDueAmount || 0) - amount);
        this.saveCustomers(customers);
      }
    }

    this.addLog({
      level: 'success',
      category: 'payment',
      action: 'DUE_PAYMENT_COLLECTED',
      actor: staffName || this.getCurrentStaff()?.name || 'Sumit',
      message: `Payment of ₹${amount} received for Job #${job.id} (${job.serviceName}) via ${method}.`,
      details: {
        jobId: job.id,
        customerName: job.customerName,
        amount,
        method,
        note,
        remainingJobDue: job.balanceDue,
      },
    });

    return job;
  }

  static recalculateCustomerStats(customerId: string): void {
    if (!customerId) return;
    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    const allJobs = this.getJobs().filter((j) => j.customerId === customerId);
    const totalJobOrders = allJobs.reduce((sum, j) => sum + (j.totalAmount || 0), 0);
    const totalJobPaid = allJobs.reduce((sum, j) => sum + (j.advancePaid || 0), 0);
    const totalJobDue = allJobs.reduce((sum, j) => sum + (j.balanceDue || 0), 0);

    customer.totalOrdersAmount = Math.max(customer.totalOrdersAmount || 0, totalJobOrders);
    customer.totalPaidAmount = Math.max(customer.totalPaidAmount || 0, totalJobPaid);
    if (allJobs.length > 0) {
      customer.totalDueAmount = totalJobDue;
    }
    customer.jobCount = Math.max(customer.jobCount || 0, allJobs.length);

    this.saveCustomers(customers);
  }

  static recordCustomerPayment(
    customerId: string,
    amount: number,
    method: PaymentMethod = 'Cash',
    note?: string,
    staffName?: string
  ): Customer | undefined {
    if (!customerId) return undefined;
    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return undefined;

    customer.totalPaidAmount = (customer.totalPaidAmount || 0) + amount;
    customer.totalDueAmount = Math.max(0, (customer.totalDueAmount || 0) - amount);
    this.saveCustomers(customers);

    this.addLog({
      level: 'success',
      category: 'payment',
      action: 'CUSTOMER_DUE_SETTLED',
      actor: staffName || this.getCurrentStaff()?.name || 'Sumit',
      message: `Account due payment of ₹${amount} received for ${customer.name}. Remaining due: ₹${customer.totalDueAmount}.`,
      details: {
        customerId: customer.id,
        customerName: customer.name,
        amount,
        method,
        note,
        remainingDue: customer.totalDueAmount,
      },
    });

    return customer;
  }

  // Invoices
  static getInvoices(): Invoice[] {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const all = getItem<Invoice[]>(KEYS.INVOICES, INITIAL_INVOICES).map((inv) => ({
      ...inv,
      businessId: inv.businessId || 'biz_nil_printers_001',
    }));
    return all.filter((inv) => inv.businessId === activeBusinessId);
  }

  static saveInvoices(invoices: Invoice[]): void {
    this.saveTenantEntities(KEYS.INVOICES, invoices, INITIAL_INVOICES);
  }

  static generateNextInvoiceId(): string {
    const invoices = this.getInvoices();
    let maxNum = 128;
    invoices.forEach((inv) => {
      const match = inv.id.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `NP-INV-${String(maxNum + 1).padStart(6, '0')}`;
  }

  static addInvoice(invoice: Invoice): Invoice {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const config = BusinessConfigService.getConfig();
    if (!invoice.businessProfileSnapshot) {
      invoice.businessProfileSnapshot = { ...config.profile };
    }
    invoice.businessId = activeBusinessId;
    const invoices = this.getInvoices();
    invoices.unshift(invoice);
    this.saveInvoices(invoices);
    return invoice;
  }

  // Materials & Stock
  static getMaterials(): MaterialItem[] {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const all = getItem<MaterialItem[]>(KEYS.MATERIALS, INITIAL_MATERIALS).map((m) => ({
      ...m,
      businessId: m.businessId || 'biz_nil_printers_001',
    }));
    return all.filter((m) => m.businessId === activeBusinessId);
  }

  static saveMaterials(materials: MaterialItem[]): void {
    this.saveTenantEntities(KEYS.MATERIALS, materials, INITIAL_MATERIALS);
  }

  static updateStock(materialId: string, delta: number): void {
    const materials = this.getMaterials();
    const item = materials.find((m) => m.id === materialId);
    if (item) {
      item.currentStock = Math.max(0, item.currentStock + delta);
      item.lastRestocked = new Date().toISOString().split('T')[0];
      this.saveMaterials(materials);
    }
  }

  // Expenses
  static getExpenses(): ExpenseItem[] {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    const all = getItem<ExpenseItem[]>(KEYS.EXPENSES, INITIAL_EXPENSES).map((e) => ({
      ...e,
      businessId: e.businessId || 'biz_nil_printers_001',
    }));
    return all.filter((e) => e.businessId === activeBusinessId);
  }

  static saveExpenses(expenses: ExpenseItem[]): void {
    this.saveTenantEntities(KEYS.EXPENSES, expenses, INITIAL_EXPENSES);
  }

  static addExpense(expense: ExpenseItem): ExpenseItem {
    const activeBusinessId = BusinessContextService.getCurrentBusinessId();
    expense.businessId = activeBusinessId;
    const expenses = this.getExpenses();
    expenses.unshift(expense);
    this.saveExpenses(expenses);
    return expense;
  }

  // Full Database Backup & Restore
  static exportDatabaseJSON(businessIdOverride?: string): string {
    const activeBusinessId = businessIdOverride || BusinessContextService.getCurrentBusinessId();
    const config = this.getConfig(activeBusinessId);
    const backupData = {
      version: '3.2_TENANT_SECURE',
      timestamp: new Date().toISOString(),
      businessId: activeBusinessId,
      businessName: config.profile?.businessName || config.businessName || 'LUMINA Business',
      config,
      staff: this.getStaff(),
      services: this.getServices(),
      customers: this.getCustomers(),
      jobs: this.getJobs(),
      invoices: this.getInvoices(),
      materials: this.getMaterials(),
      expenses: this.getExpenses(),
      communicationRecords: getItem<any[]>('nil_comm_records', []).filter((r: any) => r.businessId === activeBusinessId),
      communicationTemplates: getItem<any[]>('nil_comm_templates', []).filter((t: any) => t.businessId === activeBusinessId),
    };
    return JSON.stringify(backupData, null, 2);
  }

  static importDatabaseJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') return false;

      const currentBusinessId = BusinessContextService.getCurrentBusinessId();

      // P0 Security: Remap imported operational data to active business ID so foreign tenant data does not leak or cause silent merging
      const remapTenant = <T extends Record<string, any>>(items?: T[]): T[] => {
        if (!Array.isArray(items)) return [];
        return items.map((item) => ({
          ...item,
          businessId: currentBusinessId,
        }));
      };

      if (data.config) {
        if (data.config.profile) {
          data.config.profile.businessId = currentBusinessId;
        }
        setItem(KEYS.CONFIG, data.config);
      }

      if (data.staff) this.saveStaff(remapTenant(data.staff));
      if (data.services) this.saveServices(remapTenant(data.services));
      if (data.customers) this.saveCustomers(remapTenant(data.customers));
      if (data.jobs) this.saveJobs(remapTenant(data.jobs));
      if (data.invoices) this.saveInvoices(remapTenant(data.invoices));
      if (data.materials) this.saveMaterials(remapTenant(data.materials));
      if (data.expenses) this.saveExpenses(remapTenant(data.expenses));

      if (data.communicationRecords) {
        const remapped = remapTenant(data.communicationRecords);
        const allExisting = getItem<any[]>('nil_comm_records', []);
        const otherTenants = allExisting.filter((r) => r.businessId !== currentBusinessId);
        setItem('nil_comm_records', [...remapped, ...otherTenants]);
      }

      if (data.communicationTemplates) {
        const remapped = remapTenant(data.communicationTemplates);
        const allExisting = getItem<any[]>('nil_comm_templates', []);
        const otherTenants = allExisting.filter((t) => t.businessId !== currentBusinessId);
        setItem('nil_comm_templates', [...remapped, ...otherTenants]);
      }

      const cfg = this.getConfig();
      cfg.lastBackupDate = new Date().toISOString();
      this.saveConfig(cfg);

      this.addLog({
        level: 'info',
        category: 'system',
        action: 'DATABASE_RESTORED',
        actor: 'System',
        message: `Database imported and bound to active tenant ${currentBusinessId}.`,
      });

      return true;
    } catch (err) {
      console.error('Failed to import database:', err);
      return false;
    }
  }

  static resetToDefault(): void {
    setItem(KEYS.CONFIG, INITIAL_BUSINESS_CONFIG);
    setItem(KEYS.STAFF, INITIAL_STAFF);
    setItem(KEYS.SERVICES, INITIAL_SERVICES);
    setItem(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    setItem(KEYS.JOBS, INITIAL_JOBS);
    setItem(KEYS.INVOICES, INITIAL_INVOICES);
    setItem(KEYS.MATERIALS, INITIAL_MATERIALS);
    setItem(KEYS.EXPENSES, INITIAL_EXPENSES);
    setItem(KEYS.DEBUG_LOGS, INITIAL_DEBUG_LOGS);
  }

  // System Debug & Diagnostic Logs
  static getLogs(): DebugLog[] {
    return getItem<DebugLog[]>(KEYS.DEBUG_LOGS, INITIAL_DEBUG_LOGS);
  }

  static saveLogs(logs: DebugLog[]): void {
    setItem(KEYS.DEBUG_LOGS, logs);
  }

  static addLog(
    entry: Omit<DebugLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): DebugLog {
    const logs = this.getLogs();
    const newLog: DebugLog = {
      id: entry.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level,
      category: entry.category,
      action: entry.action,
      actor: entry.actor || this.getCurrentStaff().name,
      message: entry.message,
      details: entry.details,
    };
    logs.unshift(newLog);
    this.saveLogs(logs.slice(0, 50));
    return newLog;
  }

  static clearLogs(): void {
    setItem(KEYS.DEBUG_LOGS, []);
  }

  static resetLogsToDefault(): void {
    setItem(KEYS.DEBUG_LOGS, INITIAL_DEBUG_LOGS);
  }
}
