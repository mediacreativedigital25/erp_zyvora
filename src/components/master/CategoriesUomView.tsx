import React, { useState, useEffect } from 'react';
import {
  Tag,
  Scale,
  Plus,
  Search,
  Edit2,
  Trash2,
  Boxes,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Filter,
  X
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { ProductCategory, UnitOfMeasure } from '../../types/erp';
import { CatalogMasterService } from '../../services/catalogMasterService';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface CategoriesUomViewProps {
  initialTab?: 'categories' | 'uoms';
}

export const CategoriesUomView: React.FC<CategoriesUomViewProps> = ({
  initialTab = 'categories'
}) => {
  const { tenant, currentUser, addToast } = useErp();
  const [activeTab, setActiveTab] = useState<'categories' | 'uoms'>(initialTab);

  // Data states
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<'all' | 'physical' | 'service'>('all');

  const [uomSearch, setUomSearch] = useState('');
  const [uomClassFilter, setUomClassFilter] = useState<string>('all');

  // Modal States - Category
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<{
    code: string;
    name: string;
    itemType: 'physical' | 'service' | 'all';
    description: string;
    isActive: boolean;
  }>({
    code: '',
    name: '',
    itemType: 'physical',
    description: '',
    isActive: true
  });

  // Modal States - UoM
  const [isUomModalOpen, setIsUomModalOpen] = useState(false);
  const [editingUom, setEditingUom] = useState<UnitOfMeasure | null>(null);
  const [uomForm, setUomForm] = useState<{
    code: string;
    name: string;
    classification: 'Packaging' | 'Weight' | 'Volume' | 'Service' | 'Logistics' | 'General';
    description: string;
    isActive: boolean;
  }>({
    code: '',
    name: '',
    classification: 'General',
    description: '',
    isActive: true
  });

  // Delete Dialog State
  const [deletingItem, setDeletingItem] = useState<{
    type: 'category' | 'uom';
    id: string;
    name: string;
  } | null>(null);

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cats, uomList] = await Promise.all([
        CatalogMasterService.getCategories(tenant.id),
        CatalogMasterService.getUoms(tenant.id)
      ]);
      setCategories(cats);
      setUoms(uomList);
    } catch (err) {
      console.error('Error loading catalog data:', err);
      addToast('Sync Notice', 'Failed to retrieve catalog settings from server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant.id]);

  // ==========================================
  // CATEGORY HANDLERS
  // ==========================================
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      code: `CAT-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      name: '',
      itemType: 'physical',
      description: '',
      isActive: true
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      code: cat.code,
      name: cat.name,
      itemType: cat.itemType,
      description: cat.description || '',
      isActive: cat.isActive
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.code.trim() || !categoryForm.name.trim()) {
      addToast('Validation Failed', 'Category code and name are required.', 'warning');
      return;
    }

    try {
      const payload: ProductCategory = {
        id: editingCategory ? editingCategory.id : `cat_${Date.now()}`,
        tenantId: tenant.id,
        code: categoryForm.code.trim().toUpperCase(),
        name: categoryForm.name.trim(),
        itemType: categoryForm.itemType,
        description: categoryForm.description.trim(),
        isActive: categoryForm.isActive
      };

      const saved = await CatalogMasterService.saveCategory(tenant.id, payload, currentUser);

      if (editingCategory) {
        setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? saved : c)));
        addToast('Category Updated', `Category '${saved.name}' has been updated.`, 'success');
      } else {
        setCategories((prev) => [...prev, saved]);
        addToast('Category Created', `Category '${saved.name}' has been registered.`, 'success');
      }
      setIsCategoryModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast('Save Failed', 'Unable to persist category changes.', 'error');
    }
  };

  // ==========================================
  // UOM HANDLERS
  // ==========================================
  const handleOpenAddUom = () => {
    setEditingUom(null);
    setUomForm({
      code: '',
      name: '',
      classification: 'General',
      description: '',
      isActive: true
    });
    setIsUomModalOpen(true);
  };

  const handleOpenEditUom = (u: UnitOfMeasure) => {
    setEditingUom(u);
    setUomForm({
      code: u.code,
      name: u.name,
      classification: u.classification,
      description: u.description || '',
      isActive: u.isActive
    });
    setIsUomModalOpen(true);
  };

  const handleSaveUom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uomForm.code.trim() || !uomForm.name.trim()) {
      addToast('Validation Failed', 'UoM code symbol and name are required.', 'warning');
      return;
    }

    try {
      const payload: UnitOfMeasure = {
        id: editingUom ? editingUom.id : `uom_${Date.now()}`,
        tenantId: tenant.id,
        code: uomForm.code.trim().toUpperCase(),
        name: uomForm.name.trim(),
        classification: uomForm.classification,
        description: uomForm.description.trim(),
        isActive: uomForm.isActive
      };

      const saved = await CatalogMasterService.saveUom(tenant.id, payload, currentUser);

      if (editingUom) {
        setUoms((prev) => prev.map((u) => (u.id === editingUom.id ? saved : u)));
        addToast('Unit Updated', `UoM '${saved.name}' has been updated.`, 'success');
      } else {
        setUoms((prev) => [...prev, saved]);
        addToast('Unit Created', `UoM '${saved.name}' has been registered.`, 'success');
      }
      setIsUomModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast('Save Failed', 'Unable to persist UoM changes.', 'error');
    }
  };

  // ==========================================
  // DELETE HANDLERS
  // ==========================================
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      if (deletingItem.type === 'category') {
        await CatalogMasterService.deleteCategory(tenant.id, deletingItem.id);
        setCategories((prev) => prev.filter((c) => c.id !== deletingItem.id));
        addToast('Category Deleted', `Category '${deletingItem.name}' removed.`, 'info');
      } else {
        await CatalogMasterService.deleteUom(tenant.id, deletingItem.id);
        setUoms((prev) => prev.filter((u) => u.id !== deletingItem.id));
        addToast('Unit Deleted', `UoM '${deletingItem.name}' removed.`, 'info');
      }
    } catch (err) {
      console.error(err);
      addToast('Delete Failed', 'Failed to remove selected item.', 'error');
    } finally {
      setDeletingItem(null);
    }
  };

  // Filtered Lists
  const filteredCategories = categories.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(categorySearch.toLowerCase());
    const matchesType = categoryTypeFilter === 'all' || c.itemType === categoryTypeFilter || c.itemType === 'all';
    return matchesSearch && matchesType;
  });

  const filteredUoms = uoms.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(uomSearch.toLowerCase()) ||
      u.code.toLowerCase().includes(uomSearch.toLowerCase());
    const matchesClass = uomClassFilter === 'all' || u.classification === uomClassFilter;
    return matchesSearch && matchesClass;
  });

  // Classification styling
  const getClassBadgeStyle = (classification: string) => {
    switch (classification) {
      case 'Packaging':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Weight':
      case 'Volume':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Service':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Logistics':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold">Total Categories</span>
            <Tag className="w-4 h-4 text-[#086288]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{categories.length}</div>
          <p className="text-[11px] text-[#475569] mt-0.5">Active classification tags</p>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold">Physical Item Cats</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {categories.filter((c) => c.itemType === 'physical' || c.itemType === 'all').length}
          </div>
          <p className="text-[11px] text-[#475569] mt-0.5">Inventory merchandise</p>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold">Service Categories</span>
            <Wrench className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {categories.filter((c) => c.itemType === 'service' || c.itemType === 'all').length}
          </div>
          <p className="text-[11px] text-[#475569] mt-0.5">Services & digital rates</p>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold">Total UoM Units</span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{uoms.length}</div>
          <p className="text-[11px] text-[#475569] mt-0.5">Units of measurement</p>
        </div>
      </div>

      {/* WORKSPACE CARD */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl shadow-2xs overflow-hidden">
        {/* TABS HEADER */}
        <div className="p-4 border-b border-[#DCE5EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('categories')}
              className={`inline-flex items-center gap-2 pb-2.5 pt-1 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Product & Service Categories ({categories.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('uoms')}
              className={`inline-flex items-center gap-2 pb-2.5 pt-1 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'uoms'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Units of Measure (UoM) ({uoms.length})</span>
            </button>
          </div>

          <div>
            {activeTab === 'categories' ? (
              <button
                onClick={handleOpenAddCategory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] active:bg-[#06384C] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddUom}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] active:bg-[#06384C] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Unit (UoM)</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: PRODUCT & SERVICE CATEGORIES */}
        {activeTab === 'categories' && (
          <div>
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-[#DCE5EC] bg-[#FAFDFE] flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search category name or code..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DCE5EC] rounded-lg focus:outline-hidden focus:border-[#086288]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={categoryTypeFilter}
                  onChange={(e) => setCategoryTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs bg-white border border-[#DCE5EC] rounded-lg text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                >
                  <option value="all">All Item Types</option>
                  <option value="physical">Physical Products Only</option>
                  <option value="service">Services & Digital Only</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DCE5EC] bg-[#F8FAFC] text-[#475569] uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-4">Category Code</th>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Applies To</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF4F8]">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No product categories found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#086288]">{c.code}</td>
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">{c.name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              c.itemType === 'physical'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : c.itemType === 'service'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {c.itemType === 'physical'
                              ? 'Physical Items'
                              : c.itemType === 'service'
                              ? 'Services'
                              : 'All Offerings'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{c.description || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              c.isActive ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                            />
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditCategory(c)}
                              className="p-1 text-slate-400 hover:text-[#086288] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeletingItem({ type: 'category', id: c.id, name: c.name })
                              }
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: UNITS OF MEASURE (UOM) */}
        {activeTab === 'uoms' && (
          <div>
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-[#DCE5EC] bg-[#FAFDFE] flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search unit name or symbol..."
                  value={uomSearch}
                  onChange={(e) => setUomSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DCE5EC] rounded-lg focus:outline-hidden focus:border-[#086288]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={uomClassFilter}
                  onChange={(e) => setUomClassFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-[#DCE5EC] rounded-lg text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
                >
                  <option value="all">All Classifications</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Weight">Weight</option>
                  <option value="Volume">Volume</option>
                  <option value="Service">Service</option>
                  <option value="Logistics">Logistics</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DCE5EC] bg-[#F8FAFC] text-[#475569] uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-4">Symbol / Code</th>
                    <th className="py-3 px-4">Full Unit Name</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF4F8]">
                  {filteredUoms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No units of measurement found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUoms.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#086288]">{u.code}</td>
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">{u.name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getClassBadgeStyle(
                              u.classification
                            )}`}
                          >
                            {u.classification}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{u.description || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              u.isActive ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                            />
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditUom(u)}
                              className="p-1 text-slate-400 hover:text-[#086288] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Edit UoM"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeletingItem({ type: 'uom', id: u.id, name: u.name })
                              }
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete UoM"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL: ADD / EDIT CATEGORY */}
      {/* ==================================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#DCE5EC] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#DCE5EC] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#086288]" />
                <h3 className="font-bold text-sm text-[#0F172A]">
                  {editingCategory ? 'Edit Product Category' : 'Register New Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Category Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. CAT-ELK"
                  className="w-full px-3 py-2 border border-[#DCE5EC] rounded-lg font-mono focus:outline-hidden focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Food & Staple Commodities"
                  className="w-full px-3 py-2 border border-[#DCE5EC] rounded-lg focus:outline-hidden focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Applicable Item Type</label>
                <select
                  value={categoryForm.itemType}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, itemType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-[#DCE5EC] rounded-lg focus:outline-hidden focus:border-[#086288]"
                >
                  <option value="physical">Physical Merchandise Only</option>
                  <option value="service">Services & Digital Offerings Only</option>
                  <option value="all">Universal (All Item Types)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief summary of items covered by this classification..."
                  className="w-full px-3 py-2 border border-[#DCE5EC] rounded-lg focus:outline-hidden focus:border-[#086288]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catIsActive"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded text-[#086288] focus:ring-[#086288]"
                />
                <label htmlFor="catIsActive" className="text-xs text-[#0F172A] font-medium cursor-pointer">
                  Active (available in product creation dropdowns)
                </label>
              </div>

              <div className="pt-3 border-t border-[#EEF4F8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-2 border border-[#DCE5EC] text-slate-600 rounded-lg hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD / EDIT UOM */}
      {/* ==================================================================== */}
      {isUomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#DCE5EC] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#DCE5EC] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#086288]" />
                <h3 className="font-bold text-sm text-[#0F172A]">
                  {editingUom ? 'Edit Unit of Measure' : 'Register New Unit (UoM)'}
                </h3>
              </div>
              <button
                onClick={() => setIsUomModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUom} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  UoM Symbol / Short Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uomForm.code}
                  onChange={(e) => setUomForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. PCS, KG, LTR, BOX, PKT"
                  className="w-full px-3 py-2 border border-[#DCE5EC] rounded-lg font-mono focus:outline-hidden focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Full Unit Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uomForm.name}
                  onChange={(e) => setUomForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Pieces (Pcs) / Single Unit"
                  className="w-full px-3 py-2 border border-[#DCE5EC] rounded-lg focus:outline-hidden focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Unit Classification</label>
                <select
                  value={uomForm.classification}
                  onChange={(e) => setUomForm((p) => ({ ...p, classification: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-[#DCE5EC] rounded-lg focus:outline-hidden focus:border-[#086288]"
                >
                  <option value="General">General / Discrete Counts</option>
                  <option value="Packaging">Packaging (Carton, Box, Sack)</option>
                  <option value="Weight">Weight (Kg, Gram, Ton)</option>
                  <option value="Volume">Volume (Liter, mL, Gallon)</option>
                  <option value="Service">Service (Package, Milestone, Hourly, Monthly)</option>
                  <option value="Logistics">Logistics (Trip, Dispatch)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Description / Conversion Notes</label>
                <textarea
                  rows={2}
                  value={uomForm.description}
                  onChange={(e) => setUomForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Additional packaging or conversion details..."
                  className="w-full px-3 py-2 border border-[#DCE5EC] rounded-lg focus:outline-hidden focus:border-[#086288]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="uomIsActive"
                  checked={uomForm.isActive}
                  onChange={(e) => setUomForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded text-[#086288] focus:ring-[#086288]"
                />
                <label htmlFor="uomIsActive" className="text-xs text-[#0F172A] font-medium cursor-pointer">
                  Active (available in stock and billing forms)
                </label>
              </div>

              <div className="pt-3 border-t border-[#EEF4F8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUomModalOpen(false)}
                  className="px-3 py-2 border border-[#DCE5EC] text-slate-600 rounded-lg hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {editingUom ? 'Update Unit' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        title={deletingItem?.type === 'category' ? 'Delete Product Category' : 'Delete Unit of Measure'}
        message={`Are you sure you want to remove '${deletingItem?.name}'? Items currently assigned to this entry will retain their reference, but this option will no longer be available for new records.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
};
