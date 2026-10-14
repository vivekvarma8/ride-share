import { apiRequest } from '../api/client';

export interface LocationItem {
  id: string;
  name: string;
  secondary: string;
  coords: [number, number]; // [lat, lng]
  category?: 'landmark' | 'transit' | 'college' | 'junction' | 'city';
}

export interface RouteResult {
  waypoints: [number, number][]; // [lat, lng][]
  distanceKm: number;
  durationMin: number;
}

const geocodeCache = new Map<string, [number, number]>();

/**
 * Searches real places and sub-locations across India via backend proxy
 */
export async function searchLocations(query: string): Promise<LocationItem[]> {
  const clean = (query || '').trim();
  if (!clean || clean.length < 2) return [];

  try {
    const res = await apiRequest<{ success: boolean; data: LocationItem[] }>(
      `/locations/search?q=${encodeURIComponent(clean)}`
    );
    if (res.success && Array.isArray(res.data)) {
      res.data.forEach((item) => {
        geocodeCache.set(item.name.toLowerCase(), item.coords);
      });
      return res.data;
    }
  } catch (err) {
    console.warn('[LocationService] Search failed:', err);
  }
  return [];
}

/**
 * Resolves a text name to exact real coordinates
 */
export async function geocodeLocation(name: string): Promise<[number, number]> {
  if (!name) return [20.5937, 78.9629];
  const lower = name.toLowerCase().trim();

  if (geocodeCache.has(lower)) {
    return geocodeCache.get(lower)!;
  }

  try {
    const items = await searchLocations(name);
    if (items.length > 0) {
      geocodeCache.set(lower, items[0].coords);
      return items[0].coords;
    }
  } catch (e) {
    // fallback
  }

  return [20.5937, 78.9629];
}

/**
 * Synchronous resolver that checks memory cache
 */
export function resolveLocationCoords(name: string, fallbackOffset = 0): [number, number] {
  if (!name) return [17.3850 + fallbackOffset * 0.05, 78.4867 + fallbackOffset * 0.05];
  const lower = name.toLowerCase().trim();

  if (geocodeCache.has(lower)) {
    return geocodeCache.get(lower)!;
  }

  // Background geocoding
  geocodeLocation(name);

  return [17.3850 + fallbackOffset * 0.05, 78.4867 + fallbackOffset * 0.05];
}

/**
 * Real turn-by-turn road routing across India via backend proxy
 */
export async function fetchRoadRoute(start: [number, number], end: [number, number]): Promise<RouteResult> {
  try {
    const res = await apiRequest<{ success: boolean; data: RouteResult }>(
      `/locations/route?startLat=${start[0]}&startLng=${start[1]}&endLat=${end[0]}&endLng=${end[1]}`
    );
    if (res.success && res.data) {
      return res.data;
    }
  } catch (err) {
    console.warn('[LocationService] Route fetch failed:', err);
  }

  // Fallback straight corridor
  const dx = (end[0] - start[0]) * 111;
  const dy = (end[1] - start[1]) * 111;
  const straightDist = Math.sqrt(dx * dx + dy * dy);

  return {
    waypoints: [start, end],
    distanceKm: parseFloat((straightDist * 1.2).toFixed(1)),
    durationMin: Math.max(2, Math.round(straightDist * 2.0)),
  };
}
