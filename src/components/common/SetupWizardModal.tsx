import React, { useState } from 'react';
import {
  X,
  Building2,
  FileText,
  Receipt,
  Printer,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Upload,
  Trash2,
  ShieldAlert,
  Percent,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { BusinessConfigService } from '../../services/businessConfig';
import { BusinessConfig, BusinessType, PaymentMethod } from '../../types';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupCompleted: (updatedConfig: BusinessConfig) => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  onSetupCompleted,
}) => {
  const [step, setStep] = useState<number>(1);
  const [config, setConfig] = useState<BusinessConfig>(() => BusinessConfigService.getConfig());
  const [logoPreview, setLogoPreview] = useState<string | undefined>(config.profile.logoUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNextStep = () => {
    setValidationError(null);
    if (step === 1) {
      if (!config.profile.businessName?.trim()) {
        setValidationError('Business name is required.');
        return;
      }
      if (!config.profile.mobile?.trim()) {
        setValidationError('Mobile phone number is required.');
        return;
      }
      if (!config.profile.addressLine1?.trim()) {
        setValidationError('Address is required.');
        return;
      }
    } else if (step === 3 && config.gst.enabled) {
      if (!config.gst.gstin?.trim()) {
        setValidationError('GSTIN is required when GST is enabled.');
        return;
      }
    }

    if (step < 5) {
      setStep(step + 1);
    } else {
      handleFinishSetup();
    }
  };

  const handlePrevStep = () => {
    setValidationError(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    try {
      const base64 = await BusinessConfigService.validateAndOptimizeLogo(file);
      setLogoPreview(base64);
      setConfig((prev) => ({
        ...prev,
        profile: { ...prev.profile, logoUrl: base64 },
        logoUrl: base64,
      }));
    } catch (err: any) {
      setLogoError(err.message || 'Failed to upload logo image.');
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(undefined);
    setConfig((prev) => ({
      ...prev,
      profile: { ...prev.profile, logoUrl: undefined },
      logoUrl: undefined,
    }));
  };

  const handleFinishSetup = () => {
    const updatedTracker = {
      ...config.setup,
      isWizardCompleted: true,
      completedSteps: ['identity', 'billing', 'gst', 'printer', 'finish'],
    };

    const saved = BusinessConfigService.saveConfig({
      ...config,
      setup: updatedTracker,
    });

    onSetupCompleted(saved);
    onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  LUMINA CYBER SOLUTION
                </div>
                <h2 className="text-xl font-black tracking-tight">Business Setup Wizard</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Close Wizard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="mt-6 flex items-center justify-between text-xs font-bold text-slate-300">
            {['Business Identity', 'Billing', 'GST Tax', 'Printer', 'Finish'].map((label, idx) => {
              const stepNum = idx + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={idx} className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] transition-all ${
                      isDone
                        ? 'bg-emerald-500 text-slate-950'
                        : isActive
                        ? 'bg-indigo-500 text-white shadow-lg ring-4 ring-indigo-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isDone ? '✓' : stepNum}
                  </div>
                  <span
                    className={`hidden sm:inline ${
                      isActive ? 'text-white font-extrabold' : 'text-slate-400 font-medium'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {validationError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Step 1: Business Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Step 1: Business Identity & Profile</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter your cyber café or printing shop business details.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.profile.businessName}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, businessName: e.target.value, displayName: e.target.value },
                        businessName: e.target.value,
                      }))
                    }
                    placeholder="e.g. ABC Cyber Café & Digital Point"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business Category / Type
                  </label>
                  <select
                    value={config.profile.businessType}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, businessType: e.target.value as BusinessType },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    Mobile Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.profile.mobile}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, mobile: e.target.value, WhatsAppNumber: e.target.value },
                        phones: [e.target.value],
                      }))
                    }
                    placeholder="e.g. 9800099934"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={config.profile.email}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, email: e.target.value },
                        emails: [e.target.value],
                      }))
                    }
                    placeholder="e.g. shop@gmail.com"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shop Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.profile.addressLine1}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, addressLine1: e.target.value },
                        address: e.target.value,
                      }))
                    }
                    placeholder="e.g. Main Road, Near Bus Stand, New Digha"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={config.profile.pincode}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, pincode: e.target.value },
                        pincode: e.target.value,
                      }))
                    }
                    placeholder="e.g. 721463"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={config.profile.tagline}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile: { ...prev.profile, tagline: e.target.value },
                        tagline: e.target.value,
                      }))
                    }
                    placeholder="e.g. Cyber Café • Xerox • Digital Services"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Logo Upload Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Shop Brand Logo <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative group shrink-0">
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="w-16 h-16 object-contain rounded-lg border border-slate-300 bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700 transition-colors"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 text-xs font-bold shrink-0">
                      No Logo
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-500">PNG, JPG or WebP (Max 2MB). Preserves aspect ratio.</p>
                    {logoError && <p className="text-[10px] text-rose-600 font-bold">{logoError}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Billing & Invoice Configuration */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Step 2: Billing & Invoice Settings</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure default invoice prefixes, titles, and payment defaults.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Number Prefix
                  </label>
                  <input
                    type="text"
                    value={config.billing.invoicePrefix}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        billing: { ...prev.billing, invoicePrefix: e.target.value },
                      }))
                    }
                    placeholder="e.g. INV-2026-"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Generated invoices will read e.g. {config.billing.invoicePrefix}000101</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Starting Sequence Number
                  </label>
                  <input
                    type="number"
                    value={config.billing.invoiceStartNumber}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        billing: {
                          ...prev.billing,
                          invoiceStartNumber: parseInt(e.target.value) || 1,
                          currentSequence: Math.max(prev.billing.currentSequence, parseInt(e.target.value) || 1),
                        },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Header Title
                  </label>
                  <input
                    type="text"
                    value={config.billing.invoiceTitle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        billing: { ...prev.billing, invoiceTitle: e.target.value },
                      }))
                    }
                    placeholder="e.g. TAX INVOICE / RECEIPT"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Default Payment Method
                  </label>
                  <select
                    value={config.billing.defaultPaymentMethod}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        billing: { ...prev.billing, defaultPaymentMethod: e.target.value as PaymentMethod },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bill Footer Message
                  </label>
                  <input
                    type="text"
                    value={config.billing.footerText}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        billing: { ...prev.billing, footerText: e.target.value },
                      }))
                    }
                    placeholder="e.g. Thank you for choosing us! Please visit again."
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: GST Setup */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Step 3: GST Tax Setup</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Is your business registered under GST?
                </p>
              </div>

              {/* GST Enable Radio Options */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      gst: { ...prev.gst, enabled: false },
                      gstin: undefined,
                    }))
                  }
                  className={`p-4 rounded-xl border text-left transition-all ${
                    !config.gst.enabled
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-sm text-slate-900 dark:text-white">NO GST (Exempt / Small Business)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Hide GSTIN and tax fields from receipts and quick billing. Ideal for non-GST cyber cafés.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      gst: { ...prev.gst, enabled: true },
                    }))
                  }
                  className={`p-4 rounded-xl border text-left transition-all ${
                    config.gst.enabled
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-sm text-slate-900 dark:text-white">YES (GST Registered)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Enable GSTIN display, tax invoices, and CGST/SGST itemized breakdown on A4 invoices.
                  </div>
                </button>
              </div>

              {/* GST Form Fields if Enabled */}
              {config.gst.enabled && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        GSTIN Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={config.gst.gstin || ''}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            gst: { ...prev.gst, gstin: e.target.value.toUpperCase() },
                            gstin: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="e.g. 19AAECN1234F1Z8"
                        className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Registered State
                      </label>
                      <input
                        type="text"
                        value={config.gst.state || 'West Bengal'}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            gst: { ...prev.gst, state: e.target.value },
                          }))
                        }
                        placeholder="e.g. West Bengal"
                        className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Printer Preferences */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Step 4: Default Receipt & Printer Format</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select your primary hardware printer type.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { mode: 'thermal58', title: '58mm Thermal Slip', desc: 'Compact counter roll printer (POS thermal paper)' },
                  { mode: 'thermal80', title: '80mm Thermal Slip', desc: 'Wide thermal receipt roll (80mm standard POS)' },
                  { mode: 'a4', title: 'Standard A4 Laser', desc: 'Full-page tax invoices and job work orders' },
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        printerMode: item.mode as any,
                      }))
                    }
                    className={`p-4 rounded-xl border text-left transition-all ${
                      config.printerMode === item.mode
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

          {/* Step 5: Finish Confirmation */}
          {step === 5 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Your Business Setup is Complete!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  <strong className="text-slate-900 dark:text-white font-bold">{config.profile.businessName}</strong> is now configured in <strong>LUMINA CYBER SOLUTION</strong>. You can change any of these settings later from Settings.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 max-w-md mx-auto text-left space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Business:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{config.profile.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{config.profile.mobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GST Status:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{config.gst.enabled ? `Enabled (${config.gst.gstin})` : 'Disabled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Printer Default:</span>
                  <span className="font-bold text-slate-900 dark:text-white uppercase">{config.printerMode}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            {step > 1 && step < 5 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 5 && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Skip for Now
              </button>
            )}

            <button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-1.5 px-6 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-98"
            >
              <span>{step === 5 ? 'Launch LUMINA POS Workstation' : 'Continue'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
