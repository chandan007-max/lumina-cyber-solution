/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BusinessConfig,
  Customer,
  ExpenseItem,
  Invoice,
  JobItem,
  JobStatus,
  MaterialItem,
  PaymentMethod,
  ServiceItem,
  StaffUser,
} from './types';
import { StorageService } from './services/storage';
import { CloudBackupService } from './services/cloudBackup';

import { LicenseService } from './services/licenseService';
import { LicenseStatusBanner } from './components/license/LicenseStatusBanner';
import { LicenseActivationModal } from './components/license/LicenseActivationModal';

// Layout & Common Components
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { ShortcutsHelpModal } from './components/common/ShortcutsHelpModal';
import { PrintReceiptModal } from './components/print/PrintReceiptModal';
import { DebugLogsModal } from './components/common/DebugLogsModal';
import { CloudBackupModal } from './components/common/CloudBackupModal';

// Modals
import { QuickBillModal } from './components/pos/QuickBillModal';
import { NewJobModal } from './components/jobs/NewJobModal';
import { CollectPaymentModal } from './components/dues/CollectPaymentModal';
import { AddExpenseModal } from './components/expenses/AddExpenseModal';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { JobBoardView } from './components/jobs/JobBoardView';
import { InvoiceHistoryView } from './components/pos/InvoiceHistoryView';
import { NewBillView } from './components/pos/NewBillView';
import { CustomersView } from './components/customers/CustomersView';
import { DueManagementView } from './components/dues/DueManagementView';
import { ServicesMasterView } from './components/services/ServicesMasterView';
import { InventoryView } from './components/inventory/InventoryView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { CommunicationCenterView } from './components/communication/CommunicationCenterView';
import { MessagePreviewModal } from './components/communication/MessagePreviewModal';
import { OperationsCenterView } from './components/operations/OperationsCenterView';

