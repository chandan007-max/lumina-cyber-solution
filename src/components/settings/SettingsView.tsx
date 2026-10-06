import React, { useState, useRef } from 'react';
import {
  Settings,
  HardDriveDownload,
  UploadCloud,
  RotateCcw,
  CheckCircle2,
  Printer,
  Shield,
  Save,
  Building,
  Image as ImageIcon,
  Trash2,
  Upload,
  Moon,
  Sun,
  Laptop,
  Bug,
  Terminal,
  Sliders,
  Sparkles,
  Check,
  Zap,
  Percent,
  Cloud,
  CloudCheck,
  Building2,
  FileText,
  CreditCard,
  Lock,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  QrCode,
  Landmark,
  MessageSquare,
} from 'lucide-react';
import { BusinessConfig, BusinessType, PaymentMethod } from '../../types';
import { StorageService } from '../../services/storage';
import { BusinessConfigService } from '../../services/businessConfig';
import { NiLLogo } from '../common/NiLLogo';
import {
  ThermalConfig,
  loadThermalConfig,
  saveThermalConfig,
} from '../print/thermalConfig';

import { LicenseSettingsTab } from '../license/LicenseSettingsTab';
import { Key } from 'lucide-react';

interface SettingsViewProps {
  config: BusinessConfig;
  onUpdateConfig: (config: BusinessConfig) => void;
  onRefreshAllData: () => void;
  currentTheme?: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
  onOpenDebugLogs?: () => void;
  onOpenCloudBackup?: () => void;
  onOpenWizard?: () => void;
}

