import React from 'react';
import {
  LayoutDashboard,
  Zap,
  PlusSquare,
  KanbanSquare,
  Receipt,
  Users,
  CreditCard,
  Printer,
  Boxes,
  ArrowDownCircle,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bug,
  MessageSquare,
  Activity,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'pos_billing'
  | 'quick_bill'
  | 'new_job'
  | 'jobs'
  | 'invoices'
  | 'customers'
  | 'dues'
  | 'communication'
  | 'services'
  | 'inventory'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'operations';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingJobsCount: number;
  readyJobsCount: number;
  dueAmount: number;
  lowStockCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenDebugLogs?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingJobsCount,
  readyJobsCount,
  dueAmount,
  lowStockCount,
  isCollapsed,
  onToggleCollapse,
  onOpenDebugLogs,
}) => {
  const navSections = [
    {
      title: 'CORE WORKSTATION',
      items: [
        {
          id: 'dashboard' as NavTab,
          label: 'Dashboard',
          icon: LayoutDashboard,
          shortcut: '',
        },
        {
          id: 'pos_billing' as NavTab,
          label: 'POS Counter / Billing',
          icon: Zap,
          shortcut: 'F1',
        },
        {
          id: 'jobs' as NavTab,
          label: 'Job Board (Kanban)',
          icon: KanbanSquare,
          badge: pendingJobsCount > 0 ? `${pendingJobsCount}` : undefined,
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
          shortcut: 'F6',
        },
        {
          id: 'new_job' as NavTab,
          label: 'New Job Order',
          icon: PlusSquare,
          shortcut: 'F2',
        },
        {
          id: 'invoices' as NavTab,
          label: 'Invoice History',
          icon: Receipt,
          shortcut: '',
        },
      ],
    },
    {
      title: 'RELATIONS & FINANCE',
      items: [
        {
          id: 'customers' as NavTab,
          label: 'Customers',
          icon: Users,
          shortcut: 'F7',
        },
        {
          id: 'dues' as NavTab,
          label: 'Dues & Receivables',
          icon: CreditCard,
          badge: dueAmount > 0 ? `₹${dueAmount.toLocaleString('en-IN')}` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          shortcut: 'F4',
        },
        {
          id: 'communication' as NavTab,
          label: 'Communication Center',
          icon: MessageSquare,
          shortcut: '',
        },
        {
          id: 'expenses' as NavTab,
          label: 'Expenses Ledger',
          icon: ArrowDownCircle,
          shortcut: '',
        },
      ],
    },
    {
      title: 'SHOP MANAGEMENT',
      items: [
        {
          id: 'services' as NavTab,
          label: 'Services & Pricing',
          icon: Printer,
          shortcut: '',
        },
        {
          id: 'inventory' as NavTab,
          label: 'Materials & Stock',
          icon: Boxes,
          badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
          shortcut: '',
        },
        {
          id: 'reports' as NavTab,
          label: 'Reports & Profit',
          icon: BarChart3,
          shortcut: 'F8',
        },
        {
          id: 'settings' as NavTab,
          label: 'Settings & Backup',
          icon: Settings,
          shortcut: '',
        },
        {
          id: 'operations' as NavTab,
          label: 'Operations & Health',
          icon: Activity,
          shortcut: '',
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-slate-900 dark:bg-slate-950 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 dark:border-slate-800/80 select-none transition-all duration-200 ease-in-out relative z-20 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-0.5">
            {!isCollapsed && (
              <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-400 uppercase">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={isCollapsed ? `${item.label} ${item.shortcut ? `(${item.shortcut})` : ''}` : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer group relative ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  {/* Subtle active left pill */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-white rounded-r-full shadow-xs" />
                  )}

                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 group-hover:text-indigo-400 group-hover:scale-105'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                            item.badgeColor || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.shortcut && (
                        <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-300 opacity-60">
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer / Toggle & Operator Note */}
      <div className="p-2.5 border-t border-slate-800 dark:border-slate-800/80 flex items-center justify-between text-xs gap-2 bg-slate-950/40">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 truncate">
            {onOpenDebugLogs && (
              <button
                type="button"
                onClick={onOpenDebugLogs}
                title="Open Debug Panel (8 Logs) [F10]"
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-md transition-colors cursor-pointer border border-slate-700/60"
              >
                <Bug className="w-3.5 h-3.5 text-indigo-400" />
                <span>Debug (8)</span>
              </button>
            )}
            <span className="text-slate-400 text-[10px] font-mono">v2.6</span>
          </div>
        ) : (
          onOpenDebugLogs && (
            <button
              type="button"
              onClick={onOpenDebugLogs}
              title="Open Debug Panel (8 Logs) [F10]"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              <Bug className="w-4 h-4 text-indigo-400" />
            </button>
          )
        )}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer ml-auto"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
