import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  Search,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Edit3,
  Receipt,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Customer, Invoice, InvoiceItem, PaymentMethod, ServiceCategory, ServiceItem, StaffUser } from '../../types';
import { StorageService } from '../../services/storage';

interface NewBillViewProps {
  services: ServiceItem[];
  customers: Customer[];
  currentStaff: StaffUser;
  onInvoiceCreated: (invoice: Invoice, shouldPrintThermal?: boolean) => void;
  onOpenNewJob: () => void;
}

export const NewBillView: React.FC<NewBillViewProps> = ({
  services,
  customers,
  currentStaff,
  onInvoiceCreated,
  onOpenNewJob,
}) => {
  // Catalog filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart / Bill State
  const [items, setItems] = useState<
    (InvoiceItem & { originalBaseRate?: number; isManualRate?: boolean })[]
  >([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [receivedCash, setReceivedCash] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Customer State
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);

  // Quick Custom Item Form
  const [customName, setCustomName] = useState('');
  const [customRate, setCustomRate] = useState<string>('50');
  const [customQty, setCustomQty] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState('pc');

  // Categories list
  const categoryFilters = [
    { id: 'All', label: 'All Services' },
    { id: 'Printing', label: '🖨 Printing & Xerox' },
    { id: 'PhotoDesign', label: '📸 Photo & Framing' },
    { id: 'Cards', label: '💳 PVC & Cards' },
    { id: 'DocumentServices', label: '📄 Cyber & Govt Docs' },
    { id: 'RestaurantServices', label: '🏪 Restaurant Printing' },
  ];

  // Quick Code Entry State
  const [quickCodeInput, setQuickCodeInput] = useState('');
  const [quickCodeNotice, setQuickCodeNotice] = useState<string | null>(null);

  // Filtered catalog
  const filteredServices = services.filter((srv) => {
    const matchesCategory =
      selectedCategory === 'All' || srv.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (srv.code && srv.code.toLowerCase().includes(q)) ||
      srv.name.toLowerCase().includes(q) ||
      (srv.description && srv.description.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  // Handle Quick Item Code Entry
  const handleQuickCodeAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickCodeInput.trim();
    if (!q) return;

    const exactCode = services.find((s) => s.code && s.code.toLowerCase() === q.toLowerCase());
    const match = exactCode || services.find((s) => s.name.toLowerCase().includes(q.toLowerCase()));

    if (match) {
      handleAddItem(match);
      setQuickCodeNotice(`✓ Added #${match.code || '101'} - ${match.name}`);
      setQuickCodeInput('');
      setTimeout(() => setQuickCodeNotice(null), 2500);
    } else {
      setQuickCodeNotice(`⚠️ No service found for item code "${q}"`);
      setTimeout(() => setQuickCodeNotice(null), 3000);
    }
  };

  // Add standard catalog item
  const handleAddItem = (srv: ServiceItem) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.description === srv.name);
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const updatedItem = {
          ...existing,
          qty: existing.qty + 1,
          total: (existing.qty + 1) * existing.unitPrice,
        };
        const rest = prev.filter((_, idx) => idx !== existingIdx);
        return [updatedItem, ...rest]; // Move updated item to top
      }
      return [
        {
          description: srv.name,
          category: srv.category,
          qty: 1,
          unit: srv.unitLabel,
          unitPrice: srv.baseRate,
          total: srv.baseRate,
          originalBaseRate: srv.baseRate,
          isManualRate: false,
        },
        ...prev, // Prepend new item to top
      ];
    });
  };

  // Add custom arbitrary item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      alert('Please enter service description');
      return;
    }
    const rate = parseFloat(customRate) || 0;
    const qty = Math.max(1, customQty);
    setItems((prev) => [
      {
        description: customName.trim(),
        category: 'Other',
        qty,
        unit: customUnit.trim() || 'pc',
        unitPrice: rate,
        total: qty * rate,
        originalBaseRate: rate,
        isManualRate: true,
        details: 'Custom manual entry',
      },
      ...prev,
    ]);
    setCustomName('');
    setCustomRate('50');
    setCustomQty(1);
  };

  // Update item quantity
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              qty: newQty,
              total: Number((newQty * item.unitPrice).toFixed(2)),
            }
          : item
      )
    );
  };

  // Manual Rate Change per unit
  const handleUpdateRate = (index: number, newRate: number) => {
    const validRate = Math.max(0, newRate);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              unitPrice: validRate,
              total: Number((item.qty * validRate).toFixed(2)),
              isManualRate:
                item.originalBaseRate !== undefined
                  ? validRate !== item.originalBaseRate
                  : true,
            }
          : item
      )
    );
  };

  // Direct Line Total Override (calculates unit rate)
  const handleUpdateLineTotal = (index: number, newTotal: number) => {
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
          isManualRate: true,
          details: `Manual total ₹${validTotal}`,
        };
      })
    );
  };

  // Reset rate back to standard catalog base rate
  const handleResetRate = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const original = item.originalBaseRate ?? item.unitPrice;
        return {
          ...item,
          unitPrice: original,
          total: Number((item.qty * original).toFixed(2)),
          isManualRate: false,
        };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subtotal - (discount || 0));
  const cashGiven = receivedCash === '' ? grandTotal : parseFloat(receivedCash) || 0;
  const changeDue = Math.max(0, cashGiven - grandTotal);
  const balanceDue = paymentMethod === 'Due' ? grandTotal : Math.max(0, grandTotal - cashGiven);

  // Complete & Generate Invoice
  const handleCheckout = (shouldPrint: boolean) => {
    if (items.length === 0) {
      alert('Please add at least one service item to the bill.');
      return;
    }

    let customerId: string | undefined;
    if (customerPhone.trim()) {
      const saved = StorageService.upsertCustomer({
        name: customerName.trim() || 'Walk-in Customer',
        phone: customerPhone.trim(),
        address: customerAddress.trim() || undefined,
        totalOrdersAmount: grandTotal,
        totalPaidAmount: paymentMethod === 'Due' ? 0 : grandTotal,
        totalDueAmount: paymentMethod === 'Due' ? grandTotal : 0,
      });
      customerId = saved.id;
    }

    const cleanItems: InvoiceItem[] = items.map((i) => ({
      description: i.description,
      category: i.category,
      qty: i.qty,
      unit: i.unit,
      unitPrice: i.unitPrice,
      total: i.total,
      details: i.isManualRate ? `Manual Rate: ₹${i.unitPrice}/${i.unit}` : i.details,
    }));

    const newInvoice: Invoice = {
      id: StorageService.generateNextInvoiceId(),
      date: new Date().toISOString(),
      type: 'quick',
      customer: {
        id: customerId,
        name: customerName.trim() || 'Walk-in Customer',
        phone: customerPhone.trim() || '9800000000',
        address: customerAddress.trim() || undefined,
      },
      items: cleanItems,
      subtotal,
      discount: discount || 0,
      tax: 0,
      total: grandTotal,
      paid: paymentMethod === 'Due' ? 0 : grandTotal,
      balance: paymentMethod === 'Due' ? grandTotal : 0,
      paymentMethod,
      notes,
      staff: currentStaff.name,
    };

    StorageService.addInvoice(newInvoice);
    onInvoiceCreated(newInvoice, shouldPrint);

    // Reset bill state for next customer
    setItems([]);
    setDiscount(0);
    setReceivedCash('');
    setNotes('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerAddress('');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 transition-colors">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-2xs">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>POS Billing Counter</span>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md font-bold">
                [F1 Fast Counter]
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Instant walk-in billing with manual rate adjustments & one-click receipts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewJob}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Custom Job Workflow [F2]</span>
          </button>
        </div>
      </div>

      {/* Main Counter Grid: 7 cols catalog + 5 cols register */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Section: Service Catalog & Custom Item (7 cols) */}
        <div className="lg:col-span-7 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
          {/* Search & Category Filter Toolbar */}
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
            {/* Quick Item Code Direct Entry Bar */}
            <form onSubmit={handleQuickCodeAdd} className="flex gap-1.5 items-center bg-indigo-50/70 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <span className="text-[10px] font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Code Billing:</span>
              </span>
              <input
                type="text"
                placeholder="Enter Item Code (e.g. 101, 102, 201) & press Enter..."
                value={quickCodeInput}
                onChange={(e) => setQuickCodeInput(e.target.value)}
                className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-800 border-2 border-indigo-500/80 dark:border-indigo-500 rounded text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded transition-colors cursor-pointer shrink-0"
              >
                + Add Code
              </button>
            </form>
            {quickCodeNotice && (
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 animate-in fade-in px-1">
                {quickCodeNotice}
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by Item Code (101), service name, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-750"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
              {categoryFilters.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Custom Item Bar with Manual Rate */}
          <div className="px-3 py-2 bg-indigo-50/80 dark:bg-indigo-950/50 border-b border-indigo-200 dark:border-indigo-800 shrink-0">
            <form onSubmit={handleAddCustomItem} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-indigo-950 dark:text-indigo-200 text-[11px] flex items-center gap-1 shrink-0">
                <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>+ Custom Item & Rate:</span>
              </span>
              <input
                type="text"
                placeholder="Item / Service Name (e.g. Urgent Spiral, Legal Bond Copy)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-1 min-w-[160px] px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded text-xs text-slate-900 dark:text-slate-100 outline-none"
              />
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-1.5 py-0.5 border border-indigo-200 dark:border-indigo-700 rounded shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Rate"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-14 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-transparent outline-none tabular-nums"
                  title="Manual Rate in Rupees"
                />
              </div>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-1.5 py-0.5 border border-indigo-200 dark:border-indigo-700 rounded">
                <span className="text-[10px] text-slate-400">Qty:</span>
                <input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(parseInt(e.target.value, 10) || 1)}
                  className="w-10 text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                + Add
              </button>
            </form>
          </div>

          {/* Service Cards Grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredServices.map((srv) => (
              <button
                key={srv.id}
                onClick={() => handleAddItem(srv)}
                className="p-3 bg-white dark:bg-slate-850 hover:bg-emerald-50/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-xl text-left transition-all group shadow-2xs hover:shadow-xs flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 rounded">
                      #{srv.code || '101'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold truncate">{srv.category}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-950 dark:group-hover:text-emerald-200 truncate">
                    {srv.name}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {srv.description || srv.category}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">
                    /{srv.unitLabel}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 tabular-nums">
                      ₹{srv.baseRate}
                    </span>
                    <div className="p-0.5 bg-slate-100 dark:bg-slate-700 group-hover:bg-emerald-600 group-hover:text-white rounded text-slate-400 dark:text-slate-300 transition-colors">
                      <Plus className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Section: Bill Register / Cart (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
          {/* Customer Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Customer Details
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Leave blank for counter walk-in)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Mobile (e.g. 9800099934)"
                value={customerPhone}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerPhone(val);
                  if (val.length >= 4) {
                    const match = customers.find((c) => c.phone.includes(val));
                    if (match) {
                      setCustomerName(match.name);
                      if (match.address) setCustomerAddress(match.address);
                    }
                  }
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800">
              <span>Items in Bill ({items.length})</span>
              {items.length > 0 && (
                <button
                  onClick={() => setItems([])}
                  className="text-rose-600 dark:text-rose-400 hover:text-rose-800 text-[10px] cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500 text-xs">
                <Zap className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">Bill cart is empty</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Click any service on the left or add a custom item above.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs space-y-2 transition-all ${
                      item.isManualRate
                        ? 'bg-amber-50/50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Top Row: Description & Line Total */}
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, description: e.target.value } : it
                            )
                          )
                        }
                        className="flex-1 font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 outline-none truncate"
                        title="Click to rename item"
                      />

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-slate-400 font-semibold">Total:</span>
                        <div className="flex items-center bg-slate-50 dark:bg-slate-750 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">₹</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={item.total}
                            onChange={(e) =>
                              handleUpdateLineTotal(idx, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 font-extrabold text-xs text-slate-900 dark:text-white bg-transparent text-right outline-none tabular-nums"
                            title="Directly edit line total (auto-updates unit rate)"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Controls Row: Qty Stepper + MANUAL RATE CHANGE OPTION */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/80">
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Qty:</span>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-750 shadow-2xs overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.qty - 1)}
                            className="px-2 py-0.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              handleUpdateQty(idx, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-10 text-center font-bold text-xs text-slate-900 dark:text-white outline-none py-0.5 tabular-nums bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.qty + 1)}
                            className="px-2 py-0.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 ml-0.5">{item.unit}</span>
                      </div>

                      {/* Manual Rate Change Control Box */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-750 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Rate: ₹</span>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdateRate(idx, parseFloat(e.target.value) || 0)
                            }
                            className={`w-14 font-extrabold text-xs text-center rounded outline-none tabular-nums ${
                              item.isManualRate
                                ? 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700'
                                : 'text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:border-indigo-500'
                            }`}
                            title="Edit unit rate for this bill"
                          />
                          <span className="text-[10px] text-slate-400">/{item.unit}</span>
                        </div>

                        {/* Quick +/- rate micro-adjusters */}
                        <div className="hidden sm:flex items-center gap-0.5 text-[9px] font-bold">
                          <button
                            type="button"
                            onClick={() => handleUpdateRate(idx, Math.max(0, item.unitPrice - 0.5))}
                            className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded cursor-pointer"
                            title="Decrease rate by ₹0.50"
                          >
                            -0.5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateRate(idx, item.unitPrice + 0.5)}
                            className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded cursor-pointer"
                            title="Increase rate by ₹0.50"
                          >
                            +0.5
                          </button>
                        </div>

                        {/* Status Badge & Reset */}
                        {item.isManualRate ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 uppercase">
                              Manual
                            </span>
                            {item.originalBaseRate !== undefined && (
                              <button
                                type="button"
                                onClick={() => handleResetRate(idx)}
                                title={`Reset to standard ₹${item.originalBaseRate}`}
                                className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] font-medium text-slate-400">Std</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout & Tender Drawer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-3">
            {/* Totals & Discount Row */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">₹{subtotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-right font-medium text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="text-right flex flex-col justify-end">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Grand Total
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                  ₹{grandTotal}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-4 gap-1.5">
              {(['Cash', 'UPI', 'Card', 'Due'] as PaymentMethod[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMethod(mode)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === mode
                      ? mode === 'Due'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                        : 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {mode === 'Cash' && <Banknote className="w-3.5 h-3.5" />}
                  {mode === 'UPI' && <Smartphone className="w-3.5 h-3.5" />}
                  {mode === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                  {mode === 'Due' && <Clock className="w-3.5 h-3.5" />}
                  <span>{mode}</span>
                </button>
              ))}
            </div>

            {/* Cash Tender & Quick Denominations (if Cash selected) */}
            {paymentMethod === 'Cash' && (
              <div className="p-2 bg-white dark:bg-slate-750 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Cash Received:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      placeholder={`${grandTotal}`}
                      value={receivedCash}
                      onChange={(e) => setReceivedCash(e.target.value)}
                      className="w-20 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-650 rounded font-bold text-right text-slate-900 dark:text-slate-100 outline-none tabular-nums"
                    />
                  </div>
                </div>

                {/* Quick denomination chips */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                  <span className="text-slate-400 font-semibold shrink-0">Quick:</span>
                  {[grandTotal, 50, 100, 200, 500, 2000].map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReceivedCash(amt.toString())}
                      className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded cursor-pointer shrink-0"
                    >
                      {amt === grandTotal ? 'Exact' : `₹${amt}`}
                    </button>
                  ))}
                </div>

                {/* Change return alert */}
                {changeDue > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <span>Change to Return:</span>
                    <span className="font-extrabold font-mono text-sm">₹{changeDue}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons: Save Bill Only & Save & Print Bill */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCheckout(false)}
                disabled={items.length === 0}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Save Bill Only</span>
              </button>

              <button
                type="button"
                onClick={() => handleCheckout(true)}
                disabled={items.length === 0}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Printer className="w-4 h-4" />
                <span>Save & Print Bill</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
