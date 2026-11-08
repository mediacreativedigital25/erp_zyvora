import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Boxes,
  Wallet,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Receipt,
  CheckSquare,
  Database,
  Lock,
  ChevronDown,
  ChevronRight,
  Hexagon,
  Network,
  ShieldCheck,
  X,
  Building2,
  Globe,
  Sliders
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { NavGroup, SubmenuItem } from '../../config/navigation';

export const Sidebar: React.FC = () => {
  const {
    activeFeatureId,
    openAccordionId,
    setOpenAccordionId,
    navigateToFeature,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    tenant,
    companyProfile,
    isCurrentUserSuperAdmin,
    currentUser,
    navigationGroups
  } = useErp();

  const tenantDisplayName = companyProfile?.brandName || companyProfile?.legalName || tenant.name;

  // State to track open nested dropdowns (e.g., Master Data > Sales)
  const [openNestedIds, setOpenNestedIds] = useState<Record<string, boolean>>({ md_sales: false });

  const toggleNested = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenNestedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Close mobile sidebar drawer on Escape key
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSidebarOpen, setIsMobileSidebarOpen]);

  // Sync with desktop breakpoint: close mobile sidebar automatically if viewport is desktop (>= 1024px)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsMobileSidebarOpen(false);
      }
    };
    if (mediaQuery.matches && isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [isMobileSidebarOpen, setIsMobileSidebarOpen]);

  const handleTenantClick = () => {
    navigateToFeature('master_company_profile');
    setIsMobileSidebarOpen(false);
  };

  // Helper to render module icons
  const renderIcon = (iconName: string, className = 'w-4 h-4 shrink-0') => {
    switch (iconName) {
      case 'LayoutDashboard':
        return <LayoutDashboard className={className} />;
      case 'ShoppingBag':
        return <ShoppingBag className={className} />;
      case 'Truck':
        return <Truck className={className} />;
      case 'Boxes':
        return <Boxes className={className} />;
      case 'Wallet':
        return <Wallet className={className} />;
      case 'BookOpen':
        return <BookOpen className={className} />;
      case 'Users':
        return <Users className={className} />;
      case 'BarChart3':
        return <BarChart3 className={className} />;
      case 'Settings':
        return <Settings className={className} />;
      case 'Receipt':
        return <Receipt className={className} />;
      case 'CheckSquare':
        return <CheckSquare className={className} />;
      case 'Database':
        return <Database className={className} />;
      case 'Building2':
        return <Building2 className={className} />;
      case 'Globe':
        return <Globe className={className} />;
      case 'Sliders':
        return <Sliders className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Network':
        return <Network className={className} />;
      default:
        return <LayoutDashboard className={className} />;
    }
  };

  // Toggle accordion group
  const handleGroupClick = (group: NavGroup) => {
    if (group.isDirectLink) {
      navigateToFeature(group.id);
      return;
    }

    if (isSidebarCollapsed) {
      // If collapsed on desktop, expand sidebar and open this group
      setIsSidebarCollapsed(false);
      setOpenAccordionId(group.id);
      return;
    }

    // Toggle: if already open, close it; otherwise open this one (single open group rule)
    setOpenAccordionId((prev) => (prev === group.id ? null : group.id));
  };

  const handleSubmenuClick = (sub: SubmenuItem) => {
    if (sub.children && sub.children.length > 0) {
      toggleNested(sub.id);
      return;
    }

    // Guard: Item nonaktif tidak boleh menavigasi ke halaman bisnis atau memicu aksi
    if (!sub.isReady) {
      return;
    }

    navigateToFeature(sub.id);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#DCE5EC] select-none text-[#0F172A]">
      {/* Brand Header: Identitas Zyvora ERP */}
      <div
        className={`h-14 flex items-center border-b border-[#DCE5EC] bg-[#FFFFFF] transition-all duration-200 shrink-0 ${
          isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <div className={`flex items-center gap-2.5 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div
            className="w-8 h-8 rounded-lg bg-[#086288] text-white flex items-center justify-center shrink-0 shadow-xs border border-[#086288]/20"
            title="Zyvora Enterprise ERP"
          >
            <Hexagon className="w-4.5 h-4.5 fill-white/20 text-white" />
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-bold text-[#0F172A] tracking-tight truncate leading-tight">
                Zyvora
              </span>
              <span className="text-[10px] text-[#475569] font-semibold tracking-wider uppercase truncate">
                ENTERPRISE ERP
              </span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#EEF4F8] rounded-md transition-colors cursor-pointer"
          aria-label="Tutup Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Module Accordions */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1.5 custom-scrollbar" aria-label="Navigasi Utama">
        <div
          className={`px-2 pb-1 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider ${
            isSidebarCollapsed ? 'sr-only' : ''
          }`}
        >
          <span>Modul ERP</span>
        </div>

        {navigationGroups.map((group) => {
          const isDirect = !!group.isDirectLink;
          const isDirectActive = isDirect && activeFeatureId === group.id;
          const hasActiveChild =
            !isDirect &&
            group.items?.some(
              (item) =>
                item.id === activeFeatureId ||
                item.children?.some((child) => child.id === activeFeatureId)
            );
          const isOpen = openAccordionId === group.id;

          /* DIRECT LINK (e.g. Dashboard) */
          if (isDirect) {
            return (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group)}
                title={isSidebarCollapsed ? group.label : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left ${
                  isDirectActive
                    ? 'bg-[#EFF7FA] text-[#086288] font-semibold shadow-xs border border-[#B7DDEA]'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF4F8]'
                } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
              >
                <span
                  className={
                    isDirectActive ? 'text-[#086288]' : 'text-[#475569] group-hover:text-[#0F172A]'
                  }
                >
                  {renderIcon(group.iconName)}
                </span>
                {!isSidebarCollapsed && (
                  <span className="truncate flex-1">{group.label}</span>
                )}
              </button>
            );
          }

          /* ACCORDION MODULE */
          return (
            <div key={group.id} className="space-y-0.5">
              {/* Group Trigger Button */}
              <button
                onClick={() => handleGroupClick(group)}
                aria-expanded={isOpen}
                title={isSidebarCollapsed ? group.label : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left group ${
                  hasActiveChild && !isOpen
                    ? 'bg-[#EFF7FA]/60 text-[#086288] font-semibold'
                    : isOpen
                    ? 'text-[#0F172A] font-semibold bg-[#EEF4F8]'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF4F8]'
                } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
              >
                <span
                  className={`transition-colors ${
                    hasActiveChild || isOpen
                      ? 'text-[#086288]'
                      : 'text-[#475569] group-hover:text-[#0F172A]'
                  }`}
                >
                  {renderIcon(group.iconName)}
                </span>

                {!isSidebarCollapsed && (
                  <>
                    <span className="truncate flex-1">{group.label}</span>
                    <span className="text-[#94A3B8] group-hover:text-[#475569] transition-transform duration-200">
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </>
                )}
              </button>

              {/* Accordion Submenu Panel */}
              {!isSidebarCollapsed && isOpen && group.items && (
                <div
                  className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-[#DCE5EC] ml-4 transition-all duration-150"
                  role="region"
                  aria-label={`Submenu ${group.label}`}
                >
                  {group.items.map((sub, subIdx) => {
                    const hasChildren = Boolean(sub.children && sub.children.length > 0);
                    const isNestedOpen = Boolean(openNestedIds[sub.id]);

                    return (
                      <React.Fragment key={sub.id}>
                        {/* Internal display group subheader (e.g. within Human Resources) */}
                        {sub.groupHeader && (
                          <div
                            className={`px-2 py-1 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider ${
                              subIdx > 0 ? 'mt-2 pt-2 border-t border-[#EEF4F8]' : 'pt-1'
                            }`}
                          >
                            {sub.groupHeader}
                          </div>
                        )}

                        {/* NESTED DROPDOWN (e.g. Master Data > Sales) */}
                        {hasChildren ? (
                          <div className="space-y-0.5">
                            <button
                              type="button"
                              onClick={(e) => toggleNested(sub.id, e)}
                              aria-expanded={isNestedOpen}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer text-left text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF4F8]"
                            >
                              <span className="flex items-center gap-1.5 truncate mr-1.5">
                                <Lock className="w-3 h-3 text-[#94A3B8] shrink-0" />
                                <span className="truncate">{sub.label}</span>
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {sub.badge && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded border font-medium bg-[#F1F5F9] text-[#64748B] border-[#DCE5EC]">
                                    {sub.badge}
                                  </span>
                                )}
                                <span className="text-[#94A3B8]">
                                  {isNestedOpen ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </span>
                              </div>
                            </button>

                            {/* Nested Children (e.g. Customers) */}
                            {isNestedOpen && sub.children && (
                              <div
                                className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-[#CBD5E1] ml-3 transition-all duration-150"
                                role="region"
                                aria-label={`Submenu bertingkat ${sub.label}`}
                              >
                                {sub.children.map((child) => (
                                  <button
                                    key={child.id}
                                    type="button"
                                    disabled={!child.isReady && !isCurrentUserSuperAdmin}
                                    onClick={() => handleSubmenuClick(child)}
                                    title={
                                      !child.isReady
                                        ? isCurrentUserSuperAdmin
                                          ? 'Mode Pengujian Super Admin (Klik untuk membuka)'
                                          : 'Fitur dalam rancangan (Segera tersedia)'
                                        : undefined
                                    }
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                                      !child.isReady
                                        ? isCurrentUserSuperAdmin
                                          ? 'text-[#086288] hover:bg-[#EFF7FA] cursor-pointer'
                                          : 'text-[#64748B] hover:text-[#475569] hover:bg-[#F8FAFC] cursor-default'
                                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF4F8] cursor-pointer'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 truncate mr-1.5">
                                      {!child.isReady && (
                                        <Lock className="w-2.5 h-2.5 text-[#94A3B8] shrink-0" />
                                      )}
                                      <span className="truncate">{child.label}</span>
                                    </span>
                                    {child.badge && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded border font-medium shrink-0 bg-[#F1F5F9] text-[#64748B] border-[#DCE5EC]">
                                        {child.badge}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : !sub.isReady ? (
                          /* INACTIVE / DRAFT ITEM — Super Admin can click to test in sandbox */
                          <button
                            type="button"
                            disabled={!isCurrentUserSuperAdmin}
                            onClick={() => handleSubmenuClick(sub)}
                            title={
                              isCurrentUserSuperAdmin
                                ? 'Mode Pengujian Super Admin (Klik untuk membuka)'
                                : 'Fitur dalam rancangan (Segera tersedia)'
                            }
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                              isCurrentUserSuperAdmin
                                ? 'text-[#086288] hover:text-[#064B6A] hover:bg-[#EFF7FA] cursor-pointer'
                                : 'text-[#64748B] hover:text-[#475569] hover:bg-[#F8FAFC] cursor-default'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate mr-1.5">
                              <Lock className="w-3 h-3 text-[#94A3B8] shrink-0" />
                              <span className="truncate">{sub.label}</span>
                            </span>
                            {sub.badge && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded border font-medium shrink-0 bg-[#F1F5F9] text-[#64748B] border-[#DCE5EC]">
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        ) : (
                          /* ACTIVE OPERATIONAL SUBMENU ITEM (e.g. Setting Tenant, Pengguna dan Hak Akses) */
                          (() => {
                            const isSubActive = activeFeatureId === sub.id;
                            return (
                              <button
                                type="button"
                                onClick={() => handleSubmenuClick(sub)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left ${
                                  isSubActive
                                    ? 'bg-[#EFF7FA] text-[#086288] font-semibold shadow-2xs border border-[#B7DDEA]'
                                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF4F8]'
                                }`}
                              >
                                <span className="truncate mr-1.5">{sub.label}</span>
                                {sub.badge && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded border font-medium shrink-0 ${
                                      isSubActive
                                        ? 'bg-[#DCEEF5] text-[#086288] border-[#B7DDEA]'
                                        : 'bg-[#EEF4F8] text-[#475569] border-[#DCE5EC]'
                                    }`}
                                  >
                                    {sub.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })()
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Platform Super Admin Section — Only visible to Super Admin '2A' */}
        {isCurrentUserSuperAdmin && (
          <div className="pt-3 mt-3 border-t border-[#DCE5EC] space-y-1">
            <div
              className={`px-2 pb-1 text-[10px] font-bold text-[#086288] uppercase tracking-wider flex items-center justify-between ${
                isSidebarCollapsed ? 'sr-only' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#086288]" />
                <span>Super Admin</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] font-mono">
                {currentUser.userCode}
              </span>
            </div>

            {/* Submenu Daftar Tenant */}
            <button
              type="button"
              onClick={() => navigateToFeature('superadmin_tenants')}
              title={isSidebarCollapsed ? 'Daftar Tenant' : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left ${
                activeFeatureId === 'superadmin_tenants'
                  ? 'bg-[#EFF7FA] text-[#086288] font-semibold shadow-xs border border-[#B7DDEA]'
                  : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF4F8]'
              } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
            >
              <span
                className={
                  activeFeatureId === 'superadmin_tenants'
                    ? 'text-[#086288]'
                    : 'text-[#475569] group-hover:text-[#0F172A]'
                }
              >
                <Building2 className="w-4 h-4 shrink-0" />
              </span>
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate flex-1">Daftar Tenant</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded border font-medium bg-[#EFF7FA] text-[#086288] border-[#B7DDEA]">
                    Platform
                  </span>
                </>
              )}
            </button>

            {/* Submenu Pengguna Sistem Global */}
            <button
              type="button"
              onClick={() => navigateToFeature('superadmin_users')}
              title={isSidebarCollapsed ? 'Pengguna Sistem' : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left ${
                activeFeatureId === 'superadmin_users'
                  ? 'bg-[#EFF7FA] text-[#086288] font-semibold shadow-xs border border-[#B7DDEA]'
                  : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF4F8]'
              } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
            >
              <span
                className={
                  activeFeatureId === 'superadmin_users'
                    ? 'text-[#086288]'
                    : 'text-[#475569] group-hover:text-[#0F172A]'
                }
              >
                <Users className="w-4 h-4 shrink-0" />
              </span>
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate flex-1">Pengguna Sistem</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded border font-medium bg-[#EFF7FA] text-[#086288] border-[#B7DDEA]">
                    Global
                  </span>
                </>
              )}
            </button>

            {/* Submenu Koneksi */}
            <button
              type="button"
              onClick={() => navigateToFeature('superadmin_connections')}
              title={isSidebarCollapsed ? 'Koneksi' : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left ${
                activeFeatureId === 'superadmin_connections'
                  ? 'bg-[#EFF7FA] text-[#086288] font-semibold shadow-xs border border-[#B7DDEA]'
                  : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF4F8]'
              } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
            >
              <span
                className={
                  activeFeatureId === 'superadmin_connections'
                    ? 'text-[#086288]'
                    : 'text-[#475569] group-hover:text-[#0F172A]'
                }
              >
                <Network className="w-4 h-4 shrink-0" />
              </span>
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate flex-1">Koneksi</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded border font-medium bg-[#EFF7FA] text-[#086288] border-[#B7DDEA]">
                    Platform
                  </span>
                </>
              )}
            </button>

            {/* Submenu Manajemen Menu & Fitur */}
            <button
              type="button"
              onClick={() => navigateToFeature('superadmin_menu_governance')}
              title={isSidebarCollapsed ? 'Manajemen Menu & Fitur' : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left ${
                activeFeatureId === 'superadmin_menu_governance'
                  ? 'bg-[#EFF7FA] text-[#086288] font-semibold shadow-xs border border-[#B7DDEA]'
                  : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF4F8]'
              } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
            >
              <span
                className={
                  activeFeatureId === 'superadmin_menu_governance'
                    ? 'text-[#086288]'
                    : 'text-[#475569] group-hover:text-[#0F172A]'
                }
              >
                <Sliders className="w-4 h-4 shrink-0" />
              </span>
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate flex-1">Manajemen Menu</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded border font-medium bg-[#EFF7FA] text-[#086288] border-[#B7DDEA]">
                    Governance
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </nav>

      {/* Sederhanakan Tenant Identity Panel */}
      {!isSidebarCollapsed ? (
        <div className="p-3 border-t border-[#DCE5EC] bg-[#FFFFFF] shrink-0">
          <button
            type="button"
            onClick={handleTenantClick}
            className="w-full text-left p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F7FA] border border-[#DCE5EC] hover:border-[#086288]/40 transition-colors cursor-pointer group"
            title="Klik untuk membuka Profil Perusahaan"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-mono text-[#64748B] tracking-tight uppercase truncate">
                ID: {tenant.code}
              </span>
              <span className="text-[9px] font-semibold text-[#086288] bg-[#EFF7FA] px-1.5 py-0.5 rounded border border-[#B7DDEA] shrink-0">
                {tenant.plan.toUpperCase()}
              </span>
            </div>
            <div
              className="text-xs font-bold text-[#0F172A] group-hover:text-[#086288] transition-colors line-clamp-2 leading-snug"
              title={tenantDisplayName}
            >
              {tenantDisplayName}
            </div>
          </button>
        </div>
      ) : (
        /* Collapsed Mode indicator */
        <div className="p-2 border-t border-[#DCE5EC] bg-[#FFFFFF] flex justify-center shrink-0">
          <button
            type="button"
            onClick={handleTenantClick}
            className="w-9 h-9 rounded-lg bg-[#EFF7FA] hover:bg-[#DCEEF5] border border-[#B7DDEA] text-[#086288] flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
            title={`${tenantDisplayName} (${tenant.code}) • Paket: ${tenant.plan.toUpperCase()} — Buka Profil Perusahaan`}
            aria-label="Buka Profil Perusahaan"
          >
            {tenantDisplayName.substring(0, 2).toUpperCase()}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 transition-all duration-200 z-30 ${
          isSidebarCollapsed ? 'w-[68px]' : 'w-60 xl:w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:!hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Tutup Menu"
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
