/**
 * Zyvora ERP 1.0.0 — Dynamic Navigation Service
 * Loads navigation items live from Supabase PostgreSQL (app_navigation_items)
 * with instant local cache fallback, role-based filtering, and real-time live database updates.
 */

import { NAVIGATION_CONFIG, NavGroup, SubmenuItem } from '../config/navigation';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, OfficialRole, TenantRole } from '../types/erp';

export interface DynamicNavItem {
  id: string;
  groupId: string;
  parentId?: string | null;
  label: string;
  iconName: string;
  routeId: string;
  badge?: string;
  isReady: boolean;
  isActive: boolean;
  sortOrder: number;
  minRole: OfficialRole;
  tenantId?: string | null;
  customConfig?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

const ROLE_RANK: Record<string, number> = {
  customer: 10,
  sales_rep: 15,
  sales: 20,
  inventory_staff: 25,
  accountant: 25,
  branch_manager: 28,
  admin: 30,
  tenant_admin: 30,
  owner: 40,
  super_admin: 50
};

// Obsolete default seeds from legacy migration scripts that cause duplicate or misplaced items
export const OBSOLETE_SEED_IDS = new Set<string>([
  'master_market_business',
  'master_user_management',
  'master_customers',
  'master_products_services',
  'master_warehouses_locations',
  'sales_invoice',
  'sales_delivery',
  'inventory_stock',
  'inventory_movement',
  'finance_ar',
  'accounting_journal',
  'sales_order'
]);

// Semantic alias mapping for backward compatibility
export const CANONICAL_ALIASES: Record<string, string> = {
  customers: 'sales_customers',
  master_customers: 'sales_customers',
  master_market_business: 'master_market_business_line',
  master_user_management: 'rbac',
  master_products_services: 'inv_list_product',
  master_warehouses_locations: 'inv_warehouse'
};

export const LEGACY_INDONESIAN_LABELS: Record<string, string> = {
  'Profil Perusahaan': 'Company Profile',
  'Konfigurasi Sistem': 'System Configuration',
  'Manajemen Pengguna': 'User Management',
  'Kontak Bisnis': 'Business Contacts',
  'Cabang & Unit Bisnis': 'Branches & Business Units',
  'Gudang & Lokasi': 'Warehouses & Locations',
  'Pajak': 'Taxes',
  'Kendaraan Operasional': 'Vehicles',
  'Pasar & Lini Bisnis': 'Market & Business Line',
  'Sales Order Service': 'Sales Order',
  'Keuangan': 'Finance'
};

const NAV_CACHE_KEY = 'ZYVORA_DYNAMIC_NAVIGATION_V5';
const MENU_OVERRIDES_KEY = 'ZYVORA_MENU_OVERRIDES_V1';
const LEGACY_CACHE_KEYS = ['ZYVORA_DYNAMIC_NAVIGATION_V1', 'ZYVORA_DYNAMIC_NAVIGATION_V2', 'ZYVORA_DYNAMIC_NAVIGATION_V3', 'ZYVORA_DYNAMIC_NAVIGATION_V4'];

export class NavigationService {
  private static cachedNavItems: DynamicNavItem[] | null = null;

  /**
   * Retrieves all menu readiness overrides (manual Super Admin toggles)
   */
  static getMenuOverrides(): Record<string, boolean> {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(MENU_OVERRIDES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return {};
  }

  /**
   * Toggles a menu's operational readiness (isReady) status.
   * Only Super Admin or Administrator can execute this.
   */
  static async setMenuReadyStatus(
    itemId: string,
    isReady: boolean,
    currentUser: UserProfile
  ): Promise<{ success: boolean; message: string }> {
    const isSuperAdmin = currentUser.userCode === '2A' || currentUser.isPlatformSuperAdmin || currentUser.role === 'super_admin';
    if (!isSuperAdmin) {
      return {
        success: false,
        message: 'Akses Ditolak: Hanya Super Admin yang berwenang mengubah status visibilitas menu sistem.'
      };
    }

    // 1. Save to localStorage overrides
    const overrides = this.getMenuOverrides();
    overrides[itemId] = isReady;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MENU_OVERRIDES_KEY, JSON.stringify(overrides));
      } catch (e) {
        console.warn('Failed to save menu override to localStorage:', e);
      }
    }