export default function App() {
  // Database State
  const [config, setConfig] = useState<BusinessConfig>(() => StorageService.getConfig());
  const [staffList, setStaffList] = useState<StaffUser[]>(() => StorageService.getStaff());
  const [currentStaff, setCurrentStaff] = useState<StaffUser>(() =>
    StorageService.getCurrentStaff()
  );
  const [services, setServices] = useState<ServiceItem[]>(() =>
    StorageService.getServices()
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    StorageService.getCustomers()
  );
  const [jobs, setJobs] = useState<JobItem[]>(() => StorageService.getJobs());
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    StorageService.getInvoices()
  );
  const [materials, setMaterials] = useState<MaterialItem[]>(() =>
    StorageService.getMaterials()
  );
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() =>
    StorageService.getExpenses()
  );

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals visibility
  const [isQuickBillOpen, setIsQuickBillOpen] = useState(false);
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isCloudBackupOpen, setIsCloudBackupOpen] = useState(false);
  const [isLicenseActivationOpen, setIsLicenseActivationOpen] = useState(false);
  const [licenseValidation, setLicenseValidation] = useState(() =>
    LicenseService.validateLicense()
  );

  // Auto trigger daily cloud backup on app initialization if due
  useEffect(() => {
    CloudBackupService.checkAndTriggerAutoDailyBackup();
  }, []);

  // Target contexts for modals
  const [jobToRepeat, setJobToRepeat] = useState<JobItem | null>(null);
  const [preSelectedCustomerIdForDue, setPreSelectedCustomerIdForDue] = useState<
    string | undefined
  >();
  const [preSelectedJobIdForDue, setPreSelectedJobIdForDue] = useState<
    string | undefined
  >();

  // Dark Mode Theme Management
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('nil_theme') as 'light' | 'dark' | 'system' | null;
    if (saved) return saved;
    return (StorageService.getConfig().themeMode as 'light' | 'dark' | 'system') || 'light';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('nil_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    let activeDark = false;
    if (themeMode === 'dark') {
      activeDark = true;
    } else if (themeMode === 'light') {
      activeDark = false;
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      activeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setIsDark(activeDark);
    if (activeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('nil_theme', themeMode);
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Print Modal State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | undefined>();
  const [printJob, setPrintJob] = useState<JobItem | undefined>();
  const [printMode, setPrintMode] = useState<'invoice' | 'job_token' | 'payment_slip'>('invoice');
  const [autoTriggerPrint, setAutoTriggerPrint] = useState(false);

  // Debug Logs State
  const [isDebugLogsOpen, setIsDebugLogsOpen] = useState(false);

  // Sync / Refresh All Data
  const refreshAllData = useCallback(() => {
    setConfig(StorageService.getConfig());
    setStaffList(StorageService.getStaff());
    setCurrentStaff(StorageService.getCurrentStaff());
    setServices(StorageService.getServices());
    setCustomers(StorageService.getCustomers());
    setJobs(StorageService.getJobs());
    setInvoices(StorageService.getInvoices());
    setMaterials(StorageService.getMaterials());
    setExpenses(StorageService.getExpenses());
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or textarea unless pressing function key or ESC
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if (e.key === 'Escape') {
        setIsQuickBillOpen(false);
        setIsNewJobOpen(false);
        setIsCollectPaymentOpen(false);
        setIsGlobalSearchOpen(false);
        setIsShortcutsHelpOpen(false);
        setIsPrintOpen(false);
        setIsDebugLogsOpen(false);
        setIsCloudBackupOpen(false);
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setIsQuickBillOpen(true);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setJobToRepeat(null);
        setIsNewJobOpen(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setPreSelectedCustomerIdForDue(undefined);
        setPreSelectedJobIdForDue(undefined);
        setIsCollectPaymentOpen(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        setIsAddExpenseOpen(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        setActiveTab('jobs');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setActiveTab('customers');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setActiveTab('reports');
      } else if (e.key === 'F9') {
        e.preventDefault();
        toggleTheme();
      } else if (e.key === 'F10' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        setIsDebugLogsOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      } else if (e.key === '?' && !isInput) {
        setIsShortcutsHelpOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Staff switcher
  const handleStaffChange = (staff: StaffUser) => {
    setCurrentStaff(staff);
    StorageService.setCurrentStaffId(staff.id);
  };

  // Job Actions
  const handleUpdateJobStatus = (jobId: string, status: JobStatus) => {
    StorageService.updateJobStatus(jobId, status);
    setJobs(StorageService.getJobs());
  };

  const handleJobCreated = (job: JobItem, printReceipt = false) => {
    refreshAllData();
    if (printReceipt) {
      setPrintJob(job);
      setPrintInvoice(undefined);
      setPrintMode('job_token');
      setAutoTriggerPrint(true);
      setIsPrintOpen(true);
    }
  };

  const handleInvoiceCreated = (invoice: Invoice, shouldPrint = false) => {
    refreshAllData();
    if (shouldPrint) {
      setPrintInvoice(invoice);
      setPrintJob(undefined);
      setPrintMode('invoice');
      setAutoTriggerPrint(true);
      setIsPrintOpen(true);
    }
  };

  const handleRepeatJob = (job: JobItem) => {
    setJobToRepeat(job);
    setIsNewJobOpen(true);
  };

  const handlePrintJobToken = (job: JobItem) => {
    setPrintJob(job);
    setPrintInvoice(undefined);
    setPrintMode('job_token');
    setIsPrintOpen(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    setPrintInvoice(invoice);
    setPrintJob(undefined);
    setPrintMode('invoice');
    setIsPrintOpen(true);
  };

  const handleCollectJobPayment = (job: JobItem) => {
    setPreSelectedCustomerIdForDue(job.customerId);
    setPreSelectedJobIdForDue(job.id);
    setIsCollectPaymentOpen(true);
  };

  const handleCollectCustomerPayment = (customerId: string) => {
    setPreSelectedCustomerIdForDue(customerId);
    setPreSelectedJobIdForDue(undefined);
    setIsCollectPaymentOpen(true);
  };

  const handlePaymentRecorded = (
    job?: JobItem,
    customer?: Customer,
    shouldPrint = false,
    receiptInvoice?: Invoice
  ) => {
    refreshAllData();
    if (shouldPrint) {
      if (receiptInvoice) {
        setPrintInvoice(receiptInvoice);
        setPrintJob(undefined);
        setPrintMode('payment_slip');
      } else if (job) {
        setPrintJob(job);
        setPrintInvoice(undefined);
        setPrintMode('job_token');
      }
      setAutoTriggerPrint(true);
      setIsPrintOpen(true);
    }
  };

  const handleUpdateStock = (materialId: string, delta: number) => {
    StorageService.updateStock(materialId, delta);
    setMaterials(StorageService.getMaterials());
  };

  const handleAddMaterial = (material: MaterialItem) => {
    const list = StorageService.getMaterials();
    list.push(material);
    StorageService.saveMaterials(list);
    setMaterials(list);
  };

  const handleAddExpense = (expense: ExpenseItem) => {
    StorageService.addExpense(expense);
    setExpenses(StorageService.getExpenses());
  };

  const handleUpdateService = (service: ServiceItem) => {
    StorageService.updateService(service);
    setServices(StorageService.getServices());
  };

  // Counters for badges
  const pendingJobsCount = jobs.filter(
    (j) => j.status !== 'delivered' && j.status !== 'ready'
  ).length;
  const readyJobsCount = jobs.filter((j) => j.status === 'ready').length;
  const dueAmount = customers.reduce((sum, c) => sum + c.totalDueAmount, 0);
  const lowStockCount = materials.filter(
    (m) => m.currentStock <= m.minStockLevel
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Top Header */}
      <Header
        config={config}
        currentStaff={currentStaff}
        staffList={staffList}
        onStaffChange={handleStaffChange}
        onOpenQuickBill={() => setIsQuickBillOpen(true)}
        onOpenNewJob={() => {
          setJobToRepeat(null);
          setIsNewJobOpen(true);
        }}
        onOpenCollectPayment={() => {
          setPreSelectedCustomerIdForDue(undefined);
          setPreSelectedJobIdForDue(undefined);
          setIsCollectPaymentOpen(true);
        }}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onOpenShortcuts={() => setIsShortcutsHelpOpen(true)}
        onOpenCloudBackup={() => setIsCloudBackupOpen(true)}
        lowStockCount={lowStockCount}
        onNavigateToInventory={() => setActiveTab('inventory')}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Commercial Subscription Warning/Status Banner */}
      <LicenseStatusBanner
        validation={licenseValidation}
        onOpenActivationModal={() => setIsLicenseActivationOpen(true)}
        onOpenSettingsLicense={() => setActiveTab('settings')}
      />

      {/* Main Layout: Sidebar + Active Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'quick_bill') {
              setIsQuickBillOpen(true);
            } else if (tab === 'new_job') {
              setJobToRepeat(null);
              setIsNewJobOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          pendingJobsCount={pendingJobsCount}
          readyJobsCount={readyJobsCount}
          dueAmount={dueAmount}
          lowStockCount={lowStockCount}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenDebugLogs={() => setIsDebugLogsOpen(true)}
        />

        {/* View Router */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
          {activeTab === 'dashboard' && (
            <DashboardView
              jobs={jobs}
              customers={customers}
              invoices={invoices}
              materials={materials}
              onOpenQuickBill={() => setIsQuickBillOpen(true)}
              onOpenNewJob={() => {
                setJobToRepeat(null);
                setIsNewJobOpen(true);
              }}
              onOpenCollectPayment={() => {
                setPreSelectedCustomerIdForDue(undefined);
                setPreSelectedJobIdForDue(undefined);
                setIsCollectPaymentOpen(true);
              }}
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
              onSelectJob={(j) => {
                setActiveTab('jobs');
              }}
              onNavigateToTab={(tab) => {
                if (tab === 'quick_bill') {
                  setActiveTab('pos_billing');
                } else {
                  setActiveTab(tab);
                }
              }}
            />
          )}

          {activeTab === 'pos_billing' && (
            <NewBillView
              services={services}
              customers={customers}
              currentStaff={currentStaff}
              onInvoiceCreated={handleInvoiceCreated}
              onOpenNewJob={() => {
                setJobToRepeat(null);
                setIsNewJobOpen(true);
              }}
            />
          )}

          {activeTab === 'jobs' && (
            <JobBoardView
              jobs={jobs}
              customers={customers}
              onUpdateJobStatus={handleUpdateJobStatus}
              onOpenNewJob={() => {
                setJobToRepeat(null);
                setIsNewJobOpen(true);
              }}
              onRepeatJob={handleRepeatJob}
              onPrintJobToken={handlePrintJobToken}
              onCollectJobPayment={handleCollectJobPayment}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoiceHistoryView
              invoices={invoices}
              onPrintInvoice={handlePrintInvoice}
              onOpenQuickBill={() => setIsQuickBillOpen(true)}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              jobs={jobs}
              onOpenNewJobForCustomer={(cust) => {
                setJobToRepeat(null);
                setIsNewJobOpen(true);
              }}
              onRepeatJob={handleRepeatJob}
            />
          )}

          {activeTab === 'dues' && (
            <DueManagementView
              customers={customers}
              jobs={jobs}
              invoices={invoices}
              onOpenCollectPaymentForCustomer={handleCollectCustomerPayment}
              onOpenCollectPaymentForJob={handleCollectJobPayment}
              onPrintInvoice={handlePrintInvoice}
            />
          )}

          {activeTab === 'communication' && (
            <CommunicationCenterView
              customers={customers}
              jobs={jobs}
              invoices={invoices}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'services' && (
            <ServicesMasterView
              services={services}
              onUpdateService={handleUpdateService}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              materials={materials}
              onUpdateStock={handleUpdateStock}
              onAddMaterial={handleAddMaterial}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              materials={materials}
              onAddExpense={handleAddExpense}
              onUpdateStock={handleUpdateStock}
              onAddMaterial={handleAddMaterial}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              invoices={invoices}
              jobs={jobs}
              expenses={expenses}
              customers={customers}
              materials={materials}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              config={config}
              onUpdateConfig={(cfg) => setConfig(cfg)}
              onRefreshAllData={refreshAllData}
              currentTheme={themeMode}
              onThemeChange={setThemeMode}
              onOpenDebugLogs={() => setIsDebugLogsOpen(true)}
              onOpenCloudBackup={() => setIsCloudBackupOpen(true)}
            />
          )}

          {activeTab === 'operations' && (
            <OperationsCenterView
              onNavigateToBackup={() => setIsCloudBackupOpen(true)}
              onNavigateToSettings={() => setActiveTab('settings')}
              onNavigateToCommunication={() => setActiveTab('communication')}
            />
          )}
        </main>
      </div>

      {/* Global Modals & Dialogs */}
      <QuickBillModal
        isOpen={isQuickBillOpen}
        onClose={() => setIsQuickBillOpen(false)}
        services={services}
        customers={customers}
        currentStaff={currentStaff}
        onInvoiceCreated={handleInvoiceCreated}
      />

      <NewJobModal
        isOpen={isNewJobOpen}
        onClose={() => setIsNewJobOpen(false)}
        customers={customers}
        currentStaff={currentStaff}
        onJobCreated={handleJobCreated}
        initialJobToRepeat={jobToRepeat}
      />

      <CollectPaymentModal
        isOpen={isCollectPaymentOpen}
        onClose={() => setIsCollectPaymentOpen(false)}
        customers={customers}
        jobs={jobs}
        invoices={invoices}
        currentStaff={currentStaff}
        preSelectedCustomerId={preSelectedCustomerIdForDue}
        preSelectedJobId={preSelectedJobIdForDue}
        onPaymentRecorded={handlePaymentRecorded}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        materials={materials}
        onAddExpense={handleAddExpense}
        onUpdateStock={handleUpdateStock}
        onAddMaterial={handleAddMaterial}
      />

      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        customers={customers}
        jobs={jobs}
        invoices={invoices}
        onSelectJob={(j) => {
          setActiveTab('jobs');
        }}
        onSelectCustomer={(c) => {
          setActiveTab('customers');
        }}
        onSelectInvoice={(inv) => {
          handlePrintInvoice(inv);
        }}
      />

      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />

      <PrintReceiptModal
        isOpen={isPrintOpen}
        onClose={() => {
          setIsPrintOpen(false);
          setAutoTriggerPrint(false);
        }}
        config={config}
        invoice={printInvoice}
        job={printJob}
        mode={printMode}
        autoPrint={autoTriggerPrint}
      />

      <DebugLogsModal
        isOpen={isDebugLogsOpen}
        onClose={() => setIsDebugLogsOpen(false)}
        currentStaff={currentStaff}
      />

      <CloudBackupModal
        isOpen={isCloudBackupOpen}
        onClose={() => setIsCloudBackupOpen(false)}
        onDatabaseRestored={refreshAllData}
      />

      <LicenseActivationModal
        isOpen={isLicenseActivationOpen}
        onClose={() => setIsLicenseActivationOpen(false)}
        onLicenseUpdated={() => setLicenseValidation(LicenseService.validateLicense())}
      />
    </div>
  );
}
