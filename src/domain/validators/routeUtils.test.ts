/**
 * Zyvora ERP 1.0.0 — Route & Clean URL Synchronization Tests
 */

import {
  FEATURE_TO_PATH_MAP,
  PATH_TO_ROUTE_MAP,
  getPathForFeature,
  getRouteFromPath
} from '../../utils/routeUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  PASS: ${message}`);
}

console.log('======================================================');
console.log('ZYVORA ERP 1.0.0 — CLEAN URL ROUTING TESTS');
console.log('======================================================\n');

// 1. Path Resolution from Feature ID
console.log('[TEST GROUP 1] Feature ID to Clean Path');
assert(getPathForFeature('dashboard') === '/', 'Dashboard resolves to /');
assert(getPathForFeature('sales_customers') === '/sales/customers', 'Sales Customers resolves to /sales/customers');
assert(getPathForFeature('sales_order_service') === '/sales/orders', 'Sales Orders resolves to /sales/orders');
assert(getPathForFeature('master_company_profile') === '/master/company-profile', 'Company Profile resolves to /master/company-profile');
assert(getPathForFeature('inv_list_product') === '/inventory/products', 'Inventory Products resolves to /inventory/products');
assert(getPathForFeature('ar_receive_payment') === '/account-receivable/receive-payment', 'Receive Payment resolves to /account-receivable/receive-payment');

// 2. Route Matching from URL Pathname
console.log('\n[TEST GROUP 2] URL Pathname to Feature & Module');
const home = getRouteFromPath('/');
assert(home !== null && home.module === 'dashboard' && home.featureId === 'dashboard', 'Root / resolves to dashboard');

const salesCust = getRouteFromPath('/sales/customers');
assert(salesCust !== null && salesCust.module === 'sales' && salesCust.featureId === 'sales_customers', '/sales/customers resolves to sales_customers');

const companyProf = getRouteFromPath('/master/company-profile');
assert(companyProf !== null && companyProf.module === 'master_data' && companyProf.featureId === 'master_company_profile', '/master/company-profile resolves to master_company_profile');

const trailingSlash = getRouteFromPath('/master/company-profile/');
assert(trailingSlash !== null && trailingSlash.featureId === 'master_company_profile', 'Trailing slash handled gracefully');

const uppercasePath = getRouteFromPath('/Sales/Orders');
assert(uppercasePath !== null && uppercasePath.module === 'sales', 'Case insensitive path resolution passes');

const prefixFallback = getRouteFromPath('/sales');
assert(prefixFallback !== null && prefixFallback.module === 'sales', 'Root module prefix /sales resolves to sales workspace');

console.log('\n======================================================');
console.log('ALL CLEAN URL TESTS PASSED (100%)');
console.log('======================================================');
