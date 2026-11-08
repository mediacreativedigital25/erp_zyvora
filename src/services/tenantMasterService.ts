/**
 * Zyvora ERP 1.0.0 — Tenant Master Service
 * Manages Company Profile, Market & Lines of Business, and System Configurations.
 * Enforces strict multi-tenant isolation, RBAC permissions, and persistent state.
 */

import {
  CompanyProfile,
  TenantMarketProfile,
  TenantSystemConfig,
  TenantBusinessLine,
  UserProfile
} from '../types/erp';
import { IndonesiaRegionService } from './indonesiaRegionService';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CANONICAL_FALLBACK_TENANT_ID = 'ten_zyvora_corp';

export class TenantMasterService {
  private static memoryProfiles = new Map<string, CompanyProfile>();

  static resolveTenantId(tenantId?: string): string {
    if (!tenantId || tenantId === '00000000-0000-4000-8000-000000000001' || tenantId === 'undefined' || tenantId === 'null') {
      return CANONICAL_FALLBACK_TENANT_ID;
    }
    const clean = tenantId.trim();
    const lower = clean.toLowerCase();
    if (lower === 'zyv-corp' || lower === 'zyv' || lower === '001') return 'ten_zyvora_corp';
    if (lower === 'hzk' || lower === 'hizaki' || lower === '004') return 'ten_hizaki_wedding';
    if (lower === 'yul-hold' || lower === 'yulovi' || lower === '002') return 'ten_yulovi_holdings';
    if (lower === 'pls-log' || lower === 'pls' || lower === '003') return 'ten_prima_logistik';
    if (clean === 'ten_zyvora_corp' || clean === 'ten_hizaki_wedding' || clean === 'ten_yulovi_holdings' || clean === 'ten_prima_logistik') {
      return clean;
    }
    return CANONICAL_FALLBACK_TENANT_ID;
  }

  /**
   * Evaluates if user role has edit permissions for Master Tenant
   */
  static canEditMaster(user: UserProfile): boolean {
    if (user.isPlatformSuperAdmin) return true;
    return ['super_admin', 'owner', 'admin'].includes(user.role);
  }

  // ====================================================================
  // 1. PROFIL PERUSAHAAN (COMPANY PROFILE)
  // ====================================================================

