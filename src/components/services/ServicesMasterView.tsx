import React, { useState } from 'react';
import { Printer, Search, Edit3, Save, Plus, Check } from 'lucide-react';
import { ServiceCategory, ServiceItem } from '../../types';

interface ServicesMasterViewProps {
  services: ServiceItem[];
  onUpdateService: (service: ServiceItem) => void;
}

export const ServicesMasterView: React.FC<ServicesMasterViewProps> = ({
  services,
  onUpdateService,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceItem>>({});

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchQ =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q));
    const matchCat = categoryFilter === 'all' || s.category === categoryFilter;
    return matchQ && matchCat;
  });

  const startEdit = (srv: ServiceItem) => {
    setEditingId(srv.id);
    setEditForm({ ...srv });
  };

  const saveEdit = (original: ServiceItem) => {
    const updated: ServiceItem = {
      ...original,
      ...editForm,
      baseRate: Number(editForm.baseRate) || original.baseRate,
      doubleSideRate: editForm.doubleSideRate !== undefined ? Number(editForm.doubleSideRate) : original.doubleSideRate,
      minCharge: editForm.minCharge !== undefined ? Number(editForm.minCharge) : original.minCharge,
    };
    onUpdateService(updated);
    setEditingId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Services Master & Pricing Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define and adjust pricing rates per page, per sq.ft, double-side multiplier, or minimum charge without touching code
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search service by name..."
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
            <option value="all">All Service Categories</option>
            <option value="Printing">Printing & Xerox</option>
            <option value="RestaurantServices">Restaurant Services</option>
            <option value="Cards">Cards & PVC</option>
            <option value="PhotoDesign">Photo & Design</option>
            <option value="DocumentServices">Document & Cyber</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Configured Services: <span className="font-bold text-slate-900 dark:text-slate-100">{filteredServices.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-2.5 px-3 w-20">Item Code</th>
              <th className="py-2.5 px-4">Service Name</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Unit</th>
              <th className="py-2.5 px-3 text-right">Base Rate (₹)</th>
              <th className="py-2.5 px-3 text-right">Double-Side (₹)</th>
              <th className="py-2.5 px-3 text-right">Min Order (₹)</th>
              <th className="py-2.5 px-4 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredServices.map((srv, idx) => {
              const isEditing = editingId === srv.id;
              return (
                <tr key={`srv-row-${srv.id || 'srv'}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="Code"
                        value={editForm.code ?? srv.code ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                        className="w-16 px-1.5 py-1 bg-white dark:bg-slate-800 border border-indigo-400 dark:border-indigo-500 text-slate-900 dark:text-slate-100 rounded text-center font-mono font-bold text-xs outline-none"
                      />
                    ) : (
                      <span className="font-mono text-[11px] font-black bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded">
                        #{srv.code || '101'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name ?? srv.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 dark:border-indigo-500 text-slate-900 dark:text-slate-100 rounded text-xs font-bold outline-none"
                      />
                    ) : (
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{srv.name}</span>
                          {srv.popular && (
                            <span className="text-[9px] bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                              Popular
                            </span>
                          )}
                        </div>
                        {srv.description && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{srv.description}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                      {srv.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{srv.unitLabel}</td>
                  <td className="py-3 px-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.baseRate ?? srv.baseRate}
                        onChange={(e) =>
                          setEditForm({ ...editForm, baseRate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 dark:border-indigo-500 text-slate-900 dark:text-slate-100 rounded text-right font-bold text-xs outline-none"
                      />
                    ) : (
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                        ₹{srv.baseRate}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                    {isEditing ? (
                      <input
                        type="number"
                        placeholder="N/A"
                        value={editForm.doubleSideRate ?? srv.doubleSideRate ?? ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            doubleSideRate: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 dark:border-indigo-500 text-slate-900 dark:text-slate-100 rounded text-right text-xs outline-none"
                      />
                    ) : srv.doubleSideRate ? (
                      `₹${srv.doubleSideRate}`
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                    {isEditing ? (
                      <input
                        type="number"
                        placeholder="0"
                        value={editForm.minCharge ?? srv.minCharge ?? ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            minCharge: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 dark:border-indigo-500 text-slate-900 dark:text-slate-100 rounded text-right text-xs outline-none"
                      />
                    ) : srv.minCharge ? (
                      `₹${srv.minCharge}`
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => saveEdit(srv)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(srv)}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                        title="Edit rate"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
