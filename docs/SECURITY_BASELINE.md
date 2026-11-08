# ZYVORA ERP 1.0.0 — APPLICATION SECURITY BASELINE AUDIT

> **Classification**: Confidential — Internal Engineering & PO Governance  
> **Role**: Application Security Engineer & Senior ERP Architect  
> **Target**: Zyvora ERP 1.0.0 Frontend Foundation & Supabase Integration  
> **Audit Type**: Read-Only Security & Multi-Tenant Isolation Baseline  

---

## 1. Executive Summary

As part of the master foundation hardening for Zyvora ERP 1.0.0, a comprehensive read-only security audit was conducted. The audit focused on credential exposure, client-side cryptographic assumptions, authentication and session lifecycles, multi-tenant isolation barriers, and frontend injection vectors.

**Key Conclusion**: The application codebase is free of destructive migrations and exposes no private backend credentials (such as database passwords or Supabase `service_role` keys). However, because Supabase uses a public client `anon` key in browser applications, **the database's security boundary relies entirely on Postgres Row Level Security (RLS) policies**.

---

## 2. Secrets & Credentials Audit

### Static Code Analysis Findings
| Target File | Finding / Credential | Type | Risk Level | Assessment & Status |
| :--- | :--- | :--- | :--- | :--- |
| `/src/services/supabaseClient.ts` | `nfjucyabfiqlmrxnviuz.supabase.co` | Supabase Project URL | Low (Informational) | Publicly reachable gateway. Valid. |
| `/src/services/supabaseClient.ts` | `DEFAULT_SUPABASE_ANON_KEY` | Public Anon JWT | Low (Informational) | Standard client-side publishable key. |
| Whole Repo (`/src/**`, `/docs/**`) | Database Master Password | N/A | None | **Zero occurrences found.** |
| Whole Repo (`/src/**`, `/docs/**`) | `service_role` Secret Key | N/A | None | **Zero occurrences found.** |
| Whole Repo (`/src/**`, `/docs/**`) | Third-Party API Secrets | N/A | None | **Zero occurrences found.** |

### Analysis of the Public `anon` Key
- In Supabase architecture, the `anon` key is designed to be bundled into the browser client. It has no administrative permissions on Postgres tables unless explicitly granted via RLS policies.
- **Risk Mitigation**: The application prefers runtime environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. For production deployments, project administrators must configure these in the hosting dashboard.

---

## 3. Client vs. Server Role Separation

```
[ BROWSER CLIENT (Zyvora ERP) ]
        |
        |  Calls with 'anon' key + User Bearer JWT
        v
[ SUPABASE GATEWAY / POSTGREST ]
        |
        |  Evaluates Postgres Row Level Security (RLS)
        v
[ POSTGRESQL MULTI-TENANT DATABASE ]
```

### Critical Rules
1. **Never import `service_role` in Vite**: Vite bundles all imported code into public JS assets. Any service role key placed in client code grants full bypass of RLS policies to any user who inspects network tabs.
2. **Deterministic RLS Enforcement**: Every table created in PostgreSQL (`tenants`, `customers`, `sales_orders`, `journal_entries`, etc.) MUST have `ENABLE ROW LEVEL SECURITY` enabled.
3. **Fail-Safe Default**: If an RLS policy is omitted or misspelled on a table, Postgres defaults to returning 0 rows to `anon`/`authenticated` roles.

---

## 4. Multi-Tenant Isolation Analysis

Zyvora ERP implements an enterprise multi-tenant hierarchy:
```
Tenant (Company / PT)
  └── BusinessUnit (Division / SBU)
        └── Branch (Cabang Operasional)
              └── Warehouse (Gudang Fisik)
```

### Current Status in Frontend
- State isolation is currently maintained in `ErpContext.tsx` via `tenant.id`, `activeBusinessUnit.id`, and `activeBranch.id`.
- Entity creation methods (`createCustomer`, `createSalesOrder`, etc.) automatically inject the immutable active `tenantId`.

### Database Multi-Tenant Enforcement Requirements
To prevent cross-tenant data leakage (Tenant A inspecting Tenant B's customers or financials):
1. **Tenant ID Column**: Every operational table must possess a non-nullable `tenant_id UUID REFERENCES tenants(id)`.
2. **RLS Policy Template**:
   ```sql
   -- Standard Multi-Tenant Isolation Policy
   CREATE POLICY tenant_isolation_policy ON customers
     FOR ALL
     USING (
       tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
     )
     WITH CHECK (
       tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
     );
   ```
3. **Immutable Tenant Identifier**: `tenant_id` must never be modifiable via `UPDATE` statements from client sessions.

---

## 5. Authentication & Session Lifecycle

### User Sign-in & Token Management
- Supabase Auth manages access tokens (`access_token`) and refresh tokens (`refresh_token`) securely.
- In iframe / preview environments, token persistence uses `localStorage` with fallback handling to avoid third-party cookie blocking.

### Logout & Session Evacuation
- The topbar User Avatar menu provides a clean **Logout** action.
- Executing Logout:
  1. Calls `supabase.auth.signOut()`.
  2. Clears browser local/session storage keys prefixed with `sb-`.
  3. Resets in-memory ERP application state.
  4. Prevents stale session reuse or authorization replay.

---

## 6. Input Validation & Injection Hardening

### A. Customer Code Injection Defense
- Validated via strict regex: `^[A-Z0-9]{5}$`.
- Disallows SQL metacharacters (`'`, `"`, `;`, `--`), control characters, and length deviations.
- Auto-uppercase conversion ensures predictable database indexing.

### B. Transaction Sequences
- Enforced canonical pattern: `PREFIX-YYYYMM-XXXXXX` (e.g. `SO-202610-000105`).
- Strictly rejects client-tampered ID numbering.

### C. Cross-Site Scripting (XSS) Prevention
- React JSX automatically escapes dynamic values rendered in the DOM.
- No instances of `dangerouslySetInnerHTML` are used across the codebase.
- Form inputs in `CustomerFormModal` and other dialogs sanitize whitespace and enforce explicit typing.

---

## 7. Product Owner Security Recommendations

Before enabling live financial transactions and production multi-user registration, the following roadmap is recommended for Product Owner approval:

1. **PostgreSQL RLS Deployment**:
   - Ensure migration scripts execute `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` on all production tables.
2. **Tenant Claim Injection**:
   - Configure a Supabase Auth hook or Postgres trigger to embed `tenant_id` and `user_role` directly into the user's JWT `app_metadata` upon login.
3. **Audit Logging**:
   - Record immutable audit logs (`audit_logs` table) for all destructive operations (customer deletion, credit limit modifications, manual journal entries).
4. **Environment Variables**:
   - Rotate any staging Supabase keys and ensure production keys are injected exclusively via environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
