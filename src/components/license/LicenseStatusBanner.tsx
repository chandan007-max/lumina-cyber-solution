import React from 'react';
import { AlertTriangle, ShieldAlert, Sparkles, ArrowRight, X } from 'lucide-react';
import { LicenseValidationResult } from '../../types/license';

interface LicenseStatusBannerProps {
  validation: LicenseValidationResult;
  onOpenActivationModal: () => void;
  onOpenSettingsLicense: () => void;
  onDismissBanner?: () => void;
}

export const LicenseStatusBanner: React.FC<LicenseStatusBannerProps> = ({
  validation,
  onOpenActivationModal,
  onOpenSettingsLicense,
  onDismissBanner,
}) => {
  const { status, daysRemaining, isExpired, isGracePeriod, isTampered, message } = validation;

  if (status === 'LIFETIME' || status === 'ACTIVE') {
    return null; // Don't block active lifetime or normal subscription
  }

  const isCritical = isExpired || status === 'SUSPENDED' || status === 'CANCELLED' || isTampered;
  const isWarning = status === 'EXPIRING_SOON' || isGracePeriod;

  if (!isCritical && !isWarning) {
    return null;
  }

  return (
    <div
      className={`no-print px-4 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-3 border-b transition-all shrink-0 ${
        isCritical
          ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
          : 'bg-amber-500 text-slate-950 border-amber-600'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isCritical ? (
          <ShieldAlert className="w-4 h-4 shrink-0 animate-pulse text-white" />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
        )}
        <div className="truncate">
          <span className="font-extrabold uppercase tracking-wide mr-1.5">
            {isCritical ? 'License Notice:' : 'Subscription Warning:'}
          </span>
          <span className="font-medium">{message}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <button
          type="button"
          onClick={onOpenActivationModal}
          className={`px-3 py-1 rounded font-extrabold text-[11px] cursor-pointer inline-flex items-center gap-1 transition-all shadow-2xs active:scale-98 ${
            isCritical
              ? 'bg-white text-rose-950 hover:bg-rose-50'
              : 'bg-slate-950 text-white hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isCritical ? 'Activate License' : 'Renew License'}</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </button>

        <button
          type="button"
          onClick={onOpenSettingsLicense}
          className={`px-2.5 py-1 rounded font-semibold text-[11px] cursor-pointer transition-colors ${
            isCritical
              ? 'bg-rose-700 text-white hover:bg-rose-800'
              : 'bg-amber-600 text-slate-950 hover:bg-amber-700'
          }`}
        >
          Details
        </button>

        {!isCritical && onDismissBanner && (
          <button
            type="button"
            onClick={onDismissBanner}
            className="p-1 hover:bg-black/10 rounded cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
