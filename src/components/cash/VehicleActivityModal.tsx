import React, { useState, useEffect } from 'react';
import { X, Car, Fuel, Gauge, Calendar, Check, AlertCircle } from 'lucide-react';
import { CompanyVehicle } from '../../types/erp';
import { VehicleMasterService } from '../../services/vehicleMasterService';
import { useErp } from '../../context/ErpContext';

interface VehicleActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  nominalAmount: number;
  initialData?: {
    vehicleId?: string;
    licensePlate?: string;
    odometerKm?: number;
    fuelLiters?: number;
    fuelPurchaseDate?: string;
  };
  onSave: (data: {
    vehicleId: string;
    licensePlate: string;
    odometerKm: number;
    fuelLiters: number;
    fuelPurchaseDate: string;
  }) => void;
}

export const VehicleActivityModal: React.FC<VehicleActivityModalProps> = ({
  isOpen,
  onClose,
  nominalAmount,
  initialData,
  onSave
}) => {
  const { tenant } = useErp();
  const [vehicles, setVehicles] = useState<CompanyVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [odometerKm, setOdometerKm] = useState<string>('');
  const [fuelLiters, setFuelLiters] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setSelectedVehicleId(initialData.vehicleId || '');
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
      setPurchaseDate(initialData.fuelPurchaseDate || new Date().toISOString().split('T')[0]);
    } else {
      setSelectedVehicleId('');
      setOdometerKm('');
      setFuelLiters('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
    }
    setErrorMessage(null);

    VehicleMasterService.getVehicles(tenant.id).then((list) => {
      setVehicles(list);
      if (initialData?.vehicleId) {
        const defaultVeh = list.find((v) => v.id === initialData.vehicleId);
        if (defaultVeh) {
          setSelectedVehicleId(defaultVeh.id);
          if (initialData.odometerKm === undefined && defaultVeh.currentOdometerKm) {
            setOdometerKm(String(defaultVeh.currentOdometerKm));
          }
        }
      } else if (!initialData && list.length > 0) {
        setSelectedVehicleId(list[0].id);
        if (list[0].currentOdometerKm) {
          setOdometerKm(String(list[0].currentOdometerKm));
        }
      }
    });
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const currentVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const numericKm = parseFloat(odometerKm) || 0;
  const numericLiters = parseFloat(fuelLiters) || 0;

  // Live Metric: Kalkulasi harga per liter (Nominal / Liter)
  const pricePerLiter =
    nominalAmount > 0 && numericLiters > 0 ? Math.round(nominalAmount / numericLiters) : 0;

  const handleVehicleChange = (id: string) => {
    setSelectedVehicleId(id);
    const v = vehicles.find((item) => item.id === id);
    if (v && (!odometerKm || parseFloat(odometerKm) < v.currentOdometerKm)) {
      setOdometerKm(String(v.currentOdometerKm));
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedVehicleId || !currentVehicle) {
      setErrorMessage('Please select a company vehicle plate number.');
      return;
    }

    if (numericKm <= 0) {
      setErrorMessage('Current odometer reading (KM) must be greater than zero.');
      return;
    }

    if (numericLiters <= 0) {
      setErrorMessage('Fuel volume (liters) must be greater than zero.');
      return;
    }

    onSave({
      vehicleId: currentVehicle.id,
      licensePlate: currentVehicle.licensePlate,
      odometerKm: numericKm,
      fuelLiters: numericLiters,
      fuelPurchaseDate: purchaseDate
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DCEEF5] flex items-center justify-center text-[#086288]">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Vehicle Activity & Fuel Log</h3>
              <p className="text-xs text-slate-500">Fleet odometer and fuel purchase verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleApply} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Pilih Nopol */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Select License Plate (Nopol) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedVehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#086288] focus:border-transparent outline-none pr-8 text-slate-800 font-medium"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} — {v.brandModel} ({v.currentOdometerKm.toLocaleString()} KM)
                  </option>
                ))}
              </select>
              <Car className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            {currentVehicle && (
              <p className="text-[11px] text-slate-500 mt-1">
                Last recorded odometer:{' '}
                <span className="font-semibold text-slate-700">
                  {currentVehicle.currentOdometerKm.toLocaleString()} KM
                </span>{' '}
                • Fuel: <span className="capitalize font-medium">{currentVehicle.fuelType}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* 2. Odometer KM */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Current Odometer (KM) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value)}
                  placeholder="e.g. 45280"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#086288] focus:border-transparent outline-none pr-8 font-mono text-slate-800"
                />
                <Gauge className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* 3. Jumlah Liter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Fuel Volume (Liters) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                  placeholder="e.g. 28.5"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#086288] focus:border-transparent outline-none pr-8 font-mono text-slate-800"
                />
                <Fuel className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 4. Tanggal Beli */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Purchase Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#086288] focus:border-transparent outline-none pr-8 text-slate-800"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Live Metric Banner */}
          <div className="p-3.5 rounded-xl bg-[#F0F8FA] border border-[#BDE0EE] flex items-center justify-between text-xs">
            <span className="text-[#086288] font-medium">Estimated Fuel Price per Liter:</span>
            <span className="font-bold text-[#086288] font-mono text-sm">
              {pricePerLiter > 0 ? `Rp ${pricePerLiter.toLocaleString()}/L` : '—'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#086288] hover:bg-[#064c6a] rounded-xl shadow-sm transition-all shadow-[#086288]/20"
            >
              <Check className="w-4 h-4" />
              Save Vehicle Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
