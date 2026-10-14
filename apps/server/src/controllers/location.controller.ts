import { Request, Response, NextFunction } from 'express';

// In-memory cache for ultra-fast location searches and routes
const searchCache = new Map<string, any[]>();
const routeCache = new Map<string, any>();

function formatLocationDisplay(properties: any): { name: string; secondary: string } {
  const p = properties || {};
  let name = p.name || p.street || 'Location';

  const parts: string[] = [];
  if (p.street && p.street !== name) parts.push(p.street);
  if (p.district && p.district !== name) parts.push(p.district);
  if (p.city && p.city !== name) parts.push(p.city);
  if (p.state) parts.push(p.state);

  const secondary = parts.length > 0 ? parts.join(', ') : (p.country || 'India');
  return { name, secondary };
}

export class LocationController {
  /**
   * Search locations across India dynamically with POIs, streets, and sub-locations
   */
  static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = (req.query.q as string || '').trim();
      if (!query || query.length < 2) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      const cacheKey = query.toLowerCase();
      if (searchCache.has(cacheKey)) {
        res.status(200).json({ success: true, data: searchCache.get(cacheKey) });
        return;
      }

      const results: any[] = [];
      const seenCoords = new Set<string>();

      // 1. Query Photon API (server-side has zero CORS restrictions)
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lat=20.5937&lon=78.9629`;
        const pRes = await fetch(photonUrl);
        if (pRes.ok) {
          const data: any = await pRes.json();
          if (data.features && Array.isArray(data.features)) {
            data.features.forEach((f: any, idx: number) => {
              const coords: [number, number] = [f.geometry.coordinates[1], f.geometry.coordinates[0]];
              const coordKey = `${coords[0].toFixed(4)},${coords[1].toFixed(4)}`;

              if (!seenCoords.has(coordKey)) {
                seenCoords.add(coordKey);
                const { name, secondary } = formatLocationDisplay(f.properties);

                let category = 'landmark';
                const osmVal = (f.properties?.osm_value || '').toLowerCase();
                const osmKey = (f.properties?.osm_key || '').toLowerCase();
                if (osmVal.includes('college') || osmVal.includes('university') || osmVal.includes('school')) {
                  category = 'college';
                } else if (osmKey === 'highway' || osmVal.includes('road') || osmVal.includes('junction')) {
                  category = 'junction';
                } else if (osmVal.includes('station') || osmVal.includes('bus') || osmVal.includes('rail')) {
                  category = 'transit';
                }

                results.push({
                  id: `pt-${f.properties?.osm_id || idx}`,
                  name,
                  secondary,
                  coords,
                  category,
                });
              }
            });
          }
        }
      } catch (e: any) {
        console.warn('[LocationSearch] Photon error:', e.message);
      }

      // 2. Query Nominatim if needed to augment
      if (results.length < 3) {
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&countrycodes=in&limit=6&addressdetails=1`;

          const nRes = await fetch(nomUrl, {
            headers: { 'User-Agent': 'RouteMateCarpool/2.0' },
          });

          if (nRes.ok) {
            const data: any = await nRes.json();
            if (Array.isArray(data)) {
              data.forEach((item: any, idx: number) => {
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);
                const coordKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;

                if (!seenCoords.has(coordKey)) {
                  seenCoords.add(coordKey);
                  const parts = (item.display_name || '').split(',');
                  const name = parts[0]?.trim() || item.name || query;
                  const secondary = parts.slice(1, 4).join(',').trim() || 'India';

                  results.push({
                    id: `nom-${item.place_id || idx}`,
                    name,
                    secondary,
                    coords: [lat, lon],
                    category: 'landmark',
                  });
                }
              });
            }
          }
        } catch (e: any) {
          console.warn('[LocationSearch] Nominatim error:', e.message);
        }
      }

      if (results.length > 0) {
        searchCache.set(cacheKey, results);
      }

      res.status(200).json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Turn-by-turn road route computation
   */
  static async route(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startLat = parseFloat(req.query.startLat as string);
      const startLng = parseFloat(req.query.startLng as string);
      const endLat = parseFloat(req.query.endLat as string);
      const endLng = parseFloat(req.query.endLng as string);

      if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        res.status(400).json({ success: false, error: 'Invalid coordinate parameters' });
        return;
      }

      const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}_${endLat.toFixed(4)},${endLng.toFixed(4)}`;
      if (routeCache.has(cacheKey)) {
        res.status(200).json({ success: true, data: routeCache.get(cacheKey) });
        return;
      }

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        const osrmRes = await fetch(url);
        if (osrmRes.ok) {
          const data: any = await osrmRes.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const waypoints: [number, number][] = route.geometry.coordinates.map((pt: [number, number]) => [
              pt[1],
              pt[0],
            ]);

            const payload = {
              waypoints,
              distanceKm: parseFloat((route.distance / 1000).toFixed(1)),
              durationMin: Math.max(1, Math.round(route.duration / 60)),
            };

            routeCache.set(cacheKey, payload);
            res.status(200).json({ success: true, data: payload });
            return;
          }
        }
      } catch (e: any) {
        console.warn('[LocationRoute] OSRM error:', e.message);
      }

      // Fallback
      const dx = (endLat - startLat) * 111;
      const dy = (endLng - startLng) * 111;
      const straightDist = Math.sqrt(dx * dx + dy * dy);
      const payload = {
        waypoints: [[startLat, startLng], [endLat, endLng]],
        distanceKm: parseFloat((straightDist * 1.2).toFixed(1)),
        durationMin: Math.max(2, Math.round(straightDist * 2.0)),
      };

      res.status(200).json({ success: true, data: payload });
    } catch (err) {
      next(err);
    }
  }
}