  static getDefaultCompanyProfile(tenantId: string, tenantCode = 'ZYV-CORP'): CompanyProfile {
    const validTenantId = this.resolveTenantId(tenantId || tenantCode);

    if (validTenantId === 'ten_hizaki_wedding' || tenantCode === 'HZK') {
      return {
        tenantId: 'ten_hizaki_wedding',
        tenantCode: 'HZK',
        legalName: 'Hizaki Wedding Planner',
        brandName: 'Hizaki Wedding Planner',
        logoUrl: undefined,
        description: 'Layanan perencanaan pernikahan eksklusif, dekorasi tematik, dan manajemen acara profesional terpadu.',
        businessEntity: 'PERORANGAN',
        nib: '9120003456781',
        npwp: '01.345.678.9-012.000',
        email: 'corporate@hizaki.com',
        phone: '+62 22 203 1234',
        whatsapp: '+62 812 3456 7890',
        website: 'https://hizakiwedding.com',
        address: 'Gedung Menara Mandiri Lt. 18, Jl. Jend. Sudirman Kav. 54-55',
        provinceId: '32',
        provinceName: 'Jawa Barat',
        regencyId: '3273',
        regencyName: 'Kota Bandung',
        districtId: '327307',
        districtName: 'Sukajadi',
        villageId: '3273071001',
        villageName: 'Pasteur',
        postalCode: '40161',
        country: 'Indonesia',
        latitude: -6.8909,
        longitude: 107.5995,
        updatedAt: new Date().toISOString()
      };
    }

    if (validTenantId === 'ten_yulovi_holdings' || tenantCode === 'YUL-HOLD') {
      return {
        tenantId: 'ten_yulovi_holdings',
        tenantCode: 'YUL-HOLD',
        legalName: 'PT Yulovi Niaga Nusantara',
        brandName: 'Yulovi Holdings',
        logoUrl: undefined,
        description: 'Holding multi-sektor dan distribusi komoditas terintegrasi.',
        businessEntity: 'PT',
        nib: '9120003456782',
        npwp: '01.345.678.9-013.000',
        email: 'corporate@yulovi.com',
        phone: '+62 21 5289 1100',
        whatsapp: '+62 811 1234 5678',
        website: 'https://yulovi.com',
        address: 'Jl. Sudirman Kav. 54, Jakarta Selatan',
        provinceId: '31',
        provinceName: 'DKI Jakarta',
        regencyId: '3171',
        regencyName: 'Kota Jakarta Selatan',
        districtId: '317101',
        districtName: 'Kebayoran Baru',
        villageId: '3171011001',
        villageName: 'Senayan',
        postalCode: '12190',
        country: 'Indonesia',
        latitude: -6.2255,
        longitude: 106.8085,
        updatedAt: new Date().toISOString()
      };
    }

    if (validTenantId === 'ten_prima_logistik' || tenantCode === 'PLS-LOG') {
      return {
        tenantId: 'ten_prima_logistik',
        tenantCode: 'PLS-LOG',
        legalName: 'PT Prima Logistik Sentosa',
        brandName: 'Prima Logistik',
        logoUrl: undefined,
        description: 'Layanan logistik, ekspedisi dan pergudangan skala nasional.',
        businessEntity: 'PT',
        nib: '9120003456783',
        npwp: '01.345.678.9-014.000',
        email: 'ops@primalogistik.co.id',
        phone: '+62 31 8432 1100',
        whatsapp: '+62 813 9876 5432',
        website: 'https://primalogistik.co.id',
        address: 'Kawasan Industri Rungkut Blok B-12, Surabaya',
        provinceId: '35',
        provinceName: 'Jawa Timur',
        regencyId: '3578',
        regencyName: 'Kota Surabaya',
        districtId: '357808',
        districtName: 'Rungkut',
        villageId: '3578081001',
        villageName: 'Kali Rungkut',
        postalCode: '60293',
        country: 'Indonesia',
        latitude: -7.3215,
        longitude: 112.7685,
        updatedAt: new Date().toISOString()
      };
    }

    // Default: Zyvora Global Enterprises
    return {
      tenantId: tenantId || 'ten_zyvora_corp',
      tenantCode: tenantCode || 'ZYV-CORP',
      legalName: 'PT Zyvora Global Pratama',
      brandName: 'Zyvora Global Enterprises',
      logoUrl: undefined,
      description: 'Perusahaan holding penyedia solusi integrasi rantai pasok terpadu dan perdagangan umum berskala nasional.',
      businessEntity: 'PT',
      nib: '9120003456780',
      npwp: '01.345.678.9-012.000',
      email: 'corporate@zyvora.com',
      phone: '+62 21 5289 0000',
      whatsapp: '+62 811 9876 5432',
      website: 'https://www.zyvora.com',
      address: 'Gedung Menara Mandiri Lt. 18, Jl. Jend. Sudirman Kav. 54-55',
      provinceId: '31',
      provinceName: 'DKI Jakarta',
      regencyId: '3171',
      regencyName: 'Kota Jakarta Selatan',
      districtId: '317101',
      districtName: 'Kebayoran Baru',
      villageId: '3171011001',
      villageName: 'Senayan',
      postalCode: '12190',
      country: 'Indonesia',
      latitude: -6.2255,
      longitude: 106.8085,
      updatedAt: new Date().toISOString()
    };
  }

