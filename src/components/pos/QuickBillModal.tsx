import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  Zap,
  CheckCircle2,
  Keyboard,
} from 'lucide-react';
import { Customer, Invoice, InvoiceItem, PaymentMethod, ServiceItem, StaffUser } from '../../types';
import { StorageService } from '../../services/storage';
import { LicenseService } from '../../services/licenseService';

interface QuickBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceItem[];
  customers: Customer[];
  currentStaff: StaffUser;
  onInvoiceCreated: (invoice: Invoice, shouldPrint?: boolean) => void;
}

export const QuickBillModal: React.FC<QuickBillModalProps> = ({
  isOpen,
  onClose,
  services,
  customers,
  currentStaff,
  onInvoiceCreated,
}) => {
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Custom Item Form state
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItemDesc, setCustomItemDesc] = useState('');
  const [customItemRate, setCustomItemRate] = useState<string>('50');
  const [customItemQty, setCustomItemQty] = useState<number>(1);
  const [customItemUnit, setCustomItemUnit] = useState('pc');

  // Shortcut key help dropdown state
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  // Item Code System & Search
  const [itemCodeInput, setItemCodeInput] = useState('');
  const [codeFeedback, setCodeFeedback] = useState<string | null>(null);

  // Input Focus Refs
  const itemCodeInputRef = useRef<HTMLInputElement | null>(null);
  const customerPhoneRef = useRef<HTMLInputElement | null>(null);
  const discountInputRef = useRef<HTMLInputElement | null>(null);

  // Auto focus item code input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        itemCodeInputRef.current?.focus();
      }, 60);
    }
  }, [isOpen]);

  const addItem = (srv: ServiceItem, qtyToAdd: number = 1) => {
    const addQty = Math.max(1, qtyToAdd);
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.description === srv.name);
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const updatedItem = {
          ...existing,
          qty: existing.qty + addQty,
          total: (existing.qty + addQty) * existing.unitPrice,
        };
        const rest = prev.filter((_, idx) => idx !== existingIdx);
        return [updatedItem, ...rest]; // Move updated item to top
      }
      return [
        {
          description: srv.name,
          category: srv.category,
          qty: addQty,
          unit: srv.unitLabel,
          unitPrice: srv.baseRate,
          total: addQty * srv.baseRate,
        },
        ...prev, // Prepend new item to top
      ];
    });
  };

  // Quick Item Code lookup handler with multiplier parsing (e.g. 101*5 or 101x5)
  const handleItemCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = itemCodeInput.trim();
    if (!query) return;

    let codeOrTerm = query;
    let qtyToAdd = 1;

    // Check for multiplier format like 101*5, 101x5, 101 5
    const multMatch = query.match(/^([a-zA-Z0-9]+)\s*[*xX\s]\s*(\d+)$/);
    if (multMatch) {
      codeOrTerm = multMatch[1];
      qtyToAdd = parseInt(multMatch[2], 10) || 1;
    }

    // Search by exact code match or exact/partial name
    const exactCodeMatch = services.find(
      (s) => s.code && s.code.toLowerCase() === codeOrTerm.toLowerCase()
    );

    const match =
      exactCodeMatch ||
      services.find((s) => s.name.toLowerCase().includes(codeOrTerm.toLowerCase()));

    if (match) {
      addItem(match, qtyToAdd);
      setCodeFeedback(`✓ Added ${qtyToAdd > 1 ? qtyToAdd + 'x ' : ''}#${match.code || '101'} - ${match.name}`);
      setItemCodeInput('');
      setTimeout(() => setCodeFeedback(null), 2500);
    } else {
      // Check if user entered "Custom Item Name Amount" e.g. "Spiral Binding 40"
      const customMatch = query.match(/^(.+?)\s+(\d+)$/);
      if (customMatch && parseFloat(customMatch[2]) > 0) {
        const desc = customMatch[1].trim();
        const rate = parseFloat(customMatch[2]);
        setItems((prev) => [
          ...prev,
          {
            description: desc,
            category: 'Other',
            qty: 1,
            unit: 'pc',
            unitPrice: rate,
            total: rate,
            details: 'Quick keyboard entry',
          },
        ]);
        setCodeFeedback(`✓ Added custom item "${desc}" @ ₹${rate}`);
        setItemCodeInput('');
        setTimeout(() => setCodeFeedback(null), 2500);
        return;
      }

      setCodeFeedback(`⚠️ No service found for code/query "${query}"`);
      setTimeout(() => setCodeFeedback(null), 3000);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subtotal - (discount || 0));
  const effectivePaid = paidAmount === '' ? grandTotal : parseFloat(paidAmount) || 0;
  const balance = Math.max(0, grandTotal - effectivePaid);

  const handleCompleteBill = (printImmediately: boolean) => {
    if (!LicenseService.canUseFeature('pos')) {
      alert('Commercial license expired or restricted. Please renew your LUMINA CYBER SOLUTION subscription in Settings -> License & Subscription.');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one item to bill.');
      return;
    }

    // Upsert customer if phone provided
    let custId: string | undefined;
    if (customerPhone.trim()) {
      const savedCust = StorageService.upsertCustomer({
        name: customerName || 'Walk-in Customer',
        phone: customerPhone.trim(),
        totalOrdersAmount: grandTotal,
        totalPaidAmount: effectivePaid,
        totalDueAmount: balance,
      });
      custId = savedCust.id;
    }

    const newInvoice: Invoice = {
      id: StorageService.generateNextInvoiceId(),
      date: new Date().toISOString(),
      type: 'quick',
      customer: {
        id: custId,
        name: customerName.trim() || 'Walk-in Customer',
        phone: customerPhone.trim() || '9800000000',
      },
      items,
      subtotal,
      discount: discount || 0,
      tax: 0,
      total: grandTotal,
      paid: effectivePaid,
      balance,
      paymentMethod,
      notes,
      staff: currentStaff.name,
    };

    StorageService.addInvoice(newInvoice);
    onInvoiceCreated(newInvoice, printImmediately);
    onClose();
  };

  // Global Keyboard Shortcuts for Quick Bill POS
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F8 or Ctrl+Enter -> Complete & Print
      if (e.key === 'F8' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handleCompleteBill(true);
        return;
      }

      // F9 or Shift+Enter -> Complete & Save without print
      if (e.key === 'F9' || (e.shiftKey && e.key === 'Enter')) {
        e.preventDefault();
        handleCompleteBill(false);
        return;
      }

      // Alt + C -> Focus Customer Mobile
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        customerPhoneRef.current?.focus();
        return;
      }

      // Alt + D -> Focus Discount
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        discountInputRef.current?.focus();
        return;
      }

      // Alt + M / Alt + P -> Toggle Payment Method
      if (e.altKey && (e.key === 'm' || e.key === 'M' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        const methods: PaymentMethod[] = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Due'];
        const currentIdx = methods.indexOf(paymentMethod);
        const nextIdx = (currentIdx + 1) % methods.length;
        setPaymentMethod(methods[nextIdx]);
        return;
      }

      // Alt + S -> Focus Item Code Input
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        itemCodeInputRef.current?.focus();
        return;
      }

      // Alt + X -> Clear Cart
      if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        setItems([]);
        return;
      }

      // Esc -> Clear input or close
      if (e.key === 'Escape') {
        if (itemCodeInput) {
          e.preventDefault();
          setItemCodeInput('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, paymentMethod, customerName, customerPhone, discount, itemCodeInput]);

  if (!isOpen) return null;

  // Filtered quick services by search/code
  const quickServices = services.filter((s) => {
    if (!itemCodeInput.trim()) return s.popular || s.category === 'Printing';
    const q = itemCodeInput.toLowerCase().trim();
    return (
      (s.code && s.code.toLowerCase().includes(q)) ||
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  const addCustomItem = () => {
    if (!customItemDesc.trim()) {
      alert('Please enter a description for the custom service/item.');
      return;
    }
    const rate = parseFloat(customItemRate) || 0;
    setItems((prev) => [
      {
        description: customItemDesc.trim(),
        category: 'Other',
        qty: customItemQty || 1,
        unit: customItemUnit.trim() || 'pc',
        unitPrice: rate,
        total: (customItemQty || 1) * rate,
        details: 'Manual rate entry',
      },
      ...prev,
    ]);
    setCustomItemDesc('');
    setCustomItemRate('50');
    setCustomItemQty(1);
    setShowCustomItemForm(false);
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, qty: newQty, total: newQty * item.unitPrice } : item
      )
    );
  };

  const updateItemPrice = (index: number, newPrice: number) => {
    const validPrice = Math.max(0, newPrice);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              unitPrice: validPrice,
              total: Number((item.qty * validPrice).toFixed(2)),
              details: item.details ? item.details : 'Manual rate applied',
            }
          : item
      )
    );
  };

  const updateItemTotal = (index: number, newTotal: number) => {
    const validTotal = Math.max(0, newTotal);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newUnitPrice =
          item.qty > 0 ? Number((validTotal / item.qty).toFixed(2)) : validTotal;
        return {
          ...item,
          total: validTotal,
          unitPrice: newUnitPrice,
          details: `Manual total ₹${validTotal}`,
        };
      })
    );
  };

  const updateItemDescription = (index: number, newDesc: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, description: newDesc } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/70 dark:bg-emerald-950/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg shadow-2xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Quick Bill POS <span className="font-mono text-emerald-700 dark:text-emerald-400 text-xs">[F1]</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Walk-in Xerox, Printouts, Photos & Instant Counter Services
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Top-Right Dropdown Shortcut Key Help */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShortcutHelp(!showShortcutHelp)}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs rounded-lg border border-emerald-500/40 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="View Keyboard Shortcut Keys Help"
              >
                <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Shortcuts</span>
                <span className="text-[9.5px] font-mono bg-emerald-950 text-emerald-300 px-1 py-0.2 rounded border border-emerald-800">
                  [?]
                </span>
              </button>

              {/* Dropdown Menu Popover */}
              {showShortcutHelp && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-3 z-50 animate-in fade-in zoom-in-95 space-y-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 font-sans font-extrabold text-xs text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Keyboard className="w-4 h-4 text-emerald-400" />
                      Keyboard Shortcut Keys
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowShortcutHelp(false)}
                      className="text-slate-400 hover:text-white p-0.5"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    <div className="flex items-center justify-between p-1.5 bg-slate-800/90 rounded border border-slate-700">
                      <span className="text-slate-300 font-sans font-medium text-[11px]">Add Code & Qty</span>
                      <kbd className="px-1.5 py-0.5 bg-slate-950 text-emerald-400 rounded font-bold text-[10px]">101*5 + Enter</kbd>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-slate-800/90 rounded border border-slate-700">
                      <span className="text-slate-300 font-sans font-medium text-[11px]">Save & Print Thermal</span>
                      <kbd className="px-1.5 py-0.5 bg-slate-950 text-emerald-400 rounded font-bold text-[10px]">F8 / Ctrl+Enter</kbd>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-slate-800/90 rounded border border-slate-700">
                      <span className="text-slate-300 font-sans font-medium text-[11px]">Save Bill Only</span>
                      <kbd className="px-1.5 py-0.5 bg-slate-950 text-indigo-300 rounded font-bold text-[10px]">F9</kbd>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-slate-800/90 rounded border border-slate-700">
                      <span className="text-slate-300 font-sans font-medium text-[11px]">Focus Customer Phone</span>
                      <kbd className="px-1.5 py-0.5 bg-slate-950 text-indigo-300 rounded font-bold text-[10px]">Alt + C</kbd>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-slate-800/90 rounded border border-slate-700">
                      <span className="text-slate-300 font-sans font-medium text-[11px]">Focus Discount Field</span>
                      <kbd className="px-1.5 py-0.5 bg-slate-950 text-indigo-300 rounded font-bold text-[10px]">Alt + D</kbd>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-slate-800/90 rounded border border-slate-700">
                      <span className="text-slate-300 font-sans font-medium text-[11px]">Cycle Payment Method</span>
                      <kbd className="px-1.5 py-0.5 bg-slate-950 text-indigo-300 rounded font-bold text-[10px]">Alt + M</kbd>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-slate-800/90 rounded border border-slate-700">
                      <span className="text-slate-300 font-sans font-medium text-[11px]">Focus Item Code Input</span>
                      <kbd className="px-1.5 py-0.5 bg-slate-950 text-slate-400 rounded font-bold text-[10px]">Alt + S</kbd>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-slate-800/90 rounded border border-slate-700">
                      <span className="text-slate-300 font-sans font-medium text-[11px]">Clear Bill Cart</span>
                      <kbd className="px-1.5 py-0.5 bg-slate-950 text-rose-400 rounded font-bold text-[10px]">Alt + X</kbd>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body: Two columns layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Column: Quick Item Catalogs (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-850/60 space-y-3">
            {/* Item Code Quick Billing Input Bar */}
            <form onSubmit={handleItemCodeSubmit} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10.5px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  ⚡ Item Code Billing / Quick Search
                </label>
              </div>
              <div className="flex gap-1.5">
                <input
                  ref={itemCodeInputRef}
                  type="text"
                  placeholder="Type item code or name & press Enter..."
                  value={itemCodeInput}
                  onChange={(e) => setItemCodeInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border-2 border-indigo-500/80 dark:border-indigo-500 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1"
                >
                  <span>+ Add</span>
                  <kbd className="text-[9px] bg-indigo-800 px-1 py-0.2 rounded font-mono">Enter</kbd>
                </button>
              </div>
              {codeFeedback && (
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 animate-in fade-in">
                  {codeFeedback}
                </div>
              )}
            </form>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-1">
              <span>Popular Quick Services</span>
              <button
                type="button"
                onClick={() => setShowCustomItemForm(!showCustomItemForm)}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold lowercase text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <span>{showCustomItemForm ? '− cancel custom' : '+ custom item/rate'}</span>
              </button>
            </div>

            {/* Inline Custom Item & Manual Rate Form */}
            {showCustomItemForm && (
              <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-lg space-y-2 text-xs">
                <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center justify-between">
                  <span>Add Custom Item with Manual Rate</span>
                </div>
                <input
                  type="text"
                  placeholder="Item Name (e.g. Legal Bond Paper Xerox, Urgent Spiral)"
                  value={customItemDesc}
                  onChange={(e) => setCustomItemDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded text-xs outline-none font-medium focus:border-indigo-500"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">Rate (₹) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Rate"
                      value={customItemRate}
                      onChange={(e) => setCustomItemRate(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={customItemQty}
                      onChange={(e) => setCustomItemQty(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">Unit</label>
                    <input
                      type="text"
                      placeholder="pc / page"
                      value={customItemUnit}
                      onChange={(e) => setCustomItemUnit(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addCustomItem}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Item to Bill</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-1.5">
              {quickServices.map((srv, idx) => (
                <button
                  key={`srv-btn-${srv.id || 'srv'}-${idx}`}
                  onClick={() => addItem(srv)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-all text-left group shadow-2xs cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-900 dark:group-hover:text-emerald-300 truncate flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-1 py-0.2 rounded shrink-0">
                        #{srv.code || '101'}
                      </span>
                      <span className="truncate">{srv.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Rate: ₹{srv.baseRate} / {srv.unitLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      ₹{srv.baseRate}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                  </div>
                </button>
              ))}
            </div>

            {/* Quick customer look-up */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Customer (Optional for walk-in)
              </div>
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Customer Name (e.g. Rahul Das)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg outline-none focus:border-indigo-500"
                />
                <input
                  ref={customerPhoneRef}
                  type="text"
                  placeholder="Mobile No. (Alt + C) e.g. 9800099934"
                  value={customerPhone}
                  onChange={(e) => {
                    const phone = e.target.value;
                    setCustomerPhone(phone);
                    // Autofill if matches existing customer
                    const match = customers.find((c) => c.phone.includes(phone) && phone.length > 5);
                    if (match) {
                      setCustomerName(match.name);
                    }
                  }}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Bill Cart & Checkout (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between p-4 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Cart Items Table */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                <span>Items in Bill ({items.length})</span>
                {items.length > 0 && (
                  <button
                    onClick={() => setItems([])}
                    className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer text-[10px]"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                  Bill is empty. Click any service on the left to add items.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={`quick-item-${idx}`}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItemDescription(idx, e.target.value)}
                            className="w-full font-semibold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 px-1 py-0.5 rounded outline-none truncate"
                            title="Click to edit item description"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Total: ₹</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={item.total}
                            onChange={(e) => updateItemTotal(idx, parseFloat(e.target.value) || 0)}
                            className="w-16 font-extrabold text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-right tabular-nums outline-none focus:border-indigo-500 shadow-2xs"
                            title="Directly edit line total (auto-updates unit rate)"
                          />
                          <button
                            onClick={() => removeItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer ml-1"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Controls Row: Quantity & Manual Rate Change */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px]">
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Qty:</span>
                          <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateItemQty(idx, item.qty - 1)}
                              className="px-2 py-0.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateItemQty(idx, parseInt(e.target.value, 10) || 1)}
                              className="w-12 text-center font-bold text-xs outline-none border-none py-0.5 tabular-nums bg-transparent text-slate-900 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQty(idx, item.qty + 1)}
                              className="px-2 py-0.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-slate-400 dark:text-slate-500">{item.unit}</span>
                        </div>

                        {/* Manual Rate Change Input & Micro Adjusters */}
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Rate: ₹</span>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                              className="w-16 px-1 py-0.5 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded text-center outline-none focus:border-indigo-500 tabular-nums text-xs"
                              title="Edit unit rate for this bill"
                            />
                            <span className="text-slate-400 dark:text-slate-500">/{item.unit}</span>
                          </div>

                          <div className="flex items-center gap-0.5 text-[9px] font-bold">
                            <button
                              type="button"
                              onClick={() => updateItemPrice(idx, Math.max(0, item.unitPrice - 0.5))}
                              className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer border border-slate-200 dark:border-slate-700"
                              title="Decrease rate by ₹0.50"
                            >
                              -0.5
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItemPrice(idx, item.unitPrice + 0.5)}
                              className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer border border-slate-200 dark:border-slate-700"
                              title="Increase rate by ₹0.50"
                            >
                              +0.5
                            </button>
                          </div>

                          <span className="text-[9px] text-indigo-600 dark:text-indigo-300 font-bold uppercase px-1 bg-indigo-50 dark:bg-indigo-950/60 rounded border border-indigo-100 dark:border-indigo-800">
                            Manual
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Billing Totals & Payment Methods */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-2 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Discount (Alt+D):</span>
                  <input
                    ref={discountInputRef}
                    type="number"
                    min="0"
                    placeholder="₹0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-xs outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
                <div className="text-right">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Total: </span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                    ₹{grandTotal}
                  </span>
                </div>
              </div>

              {/* Payment selector */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  <span>Payment Method</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono lowercase">Alt + M to cycle</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Cash', 'UPI', 'Card', 'Due'] as PaymentMethod[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setPaymentMethod(mode);
                        if (mode === 'Due') setPaidAmount('0');
                        else setPaidAmount('');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                        paymentMethod === mode
                          ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      {mode === 'Cash' && <Banknote className="w-3.5 h-3.5 text-emerald-400" />}
                      {mode === 'UPI' && <Smartphone className="w-3.5 h-3.5 text-cyan-400" />}
                      {mode === 'Card' && <CreditCard className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{mode}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount paid override if partial or due */}
              {paymentMethod === 'Due' && (
                <div className="flex items-center justify-between text-xs bg-rose-50 dark:bg-rose-950/60 p-2 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
                  <span>Balance marked as Customer Due:</span>
                  <span className="font-bold tabular-nums">₹{grandTotal}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleCompleteBill(false)}
                  className="py-2.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Save Only</span>
                  <kbd className="text-[9.5px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">F9</kbd>
                </button>
                <button
                  onClick={() => handleCompleteBill(true)}
                  className="py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Save & Print Thermal</span>
                  <kbd className="text-[9.5px] font-mono font-bold bg-emerald-700 text-white px-1.5 py-0.5 rounded">F8 / Ctrl+Enter</kbd>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