type SettingsTab =
  | 'profile'
  | 'branding'
  | 'billing'
  | 'gst'
  | 'payments'
  | 'printer'
  | 'license'
  | 'backup'
  | 'security';

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateConfig,
  onRefreshAllData,
  currentTheme = 'light',
  onThemeChange,
  onOpenDebugLogs,
  onOpenCloudBackup,
  onOpenWizard,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [form, setForm] = useState<BusinessConfig>(() => BusinessConfigService.normalizeConfig(config));
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDraggingHasUnsaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(form.profile.logoUrl || form.logoUrl);
  const [logoError, setLogoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // 58mm Thermal Printer Configuration state
  const [thermalConfig, setThermalConfig] = useState<ThermalConfig>(() => loadThermalConfig());
  const [isTestPrinting, setIsTestPrinting] = useState(false);

  const updateThermalConfig = (updates: Partial<ThermalConfig>) => {
    setThermalConfig((prev) => {
      const next = { ...prev, ...updates };
      saveThermalConfig(next);
      return next;
    });
  };

  const handleSaveAllSettings = () => {
    const saved = BusinessConfigService.saveConfig(form);
    onUpdateConfig(saved);
    setSaveSuccess(true);
    setIsDraggingHasUnsaved(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    try {
      const base64 = await BusinessConfigService.validateAndOptimizeLogo(file);
      setLogoPreview(base64);
      setForm((prev) => ({
        ...prev,
        profile: { ...prev.profile, logoUrl: base64 },
        logoUrl: base64,
      }));
      setIsDraggingHasUnsaved(true);
    } catch (err: any) {
      setLogoError(err.message || 'Failed to upload logo image.');
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(undefined);
    setForm((prev) => ({
      ...prev,
      profile: { ...prev.profile, logoUrl: undefined },
      logoUrl: undefined,
    }));
    setIsDraggingHasUnsaved(true);
  };

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LUMINA_${form.profile.businessName.replace(/\s+/g, '_')}_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = StorageService.importDatabaseJSON(content);
        if (success) {
          alert('Database restored successfully from backup file!');
          onRefreshAllData();
        } else {
          alert('Failed to restore database. Invalid backup file format.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemoData = () => {
    if (
      window.confirm(
        'Are you sure you want to reset sample jobs and inventory to demo state? Business settings and identity will be preserved.'
      )
    ) {
      StorageService.resetToDefault();
      onRefreshAllData();
      alert('Demo data re-populated successfully. Business identity preserved.');
    }
  };

  const businessTypes: BusinessType[] = [
    'Cyber Café & Printing',
    'Cyber Café',
    'Digital Service Centre',
    'Printing Shop',
    'Xerox Centre',
    'Graphics & Designing',
    'Other',
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
              LUMINA CYBER SOLUTION
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              White-Label Business Suite
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-0.5 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Business Configuration & Settings</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {onOpenWizard && (
            <button
              onClick={onOpenWizard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run Setup Wizard</span>
            </button>
          )}

          <button
            onClick={handleSaveAllSettings}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>✓ All business configuration settings have been updated and persisted!</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-bold shadow-2xs">
        {[
          { id: 'profile', label: 'Business Profile', icon: Building2 },
          { id: 'branding', label: 'Branding & Logo', icon: ImageIcon },
          { id: 'billing', label: 'Billing & Invoice', icon: FileText },
          { id: 'gst', label: 'GST & Tax', icon: Percent },
          { id: 'payments', label: 'Payments & UPI', icon: CreditCard },
          { id: 'printer', label: 'Printer Setup', icon: Printer },
          { id: 'license', label: 'License & Subscription', icon: Key },
          { id: 'backup', label: 'Backup & Vault', icon: HardDriveDownload },
          { id: 'security', label: 'Security & Reset', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs text-xs space-y-6">
        {/* Tab 1: Business Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Business Identity & Owner Details</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Primary business identity details used across POS receipts, A4 invoices, and reports.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business Name (Trade Name)
                </label>
                <input
                  type="text"
                  value={form.profile.businessName}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, businessName: e.target.value, displayName: e.target.value },
                      businessName: e.target.value,
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business Category
                </label>
                <select
                  value={form.profile.businessType}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, businessType: e.target.value },
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {businessTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Mobile Number
                </label>
                <input
                  type="text"
                  value={form.profile.mobile}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, mobile: e.target.value },
                      phones: [e.target.value, prev.profile.alternateMobile].filter(Boolean) as string[],
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={form.profile.WhatsAppNumber || ''}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, WhatsAppNumber: e.target.value },
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  placeholder="e.g. 9800099934"
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Shop Address Line 1
                </label>
                <input
                  type="text"
                  value={form.profile.addressLine1}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, addressLine1: e.target.value },
                      address: e.target.value,
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={form.profile.city || ''}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, city: e.target.value },
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={form.profile.pincode}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, pincode: e.target.value },
                      pincode: e.target.value,
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Email
                </label>
                <input
                  type="email"
                  value={form.profile.email}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, email: e.target.value },
                      emails: [e.target.value, prev.profile.alternateEmail].filter(Boolean) as string[],
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Owner / Contact Person
                </label>
                <input
                  type="text"
                  value={form.profile.ownerName}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, ownerName: e.target.value, contactPerson: e.target.value },
                      contactPerson: e.target.value,
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Branding & Logo */}
        {activeTab === 'branding' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Shop Logo & Branding Identity</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Upload shop brand emblem. Automatically synced to header bar, 80mm thermal receipts, and A4 tax invoices.
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center gap-5">
                {logoPreview ? (
                  <div className="relative group shrink-0">
                    <img
                      src={logoPreview}
                      alt="Shop Logo"
                      className="w-20 h-20 object-contain rounded-xl border border-slate-300 dark:border-slate-600 bg-white p-2 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700 transition-colors"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center bg-white dark:bg-slate-800 text-slate-400 text-xs font-bold shrink-0">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-400" />
                    <span>No Logo</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>{logoPreview ? 'Change Logo Image' : 'Upload Shop Logo'}</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <p className="text-xs text-slate-500">Supported formats: PNG, JPG, WebP (Max 2MB). Preserves aspect ratio on documents.</p>
                  {logoError && <p className="text-xs text-rose-600 font-bold">{logoError}</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Shop Tagline / Slogan
              </label>
              <input
                type="text"
                value={form.profile.tagline}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, tagline: e.target.value },
                    tagline: e.target.value,
                  }));
                  setIsDraggingHasUnsaved(true);
                }}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Billing & Invoice */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Invoice Sequence, Prefix & Document Formatting</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Configure invoice prefixes, starting sequence numbers, header titles, and footer notes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={form.billing.invoicePrefix}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, invoicePrefix: e.target.value },
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Header Title
                </label>
                <input
                  type="text"
                  value={form.billing.invoiceTitle}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, invoiceTitle: e.target.value },
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bill Footer Thank You Note
                </label>
                <input
                  type="text"
                  value={form.billing.footerText}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, footerText: e.target.value },
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: GST & Tax */}
        {activeTab === 'gst' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>GST Registration & Tax Settings</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Enable or disable GSTIN display on bills. Non-GST shops can keep GST disabled to streamline quick billing.
              </p>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.gst.enabled}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      gst: { ...prev.gst, enabled: e.target.checked },
                      gstin: e.target.checked ? prev.gst.gstin : undefined,
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">Enable GST Tax Invoice Mode</div>
                <div className="text-[11px] text-slate-500">When enabled, GSTIN and tax breakdown appear on A4 invoices.</div>
              </div>
            </div>

            {form.gst.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    value={form.gst.gstin || ''}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        gst: { ...prev.gst, gstin: e.target.value.toUpperCase() },
                        gstin: e.target.value.toUpperCase(),
                      }));
                      setIsDraggingHasUnsaved(true);
                    }}
                    placeholder="e.g. 19AAECN1234F1Z8"
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GST State Code
                  </label>
                  <input
                    type="text"
                    value={form.gst.stateCode || '19'}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        gst: { ...prev.gst, stateCode: e.target.value },
                      }));
                      setIsDraggingHasUnsaved(true);
                    }}
                    placeholder="19 (West Bengal)"
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Payments & UPI */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>UPI Payment VPA & Bank Account Details</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Configure your UPI VPA handle. QR codes on thermal slips and A4 invoices automatically sync to this ID.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  UPI VPA Handle ID
                </label>
                <input
                  type="text"
                  value={form.payment.upiId}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      payment: { ...prev.payment, upiId: e.target.value },
                      upiId: e.target.value,
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  placeholder="e.g. 9800099934@upi"
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  UPI Account Display Name
                </label>
                <input
                  type="text"
                  value={form.payment.upiQrName}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      payment: { ...prev.payment, upiQrName: e.target.value },
                      upiQrName: e.target.value,
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  placeholder="e.g. NiL Printers / Sumit"
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Printer Setup */}
        {activeTab === 'printer' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Printer Hardware & Receipt Scale Calibration</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Set default printer formats and fine-tune 58mm thermal origin offsets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { mode: 'thermal58', title: '58mm Thermal', desc: 'Compact receipt rolls' },
                { mode: 'thermal80', title: '80mm Thermal', desc: 'Standard POS thermal slip' },
                { mode: 'a4', title: 'Standard A4 Laser', desc: 'A4 tax invoices & job sheets' },
              ].map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      printerMode: item.mode as any,
                    }));
                    setIsDraggingHasUnsaved(true);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    form.printerMode === item.mode
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 dark:text-white">{item.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 7: License & Subscription */}
        {activeTab === 'license' && <LicenseSettingsTab />}

        {/* Tab 8: Backup & Vault */}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <HardDriveDownload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Database Backup & Restoration</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Download complete shop database or restore from a JSON backup snapshot.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>Download Backup File (.JSON)</span>
              </button>

              <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer">
                <UploadCloud className="w-4 h-4" />
                <span>Restore Database JSON</span>
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>

              {onOpenCloudBackup && (
                <button
                  onClick={onOpenCloudBackup}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                >
                  <CloudCheck className="w-4 h-4 text-emerald-600" />
                  <span>Open Automated Daily Cloud Vault</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 8: Security & Reset */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Security & Demo Data Controls</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Protected system controls for resetting sample data or repairing configuration.
              </p>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/80 space-y-2">
              <div className="font-bold text-xs text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Reset Demo Sample Jobs & Inventory</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Re-populates sample jobs and stock materials. Business identity profile and configuration remain completely safe.
              </p>
              <button
                onClick={handleResetDemoData}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow transition-colors cursor-pointer mt-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Sample Demo Data</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
