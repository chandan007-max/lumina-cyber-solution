import React from 'react';
import {
  Search,
  Zap,
  Plus,
  CreditCard,
  Keyboard,
  ChevronDown,
  AlertTriangle,
  Moon,
  Sun,
  CloudCheck,
} from 'lucide-react';
import { BusinessConfig, StaffUser } from '../../types';
import { NiLLogo } from '../common/NiLLogo';
import { LicenseService } from '../../services/licenseService';

interface HeaderProps {
  config: BusinessConfig;
  currentStaff: StaffUser;
  staffList: StaffUser[];
  onStaffChange: (staff: StaffUser) => void;
  onOpenQuickBill: () => void;
  onOpenNewJob: () => void;
  onOpenCollectPayment: () => void;
  onOpenGlobalSearch: () => void;
  onOpenShortcuts: () => void;
  onOpenCloudBackup?: () => void;
  lowStockCount: number;
  onNavigateToInventory: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  currentStaff,
  staffList,
  onStaffChange,
  onOpenQuickBill,
  onOpenNewJob,
  onOpenCollectPayment,
  onOpenGlobalSearch,
  onOpenShortcuts,
  onOpenCloudBackup,
  lowStockCount,
  onNavigateToInventory,
  isDark,
  onToggleTheme,
}) => {
  const licenseVal = LicenseService.validateLicense();
  const lic = licenseVal.license;

  const planLabel = lic?.isLifetime
    ? 'LIFETIME'
    : lic?.planName
    ? lic.planName.toUpperCase()
    : 'PRO';

  const getStaffInitials = (name: string): string => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const businessTitle = config.profile?.displayName || config.businessName || 'LUMINA POS';
  const locationText = config.profile?.city
    ? `${config.profile.city}${config.profile?.state ? `, ${config.profile.state}` : ''}`
    : config.address || '';

  return (
    <header className="h-15 lg:h-16 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 select-none shadow-2xs transition-colors overflow-hidden">
      {/* ─── ZONE 1: BRAND & WORKSTATION IDENTITY ─── */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
        <NiLLogo logoUrl={config.profile?.logoUrl || config.logoUrl} size="md" variant="icon" />
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate max-w-[110px] sm:max-w-[150px] md:max-w-[180px] lg:max-w-[220px]">
              {businessTitle}
            </span>
            <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
              {planLabel}
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              POS Ready
            </span>
          </div>
          {locationText && (
            <span className="hidden xl:block text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate max-w-[180px] leading-tight">
              {locationText}
            </span>
          )}
        </div>
      </div>

      {/* ─── ZONE 2: GLOBAL OMNIBAR SEARCH TRIGGER ─── */}
      <div className="flex-1 min-w-[130px] sm:min-w-[180px] max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-2 lg:mx-3">
        <button
          type="button"
          onClick={onOpenGlobalSearch}
          className="w-full flex items-center justify-between px-2.5 sm:px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700/90 transition-all text-left group cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          aria-label="Global Search"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0" />
            <span className="truncate font-normal text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs">
              <span className="hidden sm:inline">Search customer, job, invoice...</span>
              <span className="sm:hidden">Search...</span>
            </span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xs shrink-0 ml-1">
            F3
          </kbd>
        </button>
      </div>

      {/* ─── ZONE 3: ESSENTIAL POS ACTIONS & SYSTEM UTILITIES ─── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Core Quick POS Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Quick Bill [F1] */}
          <button
            type="button"
            onClick={onOpenQuickBill}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0"
            title="Quick Bill [F1]"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
            <span className="hidden xs:inline sm:inline">Quick Bill</span>
            <kbd className="hidden 2xl:inline-block text-[9px] font-mono text-emerald-100 bg-emerald-700/80 px-1 py-0.2 rounded ml-0.5">
              F1
            </kbd>
          </button>

          {/* New Job [F2] */}
          <button
            type="button"
            onClick={onOpenNewJob}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 active:bg-slate-950 rounded-lg shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0"
            title="New Job Order [F2]"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline">New Job</span>
            <kbd className="hidden 2xl:inline-block text-[9px] font-mono text-slate-300 dark:text-indigo-100 bg-slate-800 dark:bg-indigo-700/90 px-1 py-0.2 rounded ml-0.5">
              F2
            </kbd>
          </button>

          {/* Collect Due [F4] - Visible on ultra-wide screens */}
          <button
            type="button"
            onClick={onOpenCollectPayment}
            className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Collect Due Payment [F4]"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Due</span>
            <kbd className="text-[9px] font-mono text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-1 rounded ml-0.5">
              F4
            </kbd>
          </button>
        </div>

        {/* Subtle vertical separator */}
        <div className="h-4 sm:h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block shrink-0" />

        {/* System Utilities */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Low Stock Alert */}
          {lowStockCount > 0 && (
            <button
              type="button"
              onClick={onNavigateToInventory}
              title={`${lowStockCount} raw material items below safety stock level`}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-800/80 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="tabular-nums font-bold text-[11px] sm:text-xs">{lowStockCount}</span>
            </button>
          )}

          {/* Cloud Backup Status */}
          {onOpenCloudBackup && (
            <button
              type="button"
              onClick={onOpenCloudBackup}
              title="Cloud Backup Vault Active — Click to view sync status"
              className="p-1 sm:p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Cloud Backup Status"
            >
              <CloudCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            </button>
          )}

          {/* Theme Mode Toggle [F9] */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode [F9]' : 'Switch to Dark Mode [F9]'}
            className="p-1 sm:p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Toggle theme mode"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 shrink-0" />
            )}
          </button>

          {/* Keyboard Shortcuts Trigger [?] */}
          <button
            type="button"
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts [?]"
            className="hidden sm:inline-flex p-1 sm:p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* Staff Switcher Profile Chip */}
        <div className="relative flex items-center shrink-0">
          <div className="flex items-center gap-1.5 py-1 px-1.5 sm:px-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg transition-colors cursor-pointer group shrink-0">
            {/* Operator Initials Badge */}
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold tracking-wider shrink-0">
              {getStaffInitials(currentStaff.name)}
            </div>
            {/* Operator Name & Role (Visible on wider desktop) */}
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-none truncate max-w-[85px]">
                {currentStaff.name}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-400 uppercase tracking-wider font-medium leading-tight">
                {currentStaff.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0" />

            {/* Seamless Native Select overlay for instant, accessible operator switching */}
            <select
              value={currentStaff.id}
              onChange={(e) => {
                const s = staffList.find((x) => x.id === e.target.value);
                if (s) onStaffChange(s);
              }}
              title={`Active Operator: ${currentStaff.name} (${currentStaff.role}). Click to switch operator.`}
              aria-label="Switch Operator"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {staffList.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
