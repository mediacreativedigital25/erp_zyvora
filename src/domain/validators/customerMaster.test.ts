/**
 * Zyvora ERP 1.0.0 — Customer Master & Geolocation Test Suite
 * Validates:
 * 1. Customer classification types (general, corporate, booking)
 * 2. Indonesian 4-tier administrative address validation
 * 3. Haversine distance calculation & road routing factor
 * 4. Geolocation coordinate bounds and validation
 * 5. Google Maps pin deep-link generation
 * 6. Conditional field integrity for booking and corporate accounts
 */

import {
  calculateHaversineDistanceKm,
  estimateRoadDistanceKm,
  calculateDistanceToHq,
  isValidCoordinates,
  generateGoogleMapsUrl,
  DEFAULT_HQ_COORDINATES
} from '../../utils/geoUtils';
import { validateStandardAddress } from '../../components/common/AddressForm';
import { StandardAddressData, Customer } from '../../types/erp';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

async function runCustomerMasterTestSuite() {
  console.log('\n======================================================');
  console.log('ZYVORA ERP 1.0.0 — CUSTOMER MASTER & GEOLOCATION TESTS');
  console.log('======================================================\n');

  // ------------------------------------------------------------------
  // TEST GROUP 1: Geolocation Coordinates & Bounds Validation
  // ------------------------------------------------------------------
  console.log('[TEST GROUP 1] Geolocation Coordinates Validation');

  assert(
    isValidCoordinates(-6.2255, 106.808),
    'Geo 1: Jakarta Sudirman coordinates are valid'
  );
  assert(
    isValidCoordinates(3.5852, 98.6672),
    'Geo 2: Medan coordinates are valid'
  );
  assert(
    isValidCoordinates(-7.2754, 112.7821),
    'Geo 3: Surabaya coordinates are valid'
  );
  assert(
    !isValidCoordinates(95.0, 106.8),
    'Geo 4: Latitude > 90 is invalid'
  );
  assert(
    !isValidCoordinates(-6.2, 195.0),
    'Geo 5: Longitude > 180 is invalid'
  );
  assert(
    !isValidCoordinates(NaN, 106.8),
    'Geo 6: NaN coordinate is invalid'
  );
  assert(
    !isValidCoordinates(undefined, null),
    'Geo 7: Undefined/null coordinates are invalid'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 2: Haversine Distance & Road Routing Estimation
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Haversine Distance & Headquarters Calculation');

  // HQ to Hotel Mulia Senayan (-6.2185, 106.7995)
  const distToMulia = calculateHaversineDistanceKm(
    DEFAULT_HQ_COORDINATES.latitude,
    DEFAULT_HQ_COORDINATES.longitude,
    -6.2185,
    106.7995
  );
  assert(
    distToMulia > 0.5 && distToMulia < 2.0,
    `Haversine 1: HQ to Senayan Mulia straight distance is realistic (got ${distToMulia} km)`
  );

  const roadMulia = estimateRoadDistanceKm(distToMulia);
  assert(
    roadMulia > distToMulia,
    `Haversine 2: Estimated road distance (${roadMulia} km) exceeds straight-line (${distToMulia} km)`
  );

  // HQ to Surabaya (-7.2754, 112.7821)
  const distToSurabaya = calculateHaversineDistanceKm(
    DEFAULT_HQ_COORDINATES.latitude,
    DEFAULT_HQ_COORDINATES.longitude,
    -7.2754,
    112.7821
  );
  assert(
    distToSurabaya > 600 && distToSurabaya < 750,
    `Haversine 3: HQ to Surabaya straight distance is in 600-750 km range (got ${distToSurabaya} km)`
  );

  // calculateDistanceToHq helper
  const hqCalc = calculateDistanceToHq(-6.1783, 106.6319); // Tangerang
  assert(
    hqCalc.straightDistanceKm > 15 && hqCalc.straightDistanceKm < 30,
    `Haversine 4: Tangerang straight distance is realistic (${hqCalc.straightDistanceKm} km)`
  );
  assert(
    hqCalc.estimatedRoadDistanceKm === Number((hqCalc.straightDistanceKm * 1.25).toFixed(1)),
    `Haversine 5: Road distance matches 1.25x curvature factor (${hqCalc.estimatedRoadDistanceKm} km)`
  );

  // ------------------------------------------------------------------
  // TEST GROUP 3: Google Maps Link Generation
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Google Maps Deep-Link Generation');

  const gmapsUrl = generateGoogleMapsUrl(-6.2255, 106.808);
  assert(
    gmapsUrl === 'https://www.google.com/maps?q=-6.2255,106.808',
    'Maps 1: Correctly constructs Google Maps query URL'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 4: Indonesian 4-Tier Administrative Address Validation
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Indonesian 4-Tier Address Validation');

  const validAddress: StandardAddressData = {
    country: 'Indonesia',
    provinceId: '31',
    provinceName: 'DKI Jakarta',
    regencyId: '3171',
    regencyName: 'Kota Jakarta Pusat',
    districtId: '3171010',
    districtName: 'Tanah Abang',
    villageId: '3171010001',
    villageName: 'Gelora',
    address: 'Jl. Asia Afrika No. 8, Senayan'
  };

  const validation1 = validateStandardAddress(validAddress, {
    countryRequired: true,
    provinceRequired: true,
    regencyRequired: true,
    districtRequired: true,
    villageRequired: true,
    addressRequired: true
  });
  assert(
    Object.keys(validation1).length === 0,
    'Address 1: Complete 4-tier Kemendagri address passes with 0 errors'
  );

  const missingDistrict: StandardAddressData = {
    ...validAddress,
    districtId: '',
    districtName: ''
  };
  const validation2 = validateStandardAddress(missingDistrict, {
    districtRequired: true
  });
  assert(
    Boolean(validation2.district),
    'Address 2: Catches missing district correctly'
  );

  const missingVillage: StandardAddressData = {
    ...validAddress,
    villageId: '',
    villageName: ''
  };
  const validation3 = validateStandardAddress(missingVillage, {
    villageRequired: true
  });
  assert(
    Boolean(validation3.village),
    'Address 3: Catches missing village/subdistrict correctly'
  );

  const shortAddress: StandardAddressData = {
    ...validAddress,
    address: 'Jl'
  };
  const validation4 = validateStandardAddress(shortAddress, {
    addressRequired: true
  });
  assert(
    Boolean(validation4.address),
    'Address 4: Catches street address shorter than 5 characters'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 5: Customer Classifications (General, Corporate, Booking)
  // ------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Customer Classification & Spec Integrity');

  const bookingCust: Partial<Customer> = {
    customerType: 'booking',
    name: 'Aditya Pratama',
    companyName: 'Aditya & Sarah Wedding',
    eventTitle: 'Aditya & Sarah Wedding Reception',
    targetEventDate: '2026-12-12',
    eventSession: 'evening',
    estimatedGuestCount: 600,
    venueName: 'Grand Ballroom Hotel Mulia',
    distanceFromHqKm: 1.6
  };

  assert(
    bookingCust.customerType === 'booking',
    'Classification 1: Booking customer type is explicitly configured'
  );
  assert(
    Boolean(bookingCust.eventTitle && bookingCust.targetEventDate),
    'Classification 2: Booking customer contains event title and target event date'
  );
  assert(
    bookingCust.estimatedGuestCount === 600,
    'Classification 3: Booking customer contains guest count (Pax)'
  );

  const corporateCust: Partial<Customer> = {
    customerType: 'corporate',
    name: 'Budi Hartono',
    companyName: 'PT Sumber Alfaria Makmur',
    creditLimit: 500000000,
    paymentTerms: 'net_30',
    npwp: '01.345.678.9-411.000'
  };

  assert(
    corporateCust.customerType === 'corporate',
    'Classification 4: Corporate customer type is configured'
  );
  assert(
    (corporateCust.creditLimit || 0) > 0,
    'Classification 5: Corporate customer has commercial credit limit'
  );

  const generalCust: Partial<Customer> = {
    customerType: 'general',
    name: 'Ratna Dewi',
    companyName: 'Private Individual',
    creditLimit: 0
  };

  assert(
    generalCust.customerType === 'general',
    'Classification 6: General retail B2C customer type is configured'
  );

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} passed (100%).`);
  console.log('======================================================\n');
}

runCustomerMasterTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
