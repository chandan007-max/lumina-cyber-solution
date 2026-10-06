import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  Sparkles,
  Laptop,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Check,
  ShieldAlert,
  Clock,
  History,
  Lock,
  Layers,
  Zap,
} from 'lucide-react';
import { LicenseService } from '../../services/licenseService';
import { License, LicenseAuditEvent, LicenseValidationResult, PlanId } from '../../types/license';
import { LicenseActivationModal } from './LicenseActivationModal';

export const LicenseSettingsTab: React.FC = () => {
  const [validation, setValidation] = useState<LicenseValidationResult>(() =>
    LicenseService.validateLicense()
  );
  const [isActivationModalOpen, setIsActivationModalModalOpen] = useState(false);
  const [auditEvents, setAuditEventHistory] = useState<LicenseAuditEvent[]>([]);
  const [actionSuccessMsg, setSuccessMsg] = useState<string | null>(null);

  const refreshLicenseState = () => {
    const val = LicenseService.validateLicense();
    setValidation(val);
    setAuditEventHistory(LicenseService.getAuditEventHistory());
  };

  useEffect(() => {
    refreshLicenseState();
  }, []);

  const handleDeactivateDevice = (deviceId: string) => {
    if (window.confirm('Are you sure you want to deactivate this device? It will be removed from your active device allowance.')) {
      LicenseService.deactivateDevice(deviceId);
      setSuccessMsg('Device deactivated successfully.');
      refreshLicenseState();
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleQuickRenew = (planId: PlanId) => {
    LicenseService.renewLicense(planId);
    setSuccessMsg('Subscription successfully renewed!');
    refreshLicenseState();
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const license = validation.license;
  if (!license) return null;

  const plans = LicenseService.getPlans();
  const currentPlan = LicenseService.getPlan(license.planId);

  const getStatusBadge = () => {
    switch (validation.status) {
      case 'LIFETIME':
        return <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black rounded-full text-xs uppercase tracking-wider shadow-2xs">LIFETIME LICENSE</span>;
      case 'ACTIVE':
        return <span className="px-3 py-1 bg-emerald-500 text-white font-black rounded-full text-xs uppercase tracking-wider shadow-2xs">ACTIVE</span>;
      case 'TRIAL':
        return <span className="px-3 py-1 bg-indigo-500 text-white font-black rounded-full text-xs uppercase tracking-wider shadow-2xs">14-DAY TRIAL</span>;
      case 'EXPIRING_SOON':
        return <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black rounded-full text-xs uppercase tracking-wider shadow-2xs">EXPIRING SOON</span>;
      case 'GRACE_PERIOD':
        return <span className="px-3 py-1 bg-rose-500 text-white font-black rounded-full text-xs uppercase tracking-wider shadow-2xs">GRACE PERIOD</span>;
      case 'EXPIRED':
        return <span className="px-3 py-1 bg-rose-600 text-white font-black rounded-full text-xs uppercase tracking-wider shadow-2xs">EXPIRED</span>;
      default:
        return <span className="px-3 py-1 bg-slate-700 text-white font-black rounded-full text-xs uppercase tracking-wider">{validation.status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main License Overview Card */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-400">
                  LUMINA CYBER SOLUTION
                </span>
                {getStatusBadge()}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {license.planName}
              </h2>
              <p className="text-xs text-indigo-200/80 font-medium max-w-xl">
                Commercial white-label POS software subscription for cyber cafés, printing centers, and digital service points.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsActivationModalModalOpen(true)}
                className="px-4 py-2.5 bg-white hover:bg-indigo-50 text-indigo-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
              >
                <Key className="w-4 h-4 text-indigo-600" />
                <span>Activate License Key</span>
              </button>

              <button
                type="button"
                onClick={refreshLicenseState}
                className="p-2.5 bg-indigo-900/60 hover:bg-indigo-800/80 text-white rounded-xl text-xs transition-colors cursor-pointer border border-indigo-700/50"
                title="Verify offline cryptographic signature"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Key Metrics Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-indigo-900/60">
            <div className="bg-indigo-900/30 p-3.5 rounded-xl border border-indigo-800/40 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                License Key
              </div>
              <div className="font-mono font-black text-xs sm:text-sm text-white truncate">
                {license.licenseKey}
              </div>
            </div>

            <div className="bg-indigo-900/30 p-3.5 rounded-xl border border-indigo-800/40 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                Days Remaining
              </div>
              <div className="font-mono font-black text-lg text-emerald-400">
                {license.isLifetime ? 'UNLIMITED' : `${validation.daysRemaining} Days`}
              </div>
            </div>

            <div className="bg-indigo-900/30 p-3.5 rounded-xl border border-indigo-800/40 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                Device Limit
              </div>
              <div className="font-mono font-black text-xs sm:text-sm text-white">
                {license.devices.length} / {license.deviceLimit} Devices
              </div>
            </div>

            <div className="bg-indigo-900/30 p-3.5 rounded-xl border border-indigo-800/40 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                Expiration Date
              </div>
              <div className="font-mono font-bold text-xs text-white">
                {license.isLifetime
                  ? 'Never (Lifetime)'
                  : new Date(license.expiryDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Master Tiers & Renewal Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Commercial Plans & Renewal Tiers</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upgrade or extend your software subscription duration
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = license.planId === p.planId;
            return (
              <div
                key={p.planId}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                  isCurrent
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">{p.planName}</span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-black uppercase">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {p.price > 0 ? `${p.currency}${p.price.toLocaleString('en-IN')}` : 'FREE'}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Device Limit:</span>
                    <span className="font-bold font-mono">{p.deviceLimit} Devices</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>User Limit:</span>
                    <span className="font-bold font-mono">{p.userLimit} Users</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Support Level:</span>
                    <span className="font-bold uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      {p.supportLevel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickRenew(p.planId)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        : 'bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white'
                    }`}
                  >
                    {isCurrent ? 'Extend Renewal' : `Switch to ${p.planName}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activated Bound Devices Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Bound Active Devices ({license.devices.length} / {license.deviceLimit})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Devices authorized to run this commercial POS license
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Device Name & Hardware ID</th>
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3">Activated Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {license.devices.map((dev) => (
                <tr key={dev.deviceId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{dev.deviceName}</div>
                    <div className="font-mono text-[10px] text-slate-400">{dev.deviceId}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                    {dev.platform}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono">
                    {new Date(dev.activatedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeactivateDevice(dev.deviceId)}
                      className="px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded font-bold transition-colors cursor-pointer"
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* License Feature Entitlements Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Feature Entitlements Matrix</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'pos', label: 'POS Billing Counter' },
            { key: 'jobs', label: 'Custom Job Kanban' },
            { key: 'customers', label: 'Customer Dues Ledger' },
            { key: 'inventory', label: 'Material Stock Tracker' },
            { key: 'reports', label: 'Profit & Sales Analytics' },
            { key: 'gst', label: 'GST Tax Invoicing' },
            { key: 'backup', label: 'Cloud & Offline Backups' },
            { key: 'whatsapp', label: 'WhatsApp Alerts (P12 Ready)' },
          ].map((feat) => {
            const isUnlocked = LicenseService.canUseFeature(feat.key);
            return (
              <div
                key={feat.key}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  isUnlocked
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <span>{feat.label}</span>
                {isUnlocked ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* License Audit History Event Log */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">License Security Audit Log</h3>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {auditEvents.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center">No license events logged yet.</div>
          ) : (
            auditEvents.map((evt) => (
              <div
                key={evt.eventId}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] rounded uppercase">
                      {evt.eventType}
                    </span>
                    <span>{evt.reason}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Actor: {evt.actor}
                  </div>
                </div>
                <div className="font-mono text-[10px] text-slate-400 shrink-0">
                  {new Date(evt.timestamp).toLocaleString('en-IN')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* License Activation Modal */}
      <LicenseActivationModal
        isOpen={isActivationModalOpen}
        onClose={() => setIsActivationModalModalOpen(false)}
        onLicenseUpdated={refreshLicenseState}
      />
    </div>
  );
};
