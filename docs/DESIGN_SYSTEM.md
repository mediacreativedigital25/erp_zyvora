# ZYVORA ERP 1.0.0 — GLOBAL DESIGN SYSTEM SPECIFICATION

> **Governance Notice**: Documented and standardized under the governance of the Product Owner. Any alterations to tokens, typography, component geometry, or workspace patterns require direct Product Owner approval.

---

## 1. Design Philosophy

Zyvora ERP is an enterprise-grade platform built on the principles of **clarity, efficiency, visual calm, and ergonomic consistency**.
1. **Zero Aesthetic Bloat**: No decorative cards, superfluous drop shadows, or unrequested analytical widgets.
2. **Deterministic Layouts**: Every module follows an identical workspace structure so users develop immediate muscle memory.
3. **Accessibility & Contrast**: All interactive states (focus, hover, active, disabled) meet strict contrast standards with crisp border definitions.
4. **Single Source of Truth**: Styling is driven by centralized theme variables defined in `/src/index.css` and standard shared components in `/src/components/common/`.

---

## 2. Typography Specification

### Font Family
- **Primary Font**: `Inter`, sans-serif (imported via Google Fonts with weights 400, 500, 600, 700).
- **Fallback**: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- **Strict Rule**: No secondary or alternative font families may be introduced across the application.

### Typographic Scale & Hierarchy
| Role | Size | Weight | Line Height | CSS / Tailwind Class | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 24px (1.5rem) | 600 (Semibold) | 1.25 | `text-2xl font-semibold tracking-tight` | Header title in `PageHeader` |
| **Section Title** | 16px (1rem) | 600 (Semibold) | 1.4 | `text-base font-semibold text-slate-900` | Card header, modal header, form group section |
| **Body / Regular Text** | 14px (0.875rem) | 400 (Regular) | 1.5 | `text-sm font-normal text-slate-700` | Paragraphs, descriptions, table cells |
| **Menu & Labels** | 13–14px | 500 (Medium) | 1.4 | `text-sm font-medium text-slate-700` | Sidebar navigation, form labels, tab headers |
| **Table Content** | 13–14px | 400 / 500 | 1.4 | `text-sm text-slate-800` | Data grids, status tables |
| **Helper / Footnote** | 12–13px | 400 (Regular) | 1.4 | `text-xs text-slate-500` | Field helper text, timestamps, captions |
| **Button Text** | 13–14px | 500–600 | 1 | `text-sm font-medium` | Button labels, action items |

### Numeric Data (Tabular Numerals)
Financial figures, currency (IDR), quantities, balances, ledger amounts, and codes must use tabular numerals for perfect vertical column alignment:
```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

---

## 3. Centralized Color Tokens

All colors are centralized in `/src/index.css` and mapped to Tailwind theme tokens:

### Primary Brand Palette (Teal-Cyan Enterprise)
| Token Name | Hex Code | Utility / Description |
| :--- | :--- | :--- |
| **Primary** | `#086288` | Main action buttons, active navigation, key icons |
| **Primary Hover** | `#064B6A` | Hover state for primary buttons and interactive elements |
| **Primary Active** | `#043F59` | Active / pressed state for primary controls |
| **Primary Soft** | `#DCEEF5` | Light badge background, selected row highlight |
| **Primary Subtle**| `#EFF7FA` | Avatar backgrounds, icon container backgrounds |
| **Primary Border**| `#B7DDEA` | Borders on active/focused primary elements |

### Neutral & Surface Palette
| Token Name | Hex Code | Utility / Description |
| :--- | :--- | :--- |
| **App Background** | `#F8FAFC` (`slate-50`) | Global workspace backdrop |
| **Surface** | `#FFFFFF` | Cards, panels, modal dialogs, data tables |
| **Surface Alternate** | `#EEF4F8` | Table headers, secondary backdrops, sidebar hover |
| **Border** | `#DCE5EC` | Dividers, control borders, table borders |
| **Text Primary** | `#0F172A` (`slate-900`) | Main headings, primary values |
| **Text Secondary** | `#475569` (`slate-600`) | Body copy, secondary descriptions, labels |
| **Text Muted** | `#94A3B8` (`slate-400`) | Placeholder text, disabled labels, subtle icons |
| **Text Inverse** | `#FFFFFF` | Text on primary or dark backgrounds |

### Semantic Status Colors
| State | Hex Code | Soft Bg | Border | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | `#16A34A` | `#DCFCE7` | `#86EFAC` | Active status, verified, paid invoices |
| **Warning** | `#D97706` | `#FEF3C7` | `#FCD34D` | Draft, pending review, expiring credit |
| **Error** | `#DC2626` | `#FEE2E2` | `#FCA5A5` | Blocked, rejected, negative balance, destructive action |
| **Info** | `#0284C7` | `#E0F2FE` | `#7DD3FC` | System notices, audit logs, guidance |

