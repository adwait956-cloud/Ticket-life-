import React from 'react';
import { LatLngPoint } from '../types/travel';

export const NASHIK_CENTER: LatLngPoint = { lat: 19.9975, lng: 73.7898 };
export const INDIA_CENTER: LatLngPoint = { lat: 21.1458, lng: 79.0882 };

export const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

export const MapsAvailabilityContext = React.createContext<boolean>(false);

export function useIsMapsLoadedProvider(): boolean {
  return React.useContext(MapsAvailabilityContext);
}

export function getEnvGoogleMapsKey(): string {
  const viteKey = (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY;
  return typeof viteKey === 'string' ? viteKey.trim() : '';
}

export async function resolveGoogleMapsKey(): Promise<string> {
  const envKey = getEnvGoogleMapsKey();
  if (envKey) return envKey;

  try {
    const res = await fetch('/api/maps/key');
    if (!res.ok) return '';
    const data = await res.json();
    return typeof data?.key === 'string' ? data.key.trim() : '';
  } catch {
    return '';
  }
}

export function checkAndTriggerMapsQuotaError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '');
  const status = (err as any)?.status || (err as any)?.code;
  if (
    status === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'OVER_QUERY_LIMIT' ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('429')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  return false;
}

export function toLatLngLiteral(
  loc: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined
): LatLngPoint | undefined {
  if (!loc) return undefined;
  const lat = typeof (loc as any).lat === 'function' ? (loc as any).lat() : (loc as any).lat;
  const lng = typeof (loc as any).lng === 'function' ? (loc as any).lng() : (loc as any).lng;
  if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return { lat, lng };
  }
  return undefined;
}
