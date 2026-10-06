import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', desc: 'Open Quick Bill POS (Walk-in Xerox, prints, photo)' },
    { key: '101*5 + Enter', desc: 'Quick Bill Item Code + Quantity Multiplier (e.g. 101*5)' },
    { key: 'F8 / Ctrl + Enter', desc: 'Save & Print Thermal Receipt immediately in POS' },
    { key: 'F9', desc: 'Save Bill without printing' },
    { key: 'Alt + C', desc: 'Focus Customer Mobile Number input field' },
    { key: 'Alt + D', desc: 'Focus Discount input field in POS' },
    { key: 'Alt + M', desc: 'Cycle Payment Method (Cash ➔ UPI ➔ Card ➔ Due)' },
    { key: 'Alt + S', desc: 'Focus Item Code / Search input field' },
    { key: 'F2', desc: 'Create New Job (Flex, Menu, Cards, Design)' },
    { key: 'F3', desc: 'Global Search (Find customer, phone, Job #, Invoice #)' },
    { key: 'F4', desc: 'Collect Payment / Due settlement' },
    { key: 'F5', desc: 'Record Shop Expense (with Auto-Stock Restock)' },
    { key: 'F6', desc: 'Job Board (Kanban queue: Received → Delivered)' },
    { key: 'ESC', desc: 'Clear search query or close open modal' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workstation Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            LUMINA CYBER SOLUTION POS is built for ultra-fast keyboard navigation during busy cyber café hours:
          </p>

          <div className="grid grid-cols-1 gap-2">
            {shortcuts.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
              >
                <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">{s.desc}</span>
                <kbd className="px-2 py-1 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700/60 rounded shadow-2xs">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors"
          >
            Got it (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
