import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Wrench,
  Tag,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  X,
  ShieldAlert,
  Coins,
  Layers,
  UploadCloud,
  RefreshCw,
  Trash2,
  Barcode as BarcodeIcon,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { Product, ServiceItem, TenantBusinessLine, ProductCategory, UnitOfMeasure } from '../../types/erp';
import { TenantMasterService } from '../../services/tenantMasterService';
import { MediaService } from '../../services/mediaService';
import { ProductService } from '../../services/productService';
import {
  CatalogMasterService,
  DEFAULT_INITIAL_CATEGORIES,
  DEFAULT_INITIAL_UOMS
} from '../../services/catalogMasterService';
import { generateSmartSku, generateEan13Barcode } from '../../utils/productUtils';

interface ProductsServicesViewProps {
  defaultTab?: 'physical' | 'services';
}

export const ProductsServicesView: React.FC<ProductsServicesViewProps> = ({
  defaultTab = 'physical'
}) => {
  const {
    products,
    setProducts,
    tenant,
    currentUser,
    isCurrentUserSuperAdmin,
    addToast
  } = useErp();

  const canEdit =
    isCurrentUserSuperAdmin || ['super_admin', 'owner', 'admin'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'physical' | 'services'>(
    defaultTab === 'services' ? 'services' : 'physical'
  );

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab === 'services' ? 'services' : 'physical');
    }
  }, [defaultTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedBusinessLineFilter, setSelectedBusinessLineFilter] = useState('ALL');

  // Business Lines & Categories State
  const [businessLines, setBusinessLines] = useState<TenantBusinessLine[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>(DEFAULT_INITIAL_CATEGORIES);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>(DEFAULT_INITIAL_UOMS);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);

  // Service items state
  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 'srv_01',
      code: 'JUDPLAT',
      barcode: '8999001000015',
      name: 'Platinum Digital Web Invitation (Queinvite)',
      description: 'Interactive wedding landing page with RSVP, music player, and photo gallery.',
      category: 'Multimedia & Digital Invitations',
      businessLineId: 'lob_01',
      uom: 'Service Package',
      costPrice: 75000,
      rate: 350000,
      imageUrl: '',
      isActive: true
    },
    {
      id: 'srv_02',
      code: 'SRV-LOG-01',
      barcode: '8999001000022',
      name: 'Container Cargo Unloading & Handling',
      description: 'Port cargo unloading and staging labor into distribution warehouse.',
      category: 'Handling & Cargo Services',
      businessLineId: 'lob_02',
      uom: 'Delivery Trip',
      costPrice: 200000,
      rate: 450000,
      imageUrl: '',
      isActive: true
    },
    {
      id: 'srv_03',
      code: 'SRV-TRN-02',
      barcode: '8999001000039',
      name: 'Intercity Heavy Trucking Freight',
      description: 'Long-haul intercity road freight logistics with 10-wheeler fleet.',
      category: 'Transportation & Logistics',
      businessLineId: 'lob_02',
      uom: 'Delivery Trip',
      costPrice: 2200000,
      rate: 3500000,
      imageUrl: '',
      isActive: true
    }
  ]);

  useEffect(() => {
    let mounted = true;
    const loadLiveCatalogs = async () => {
      setIsLoadingCatalogs(true);
      try {
        const [market, liveProducts, liveServices, liveCats, liveUoms] = await Promise.all([
          TenantMasterService.getMarketProfile(tenant.id).catch(() => null),
          ProductService.getProducts(tenant.id).catch(() => []),
          ProductService.getServices(tenant.id).catch(() => []),
          CatalogMasterService.getCategories(tenant.id).catch(() => []),
          CatalogMasterService.getUoms(tenant.id).catch(() => [])
        ]);

        if (mounted) {
          if (market?.businessLines) {
            setBusinessLines(market.businessLines.filter((l) => l.isActive));
          }
          setProducts(liveProducts);
          if (liveServices.length > 0) {
            setServices(liveServices);
          }
          if (liveCats.length > 0) {
            setCategories(liveCats);
          }
          if (liveUoms.length > 0) {
            setUoms(liveUoms);
          }
        }
      } catch (err) {
        console.warn('Failed loading live catalogs:', err);
      } finally {
        if (mounted) setIsLoadingCatalogs(false);
      }
    };
    loadLiveCatalogs();
    return () => {
      mounted = false;
    };
  }, [tenant.id]);

  // ==========================================
  // MODAL 1: PHYSICAL PRODUCTS
  // ==========================================
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUserEditedSku, setIsUserEditedSku] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productFormData, setProductFormData] = useState<{
    sku: string;
    barcode: string;
    name: string;
    description: string;
    category: string;
    businessLineId: string;
    uom: string;
    weightGram: number;
    minStockLevel: number;
    costPrice: number;
    sellingPrice: number;
    imageUrl: string;
    status: 'active' | 'inactive';
  }>({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category: '',
    businessLineId: '',
    uom: '',
    weightGram: 0,
    minStockLevel: 0,
    costPrice: 0,
    sellingPrice: 0,
    imageUrl: '',
    status: 'active'
  });

  const openAddProductModal = () => {
    const nextSeq = products.length + 1;
    const generatedBarcode = generateEan13Barcode(nextSeq, '899', '9001');
    const primaryLine = businessLines.find((l) => l.isPrimary) || businessLines[0];

    const defaultCat =
      categories.find((c) => c.itemType === 'physical')?.name ||
      categories[0]?.name ||
      'Food & Groceries';
    const defaultUom = uoms[0]?.name || 'Pieces (Pcs) / Unit';

    setEditingProduct(null);
    setIsUserEditedSku(false);
    setProductFormData({
      sku: '',
      barcode: generatedBarcode,
      name: '',
      description: '',
      category: defaultCat,
      businessLineId: primaryLine?.id || '',
      uom: defaultUom,
      weightGram: 0,
      minStockLevel: 0,
      costPrice: 0,
      sellingPrice: 0,
      imageUrl: '',
      status: 'active'
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setIsUserEditedSku(true);
    setProductFormData({
      sku: prod.sku,
      barcode: prod.barcode || generateEan13Barcode(1, '899', '9001'),
      name: prod.name,
      description: prod.description || '',
      category: prod.category,
      businessLineId: prod.businessLineId || businessLines[0]?.id || '',
      uom: prod.uom,
      weightGram: prod.weightGram || 0,
      minStockLevel: prod.minStockLevel || 0,
      costPrice: prod.costPrice || 0,
      sellingPrice: prod.sellingPrice || 0,
      imageUrl: prod.imageUrl || '',
      status: prod.status
    });
    setIsProductModalOpen(true);
  };

  const handleProductNameChange = (newName: string) => {
    setProductFormData((prev) => {
      const updated = { ...prev, name: newName };
      if (!isUserEditedSku && newName.trim().length > 1) {
        updated.sku = generateSmartSku(newName);
      }
      return updated;
    });
  };

  const handleRegenerateBarcode = () => {
    const randomSeq = Math.floor(1000 + Math.random() * 8999);
    const newBarcode = generateEan13Barcode(randomSeq, '899', '9001');
    setProductFormData((prev) => ({ ...prev, barcode: newBarcode }));
    addToast('New Barcode Generated', `EAN-13: ${newBarcode}`, 'info');
  };

  const handleProductImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = MediaService.validateImageFile(file);
    if (!validation.valid) {
      addToast('File Rejected', validation.error || 'Unsupported file format or size exceeds 2MB.', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const webpFile = await MediaService.convertToWebP(file);
      const previewUrl = URL.createObjectURL(webpFile);

      setProductFormData((prev) => ({ ...prev, imageUrl: previewUrl }));
      addToast('Product Image Processed', 'Product image processed and ready for saving.', 'success');
    } catch (err) {
      console.error('Image upload failed:', err);
      addToast('Processing Failed', 'Unable to optimize selected image.', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFormData.name.trim() || !productFormData.sku.trim()) {
      addToast('Validation Failed', 'SKU and product name are required.', 'warning');
      return;
    }

    try {
      const productToSave: Product = editingProduct
        ? { ...editingProduct, ...productFormData }
        : {
            id: `prod_${Date.now()}`,
            tenantId: currentUser.tenantId,
            ...productFormData,
            type: 'physical',
            stockByWarehouse: {},
            totalStock: 0
          };

      const persisted = await ProductService.saveProduct(tenant.id, productToSave, currentUser);

      if (editingProduct) {
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? persisted : p)));
        addToast('Product Updated', `SKU '${persisted.sku}' successfully updated.`, 'success');
      } else {
        setProducts((prev) => [...prev, persisted]);
        addToast('Product Registered', `SKU '${persisted.sku}' [${persisted.name}] successfully registered.`, 'success');
      }
      setIsProductModalOpen(false);
    } catch (err) {
      console.error('Save product error:', err);
      addToast('Save Failed', 'An error occurred while saving the product.', 'error');
    }
  };

  const toggleProductStatus = async (id: string) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;
    const newStatus: Product['status'] = target.status === 'active' ? 'inactive' : 'active';
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    await ProductService.toggleProductStatus(tenant.id, id, newStatus);
    addToast('Status Updated', 'Product status has been updated.', 'info');
  };

  // ==========================================
  // MODAL 2: SERVICES & DIGITAL
  // ==========================================
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isUserEditedServiceSku, setIsUserEditedServiceSku] = useState(false);
  const serviceFileInputRef = useRef<HTMLInputElement>(null);

  const [serviceFormData, setServiceFormData] = useState<{
    code: string;
    barcode: string;
    name: string;
    description: string;
    category: string;
    businessLineId: string;
    uom: string;
    costPrice: number;
    rate: number;
    imageUrl: string;
    isActive: boolean;
  }>({
    code: '',
    barcode: '',
    name: '',
    description: '',
    category: '',
    businessLineId: '',
    uom: '',
    costPrice: 0,
    rate: 0,
    imageUrl: '',
    isActive: true
  });

  const openAddServiceModal = () => {
    const nextSeq = services.length + 10;
    const generatedBarcode = generateEan13Barcode(nextSeq, '899', '9002');
    const defaultLine =
      businessLines.find((l) => l.name.toLowerCase().includes('undangan') || l.name.toLowerCase().includes('queinvite')) ||
      businessLines[0];

    const defaultCat =
      categories.find((c) => c.itemType === 'service')?.name ||
      categories[0]?.name ||
      'Multimedia & Digital Invitations';
    const defaultUom =
      uoms.find((u) => u.classification === 'Service')?.name ||
      'Service Package';

    setEditingService(null);
    setIsUserEditedServiceSku(false);
    setServiceFormData({
      code: '',
      barcode: generatedBarcode,
      name: '',
      description: '',
      category: defaultCat,
      businessLineId: defaultLine?.id || businessLines[0]?.id || '',
      uom: defaultUom,
      costPrice: 0,
      rate: 0,
      imageUrl: '',
      isActive: true
    });
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (srv: ServiceItem) => {
    setEditingService(srv);
    setIsUserEditedServiceSku(true);
    setServiceFormData({
      code: srv.code,
      barcode: srv.barcode || generateEan13Barcode(12, '899', '9002'),
      name: srv.name,
      description: srv.description || '',
      category: srv.category,
      businessLineId: srv.businessLineId || businessLines[0]?.id || '',
      uom: srv.uom,
      costPrice: srv.costPrice || 0,
      rate: srv.rate,
      imageUrl: srv.imageUrl || '',
      isActive: srv.isActive
    });
    setIsServiceModalOpen(true);
  };

  const handleServiceNameChange = (newName: string) => {
    setServiceFormData((prev) => {
      const updated = { ...prev, name: newName };
      if (!isUserEditedServiceSku && newName.trim().length > 1) {
        updated.code = generateSmartSku(newName);
      }
      return updated;
    });
  };

  const handleRegenerateServiceBarcode = () => {
    const randomSeq = Math.floor(1000 + Math.random() * 8999);
    const newBarcode = generateEan13Barcode(randomSeq, '899', '9002');
    setServiceFormData((prev) => ({ ...prev, barcode: newBarcode }));
    addToast('New Barcode Generated', `EAN-13: ${newBarcode}`, 'info');
  };

  const handleServiceImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = MediaService.validateImageFile(file);
    if (!validation.valid) {
      addToast('File Rejected', validation.error || 'Unsupported file format or size exceeds 2MB.', 'error');
      return;
    }

    try {
      const webpFile = await MediaService.convertToWebP(file);
      const previewUrl = URL.createObjectURL(webpFile);
      setServiceFormData((prev) => ({ ...prev, imageUrl: previewUrl }));
      addToast('Banner Processed', 'Service banner processed and ready for saving.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Processing Failed', 'Unable to optimize selected banner.', 'error');
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormData.name.trim() || !serviceFormData.code.trim()) {
      addToast('Validation Failed', 'Service SKU code and name are required.', 'warning');
      return;
    }

    try {
      const serviceToSave: ServiceItem = editingService
        ? { ...editingService, ...serviceFormData }
        : {
            id: `srv_${Date.now()}`,
            tenantId: currentUser.tenantId,
            ...serviceFormData
          };

      const persisted = await ProductService.saveService(tenant.id, serviceToSave, currentUser);

      if (editingService) {
        setServices((prev) => prev.map((s) => (s.id === editingService.id ? persisted : s)));
        addToast('Service Updated', `Service '${persisted.code}' successfully updated.`, 'success');
      } else {
        setServices((prev) => [...prev, persisted]);
        addToast('Service Registered', `Service '${persisted.code}' [${persisted.name}] successfully registered.`, 'success');
      }
      setIsServiceModalOpen(false);
    } catch (err) {
      console.error('Save service error:', err);
      addToast('Save Failed', 'An error occurred while saving the service item.', 'error');
    }
  };

  const toggleServiceStatus = async (id: string) => {
    const target = services.find((s) => s.id === id);
    if (!target) return;
    const newStatus = !target.isActive;
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: newStatus } : s)));
    await ProductService.toggleServiceStatus(tenant.id, id, newStatus);
    addToast('Status Updated', 'Service status has been updated.', 'info');
  };

  // Business Line Name resolver
  const getBusinessLineName = (lineId?: string) => {
    if (!lineId) return '-';
    const found = businessLines.find((l) => l.id === lineId);
    return found ? found.name : lineId;
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    const matchesCategory = selectedCategoryFilter === 'ALL' || p.category === selectedCategoryFilter;
    const matchesLine =
      selectedBusinessLineFilter === 'ALL' || p.businessLineId === selectedBusinessLineFilter;
    return matchesSearch && matchesCategory && matchesLine;
  });

  // Filtered Services
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.barcode && s.barcode.includes(searchQuery));
    const matchesCategory = selectedCategoryFilter === 'ALL' || s.category === selectedCategoryFilter;
    const matchesLine =
      selectedBusinessLineFilter === 'ALL' || s.businessLineId === selectedBusinessLineFilter;
    return matchesSearch && matchesCategory && matchesLine;
  });

  // Inventory Valuation Metrics
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + (p.costPrice || 0) * (p.totalStock || 0),
    0
  );
  const criticalStockItems = products.filter(
    (p) => (p.totalStock || 0) <= (p.minStockLevel || 0) && p.status === 'active'
  );

  return (
    <div className="space-y-6">
      {/* RBAC Notice */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-xs shadow-2xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Read-Only Notice: Product catalog management, SKUs, and pricing structures can only be modified by Super Admin, Owner, or Tenant Admin.
          </span>
        </div>
      )}


      {/* Main Tabbed Container */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl shadow-2xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-[#DCE5EC] px-4 pt-3 flex flex-wrap items-center justify-between gap-3 bg-[#FAFDFE]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('physical')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'physical'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Physical Inventory Products</span>
              <span className="bg-[#EFF7FA] text-[#086288] text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {products.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'services'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Services & Digital Offerings</span>
              <span className="bg-[#EFF7FA] text-[#086288] text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {services.length}
              </span>
            </button>
          </div>

          {/* Action Button */}
          {canEdit && (
            <div className="pb-2">
              {activeTab === 'physical' && (
                <button
                  onClick={openAddProductModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] active:bg-[#06384C] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Physical Product</span>
                </button>
              )}
              {activeTab === 'services' && (
                <button
                  onClick={openAddServiceModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] active:bg-[#06384C] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Service Item</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-[#DCE5EC] bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or EAN-13 barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Line of Business */}
            <div className="flex items-center gap-1.5 text-xs text-[#475569]">
              <Layers className="w-3.5 h-3.5 text-[#086288]" />
              <select
                value={selectedBusinessLineFilter}
                onChange={(e) => setSelectedBusinessLineFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#086288]"
              >
                <option value="ALL">All Business Lines</option>
                {businessLines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Category */}
            <div className="flex items-center gap-1.5 text-xs text-[#475569]">
              <Tag className="w-3.5 h-3.5 text-[#086288]" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#086288]"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TAB 1: PHYSICAL PRODUCTS */}
        {activeTab === 'physical' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                  <th className="py-3 px-3 w-14 text-center">Image</th>
                  <th className="py-3 px-3">SKU & POS Barcode</th>
                  <th className="py-3 px-4">Product Name & Specifications</th>
                  <th className="py-3 px-3">Line of Business</th>
                  <th className="py-3 px-3">Category & UoM</th>
                  <th className="py-3 px-3 text-center">Weight (g)</th>
                  <th className="py-3 px-3 text-right">Cost / COGS</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-center">Safety Stock</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No physical products match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isCritical = (p.totalStock || 0) <= (p.minStockLevel || 0);
                    return (
                      <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                        {/* Image */}
                        <td className="py-2.5 px-3 text-center">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-10 h-10 object-cover rounded-lg border border-[#DCE5EC] mx-auto shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] border border-[#DCE5EC] flex items-center justify-center text-slate-400 mx-auto">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                        </td>

                        {/* SKU & Barcode */}
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-[#086288] text-[11px]">{p.sku}</div>
                          {p.barcode && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                              <BarcodeIcon className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{p.barcode}</span>
                            </div>
                          )}
                        </td>

                        {/* Product Name */}
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-[#0F172A]">{p.name}</div>
                          {p.description && (
                            <div className="text-[11px] text-[#475569] line-clamp-1 mt-0.5">
                              {p.description}
                            </div>
                          )}
                        </td>

                        {/* Line of Business */}
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                            {getBusinessLineName(p.businessLineId)}
                          </span>
                        </td>

                        {/* Category & UoM */}
                        <td className="py-2.5 px-3">
                          <div className="text-[#0F172A] font-medium">{p.category}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{p.uom}</div>
                        </td>

                        {/* Weight */}
                        <td className="py-2.5 px-3 text-center font-mono text-[#0F172A]">
                          {p.weightGram ? `${p.weightGram.toLocaleString('id-ID')} g` : '0 g'}
                        </td>

                        {/* Cost / HPP */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          Rp {(p.costPrice || 0).toLocaleString('id-ID')}
                        </td>

                        {/* Selling Price */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#086288]">
                          Rp {(p.sellingPrice || 0).toLocaleString('id-ID')}
                        </td>

                        {/* Safety Stock */}
                        <td className="py-2.5 px-3 text-center">
                          <div
                            className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                              isCritical ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span>{p.totalStock || 0}</span>
                            <span className="text-[10px] text-slate-500">/ min {p.minStockLevel || 0}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => toggleProductStatus(p.id)}
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                              p.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Click to toggle status"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                p.status === 'active' ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                            />
                            <span>{p.status === 'active' ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          {canEdit && (
                            <button
                              onClick={() => openEditProductModal(p)}
                              className="p-1.5 text-slate-400 hover:text-[#086288] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: SERVICES & DIGITAL */}
        {activeTab === 'services' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                  <th className="py-3 px-3 w-14 text-center">Thumbnail</th>
                  <th className="py-3 px-3">Service SKU & Barcode</th>
                  <th className="py-3 px-4">Service Name / Digital Offering</th>
                  <th className="py-3 px-3">Line of Business</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Billing UoM</th>
                  <th className="py-3 px-3 text-right">Base Cost (Rp)</th>
                  <th className="py-3 px-3 text-right">Selling Rate (Rp)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No services match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Image / Icon */}
                      <td className="py-2.5 px-3 text-center">
                        {s.imageUrl ? (
                          <img
                            src={s.imageUrl}
                            alt={s.name}
                            className="w-10 h-10 object-cover rounded-lg border border-[#DCE5EC] mx-auto shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mx-auto">
                            <Wrench className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Code & Barcode */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-[#086288] text-[11px]">{s.code}</div>
                        {s.barcode && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                            <BarcodeIcon className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{s.barcode}</span>
                          </div>
                        )}
                      </td>

                      {/* Service Name */}
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-[#0F172A]">{s.name}</div>
                        {s.description && (
                          <div className="text-[11px] text-[#475569] line-clamp-1 mt-0.5">
                            {s.description}
                          </div>
                        )}
                      </td>

                      {/* Line of Business */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                          {getBusinessLineName(s.businessLineId)}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 text-[#0F172A] font-medium">{s.category}</td>

                      {/* Billing UoM */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-[#475569]">{s.uom}</span>
                      </td>

                      {/* Base Cost / HPP */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        Rp {(s.costPrice || 0).toLocaleString('id-ID')}
                      </td>

                      {/* Selling Rate */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#086288]">
                        Rp {(s.rate || 0).toLocaleString('id-ID')}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => toggleServiceStatus(s.id)}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                            s.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.isActive ? 'bg-emerald-600' : 'bg-slate-400'
                            }`}
                          />
                          <span>{s.isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        {canEdit && (
                          <button
                            onClick={() => openEditServiceModal(s)}
                            className="p-1.5 text-slate-400 hover:text-[#086288] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Service"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: FORM REGISTER PHYSICAL PRODUCT                        */}
      {/* ============================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-[#DCE5EC] shadow-xl overflow-hidden my-8">
            <div className="p-4 border-b border-[#DCE5EC] flex items-center justify-between bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] text-[#086288] flex items-center justify-center">
                  <Package className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F172A] text-sm">
                    {editingProduct ? 'Edit Physical Product' : 'Register New Physical Product'}
                  </h3>
                  <p className="text-[11px] text-[#475569]">
                    Merchandise SKU catalog, EAN-13 retail barcode, and Cost Center attribution.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* UPLOAD PRODUCT IMAGE */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">
                  Product Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-dashed border-[#B7DDEA] bg-[#FAFDFE] flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {productFormData.imageUrl ? (
                      <>
                        <img
                          src={productFormData.imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setProductFormData((p) => ({ ...p, imageUrl: '' }))}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove Image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <UploadCloud className="w-6 h-6 text-[#086288]/40" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleProductImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DCE5EC] hover:bg-slate-50 text-[#086288] rounded-lg font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{productFormData.imageUrl ? 'Change Photo' : 'Select Product Image'}</span>
                    </button>
                    <p className="text-[10px] text-slate-500">
                      Format PNG, JPG, or WebP (Max 2MB). Image automatically optimized for fast loading.
                    </p>
                  </div>
                </div>
              </div>

              {/* PRODUCT NAME */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Full Product Name & Specifications <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productFormData.name}
                  onChange={(e) => handleProductNameChange(e.target.value)}
                  placeholder="e.g. Granulated White Sugar 1kg / Premium Cooking Oil 2L"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              {/* SKU & BARCODE EAN-13 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>Product SKU (Abbr.)</span>
                      <Sparkles className="w-3 h-3 text-[#086288]" />
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Auto-suggest</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={productFormData.sku}
                    onChange={(e) => {
                      setIsUserEditedSku(true);
                      setProductFormData({ ...productFormData, sku: e.target.value.toUpperCase() });
                    }}
                    placeholder="e.g. GLP1K"
                    className="w-full bg-[#FAFDFE] border border-[#B7DDEA] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Auto-generated from product name abbreviation (e.g. Gula Pasir 1kg &rarr; GLP1K).
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <BarcodeIcon className="w-3.5 h-3.5 text-[#086288]" />
                      <span>EAN-13 Retail Barcode</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerateBarcode}
                      className="text-[10px] font-semibold text-[#086288] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                      title="Generate new barcode"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Randomize
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={productFormData.barcode}
                    onChange={(e) => setProductFormData({ ...productFormData, barcode: e.target.value })}
                    placeholder="8999001000015"
                    className="w-full bg-[#FAFDFE] border border-[#B7DDEA] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    13-digit valid with official GS1 Modulo-10 checksum (scannable by retail lasers).
                  </p>
                </div>
              </div>

              {/* LINE OF BUSINESS & CATEGORY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Line of Business (Cost Center) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={productFormData.businessLineId}
                    onChange={(e) => setProductFormData({ ...productFormData, businessLineId: e.target.value })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#086288]"
                  >
                    <option value="">Select Line of Business...</option>
                    {businessLines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Product Category</label>
                  <select
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Product Description & Specs</label>
                <textarea
                  rows={2}
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  placeholder="Packaging details, material, variants, or handling notes..."
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              {/* UOM & WEIGHT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Unit of Measure (UoM)</label>
                  <select
                    value={productFormData.uom}
                    onChange={(e) => setProductFormData({ ...productFormData, uom: e.target.value })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#086288]"
                  >
                    {uoms.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Item Weight (Grams)</label>
                  <input
                    type="number"
                    min="0"
                    value={productFormData.weightGram}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, weightGram: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Used for automated shipping freight calculations.</p>
                </div>
              </div>

              {/* COST PRICE, SELLING PRICE & SAFETY STOCK (DEFAULT ZERO) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#EEF4F8]">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Cost Price / COGS (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={productFormData.costPrice}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Selling Price (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={productFormData.sellingPrice}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, sellingPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Minimum Safety Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={productFormData.minStockLevel}
                    onChange={(e) =>
                      setProductFormData({ ...productFormData, minStockLevel: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-3 border-t border-[#DCE5EC] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-[#DCE5EC] rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  {editingProduct ? 'Update Product' : 'Save Physical Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: FORM REGISTER SERVICE / DIGITAL ITEM                   */}
      {/* ============================================================== */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-[#DCE5EC] shadow-xl overflow-hidden my-8">
            <div className="p-4 border-b border-[#DCE5EC] flex items-center justify-between bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Wrench className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F172A] text-sm">
                    {editingService ? 'Edit Service Item' : 'Register New Service / Digital Offering'}
                  </h3>
                  <p className="text-[11px] text-[#475569]">
                    Service rate catalog, POS barcode, and Cost Center attribution (e.g. Queinvite).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* UPLOAD SERVICE BANNER */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">
                  Service Banner / Thumbnail
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-dashed border-[#B7DDEA] bg-[#FAFDFE] flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {serviceFormData.imageUrl ? (
                      <>
                        <img
                          src={serviceFormData.imageUrl}
                          alt="Preview Service"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setServiceFormData((s) => ({ ...s, imageUrl: '' }))}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove Image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <Wrench className="w-6 h-6 text-indigo-400/50" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      ref={serviceFileInputRef}
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleServiceImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => serviceFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DCE5EC] hover:bg-slate-50 text-[#086288] rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{serviceFormData.imageUrl ? 'Change Banner' : 'Select Banner Image'}</span>
                    </button>
                    <p className="text-[10px] text-slate-500">
                      Format PNG, JPG, or WebP. Automatically optimized for fast responsive catalog displays.
                    </p>
                  </div>
                </div>
              </div>

              {/* SERVICE NAME */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Full Service Name & Scope <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={serviceFormData.name}
                  onChange={(e) => handleServiceNameChange(e.target.value)}
                  placeholder="e.g. Platinum Interactive Web Invitation (Queinvite)"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              {/* SERVICE SKU & POS BARCODE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>Service SKU (Abbr.)</span>
                      <Sparkles className="w-3 h-3 text-[#086288]" />
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Auto-suggest</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceFormData.code}
                    onChange={(e) => {
                      setIsUserEditedServiceSku(true);
                      setServiceFormData({ ...serviceFormData, code: e.target.value.toUpperCase() });
                    }}
                    placeholder="e.g. JUDPLAT"
                    className="w-full bg-[#FAFDFE] border border-[#B7DDEA] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Auto-generated from service name initials (e.g. Jasa Undangan Digital Platinum &rarr; JUDPLAT).
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <BarcodeIcon className="w-3.5 h-3.5 text-[#086288]" />
                      <span>EAN-13 POS Barcode</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerateServiceBarcode}
                      className="text-[10px] font-semibold text-[#086288] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                      title="Generate new barcode"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Randomize
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceFormData.barcode}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, barcode: e.target.value })}
                    placeholder="8999002000015"
                    className="w-full bg-[#FAFDFE] border border-[#B7DDEA] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    13-digit EAN-13 valid for POS menu sheets and direct scanning.
                  </p>
                </div>
              </div>

              {/* LINE OF BUSINESS & CATEGORY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Line of Business (Cost Center) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={serviceFormData.businessLineId}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, businessLineId: e.target.value })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#086288]"
                  >
                    <option value="">Select Line of Business...</option>
                    {businessLines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Service Category</label>
                  <select
                    value={serviceFormData.category}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, category: e.target.value })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Service Scope & Deliverables</label>
                <textarea
                  rows={2}
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                  placeholder="Service inclusions, turnaround time, milestones, or terms..."
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              {/* BILLING UOM */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Billing Unit of Measure (UoM)</label>
                <select
                  value={serviceFormData.uom}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, uom: e.target.value })}
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#086288]"
                >
                  {uoms.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* BASE COST & SELLING RATE (DEFAULT ZERO) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#EEF4F8]">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Base Cost / HPP (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={serviceFormData.costPrice}
                    onChange={(e) =>
                      setServiceFormData({ ...serviceFormData, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Hosting, external vendor, or production cost.</p>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Selling Rate (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={serviceFormData.rate}
                    onChange={(e) =>
                      setServiceFormData({ ...serviceFormData, rate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Commercial billable rate to client / POS checkout.</p>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-3 border-t border-[#DCE5EC] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 border border-[#DCE5EC] rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  {editingService ? 'Update Service' : 'Save Service Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
