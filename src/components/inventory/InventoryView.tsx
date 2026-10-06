import React, { useState } from 'react';
import { Boxes, AlertTriangle, Plus, Search, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { MaterialItem } from '../../types';

interface InventoryViewProps {
  materials: MaterialItem[];
  onUpdateStock: (materialId: string, delta: number) => void;
  onAddMaterial: (material: MaterialItem) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  materials,
  onUpdateStock,
  onAddMaterial,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New item form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<MaterialItem['category']>('Paper');
  const [newUnit, setNewUnit] = useState('Ream (500 sheets)');
  const [newCurrentStock, setNewCurrentStock] = useState<number>(10);
  const [newMinStock, setNewMinStock] = useState<number>(3);
  const [newCost, setNewCost] = useState<number>(250);
  const [newSupplier, setNewSupplier] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const lowStockCount = materials.filter((m) => m.currentStock <= m.minStockLevel).length;

  const filteredMaterials = materials.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchQ =
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.supplier && m.supplier.toLowerCase().includes(q));
    const matchCat = categoryFilter === 'all' || m.category === categoryFilter;
    return matchQ && matchCat;
  });

  const handleSaveNewItem = () => {
    setFormError(null);
    if (!newName.trim()) {
      setFormError('Please enter material name');
      return;
    }
    const item: MaterialItem = {
      id: `mat-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      unit: newUnit,
      currentStock: newCurrentStock,
      minStockLevel: newMinStock,
      costPerUnit: newCost,
      supplier: newSupplier.trim() || undefined,
      lastRestocked: new Date().toISOString().split('T')[0],
    };
    onAddMaterial(item);
    setIsAddModalOpen(false);
    setNewName('');
    setFormError(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Raw Material Stock & Consumables
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Keep track of paper reams, flex rolls, vinyl, inks, toners, and PVC blanks
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-lg text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>{lowStockCount} Items Below Safety Level</span>
            </div>
          )}

          <button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-300 dark:text-white" />
            <span>+ Add Material</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search material, toner, paper..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none w-64 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Material Types</option>
            <option value="Paper">Paper & Board</option>
            <option value="Flex & Vinyl">Flex & Vinyl</option>
            <option value="Cards & Pouches">Cards & Pouches</option>
            <option value="Inks & Toners">Inks & Toners</option>
            <option value="Hardware & Binding">Hardware & Binding</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total items: <span className="font-bold text-slate-900 dark:text-slate-100">{filteredMaterials.length}</span>
        </div>
      </div>

      {/* Material Grid / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-2.5 px-4">Material / Item</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3 text-center">Unit</th>
              <th className="py-2.5 px-3 text-right">In Stock</th>
              <th className="py-2.5 px-3 text-right">Min Level</th>
              <th className="py-2.5 px-3 text-right">Unit Cost</th>
              <th className="py-2.5 px-3">Supplier</th>
              <th className="py-2.5 px-4 text-right">Stock Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredMaterials.map((mat, idx) => {
              const isLow = mat.currentStock <= mat.minStockLevel;
              return (
                <tr
                  key={`mat-row-${mat.id || 'mat'}-${idx}`}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    isLow ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {isLow && (
                        <span title="Below safety stock level!">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        </span>
                      )}
                      <span>{mat.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      Restocked: {mat.lastRestocked}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                      {mat.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">{mat.unit}</td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`text-sm font-extrabold tabular-nums ${
                        isLow ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {mat.currentStock}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 tabular-nums">
                    {mat.minStockLevel}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                    ₹{mat.costPerUnit}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                    {mat.supplier || 'Local Market'}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => onUpdateStock(mat.id, -1)}
                      title="Deduct 1 used"
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold rounded cursor-pointer transition-colors"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => onUpdateStock(mat.id, 1)}
                      title="Add 1 restocked"
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold rounded cursor-pointer transition-colors"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => onUpdateStock(mat.id, 5)}
                      title="Add 5 restocked batch"
                      className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold rounded cursor-pointer transition-colors"
                    >
                      +5
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Material Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden text-xs animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-900 dark:bg-slate-950 text-white font-bold flex justify-between items-center border-b border-slate-800">
              <span>+ Add New Material / Consumable</span>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="px-5 py-2 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Century Star 300 GSM Art Board"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                  >
                    <option value="Paper">Paper & Board</option>
                    <option value="Flex & Vinyl">Flex & Vinyl</option>
                    <option value="Cards & Pouches">Cards & Pouches</option>
                    <option value="Inks & Toners">Inks & Toners</option>
                    <option value="Hardware & Binding">Hardware & Binding</option>
                    <option value="Frames">Frames</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Unit Label</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Initial Qty</label>
                  <input
                    type="number"
                    value={newCurrentStock}
                    onChange={(e) => setNewCurrentStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Min Level</label>
                  <input
                    type="number"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Cost / Unit (₹)</label>
                  <input
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Supplier Info</label>
                <input
                  type="text"
                  placeholder="e.g. Bhowmik Paper Mart, Kharagpur"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewItem}
                className="px-4 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-bold rounded cursor-pointer transition-colors"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
