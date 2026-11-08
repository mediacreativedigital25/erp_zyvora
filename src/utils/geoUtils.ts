/**
 * Zyvora ERP 1.0.0 — Geolocation & Headquarters Distance Calculation Utility
 * Provides Haversine straight-line distance, estimated road distance,
 * coordinate validation, and Google Maps deep-link generation.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  label?: string;
}

/**
 * Default Headquarters Office Coordinates
 * Menara Mandiri Lt. 18, Jl. Jend. Sudirman Kav. 54-55, Jakarta Selatan
 */
export const DEFAULT_HQ_COORDINATES: GeoCoordinates = {
  latitude: -6.2255,
  longitude: 106.808,
  label: 'Headquarters (Menara Mandiri, Jakarta)'
};

/**
 * Resolves the Headquarters Origin Anchor dynamically from Company Profile.
 * If Company Profile has valid latitude and longitude coordinates, returns those coordinates
 * with the company brand/legal name and location label.
 * Otherwise falls back to DEFAULT_HQ_COORDINATES.
 */
export function getHqCoordinates(companyProfile?: {
  latitude?: number | null;
  longitude?: number | null;
  brandName?: string | null;
  legalName?: string | null;
  villageName?: string | null;
  districtName?: string | null;
  regencyName?: string | null;
  address?: string | null;
} | null): GeoCoordinates {
  if (
    companyProfile &&
    isValidCoordinates(companyProfile.latitude, companyProfile.longitude)
  ) {
    const orgName =
      companyProfile.brandName?.trim() ||
      companyProfile.legalName?.trim() ||
      'Headquarters';
    const loc =
      companyProfile.villageName?.trim() ||
      companyProfile.districtName?.trim() ||
      companyProfile.regencyName?.trim() ||
      'HQ';

    return {
      latitude: Number(companyProfile.latitude),
      longitude: Number(companyProfile.longitude),
      label: `${orgName} (${loc})`
    };
  }
  return DEFAULT_HQ_COORDINATES;
}

/**
 * Validates whether latitude and longitude are valid finite numbers within earth bounds
 */
export function isValidCoordinates(lat?: number | null, lon?: number | null): boolean {
  if (lat === undefined || lat === null || lon === undefined || lon === null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Calculates straight-line distance between two coordinates in kilometers using the Haversine formula
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinates(lat1, lon1) || !isValidCoordinates(lat2, lon2)) return 0;

  const EARTH_RADIUS_KM = 6371;
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Number(distance.toFixed(1));
}

/**
 * Estimates road driving distance from straight-line Haversine distance
 * using standard Indonesian urban/regional routing factor (1.25x)
 */
export function estimateRoadDistanceKm(straightDistanceKm: number): number {
  if (straightDistanceKm <= 0) return 0;
  // Indonesian road curvature & routing coefficient: ~1.25x
  return Number((straightDistanceKm * 1.25).toFixed(1));
}

/**
 * Calculates estimated road distance from Headquarters to a target destination
 */
export function calculateDistanceToHq(
  destLat: number,
  destLon: number,
  hq: GeoCoordinates = DEFAULT_HQ_COORDINATES
): { straightDistanceKm: number; estimatedRoadDistanceKm: number } {
  const straightDistanceKm = calculateHaversineDistanceKm(
    hq.latitude,
    hq.longitude,
    destLat,
    destLon
  );
  const estimatedRoadDistanceKm = estimateRoadDistanceKm(straightDistanceKm);

  return { straightDistanceKm, estimatedRoadDistanceKm };
}

/**
 * Generates Google Maps pin URL for given coordinates
 */
export function generateGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Formats distance display label (e.g. "±14.2 km")
 */
export function formatDistanceLabel(distanceKm?: number | null): string {
  if (distanceKm === undefined || distanceKm === null || distanceKm <= 0) {
    return 'N/A';
  }
  return `±${distanceKm.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}
