import React, { useState } from 'react';
import { X, Key, ShieldCheck, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Laptop, Calendar } from 'lucide-react';
import { LicenseService } from '../../services/licenseService';
import { License, PlanId } from '../../types/license';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLicenseUpdated: (updatedLicense: License) => void;
}

export const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({
  isOpen,
  onClose,
  onLicenseUpdated,
}) => {
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('yearly_1y');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const plans = LicenseService.getPlans();

  const handleActivateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await LicenseService.activateLicenseKey(licenseKeyInput, selectedPlanId);
    if (res.success && res.license) {
      setSuccessMsg(res.message);
      onLicenseUpdated(res.license);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setLicenseKeyInput('');
      }, 1500);
    } else {
      setErrorMsg(res.message || 'Invalid license key.');
    }
  };

  const handleQuickActivatePlan = async (planId: PlanId) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const plan = LicenseService.getPlan(planId);
    const sampleKey = LicenseService.generateLicenseKey();
    
    const res = await LicenseService.activateLicenseKey(sampleKey, planId);
    if (res.success && res.license) {
      setSuccessMsg(`Activated ${plan.planName}!`);
      onLicenseUpdated(res.license);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                LUMINA CYBER SOLUTION
              </div>
              <h3 className="text-lg font-black tracking-tight">Software License Activation</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/80 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form: Enter License Key */}
          <form onSubmit={handleActivateKey} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Enter Commercial License Key
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  placeholder="e.g. LCS-8A9F-3B2E-7D4C-9102"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold tracking-wider text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  required
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Activate</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                License keys are provided upon purchasing LUMINA CYBER SOLUTION commercial subscriptions.
              </p>
            </div>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Or Select Commercial Plan Tier
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {/* Plan Selector Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plans.map((p) => (
              <button
                key={p.planId}
                type="button"
                onClick={() => handleQuickActivatePlan(p.planId)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between hover:border-indigo-500 ${
                  selectedPlanId === p.planId
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">{p.planName}</span>
                    <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                      {p.price > 0 ? `${p.currency}${p.price}` : 'Free'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight">
                    {p.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Laptop className="w-3 h-3 text-slate-400" />
                    <span>{p.deviceLimit} Devices</span>
                  </span>
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                    <span>Activate Now</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Offline-Capable Signed Verification</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
