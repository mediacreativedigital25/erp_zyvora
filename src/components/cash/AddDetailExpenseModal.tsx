import React, { useState, useEffect } from 'react';
import {
  X,
  Fuel,
  Gauge,
  Building2,
  Check,
  AlertCircle,
  Upload,
  Receipt
} from 'lucide-react';
import {
  ExpenseClaimItem,
  ExpenseClaimOrderByType,
  TenantBusinessLine,
  Branch,
  CompanyVehicle,
  ClaimExpenseCategory,
  ClaimExpenseActivity,
  Employee
} from '../../types/erp';
import { VehicleMasterService } from '../../services/vehicleMasterService';
import { ExpenseClaimService } from '../../services/expenseClaimService';
import { ClaimSettingsService } from '../../services/claimSettingsService';
import { EmployeeService } from '../../services/employeeService';
import { useErp } from '../../context/ErpContext';

interface AddDetailExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ExpenseClaimItem) => void;
  initialData?: ExpenseClaimItem | null;
  businessLines: TenantBusinessLine[];
  branches: Branch[];
  employees?: Employee[];
}

export const AddDetailExpenseModal: React.FC<AddDetailExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  businessLines,
  branches,
  employees
}) => {
  const { tenant } = useErp();
  const [vehicles, setVehicles] = useState<CompanyVehicle[]>([]);
  const [categoriesList, setCategoriesList] = useState<ClaimExpenseCategory[]>([]);
  const [activitiesList, setActivitiesList] = useState<ClaimExpenseActivity[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>(employees || []);

  useEffect(() => {
    if (employees && employees.length > 0) {
      setEmployeesList(employees);
    } else {
      EmployeeService.getEmployees(tenant.id).then(setEmployeesList);
    }
  }, [employees, tenant.id]);

  // Form states - All initialized to blank / unselected by default
  const [orderByType, setOrderByType] = useState<ExpenseClaimOrderByType | ''>('');
  const [orderByTargetId, setOrderByTargetId] = useState<string>('');
  const [costCenterCode, setCostCenterCode] = useState<string>('');
  const [orderByTargetName, setOrderByTargetName] = useState<string>('');

  const [category, setCategory] = useState<string>('');
  const [activity, setActivity] = useState<string>('');
  const [isVehicleActivity, setIsVehicleActivity] = useState<boolean>(false);

  // Vehicle Activity fields
  const [vehicleId, setVehicleId] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [odometerKm, setOdometerKm] = useState<string>('');
  const [fuelLiters, setFuelLiters] = useState<string>('');
  const [fuelPurchaseDate, setFuelPurchaseDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );

  const [nominal, setNominal] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize / reset form state whenever modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      // Edit mode: populate existing item data
      setOrderByType(initialData.orderByType || 'business_line');
      setOrderByTargetId(initialData.orderByTargetId || '');
      setCostCenterCode(initialData.costCenterCode || '');
      setOrderByTargetName(initialData.orderByTargetName || '');
      setCategory(initialData.category || '');
      setActivity(initialData.activity || '');
      setIsVehicleActivity(initialData.isVehicleActivity ?? false);
      setVehicleId(initialData.vehicleId || '');
      setLicensePlate(initialData.licensePlate || '');
      setOdometerKm(
        initialData.odometerKm !== undefined && initialData.odometerKm !== null
          ? String(initialData.odometerKm)
          : ''
      );
      setFuelLiters(
        initialData.fuelLiters !== undefined && initialData.fuelLiters !== null
          ? String(initialData.fuelLiters)
          : ''
      );
      setFuelPurchaseDate(initialData.fuelPurchaseDate || new Date().toISOString().split('T')[0]);
      setNominal(
        initialData.nominal !== undefined && initialData.nominal !== null
          ? String(initialData.nominal)
          : ''
      );
      setRemark(initialData.remark || '');
      setReceiptUrl(initialData.receiptUrl || '');
      setErrorMessage(null);
    } else {
      // Clean Add mode: EVERYTHING is blank, user must actively choose
      setOrderByType('');
      setOrderByTargetId('');
      setOrderByTargetName('');
      setCostCenterCode('');
      setCategory('');
      setActivity('');
      setIsVehicleActivity(false);
      setVehicleId('');
      setLicensePlate('');
      setOdometerKm('');
      setFuelLiters('');
      setFuelPurchaseDate(new Date().toISOString().split('T')[0]);
      setNominal('');
      setRemark('');
      setReceiptUrl('');
      setErrorMessage(null);
    }
  }, [isOpen, initialData, businessLines]);

  // Load vehicles and claim master settings (WITHOUT auto-selecting in Add mode)
  useEffect(() => {
    if (!isOpen) return;

    VehicleMasterService.getVehicles(tenant.id).then((list) => {
      setVehicles(list);
      if (initialData?.vehicleId) {
        const found = list.find((v) => v.id === initialData.vehicleId);
        if (found) {
          setVehicleId(found.id);
          setLicensePlate(found.licensePlate);
          if (initialData.odometerKm === undefined && found.currentOdometerKm) {
            setOdometerKm(String(found.currentOdometerKm));
          }
        }
      }
    });

    Promise.all([
      ClaimSettingsService.getCategories(tenant.id),
      ClaimSettingsService.getActivities(tenant.id)
    ]).then(([cats, acts]) => {
      setCategoriesList(cats);
      setActivitiesList(acts);
      if (initialData?.category) {
        const foundCat = cats.find((c) => c.code === initialData.category || c.id === initialData.category);
        if (foundCat) {
          setIsVehicleActivity(foundCat.isVehicleActivity);
        }
      }
    });
  }, [isOpen, initialData]);

  // Recalculate Cost Center when Order By Type or Target changes
  useEffect(() => {
    if (!isOpen) return;
    if (!orderByType || !orderByTargetId) {
      setCostCenterCode('');
      setOrderByTargetName('');
      return;
    }
    const resolved = ExpenseClaimService.resolveCostCenter(
      orderByType as ExpenseClaimOrderByType,
      orderByTargetId,
      businessLines,
      employeesList,
      branches
    );
    setCostCenterCode(resolved.costCenterCode);
    setOrderByTargetName(resolved.targetName);
  }, [isOpen, orderByType, orderByTargetId, businessLines, employeesList, branches]);

  // Handle Order By Type change (resets target ID to blank)
  const handleOrderByTypeChange = (newType: string) => {
    setOrderByType(newType as ExpenseClaimOrderByType | '');
    setOrderByTargetId('');
    setCostCenterCode('');
    setOrderByTargetName('');
  };

  // Sync category selection with vehicle fleet requirement
  const handleCategoryChange = (catCode: string) => {
    setCategory(catCode);
    if (!catCode) {
      setIsVehicleActivity(false);
      setVehicleId('');
      setLicensePlate('');
      setOdometerKm('');
      setFuelLiters('');
      return;
    }
    const cat = categoriesList.find((c) => c.code === catCode || c.id === catCode);
    if (cat) {
      setIsVehicleActivity(cat.isVehicleActivity);
      if (!cat.isVehicleActivity) {
        setVehicleId('');
        setLicensePlate('');
        setOdometerKm('');
        setFuelLiters('');
      }
    } else {
      setIsVehicleActivity(false);
    }
  };

  const handleVehicleChange = (vId: string) => {
    setVehicleId(vId);
    if (!vId) {
      setLicensePlate('');
      setOdometerKm('');
      return;
    }
    const v = vehicles.find((item) => item.id === vId);
    if (v) {
      setLicensePlate(v.licensePlate);
      if (!odometerKm || parseFloat(odometerKm) < v.currentOdometerKm) {
        setOdometerKm(String(v.currentOdometerKm));
      }
    }
  };

  if (!isOpen) return null;

  const numericNominal = parseFloat(nominal) || 0;
  const numericKm = parseFloat(odometerKm) || 0;
  const numericLiters = parseFloat(fuelLiters) || 0;
  const pricePerLiter =
    numericNominal > 0 && numericLiters > 0 ? Math.round(numericNominal / numericLiters) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Guard Validations
    if (!orderByType) {
      setErrorMessage('Silakan pilih Jenis Pembebanan Biaya.');
      return;
    }

    if (!orderByTargetId) {
      setErrorMessage('Silakan pilih Entitas Target Pembebanan (Lini Bisnis / Personil / Cabang).');
      return;
    }

    if (!category) {
      setErrorMessage('Silakan pilih Kategori Klaim biaya.');
      return;
    }

    if (!activity.trim()) {
      setErrorMessage('Deskripsi aktivitas operasional wajib diisi.');
      return;
    }

    const currentCat = categoriesList.find((c) => c.code === category || c.id === category);
    if (currentCat && currentCat.maxLimit > 0 && numericNominal > currentCat.maxLimit) {
      setErrorMessage(
        `Nominal melebihi batas plafon kategori '${currentCat.name}' (Maksimal: Rp ${currentCat.maxLimit.toLocaleString('id-ID')}).`
      );
      return;
    }

    if (currentCat && currentCat.isReceiptRequired && !receiptUrl) {
      setErrorMessage(
        `Kategori '${currentCat.name}' mewajibkan lampiran bukti struk nota pembayaran.`
      );
      return;
    }

    if (isVehicleActivity) {
      if (!vehicleId || !licensePlate) {
        setErrorMessage('Silakan pilih nomor polisi armada kendaraan.');
        return;
      }
      if (numericKm <= 0) {
        setErrorMessage('Odometer kendaraan (KM) wajib diisi.');
        return;
      }
      if (numericLiters <= 0) {
        setErrorMessage('Volume BBM (Liter) harus lebih besar dari 0.');
        return;
      }
    }

    if (numericNominal <= 0) {
      setErrorMessage('Nominal biaya klaim harus lebih besar dari Rp 0.');
      return;
    }

    const item: ExpenseClaimItem = {
      id: initialData?.id || `item_${Date.now()}`,
      lineNumber: initialData?.lineNumber || 1,
      orderByType: orderByType as ExpenseClaimOrderByType,
      orderByTargetId,
      orderByTargetName,
      costCenterCode,
      category,
      activity: activity.trim(),
      isVehicleActivity,
      vehicleId: isVehicleActivity ? vehicleId : undefined,
      licensePlate: isVehicleActivity ? licensePlate : undefined,
      odometerKm: isVehicleActivity ? numericKm : undefined,
      fuelLiters: isVehicleActivity ? numericLiters : undefined,
      fuelPurchaseDate: isVehicleActivity ? fuelPurchaseDate : undefined,
      nominal: numericNominal,
      remark: remark.trim() || undefined,
      receiptUrl: receiptUrl || undefined
    };

    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Modal Container: WIDENED TO max-w-4xl lg:max-w-5xl */}
      <div className="bg-white rounded-xl shadow-xl max-w-4xl lg:max-w-5xl w-full overflow-hidden border border-[#DCE5EC] my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                {initialData ? 'Edit Detail Klaim Biaya' : 'Tambah Detail Klaim Biaya'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Order By & Cost Center Resolution */}
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#DCE5EC] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="font-semibold text-[#0F172A]">
                Pembebanan Biaya (Order By / Charged Entity) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-0.5 rounded border border-[#DCE5EC] bg-white">
                <Building2 className="w-3.5 h-3.5 text-[#086288]" />
                {costCenterCode ? (
                  <span className="text-[#086288] font-bold">
                    Cost Center: {costCenterCode}
                  </span>
                ) : (
                  <span className="text-[#64748B] font-normal">
                    Cost Center: — (Belum Dipilih)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <select
                  value={orderByType}
                  onChange={(e) => handleOrderByTypeChange(e.target.value)}
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] font-medium"
                >
                  <option value="">-- Pilih Jenis Pembebanan --</option>
                  <option value="business_line">Lini Bisnis (Business Line / LOB)</option>
                  <option value="personnel">Personil (Staff / PIC)</option>
                  <option value="branch">Cabang (Branch Office)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                {!orderByType && (
                  <select
                    disabled
                    value=""
                    className="w-full bg-[#F1F5F9] border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#94A3B8] cursor-not-allowed font-medium"
                  >
                    <option value="">-- Pilih Jenis Pembebanan Terlebih Dahulu --</option>
                  </select>
                )}

                {orderByType === 'business_line' && (
                  <select
                    value={orderByTargetId}
                    onChange={(e) => setOrderByTargetId(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] font-medium"
                  >
                    <option value="">-- Pilih Lini Bisnis --</option>
                    {businessLines.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.costCenterCode || (b.code === 'HOLDING' ? 'CC-SHARED-HOLDING' : `CC-LOB-${b.code}`)})
                      </option>
                    ))}
                  </select>
                )}

                {orderByType === 'personnel' && (
                  <select
                    value={orderByTargetId}
                    onChange={(e) => setOrderByTargetId(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] font-medium"
                  >
                    <option value="">-- Pilih Personil / PIC --</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.businessLineName || 'Holding / Shared Services'})
                      </option>
                    ))}
                  </select>
                )}

                {orderByType === 'branch' && (
                  <select
                    value={orderByTargetId}
                    onChange={(e) => setOrderByTargetId(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] font-medium"
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {branches
                      .filter((br) => br.isActive || br.id === orderByTargetId)
                      .map((br) => (
                        <option key={br.id} value={br.id} disabled={!br.isActive && br.id !== orderByTargetId}>
                          {br.name} (CC-BR-{br.code.toUpperCase()}) {!br.isActive ? ' (Nonaktif)' : ''}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* 2. Expense Category & Activity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1.5">
                Kategori Klaim (Expense Category) <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] font-medium"
              >
                <option value="">-- Pilih Kategori Klaim --</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#0F172A] mb-1.5">
                Aktivitas Operasional (Activity Description) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                list="claim-activities-list"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="Pilih aktivitas atau ketik manual..."
                className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
              />
              <datalist id="claim-activities-list">
                {activitiesList.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* 3. Vehicle & Fuel Activity Panel (Hanya muncul jika Kategori BBM dipilih) */}
          {isVehicleActivity && (
            <div className="p-4 rounded-lg bg-[#EFF7FA]/50 border border-[#B7DDEA] space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#086288]">
                <Fuel className="w-4 h-4" />
                <span>Armada Kendaraan & Log BBM (Vehicle Fleet & Fuel Log)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Select Vehicle Nopol */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Pilih Nomor Polisi (License Plate / Nopol) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] font-medium"
                  >
                    <option value="">-- Pilih Nomor Polisi Armada --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate} — {v.brandModel} {v.custodianName ? `(${v.custodianName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Tanggal Pembelian BBM <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={fuelPurchaseDate}
                    onChange={(e) => setFuelPurchaseDate(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  />
                </div>

                {/* Odometer KM */}
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Odometer Terakhir (KM) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={odometerKm}
                      onChange={(e) => setOdometerKm(e.target.value)}
                      placeholder="Contoh: 45280"
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] pr-7"
                    />
                    <Gauge className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Fuel Liters */}
                <div className="sm:col-span-2 md:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1">
                      Volume BBM (Liter) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={fuelLiters}
                        onChange={(e) => setFuelLiters(e.target.value)}
                        placeholder="Contoh: 28.5"
                        className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] pr-7"
                      />
                      <Fuel className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {pricePerLiter > 0 && (
                    <div className="flex flex-col justify-end">
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-md bg-white border border-[#B7DDEA] text-[#086288]">
                        <span className="font-medium">Kalkulasi Harga BBM per Liter:</span>
                        <span className="font-mono font-bold text-sm">Rp {pricePerLiter.toLocaleString('id-ID')} / Liter</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. Requested Amount */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Nominal Klaim Biaya (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[#94A3B8] font-semibold text-xs">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="Contoh: 250000"
                className="w-full bg-white border border-[#DCE5EC] rounded-md pl-9 pr-3 py-2 text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
              />
            </div>
          </div>

          {/* 5. Remark */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Keterangan Tambahan (Remark / Notes)
            </label>
            <textarea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Masukkan catatan rincian kegiatan atau keperluan klaim..."
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
            />
          </div>

          {/* 6. Receipt Upload */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Lampiran Bukti (Receipt / Struk SPBU)
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-[#DCE5EC] hover:bg-[#F8FAFC] text-[#475569] rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>{receiptUrl ? 'Ganti File Struk' : 'Unggah File Struk'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReceiptUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                />
              </label>
              {receiptUrl && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Struk Terlampir
                </span>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#DCE5EC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#DCE5EC] hover:bg-[#F8FAFC] text-[#475569] rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan Rincian</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