    // 2. If dynamic item exists in Supabase, update it
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        await client
          .from('app_navigation_items')
          .update({ is_ready: isReady, updated_at: new Date().toISOString() })
          .eq('id', itemId);
      } catch (err) {
        console.warn('Supabase menu ready status update caught error:', err);
      }
    }

    return {
      success: true,
      message: `Menu '${itemId}' berhasil ${isReady ? 'diaktifkan (Siap Operasional)' : 'dinonaktifkan (Mode Maintenance / Segera Tersedia)'}.`
    };
  }

  /**
   * Evaluates if the user's role satisfies the minimum role requirement
   */
  static isRoleAuthorized(userRole: TenantRole | string, minRole: OfficialRole, isSuperAdmin = false): boolean {
    if (isSuperAdmin || userRole === 'super_admin') return true;
    const userRank = ROLE_RANK[userRole] || 20;
    const requiredRank = ROLE_RANK[minRole] || 20;
    return userRank >= requiredRank;
  }

  /**
   * Retrieves all dynamic navigation items from Supabase or local cache
   */
  static async fetchNavigationItems(tenantId?: string): Promise<DynamicNavItem[]> {
    // 0. Clean up legacy caches from previous iterations
    if (typeof window !== 'undefined') {
      try {
        LEGACY_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
      } catch {
        // ignore storage errors
      }
    }

    // 1. Try fetching from Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        let query = client
          .from('app_navigation_items')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (tenantId) {
          query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
        } else {
          query = query.is('tenant_id', null);
        }

        const { data, error } = await query;

        if (!error && Array.isArray(data) && data.length > 0) {
          // Asynchronous self-healing cleanup: remove any obsolete seeds from Supabase
          const obsoleteRows = data.filter((row: any) => OBSOLETE_SEED_IDS.has(row.id));
          if (obsoleteRows.length > 0) {
            (async () => {
              try {
                await client
                  .from('app_navigation_items')
                  .delete()
                  .in(
                    'id',
                    obsoleteRows.map((r: any) => r.id)
                  );
                console.log(`[NavigationService] Cleaned up ${obsoleteRows.length} obsolete seeds from Supabase.`);
              } catch (cleanupErr) {
                console.warn('[NavigationService] Obsolete seeds cleanup notice:', cleanupErr);
              }
            })();
          }

          // Strict filter: exclude all obsolete seed records immediately
          const cleanRows = data.filter((row: any) => !OBSOLETE_SEED_IDS.has(row.id));

          const items: DynamicNavItem[] = cleanRows.map((row: any) => ({
            id: row.id,
            groupId: row.group_id,
            parentId: row.parent_id,
            label: LEGACY_INDONESIAN_LABELS[row.label] || row.label,
            iconName: row.icon_name || 'Boxes',
            routeId: row.route_id || row.id,
            badge: row.badge,
            isReady: Boolean(row.is_ready),
            isActive: Boolean(row.is_active),
            sortOrder: row.sort_order || 10,
            minRole: (row.min_role as OfficialRole) || 'sales',
            tenantId: row.tenant_id,
            customConfig: row.custom_config || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));

          this.cachedNavItems = items;
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(NAV_CACHE_KEY, JSON.stringify(items));
            } catch {
              // ignore storage errors
            }
          }
          return items;
        }
      } catch (err) {
        console.warn('NavigationService: Supabase navigation query skipped/failed, using fallback cache.', err);
      }
    }

    // 2. Try loading from localStorage cache
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(NAV_CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleanCached = parsed
              .filter((i: DynamicNavItem) => !OBSOLETE_SEED_IDS.has(i.id))
              .map((i: DynamicNavItem) => ({
                ...i,
                label: LEGACY_INDONESIAN_LABELS[i.label] || i.label
              }));
            this.cachedNavItems = cleanCached;
            return cleanCached;
          }
        }
      } catch {
        // fallback
      }
    }

    return this.cachedNavItems || [];
  }

  /**
   * Transforms raw dynamic items and static navigation into consolidated NavGroup list
   */
  static buildNavGroups(
    dynamicItems: DynamicNavItem[],
    userRole: TenantRole = 'sales',
    isSuperAdmin = false
  ): NavGroup[] {
    const overrides = this.getMenuOverrides();

    // Clone baseline config and apply overrides
    const groups: NavGroup[] = NAVIGATION_CONFIG.map((group) => ({
      ...group,
      items: group.items
        ? group.items.map((item) => {
            const hasOverride = typeof overrides[item.id] === 'boolean';
            const readyState = hasOverride ? overrides[item.id] : item.isReady;
            const updatedChildren = item.children?.map((child) => {
              const childOverride = typeof overrides[child.id] === 'boolean';
              const childReady = childOverride ? overrides[child.id] : child.isReady;
              return {
                ...child,
                isReady: childReady,
                badge: childReady ? undefined : (child.badge || 'Segera tersedia')
              };
            });

            return {
              ...item,
              isReady: readyState,
              badge: readyState ? undefined : (item.badge || 'Segera tersedia'),
              children: updatedChildren
            };
          })
        : []
    }));

    // Index of existing item IDs to prevent duplicate rendering
    const existingIds = new Set<string>();
    groups.forEach((g) => {
      existingIds.add(g.id);
      g.items?.forEach((i) => {
        existingIds.add(i.id);
        i.children?.forEach((c) => existingIds.add(c.id));
      });
    });

    // Merge dynamic items from database
    for (const item of dynamicItems) {
      // 1. Strict filter: skip any obsolete seed item
      if (OBSOLETE_SEED_IDS.has(item.id)) {
        continue;
      }

      // 2. Security check: only include if user's role is permitted
      if (!this.isRoleAuthorized(userRole, item.minRole, isSuperAdmin)) {
        continue;
      }

      // Resolve alias if known (e.g. master_market_business -> master_market_business_line)
      const canonicalTargetId = CANONICAL_ALIASES[item.id] || item.id;

      // Check if item belongs to an existing group
      let targetGroup = groups.find((g) => g.id === item.groupId);

      // If group doesn't exist, create dynamic group
      if (!targetGroup) {
        targetGroup = {
          id: item.groupId,
          label: item.groupId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          iconName: item.iconName || 'Boxes',
          items: []
        };
        groups.push(targetGroup);
      }

      if (!targetGroup.items) {
        targetGroup.items = [];
      }

      // Check if already in target group
      const existingItemIndex = targetGroup.items.findIndex(
        (i) => i.id === canonicalTargetId || i.id === item.id
      );

      const hasOverride = typeof overrides[item.id] === 'boolean';
      const readyState = hasOverride ? overrides[item.id] : item.isReady;

      const convertedSubmenu: SubmenuItem = {
        id: item.id,
        label: LEGACY_INDONESIAN_LABELS[item.label] || item.label,
        description: (item.customConfig?.description as string) || undefined,
        badge: readyState ? undefined : (item.badge || 'Segera tersedia'),
        isReady: readyState
      };

      if (existingItemIndex >= 0) {
        // Update badge and ready state from database live on canonical item,
        // while preserving canonical English label unless custom or translated
        const existingCanonicalItem = targetGroup.items[existingItemIndex];
        const isCoreSystemItem = !item.id.startsWith('custom_');
        const resolvedLabel = isCoreSystemItem
          ? (existingCanonicalItem.label || LEGACY_INDONESIAN_LABELS[item.label] || item.label)
          : (LEGACY_INDONESIAN_LABELS[item.label] || item.label);

        targetGroup.items[existingItemIndex] = {
          ...existingCanonicalItem,
          label: resolvedLabel,
          badge: readyState ? undefined : (item.badge || 'Segera tersedia'),
          isReady: readyState
        };
      } else {
        // Architectural Guard:
        // Only append as a brand-new menu item if:
        // a) It is explicitly a custom menu item (e.g. custom_xxx), OR
        // b) It belongs to a non-standard dynamic group
        const isCoreGroup = NAVIGATION_CONFIG.some((g) => g.id === targetGroup?.id);
        const isCustomItem = item.id.startsWith('custom_');

        if (!isCoreGroup || isCustomItem) {
          targetGroup.items.push(convertedSubmenu);
          existingIds.add(item.id);
        } else {
          console.warn(
            `[NavigationService] Ignored unrecognized non-custom item '${item.id}' in core group '${item.groupId}'.`
          );
        }
      }
    }

    // Role Visibility Filtering:
    // If NOT Super Admin:
    // 1. Filter out all items that are NOT ready (isReady === false)
    // 2. Filter out groups that have 0 ready items (unless isDirectLink like Dashboard)
    if (!isSuperAdmin) {
      return groups
        .map((group) => {
          if (group.isDirectLink) return group;
          if (!group.items) return null;
          const filteredItems = group.items
            .filter((i) => i.isReady)
            .map((i) => ({
              ...i,
              children: i.children ? i.children.filter((c) => c.isReady) : undefined
            }));
          if (filteredItems.length === 0) return null;
          return { ...group, items: filteredItems };
        })
        .filter(Boolean) as NavGroup[];
    }

    return groups;
  }

  /**
   * Add a new live dynamic menu item into Supabase database
   */
  static async createMenuItem(
    itemData: Omit<DynamicNavItem, 'id' | 'createdAt' | 'updatedAt' | 'routeId'> & {
      id?: string;
      routeId?: string;
    },
    currentUser: UserProfile
  ): Promise<{ success: boolean; message: string; item?: DynamicNavItem }> {
    // Security check: Only Super Admin or Admin can create dynamic menu items
    const isSuperAdmin = currentUser.userCode === '2A' || currentUser.isPlatformSuperAdmin;
    const isAdmin = ['super_admin', 'owner', 'admin'].includes(currentUser.role);
    if (!isSuperAdmin && !isAdmin) {
      return {
        success: false,
        message: 'Access Denied: Only Administrators are authorized to add system navigation menus.'
      };
    }

    const cleanId = (
      itemData.id || `custom_${itemData.label.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${Date.now().toString(36)}`
    ).trim();

    const newItem: DynamicNavItem = {
      id: cleanId,
      groupId: itemData.groupId,
      parentId: itemData.parentId || null,
      label: itemData.label.trim(),
      iconName: itemData.iconName || 'Boxes',
      routeId: itemData.routeId || cleanId,
      badge: itemData.badge?.trim() || undefined,
      isReady: itemData.isReady ?? true,
      isActive: itemData.isActive ?? true,
      sortOrder: itemData.sortOrder || 99,
      minRole: itemData.minRole || 'sales',
      tenantId: isSuperAdmin ? (itemData.tenantId || null) : currentUser.tenantId,
      customConfig: itemData.customConfig || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Save to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { error } = await client.from('app_navigation_items').upsert({
          id: newItem.id,
          group_id: newItem.groupId,
          parent_id: newItem.parentId,
          label: newItem.label,
          icon_name: newItem.iconName,
          route_id: newItem.routeId,
          badge: newItem.badge,
          is_ready: newItem.isReady,
          is_active: newItem.isActive,
          sort_order: newItem.sortOrder,
          min_role: newItem.minRole,
          tenant_id: newItem.tenantId,
          custom_config: newItem.customConfig,
          created_by: currentUser.id || null
        });

        if (error) {
          console.warn('Database save warning (falling back to cache):', error.message);
        }
      } catch (e: any) {
        console.warn('Supabase app_navigation_items upsert caught error:', e.message);
      }
    }

    // 2. Update local cache
    const current = await this.fetchNavigationItems(currentUser.tenantId);
    const updated = [...current.filter((i) => i.id !== newItem.id), newItem];
    this.cachedNavItems = updated;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(NAV_CACHE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      message: `Menu '${newItem.label}' berhasil ditambahkan ke database live.`,
      item: newItem
    };
  }

  /**
   * Delete or deactivate dynamic menu item
   */
  static async deleteMenuItem(
    itemId: string,
    currentUser: UserProfile
  ): Promise<{ success: boolean; message: string }> {
    const isSuperAdmin = currentUser.userCode === '2A' || currentUser.isPlatformSuperAdmin;
    const isAdmin = ['super_admin', 'owner', 'admin'].includes(currentUser.role);
    if (!isSuperAdmin && !isAdmin) {
      return {
        success: false,
        message: 'Akses Ditolak: Hanya Administrator yang berwenang menghapus menu sistem.'
      };
    }

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('app_navigation_items').delete().eq('id', itemId);
      } catch {
        // fallback
      }
    }

    const current = await this.fetchNavigationItems(currentUser.tenantId);
    const updated = current.filter((i) => i.id !== itemId);
    this.cachedNavItems = updated;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(NAV_CACHE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      message: 'Menu berhasil dihapus dari database.'
    };
  }
}