---

## 4. Spacing, Dimensions & Geometry

### Control Heights & Radii
- **Button Height**: Standard `36px` to `40px` (`h-9` or `h-10`, `px-4`, `py-2`).
- **Input & Select Height**: Standard `38px` to `40px` (`h-[38px]` to `h-10`, `px-3`, `py-2`).
- **Control Border Radius**: `6px` to `8px` (`rounded-md` or `rounded-lg`).
- **Border Thickness**: `1px` solid throughout (`border border-[#DCE5EC]`).
- **Focus Rings**: `focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] focus:outline-none`.

### Layout Spacing
- **Gap between inline controls**: `8px` to `12px` (`space-x-2` or `gap-3`).
- **Gap between form fields**: `16px` (`space-y-4` or `gap-4`).
- **Gap between page sections**: `20px` to `24px` (`space-y-6` or `gap-6`).
- **Page content padding**: `24px` (`p-6`).

---

## 5. Global Workspace Standard

Every application page strictly implements the standardized layout flow:

```
+-----------------------------------------------------------------+
| Topbar (3 items: Logo/Tenant Icon [L], Notifications [R], Avatar [R])
+-----------------------------------------------------------------+
| [Breadcrumb] Module > Submodule                                 |
|                                                                 |
| [PageHeader]                                                    |
| Title                     [Secondary Action] [Primary Action]   |
| Description text                                                |
+-----------------------------------------------------------------+
| [PageToolbar] (Optional: Search, Filter, Date Range)           |
+-----------------------------------------------------------------+
| [Main Content Area]                                             |
| - If no records: [PageEmptyState]                               |
| - If records exist: [PageTable] with consistent columns         |
+-----------------------------------------------------------------+
| [Pagination] (When data set > page limit)                       |
+-----------------------------------------------------------------+
```

### Action Placement Rules
1. **Page-Level Primary Action**: Positioned at the top right of `PageHeader` (e.g., `+ Tambah Pelanggan`, `+ Buat Pesanan`).
2. **Page-Level Secondary Action**: Positioned immediately to the left of the primary action (e.g., `Ekspor Data`, `Import`).
3. **Form & Modal Actions**:
   - `Batal` (Secondary / Ghost): Bottom right, positioned to the left of the submit button.
   - `Simpan` / `Buat` / `Perbarui` (Primary): Bottom right corner.
4. **Destructive Actions**: Styled with Error semantic (`#DC2626`) and must trigger a `ConfirmDialog` before execution.

### Anti-Card Bloat Rules
- Do NOT wrap headers, breadcrumbs, search bars, and individual paragraphs in disconnected floating cards.
- The entire data view rests cleanly on a single unified surface with a crisp border (`bg-white border border-[#DCE5EC] rounded-lg`).
- Cards are reserved exclusively for grouping cohesive entity records (e.g., customer address panel, customer financial summary).

---

## 6. Topbar Specification

The topbar is intentionally minimal, containing exactly three functional elements:
1. **Left**: Sidebar Toggle Button (`w-9 h-9`, `#086288` hover, `PanelLeftClose`/`PanelLeftOpen` icon) with support for collapsing/expanding desktop sidebar and toggling mobile drawer.
   *(Replaced former building icon per Product Owner directive; brand logo and identity remain anchored at the top of the sidebar)*.
2. **Right**: Notification Bell (`h-9 w-9` click target, `#086288` hover, opens `NotificationDrawer` with zero mock noise).
3. **Right**: User Avatar (`h-9 w-9` circular container with user initials) with a clean dropdown containing **only**:
   - **Profil**: Notifies user of pending PO profile route.
   - **Logout**: Cleanly signs out from Supabase Auth (`supabase.auth.signOut()`), flushes session storage, and resets application state.

---

## 7. Modal Architecture

All modal dialogs extend the standard `BaseModal` (`/src/components/common/BaseModal.tsx`):
- **Sizes**:
  - `sm`: `max-w-[400px]` (Confirmations, simple prompts)
  - `md`: `max-w-[560px]` (Standard single-column entity forms)
  - `lg`: `max-w-[760px]` (Two-column master data forms, e.g., Customer Master)
  - `xl`: `max-w-[960px]` (Complex multi-line order & voucher entries)
- **Header**: Standard title + description + close button (`X`).
- **Body**: Scrollable with auto-overflow and consistent `p-6` padding.
- **Footer**: Sticky bottom bar with `border-t border-[#DCE5EC]`, Cancel button on the left, Primary Action button on the right.

---

## 8. Navigation & Tab Discipline

- The sidebar accordion is the canonical navigation structure.
- **Zero Duplicate Tabs**: In-page tab bars must not duplicate options already present in the sidebar accordion. Submodules are directly navigated via the sidebar, and the active feature is reflected in the Breadcrumb and PageHeader.