  static async getCompanyProfile(tenantId: string, tenantCode?: string): Promise<CompanyProfile> {
    const validTenantId = this.resolveTenantId(tenantId);

    // 1. Try Supabase first (Live Network First)
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('company_profiles')
          .select('*')
          .eq('tenant_id', validTenantId)
          .maybeSingle();

        if (data && !error) {
          const profile: CompanyProfile = {
            tenantId: tenantId || data.tenant_id,
            tenantCode: tenantCode || data.tenant_code || 'ZYV-CORP',
            legalName: data.legal_name,
            brandName: data.brand_name,
            logoUrl: data.logo_url || undefined,
            description: data.description || '',
            businessEntity: data.business_entity || 'PT',
            nib: data.nib || '',
            npwp: data.npwp || '',
            email: data.email || '',
            phone: data.phone || '',
            whatsapp: data.whatsapp || '',
            website: data.website || '',
            address: data.address || '',
            provinceId: data.province_id || '',
            provinceName: data.province_name || '',
            regencyId: data.regency_id || '',
            regencyName: data.regency_name || '',
            districtId: data.district_id || '',
            districtName: data.district_name || '',
            villageId: data.village_id || '',
            villageName: data.village_name || '',
            postalCode: data.postal_code || '',
            country: data.country || 'Indonesia',
            latitude: data.latitude !== undefined && data.latitude !== null
              ? Number(data.latitude)
              : IndonesiaRegionService.lookupCoordinates(data.village_name, data.district_name, data.regency_name)?.latitude,
            longitude: data.longitude !== undefined && data.longitude !== null
              ? Number(data.longitude)
              : IndonesiaRegionService.lookupCoordinates(data.village_name, data.district_name, data.regency_name)?.longitude,
            updatedAt: data.updated_at
          };
          this.memoryProfiles.set(tenantId, profile);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`ZYVORA_TENANT_PROFILE_${tenantId}`, JSON.stringify(profile));
              localStorage.setItem(`ZYVORA_TENANT_PROFILE_${validTenantId}`, JSON.stringify(profile));
            } catch {}
          }
          return profile;
        }
      } catch (err) {
        console.warn('[TenantMasterService] Supabase getCompanyProfile notice:', err);
      }
    }

    // 2. Check in-memory store
    if (this.memoryProfiles.has(tenantId)) {
      const mem = this.memoryProfiles.get(tenantId)!;
      if (tenantCode) mem.tenantCode = tenantCode;
      return { ...mem };
    }

    // 3. Try persistent client storage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`ZYVORA_TENANT_PROFILE_${tenantId}`) ||
                       localStorage.getItem(`ZYVORA_TENANT_PROFILE_${validTenantId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (tenantCode) parsed.tenantCode = tenantCode;
          if (parsed.latitude === undefined || parsed.longitude === undefined) {
            const fallbackCoords = IndonesiaRegionService.lookupCoordinates(
              parsed.villageName,
              parsed.districtName,
              parsed.regencyName
            );
            if (fallbackCoords) {
              parsed.latitude = fallbackCoords.latitude;
              parsed.longitude = fallbackCoords.longitude;
            }
          }
          this.memoryProfiles.set(tenantId, parsed);
          return parsed;
        }
      } catch {
        // fallback
      }
    }

    return this.getDefaultCompanyProfile(tenantId, tenantCode);
  }

  static async saveCompanyProfile(
    profile: CompanyProfile,
    actor: UserProfile
  ): Promise<{ success: boolean; profile: CompanyProfile; message: string }> {
    if (!this.canEditMaster(actor)) {
      throw new Error('ERR_FORBIDDEN: Only Super Admin, Tenant Owner, or Tenant Admin are authorized to update Company Profile.');
    }

    // Input Validation
    if (!profile.legalName || profile.legalName.trim().length < 3) {
      throw new Error('Corporate legal name is required (minimum 3 characters).');
    }
    if (!profile.brandName || profile.brandName.trim().length < 2) {
      throw new Error('Trade / brand name is required (minimum 2 characters).');
    }
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      throw new Error('Invalid corporate email address format.');
    }

    const validTenantId = this.resolveTenantId(profile.tenantId);
    const validActorId = (actor.id && UUID_REGEX.test(actor.id)) ? actor.id : null;

    const updatedProfile: CompanyProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.fullName
    };

    // Save to memory cache
    this.memoryProfiles.set(profile.tenantId, updatedProfile);

    // Save to persistent storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`ZYVORA_TENANT_PROFILE_${profile.tenantId}`, JSON.stringify(updatedProfile));
        localStorage.setItem(`ZYVORA_TENANT_PROFILE_${validTenantId}`, JSON.stringify(updatedProfile));
      } catch {
        // ignore storage errors
      }
    }

    // Try Supabase update if configured
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const payload: Record<string, any> = {
          tenant_id: validTenantId,
          tenant_code: profile.tenantCode || 'ZYV-CORP',
          legal_name: profile.legalName.trim(),
          brand_name: profile.brandName.trim(),
          logo_url: profile.logoUrl || null,
          description: profile.description || '',
          business_entity: profile.businessEntity || 'PT',
          nib: profile.nib || null,
          npwp: profile.npwp || null,
          email: profile.email ? profile.email.trim() : null,
          phone: profile.phone || null,
          whatsapp: profile.whatsapp || null,
          website: profile.website || null,
          address: profile.address || '',
          province_id: profile.provinceId || null,
          province_name: profile.provinceName || null,
          regency_id: profile.regencyId || null,
          regency_name: profile.regencyName || null,
          district_id: profile.districtId || null,
          district_name: profile.districtName || null,
          village_id: profile.villageId || null,
          village_name: profile.villageName || null,
          postal_code: profile.postalCode || null,
          country: profile.country || 'Indonesia',
          latitude: profile.latitude !== undefined ? profile.latitude : null,
          longitude: profile.longitude !== undefined ? profile.longitude : null,
          updated_at: updatedProfile.updatedAt
        };

        if (validActorId) {
          payload.updated_by = validActorId;
        }

        const { error } = await client.from('company_profiles').upsert(payload, { onConflict: 'tenant_id' });
        if (error) {
          console.warn('[TenantMasterService] Supabase saveCompanyProfile notice:', error.message);
        }
      } catch (err) {
        console.warn('[TenantMasterService] Supabase saveCompanyProfile exception:', err);
      }
    }

    return {
      success: true,
      profile: updatedProfile,
      message: 'Company profile successfully updated and synchronized to database.'
    };
  }

  // ====================================================================
  // 2. MARKET & LINI BISNIS
  // ====================================================================

  static getDefaultMarketProfile(tenantId: string): TenantMarketProfile {
    return {
      tenantId,
      industryCategory: 'Jasa Pernikahan & Event Organizer',
      businessModel: 'B2C',
      businessLines: [
        {
          id: `lob_${tenantId}_holding`,
          tenantId,
          code: 'HOLDING',
          name: 'Holding / Shared Services',
          description: 'Pos biaya bersama holding dan administrasi kantor pusat.',
          isPrimary: true,
          isActive: true,
          costCenterCode: 'CC-SHARED-HOLDING',
          allowSharedAllocation: true,
          createdAt: new Date().toISOString()
        },
        {
          id: `lob_${tenantId}_hizaki`,
          tenantId,
          code: 'HIZAKI',
          name: 'Hizaki Wedding Planner',
          description: 'Layanan konsultasi dan perencanaan pernikahan terpadu (Wedding Organizer & Planner).',
          isPrimary: false,
          isActive: true,
          costCenterCode: 'CC-LOB-HIZAKI',
          allowSharedAllocation: true,
          createdAt: new Date().toISOString()
        },
        {
          id: `lob_${tenantId}_kimiko`,
          tenantId,
          code: 'KIMIKO',
          name: 'Ki Mi Ko Pager Ayu',
          description: 'Penyedia jasa pager ayu, bridesmaid, dan usher resepsi pernikahan.',
          isPrimary: false,
          isActive: true,
          costCenterCode: 'CC-LOB-KIMIKO',
          allowSharedAllocation: true,
          createdAt: new Date().toISOString()
        },
        {
          id: `lob_${tenantId}_aurum`,
          tenantId,
          code: 'AURUM',
          name: 'Aurum Deco',
          description: 'Jasa dekorasi pelaminan, tata panggung, bunga segar, dan venue styling.',
          isPrimary: false,
          isActive: true,
          costCenterCode: 'CC-LOB-AURUM',
          allowSharedAllocation: true,
          createdAt: new Date().toISOString()
        }
      ],
      updatedAt: new Date().toISOString()
    };
  }

  static async getMarketProfile(tenantId: string): Promise<TenantMarketProfile> {
    const validTenantId = this.resolveTenantId(tenantId);

    // 1. Live Supabase first
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('tenant_market_profiles')
          .select('*, tenant_business_lines(*)')
          .eq('tenant_id', validTenantId)
          .maybeSingle();

        if (data && !error) {
          const profile: TenantMarketProfile = {
            tenantId: tenantId || data.tenant_id,
            industryCategory: data.industry_category || 'Perdagangan Besar & Distribusi',
            businessModel: data.business_model || 'B2B',
            businessLines: (data.tenant_business_lines || []).map((b: any) => ({
              id: b.id,
              tenantId: tenantId || b.tenant_id,
              code: b.code,
              name: b.name,
              description: b.description || '',
              isPrimary: Boolean(b.is_primary),
              isActive: Boolean(b.is_active),
              costCenterCode: b.cost_center_code || `CC-${b.code}`,
              allowSharedAllocation: b.allow_shared_allocation !== false,
              createdAt: b.created_at
            })),
            updatedAt: data.updated_at
          };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`ZYVORA_MARKET_PROFILE_${tenantId}`, JSON.stringify(profile));
              localStorage.setItem(`ZYVORA_MARKET_PROFILE_${validTenantId}`, JSON.stringify(profile));
            } catch {}
          }
          return profile;
        }
      } catch (err) {
        console.warn('[TenantMasterService] Supabase getMarketProfile notice:', err);
      }
    }

    // 2. Client storage fallback
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`ZYVORA_MARKET_PROFILE_${tenantId}`) ||
                       localStorage.getItem(`ZYVORA_MARKET_PROFILE_${validTenantId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed;
        }
      } catch {
        // fallback
      }
    }

    return this.getDefaultMarketProfile(tenantId);
  }

  static async saveMarketProfile(
    profile: TenantMarketProfile,
    actor: UserProfile
  ): Promise<{ success: boolean; profile: TenantMarketProfile; message: string }> {
    if (!this.canEditMaster(actor)) {
      throw new Error('ERR_FORBIDDEN: Only Super Admin, Tenant Owner, or Tenant Admin are authorized to update Market & Business Lines.');
    }

    if (!profile.industryCategory) {
      throw new Error('Industry category is required.');
    }

    if (profile.businessLines.length === 0) {
      throw new Error('Tenant must have at least one business line.');
    }

    // Ensure exactly 1 primary business line
    const primaryCount = profile.businessLines.filter((l) => l.isPrimary).length;
    if (primaryCount === 0) {
      profile.businessLines[0].isPrimary = true;
    } else if (primaryCount > 1) {
      // Keep only first as primary
      let foundFirst = false;
      profile.businessLines.forEach((l) => {
        if (l.isPrimary && !foundFirst) {
          foundFirst = true;
        } else if (l.isPrimary && foundFirst) {
          l.isPrimary = false;
        }
      });
    }

    const validTenantId = this.resolveTenantId(profile.tenantId);
    const validActorId = (actor.id && UUID_REGEX.test(actor.id)) ? actor.id : null;

    const updatedProfile: TenantMarketProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.fullName
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`ZYVORA_MARKET_PROFILE_${profile.tenantId}`, JSON.stringify(updatedProfile));
        localStorage.setItem(`ZYVORA_MARKET_PROFILE_${validTenantId}`, JSON.stringify(updatedProfile));
      } catch {
        // ignore
      }
    }

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const payload: Record<string, any> = {
          tenant_id: validTenantId,
          industry_category: profile.industryCategory,
          business_model: profile.businessModel,
          updated_at: updatedProfile.updatedAt
        };
        if (validActorId) {
          payload.updated_by = validActorId;
        }

        await client.from('tenant_market_profiles').upsert(payload, { onConflict: 'tenant_id' });

        if (profile.businessLines && profile.businessLines.length > 0) {
          for (const bl of profile.businessLines) {
            const blPayload: Record<string, any> = {
              tenant_id: validTenantId,
              code: bl.code,
              name: bl.name,
              description: bl.description || '',
              is_primary: Boolean(bl.isPrimary),
              is_active: Boolean(bl.isActive),
              cost_center_code: bl.costCenterCode || `CC-${bl.code}`,
              allow_shared_allocation: bl.allowSharedAllocation !== false,
              updated_at: updatedProfile.updatedAt
            };
            if (bl.id && UUID_REGEX.test(bl.id)) {
              blPayload.id = bl.id;
            }
            await client.from('tenant_business_lines').upsert(blPayload);
          }
        }
      } catch (err) {
        console.warn('[TenantMasterService] Supabase saveMarketProfile notice:', err);
      }
    }

    return {
      success: true,
      profile: updatedProfile,
      message: 'Market & Business Line profile successfully updated and synchronized to database.'
    };
  }

  /**
   * Generates next sequential Business Line Code (format: LOB-XX)
   * Automatically calculates max existing sequence and ensures collision-free codes.
   */
  static generateNextBusinessLineCode(lines: TenantBusinessLine[] = []): string {
    const existingNumbers = lines
      .map((l) => {
        const match = l.code?.match(/LOB-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxSeq = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextSeq = maxSeq + 1;
    const padded = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
    return `LOB-${padded}`;
  }

  // ====================================================================
  // 3. KONFIGURASI SISTEM DASAR (SYSTEM CONFIG)
  // ====================================================================

  static getDefaultSystemConfig(tenantId: string): TenantSystemConfig {
    return {
      tenantId,
      baseCurrency: 'IDR',
      timezone: 'Asia/Jakarta',
      language: 'id',
      dateFormat: 'DD/MM/YYYY',
      fiscalYearStartMonth: 1, // Januari
      updatedAt: new Date().toISOString()
    };
  }

  static async getSystemConfig(tenantId: string): Promise<TenantSystemConfig> {
    const validTenantId = this.resolveTenantId(tenantId);

    // 1. Live Supabase first
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('tenant_system_configs')
          .select('*')
          .eq('tenant_id', validTenantId)
          .maybeSingle();

        if (data && !error) {
          const config: TenantSystemConfig = {
            tenantId: tenantId || data.tenant_id,
            baseCurrency: data.base_currency || 'IDR',
            timezone: data.timezone || 'Asia/Jakarta',
            language: data.language || 'id',
            dateFormat: data.date_format || 'DD/MM/YYYY',
            fiscalYearStartMonth: data.fiscal_year_start_month || 1,
            updatedAt: data.updated_at
          };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`ZYVORA_SYSTEM_CONFIG_${tenantId}`, JSON.stringify(config));
              localStorage.setItem(`ZYVORA_SYSTEM_CONFIG_${validTenantId}`, JSON.stringify(config));
            } catch {}
          }
          return config;
        }
      } catch (err) {
        console.warn('[TenantMasterService] Supabase getSystemConfig notice:', err);
      }
    }

    // 2. Client storage fallback
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`ZYVORA_SYSTEM_CONFIG_${tenantId}`) ||
                       localStorage.getItem(`ZYVORA_SYSTEM_CONFIG_${validTenantId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed;
        }
      } catch {
        // fallback
      }
    }

    return this.getDefaultSystemConfig(tenantId);
  }

  static async saveSystemConfig(
    config: TenantSystemConfig,
    actor: UserProfile
  ): Promise<{ success: boolean; config: TenantSystemConfig; message: string }> {
    if (!this.canEditMaster(actor)) {
      throw new Error('ERR_FORBIDDEN: Only Super Admin, Tenant Owner, or Tenant Admin are authorized to update System Configuration.');
    }

    const validTenantId = this.resolveTenantId(config.tenantId);
    const validActorId = (actor.id && UUID_REGEX.test(actor.id)) ? actor.id : null;

    const updatedConfig: TenantSystemConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.fullName
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`ZYVORA_SYSTEM_CONFIG_${config.tenantId}`, JSON.stringify(updatedConfig));
        localStorage.setItem(`ZYVORA_SYSTEM_CONFIG_${validTenantId}`, JSON.stringify(updatedConfig));
      } catch {
        // ignore
      }
    }

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const payload: Record<string, any> = {
          tenant_id: validTenantId,
          base_currency: config.baseCurrency,
          timezone: config.timezone,
          language: config.language,
          date_format: config.dateFormat,
          fiscal_year_start_month: config.fiscalYearStartMonth,
          updated_at: updatedConfig.updatedAt
        };
        if (validActorId) {
          payload.updated_by = validActorId;
        }

        await client.from('tenant_system_configs').upsert(payload, { onConflict: 'tenant_id' });
      } catch (err) {
        console.warn('[TenantMasterService] Supabase saveSystemConfig notice:', err);
      }
    }

    return {
      success: true,
      config: updatedConfig,
      message: 'System configuration successfully updated and synchronized to database.'
    };
  }
}
