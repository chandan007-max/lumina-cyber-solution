import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Boxes,
  AlertCircle,
  CheckCircle,
  Plus,
  Sparkles,
  Check,
  Package,
} from 'lucide-react';
import { ExpenseItem, MaterialItem, PaymentMethod } from '../../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MaterialItem[];
  onAddExpense: (expense: ExpenseItem) => void;
  onUpdateStock: (materialId: string, delta: number) => void;
  onAddMaterial?: (material: MaterialItem) => void;
  initialCategory?: ExpenseItem['category'];
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  materials,
  onAddExpense,
  onUpdateStock,
  onAddMaterial,
  initialCategory = 'Paper & Media',
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseItem['category']>(initialCategory);
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paidTo, setPaidTo] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Check if current category is for raw materials & stock purchases
  const isMaterialCategory =
    category === 'Paper & Media' ||
    category === 'Inks & Toners' ||
    category === 'Raw Material & Stock';

  const [linkToStock, setLinkToStock] = useState<boolean>(isMaterialCategory);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [restockQty, setRestockQty] = useState<number | ''>(1);

  // Quick Inline New Material Creation
  const [isCreatingNewMaterial, setIsCreatingNewMaterial] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatCategory, setNewMatCategory] = useState<MaterialItem['category']>('Paper');
  const [newMatUnit, setNewMatUnit] = useState('Ream (500 sheets)');
  const [newMatMinStock, setNewMatMinStock] = useState<number>(3);

  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync linkToStock state and material selection when category changes
  useEffect(() => {
    if (isMaterialCategory) {
      setLinkToStock(true);
      if (materials.length > 0) {
        const match = materials.find((m) => {
          if (category === 'Paper & Media') return m.category === 'Paper' || m.category === 'Flex & Vinyl';
          if (category === 'Inks & Toners') return m.category === 'Inks & Toners';
          return true;
        });
        if (match) setSelectedMaterialId(match.id);
        else if (materials[0]) setSelectedMaterialId(materials[0].id);
      }
    } else {
      setLinkToStock(false);
    }
  }, [category, materials, isMaterialCategory]);

  // Reset errors on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessNotice(null);
      if (materials.length > 0 && !selectedMaterialId) {
        setSelectedMaterialId(materials[0].id);
      }
    }
  }, [isOpen, materials]);

  if (!isOpen) return null;

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);
  const numAmount = typeof amount === 'number' ? amount : 0;
  const numQty = typeof restockQty === 'number' ? restockQty : 0;

  const calculatedUnitCost =
    numAmount > 0 && numQty > 0 ? Math.round((numAmount / numQty) * 100) / 100 : 0;

  const handleQuickTitle = (suggestedTitle: string, suggestedCat: ExpenseItem['category'], defaultPaidTo?: string) => {
    setTitle(suggestedTitle);
    setCategory(suggestedCat);
    if (defaultPaidTo) setPaidTo(defaultPaidTo);

    const lower = suggestedTitle.toLowerCase();
    const matchedMat = materials.find((m) => lower.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(lower));
    if (matchedMat) {
      setSelectedMaterialId(matchedMat.id);
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide an expense title or description');
      return;
    }
    if (numAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0');
      return;
    }

    // ONLY update material & stock automatically if selected category is raw material/stock AND linkToStock is active
    const shouldUpdateStock = isMaterialCategory && linkToStock;

    let linkedMatId = selectedMaterialId;
    let linkedMatName = selectedMaterial?.name;

    if (shouldUpdateStock) {
      if (isCreatingNewMaterial) {
        if (!newMatName.trim()) {
          setError('Please enter the name for the new raw material');
          return;
        }
        if (onAddMaterial) {
          const newMat: MaterialItem = {
            id: `mat-${Date.now()}`,
            name: newMatName.trim(),
            category: newMatCategory,
            unit: newMatUnit.trim() || 'Units',
            currentStock: numQty,
            minStockLevel: newMatMinStock || 3,
            costPerUnit: calculatedUnitCost || 100,
            supplier: paidTo.trim() || undefined,
            lastRestocked: date,
          };
          onAddMaterial(newMat);
          linkedMatId = newMat.id;
          linkedMatName = newMat.name;
        }
      } else if (selectedMaterial && numQty > 0) {
        // Auto-update existing stock
        onUpdateStock(selectedMaterial.id, numQty);
      }
    }

    // Create Expense Item
    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      date: date || new Date().toISOString().split('T')[0],
      title: title.trim(),
      category,
      amount: numAmount,
      paymentMethod,
      paidTo: paidTo.trim() || undefined,
      notes: notes.trim() || undefined,
      materialId: shouldUpdateStock && linkedMatId ? linkedMatId : undefined,
      materialName: shouldUpdateStock && linkedMatName ? linkedMatName : undefined,
      restockQuantity: shouldUpdateStock && numQty > 0 ? numQty : undefined,
    };

    onAddExpense(newExpense);

    setSuccessNotice(`Expense ₹${numAmount} recorded successfully!`);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden text-xs animate-in fade-in zoom-in-95 my-auto">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-2">
                <span>Record Shop Expense</span>
                {isMaterialCategory && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
                    ⚡ Auto-Stock Update On
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isMaterialCategory
                  ? 'Raw Material purchase selected — material stock quantity will update automatically'
                  : 'General operational shop expense (no stock quantity change)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
          <span className="text-slate-500 font-bold shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Quick:
          </span>
          <button
            type="button"
            onClick={() => handleQuickTitle('JK Copier A4 75 GSM Paper (5 Reams)', 'Paper & Media', 'Kolkata Paper Agency')}
            className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-md font-medium text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
          >
            📄 JK A4 Paper (Stock)
          </button>
          <button
            type="button"
            onClick={() => handleQuickTitle('Star Frontlit Flex 340 GSM Roll', 'Paper & Media', 'SignMedia Supplies')}
            className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-md font-medium text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
          >
            🎨 Flex Media Roll (Stock)
          </button>
          <button
            type="button"
            onClick={() => handleQuickTitle('Epson 003 CMYK Ink Refill Bottles', 'Inks & Toners', 'Epson Dealer')}
            className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-md font-medium text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
          >
            🖨️ Printer Ink (Stock)
          </button>
          <button
            type="button"
            onClick={() => handleQuickTitle('Electricity Monthly Power Bill', 'Electricity', 'WBSEDCL')}
            className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-md font-medium text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
          >
            ⚡ Electricity (General)
          </button>
          <button
            type="button"
            onClick={() => handleQuickTitle('Staff Tea & Daily Counter Refreshments', 'Tea & Snacks')}
            className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-md font-medium text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
          >
            ☕ Tea & Snacks
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-xs">{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold text-xs">{successNotice}</span>
            </div>
          )}

          {/* Title & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Expense Title / Item Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 5 Reams JK Copier A4 Paper 75 GSM"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Expense Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <optgroup label="📦 RAW MATERIALS & STOCK PURCHASES (Auto Stock Update)">
                  <option value="Paper & Media">Paper & Media (Reams, Flex, Vinyl)</option>
                  <option value="Inks & Toners">Inks & Toners (Cartridges, Refills)</option>
                  <option value="Raw Material & Stock">Raw Material & Stock Purchase</option>
                </optgroup>
                <optgroup label="🏢 GENERAL SHOP OPERATIONAL EXPENSES">
                  <option value="Electricity">Electricity / Power Bill</option>
                  <option value="Internet & Cyber">Internet, WiFi & Portal Fees</option>
                  <option value="Machine Maintenance">Machine Maintenance & Spares</option>
                  <option value="Rent">Shop / Room Rent</option>
                  <option value="Outsourcing">Outsourcing & Third-Party Jobs</option>
                  <option value="Staff Salary">Staff Wages & Daily Allowances</option>
                  <option value="Tea & Snacks">Tea, Coffee & Daily Snacks</option>
                  <option value="Other">Other Miscellaneous Expense</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Amount, Payment Mode, Vendor Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Expense Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg font-extrabold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="Cash">💵 Cash</option>
                <option value="UPI">📱 UPI (GPay/PhonePe)</option>
                <option value="Card">💳 Debit/Credit Card</option>
                <option value="Bank Transfer">🏦 Bank NEFT/IMPS</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Paid To / Vendor
              </label>
              <input
                type="text"
                placeholder="e.g. Supplier / Agency"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* =======================================================
              AUTOMATIC MATERIAL & STOCK QUANTITY UPDATE SECTION
              Active ONLY when a Raw Material/Stock Category is selected
              ======================================================= */}
          {isMaterialCategory ? (
            <div className="rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 shadow-xs overflow-hidden transition-all animate-in fade-in duration-200">
              {/* Header */}
              <div className="px-4 py-2.5 bg-indigo-100 dark:bg-indigo-900/60 border-b border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkToStock}
                    onChange={(e) => setLinkToStock(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Auto-Update Raw Material Stock Quantity
                  </span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  ⚡ Auto-Update Active for {category}
                </span>
              </div>

              {linkToStock && (
                <div className="p-4 space-y-3.5">
                  {!isCreatingNewMaterial ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {/* Select Existing Stock Item */}
                        <div className="sm:col-span-7">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-slate-800 dark:text-slate-200 font-bold">
                              Select Material to Restock:
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsCreatingNewMaterial(true)}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" /> New Material
                            </button>
                          </div>
                          <select
                            value={selectedMaterialId}
                            onChange={(e) => setSelectedMaterialId(e.target.value)}
                            className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {materials.map((mat) => (
                              <option key={mat.id} value={mat.id}>
                                {mat.name} ({mat.category}) · Current Stock: {mat.currentStock} {mat.unit}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity to Restock */}
                        <div className="sm:col-span-5">
                          <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1">
                            + Quantity Added ({selectedMaterial?.unit || 'Units'}):
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              placeholder="Qty"
                              value={restockQty}
                              onChange={(e) =>
                                setRestockQty(e.target.value === '' ? '' : parseFloat(e.target.value))
                              }
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-extrabold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex gap-1 shrink-0">
                              {[1, 5, 10].map((quickQty) => (
                                <button
                                  key={quickQty}
                                  type="button"
                                  onClick={() => setRestockQty(quickQty)}
                                  className="px-2 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold cursor-pointer text-slate-700 dark:text-slate-300"
                                >
                                  +{quickQty}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stock Math Result Box */}
                      {selectedMaterial && numQty > 0 && (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-lg font-bold text-center leading-tight">
                              <span className="block text-[9px] text-emerald-600 dark:text-emerald-400">NEW STOCK TOTAL</span>
                              <span className="text-sm font-black">
                                {selectedMaterial.currentStock + numQty} {selectedMaterial.unit}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {selectedMaterial.name}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                                Existing: {selectedMaterial.currentStock} {selectedMaterial.unit} + {numQty} Restocked
                              </div>
                            </div>
                          </div>

                          {calculatedUnitCost > 0 && (
                            <div className="text-right font-mono text-[10px] text-slate-600 dark:text-slate-400">
                              <span>Unit Purchase Cost: </span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                ₹{calculatedUnitCost} / {selectedMaterial.unit}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Create New Material Inline */
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-indigo-300 dark:border-indigo-700 space-y-2.5">
                      <div className="flex justify-between items-center pb-1 border-b border-slate-200 dark:border-slate-700 font-bold text-indigo-700 dark:text-indigo-300">
                        <span>+ Add New Material Item to Catalog</span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingNewMaterial(false)}
                          className="text-slate-500 hover:text-slate-700 text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-0.5">
                            Material Name:
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 12x18 Glossy 300 GSM Art Paper"
                            value={newMatName}
                            onChange={(e) => setNewMatName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-0.5">
                            Category:
                          </label>
                          <select
                            value={newMatCategory}
                            onChange={(e) => setNewMatCategory(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                          >
                            <option value="Paper">Paper</option>
                            <option value="Flex & Vinyl">Flex & Vinyl</option>
                            <option value="Inks & Toners">Inks & Toners</option>
                            <option value="Cards & Pouches">Cards & Pouches</option>
                            <option value="Hardware & Binding">Hardware & Binding</option>
                            <option value="Frames">Frames</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-0.5">
                            Unit of Measure:
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Reams, Rolls, Bottles"
                            value={newMatUnit}
                            onChange={(e) => setNewMatUnit(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-0.5">
                            Initial Stock Added:
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={restockQty}
                            onChange={(e) =>
                              setRestockQty(e.target.value === '' ? '' : parseFloat(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400 shrink-0" />
                <span>General Operational Expense selected — Material Stock will NOT be changed.</span>
              </div>
            </div>
          )}

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Expense Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Bill / Voucher / Reference #
              </label>
              <input
                type="text"
                placeholder="e.g. Bill #1042 or UPI Ref"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>
                {isMaterialCategory && linkToStock && selectedMaterial
                  ? `Save Expense & Auto-Restock (+${numQty} ${selectedMaterial.unit})`
                  : 'Save Shop Expense'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
