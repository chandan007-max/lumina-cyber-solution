import React from 'react';
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  X,
  Building2,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { BusinessConfigService } from '../../services/businessConfig';

interface SetupChecklistWidgetProps {
  onOpenWizard: () => void;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

export const SetupChecklistWidget: React.FC<SetupChecklistWidgetProps> = ({
  onOpenWizard,
  onOpenSettings,
  onDismiss,
}) => {
  const { percentage, checklist } = BusinessConfigService.calculateSetupCompletion();

  if (percentage >= 100) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-lg border border-indigo-500/30 relative overflow-hidden mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-400 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                LUMINA SETUP CHECKLIST
              </span>
              <span className="text-[10px] font-black bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 px-2 py-0.5 rounded-full">
                {percentage}% Completed
              </span>
            </div>
            <h3 className="text-sm font-extrabold tracking-tight mt-0.5">
              Complete Business Configuration & Branding
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Configure your business profile, shop logo, GST settings, and payment UPI VPAs to personalize your A4 invoices and thermal receipts.
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          title="Dismiss Checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 mb-4 overflow-hidden border border-white/10">
        <div
          className="bg-gradient-to-r from-indigo-400 to-emerald-400 h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Checklist items grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {checklist.map((item) => (
          <div
            key={item.key}
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 p-2 rounded-lg border transition-all cursor-pointer ${
              item.done
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            {item.done ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="truncate font-semibold text-[11px]">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10 text-xs font-bold">
        <button
          onClick={onOpenWizard}
          className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow transition-colors"
        >
          <span>Run Setup Wizard</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Open Full Settings</span>
        </button>
      </div>
    </div>
  );
};
