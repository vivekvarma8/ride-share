import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, Play, Pause, CheckCircle, Info, X, MapPin, Gauge } from 'lucide-react';
import { resolveLocationCoords, fetchRoadRoute, RouteResult } from '../services/location.service';

interface RideMapProps {
  origin: string;
  destination: string;
  originCoords?: [number, number] | null;
  destCoords?: [number, number] | null;
  currentCoords?: [number, number] | null;
  currentLat?: number | null;
  currentLng?: number | null;
  status?: string;
  height?: string;
  className?: string;
  interactive?: boolean;
  onSimulateMove?: (lat: number, lng: number) => void;
  showSimulateControl?: boolean;
}

export const RideMap: React.FC<RideMapProps> = ({
  origin,
  destination,
  originCoords,
  destCoords,
  currentCoords,
  currentLat,
  currentLng,
  status = 'SCHEDULED',
  height = '320px',
  className = '',
  interactive = true,
  onSimulateMove,
  showSimulateControl = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const haloPolylineRef = useRef<L.Polyline | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);
  const simulationStepRef = useRef(0);
  const waypointsRef = useRef<[number, number][]>([]);

  // Resolve start & end real-world coordinates
  const start: [number, number] = originCoords || resolveLocationCoords(origin, 0);
  const end: [number, number] = destCoords || resolveLocationCoords(destination, 1);

  // Active vehicle coordinates
  const resolvedCurrent = currentCoords || (currentLat && currentLng ? [currentLat, currentLng] as [number, number] : null);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }
      const map = L.map(mapContainerRef.current, {
        zoomControl: interactive,
        attributionControl: false,
        dragging: interactive,
        scrollWheelZoom: false,
      }).setView(start, 13);

      // Free OpenStreetMap Standard Tiles
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Custom Origin Pin (Green)
    const originIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="background: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(16,185,129,0.5); border: 2.5px solid white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
    });

    // Custom Destination Pin (Purple/Indigo)
    const destIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="background: #4f46e5; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(79,70,229,0.5); border: 2.5px solid white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
    });

    // Custom Vehicle Pin with live radar ripple
    const carIcon = L.divIcon({
      className: 'custom-car-pin',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(99, 102, 241, 0.35); animation: radar-ripple 2s infinite ease-out;"></div>
          <div style="position: relative; z-index: 2; background: #0f172a; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(15,23,42,0.5); border: 2.5px solid #6366f1;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    // Clear previous vector layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Add Origin and Destination markers
    L.marker(start, { icon: originIcon })
      .bindPopup(`<b>Origin:</b><br>${origin || 'Pickup Stop'}`)
      .addTo(map);

    L.marker(end, { icon: destIcon })
      .bindPopup(`<b>Destination:</b><br>${destination || 'Dropoff Stop'}`)
      .addTo(map);

    // Initial placeholder polyline
    const initialWaypoints: [number, number][] = [start, end];
    waypointsRef.current = initialWaypoints;

    const halo = L.polyline(initialWaypoints, {
      color: '#818cf8',
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    haloPolylineRef.current = halo;

    const line = L.polyline(initialWaypoints, {
      color: '#4f46e5',
      weight: 4.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: status === 'SCHEDULED' ? '6, 8' : undefined,
    }).addTo(map);
    polylineRef.current = line;

    // Fit map bounds
    map.fitBounds(L.latLngBounds([start, end]), { padding: [45, 45], maxZoom: 15 });

    // Fetch real road route geometry asynchronously from OSRM
    fetchRoadRoute(start, end).catch(() => null).then((res) => {
      if (!res) return;
      setRouteInfo(res);
      waypointsRef.current = res.waypoints;

      if (haloPolylineRef.current) {
        haloPolylineRef.current.setLatLngs(res.waypoints);
      }
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(res.waypoints);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(L.latLngBounds(res.waypoints), { padding: [45, 45], maxZoom: 15 });
      }
    });

    // Place active vehicle marker if ride is in progress or coords provided
    const initialCarPos = resolvedCurrent || (status === 'IN_PROGRESS' ? start : null);
    if (initialCarPos) {
      const carMarker = L.marker(initialCarPos, { icon: carIcon })
        .bindPopup('<b>Live Vehicle En Route</b>')
        .addTo(map);
      carMarkerRef.current = carMarker;
    }
  }, [origin, destination, originCoords, destCoords, status]);

  // Update live vehicle position when coords change
  useEffect(() => {
    if (resolvedCurrent && carMarkerRef.current) {
      carMarkerRef.current.setLatLng(resolvedCurrent);
    }
  }, [resolvedCurrent]);

  // Real turn-by-turn road GPS simulation
  useEffect(() => {
    let interval: any = null;
    if (isSimulating && status === 'IN_PROGRESS') {
      interval = setInterval(() => {
        const waypoints = waypointsRef.current;
        if (!waypoints || waypoints.length === 0) return;

        simulationStepRef.current += 1;
        const totalSteps = waypoints.length;
        const currentIndex = simulationStepRef.current % totalSteps;
        const nextCoord = waypoints[currentIndex];

        if (carMarkerRef.current) {
          carMarkerRef.current.setLatLng(nextCoord);
        }
        if (onSimulateMove) {
          onSimulateMove(nextCoord[0], nextCoord[1]);
        }
      }, 800);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulating, status, onSimulateMove]);

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm ${className}`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-0" />

      {/* Floating Status Badges & HUD */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        <span
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 backdrop-blur-md ${
            status === 'IN_PROGRESS'
              ? 'bg-emerald-600/90 text-white animate-pulse'
              : status === 'COMPLETED'
              ? 'bg-slate-900/90 text-white'
              : 'bg-white/95 text-indigo-700 border border-slate-200'
          }`}
        >
          {status === 'IN_PROGRESS' && (
            <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
          )}
          {status === 'IN_PROGRESS' ? 'Live Road Navigation' : 'Real Road Corridor'}
        </span>

        {/* Real Driving Distance & Time HUD */}
        {routeInfo && (
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-950/85 text-white border border-slate-800 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
            <Gauge className="h-3 w-3 text-indigo-400" />
            <span>{routeInfo.distanceKm} km • ~{routeInfo.durationMin} mins driving</span>
          </span>
        )}

        <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white/90 text-emerald-800 border border-emerald-200/80 backdrop-blur-md flex items-center gap-1.5 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          OpenStreetMap (No API Key Required)
        </span>
      </div>

      {/* API Key Guide Button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={() => setShowApiKeyModal(true)}
          className="p-1.5 bg-white/90 hover:bg-white text-slate-600 hover:text-indigo-600 rounded-xl border border-slate-200/90 shadow-sm backdrop-blur transition flex items-center gap-1 text-[11px] font-bold"
          title="Map API Key Guide"
        >
          <Info className="h-3.5 w-3.5 text-indigo-500" />
          <span className="hidden sm:inline">Map Guide</span>
        </button>
      </div>

      {/* Interactive Simulation Button for Driver/Demo */}
      {showSimulateControl && status === 'IN_PROGRESS' && (
        <div className="absolute bottom-3 right-3 z-10">
          <button
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg backdrop-blur transition flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            {isSimulating ? (
              <>
                <Pause className="h-3.5 w-3.5 text-amber-400" />
                <span>Pause GPS Sim</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-emerald-400" />
                <span>Simulate Turn-by-Turn Drive</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* API Key Information Modal */}
      {showApiKeyModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-slate-800 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <MapPin className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Map & Geocoding Details</h3>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  Real GPS & Turn-by-Turn Routing Active
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  The map is integrated with <strong>real-time geocoding and OSRM turn-by-turn road routing</strong>. It works dynamically for every city, town, campus, and landmark across all of India without any API key or subscription.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="font-bold text-slate-900">Features Active:</div>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Dynamic live search across all cities, campuses, streets, and transit hubs in India.</li>
                  <li>Real driving distance and duration computed from live road network.</li>
                  <li>Live vehicle radar marker moving along actual streets.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowApiKeyModal(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
