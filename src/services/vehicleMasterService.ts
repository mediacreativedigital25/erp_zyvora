/**
 * Zyvora ERP 1.0.0 — Vehicle Master Service
 * Manages company operational vehicles (armada operasional), custodians, tax due dates & fuel meter logs
 */

import { CompanyVehicle } from '../types/erp';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export const INITIAL_COMPANY_VEHICLES: CompanyVehicle[] = [
  {
    id: 'veh_01',
    licensePlate: 'B 1234 XYZ',
    brandModel: 'Toyota Avanza 1.3 G',
    vehicleType: 'car',
    fuelType: 'pertamax',
    assignedBranchId: 'br_jkt_hq',
    assignedBusinessLineId: 'lob_01',
    custodianEmployeeId: 'emp_01',
    custodianName: 'Iklas Padli (COO)',
    taxDueDate: '2026-11-20', // Segera jatuh tempo (~25 hari lagi)
    plateExpiryDate: '2028-11-20',
    currentOdometerKm: 45280,
    isActive: true,
    notes: 'Kendaraan operasional utama Head Office Jakarta'
  },
  {
    id: 'veh_02',
    licensePlate: 'B 5678 ABC',
    brandModel: 'Daihatsu Gran Max Blind Van',
    vehicleType: 'van',
    fuelType: 'pertalite',
    assignedBranchId: 'br_jkt_hq',
    assignedBusinessLineId: 'lob_02',
    custodianEmployeeId: 'emp_03',
    custodianName: 'Bambang Pamungkas (Warehouse Lead)',
    taxDueDate: '2027-04-15', // Masih aman
    plateExpiryDate: '2029-04-15',
    currentOdometerKm: 78150,
    isActive: true,
    notes: 'Armada logistik pengiriman & delivery hampers'
  },
  {
    id: 'veh_03',
    licensePlate: 'L 9012 DEF',
    brandModel: 'Honda Beat FI',
    vehicleType: 'motorcycle',
    fuelType: 'pertalite',
    assignedBranchId: 'br_sub_east',
    assignedBusinessLineId: 'lob_01',
    custodianEmployeeId: 'emp_04',
    custodianName: 'Arya Pratama (Surabaya Lead)',
    taxDueDate: '2026-10-20', // Sudah lewat jatuh tempo (telat pajak!)
    plateExpiryDate: '2027-10-20',
    currentOdometerKm: 18400,
    isActive: true,
    notes: 'Operasional kurir cepat Cabang Surabaya'
  }
];

const LOCAL_STORAGE_KEY = 'ZYVORA_COMPANY_VEHICLES_CACHE';

export interface VehicleTaxAlert {
  status: 'safe' | 'warning' | 'overdue' | 'unknown';
  daysRemaining: number;
  label: string;
  isOverdue: boolean;
  badgeVariant: 'danger' | 'warning' | 'success' | 'slate';
}

export class VehicleMasterService {
  /**
   * Menghitung status pengingat jatuh tempo pajak kendaraan secara cerdas
   */
  static getTaxStatus(taxDueDate?: string, referenceDate = new Date()): VehicleTaxAlert {
    if (!taxDueDate) {
      return {
        status: 'unknown',
        daysRemaining: 0,
        label: 'Belum Diatur',
        isOverdue: false,
        badgeVariant: 'slate'
      };
    }

    const due = new Date(taxDueDate);
    const diffTime = due.getTime() - referenceDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'overdue',
        daysRemaining: diffDays,
        label: `Telat ${Math.abs(diffDays)} Hari (Segera Perpanjang)`,
        isOverdue: true,
        badgeVariant: 'danger'
      };
    } else if (diffDays <= 30) {
      return {
        status: 'warning',
        daysRemaining: diffDays,
        label: `Sisa ${diffDays} Hari (Jatuh Tempo Segera)`,
        isOverdue: false,
        badgeVariant: 'warning'
      };
    } else {
      return {
        status: 'safe',
        daysRemaining: diffDays,
        label: `Pajak Aktif (Sisa ${diffDays} Hari)`,
        isOverdue: false,
        badgeVariant: 'success'
      };
    }
  }

  /**
   * Mengambil seluruh data armada kendaraan aktif
   */
  static async getVehicles(tenantId = 'ten_zyvora_corp'): Promise<CompanyVehicle[]> {
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('company_vehicles')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('license_plate', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            tenantId: row.tenant_id,
            licensePlate: row.license_plate,
            brandModel: row.brand_model,
            vehicleType: row.vehicle_type || 'car',
            fuelType: row.fuel_type || 'pertamax',
            assignedBranchId: row.assigned_branch_id,
            assignedBusinessLineId: row.assigned_business_line_id,
            custodianEmployeeId: row.custodian_employee_id,
            custodianName: row.custodian_name,
            taxDueDate: row.tax_due_date,
            plateExpiryDate: row.plate_expiry_date,
            currentOdometerKm: Number(row.current_odometer_km) || 0,
            isActive: row.is_active,
            notes: row.notes
          }));
        }
      } catch (err) {
        console.warn('Fallback to local storage for vehicles:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_COMPANY_VEHICLES));
      } catch {}
    }

    return INITIAL_COMPANY_VEHICLES;
  }

  /**
   * Menyimpan / memperbarui armada kendaraan
   */
  static async saveVehicle(vehicle: Partial<CompanyVehicle>, tenantId = 'ten_zyvora_corp'): Promise<CompanyVehicle> {
    const existingList = await this.getVehicles(tenantId);
    let updatedVehicle: CompanyVehicle;

    if (vehicle.id) {
      const idx = existingList.findIndex((v) => v.id === vehicle.id);
      if (idx >= 0) {
        updatedVehicle = {
          ...existingList[idx],
          ...vehicle,
          currentOdometerKm: Number(vehicle.currentOdometerKm ?? existingList[idx].currentOdometerKm)
        } as CompanyVehicle;
        existingList[idx] = updatedVehicle;
      } else {
        updatedVehicle = {
          ...vehicle,
          id: vehicle.id,
          tenantId,
          isActive: vehicle.isActive ?? true
        } as CompanyVehicle;
        existingList.push(updatedVehicle);
      }
    } else {
      updatedVehicle = {
        id: `veh_${Date.now()}`,
        tenantId,
        licensePlate: (vehicle.licensePlate || '').toUpperCase().trim(),
        brandModel: vehicle.brandModel || 'Operational Vehicle',
        vehicleType: vehicle.vehicleType || 'car',
        fuelType: vehicle.fuelType || 'pertamax',
        assignedBranchId: vehicle.assignedBranchId,
        assignedBusinessLineId: vehicle.assignedBusinessLineId,
        custodianEmployeeId: vehicle.custodianEmployeeId,
        custodianName: vehicle.custodianName,
        taxDueDate: vehicle.taxDueDate,
        plateExpiryDate: vehicle.plateExpiryDate,
        currentOdometerKm: Number(vehicle.currentOdometerKm || 0),
        isActive: vehicle.isActive ?? true,
        notes: vehicle.notes
      };
      existingList.push(updatedVehicle);
    }

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('company_vehicles').upsert({
          id: updatedVehicle.id,
          tenant_id: tenantId,
          license_plate: updatedVehicle.licensePlate,
          brand_model: updatedVehicle.brandModel,
          vehicle_type: updatedVehicle.vehicleType,
          fuel_type: updatedVehicle.fuelType,
          assigned_branch_id: updatedVehicle.assignedBranchId,
          assigned_business_line_id: updatedVehicle.assignedBusinessLineId,
          custodian_employee_id: updatedVehicle.custodianEmployeeId,
          custodian_name: updatedVehicle.custodianName,
          tax_due_date: updatedVehicle.taxDueDate,
          plate_expiry_date: updatedVehicle.plateExpiryDate,
          current_odometer_km: updatedVehicle.currentOdometerKm,
          is_active: updatedVehicle.isActive,
          notes: updatedVehicle.notes,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to upsert vehicle to server:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existingList));
      } catch {}
    }

    return updatedVehicle;
  }

  /**
   * Menghapus armada kendaraan
   */
  static async deleteVehicle(id: string, tenantId = 'ten_zyvora_corp'): Promise<boolean> {
    const existingList = await this.getVehicles(tenantId);
    const filtered = existingList.filter((v) => v.id !== id);

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('company_vehicles').delete().eq('id', id).eq('tenant_id', tenantId);
      } catch (err) {
        console.warn('Failed to delete vehicle from server:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      } catch {}
    }

    return true;
  }

  /**
   * Memperbarui posisi odometer / KM setelah pengisian BBM
   */
  static async updateOdometer(vehicleId: string, newKm: number, tenantId = 'ten_zyvora_corp'): Promise<void> {
    const list = await this.getVehicles(tenantId);
    const target = list.find((v) => v.id === vehicleId);
    if (target && newKm > target.currentOdometerKm) {
      target.currentOdometerKm = newKm;
      await this.saveVehicle(target, tenantId);
    }
  }
}
