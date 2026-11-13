import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Search,
  Car,
  Compass,
  Bike,
  Loader2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  LocateFixed,
} from 'lucide-react';
import { LatLngPoint, SearchFilterState, TransportCategory, TransportOption } from '../types/travel';
import {
  checkAndTriggerMapsQuotaError,
  GMP_ATTRIBUTION_ID,
  INDIA_CENTER,
  NASHIK_CENTER,
  toLatLngLiteral,
} from '../services/mapsConfig';
import { IndiaPlaceInput, SelectedIndiaPlace } from './IndiaPlaceInput';

interface ExplorerPlaceItem {
  id: string;
  name: string;
  address: string;
  position: LatLngPoint;
  rating?: number;
  types?: string[];
}

interface IndiaMapsExplorerProps {
  filters: SearchFilterState;
  onUpdateFilters: (updated: Partial<SearchFilterState>) => void;
  onBookInstantRouteRide: (option: TransportOption) => void;
}

const NASHIK_QUERY_PRESETS = [
  'Nashik Road Railway Station',
  'Panchavati Nashik',
  'College Road Nashik',
  'Gangapur Road Nashik',
  'CIDCO Nashik',
  'Satpur MIDC Nashik',
  'Dwarka Circle Nashik',
  'Trimbakeshwar Nashik',
  'Ozar Airport Nashik',
  'Indira Nagar Nashik',
];

const ALL_INDIA_CITY_PRESETS = [
  'Mumbai Maharashtra',
  'Pune Maharashtra',
  'Nagpur Maharashtra',
  'Chhatrapati Sambhajinagar Maharashtra',
  'New Delhi India',
  'Bengaluru Karnataka',
  'Hyderabad Telangana',
  'Ahmedabad Gujarat',
  'Jaipur Rajasthan',
  'Chennai Tamil Nadu',
];

const CATEGORY_PLACE_QUERIES: { id: string; label: string; querySuffix: string }[] = [
  { id: 'all', label: 'All Places', querySuffix: 'popular places landmarks' },
  { id: 'transit', label: 'Stations & Bus Stands', querySuffix: 'railway station bus stand airport' },
  { id: 'temple', label: 'Temples & Heritage', querySuffix: 'temple tourist attraction' },
  { id: 'market', label: 'Malls & Markets', querySuffix: 'shopping mall market chowk' },
  { id: 'hospital', label: 'Hospitals & Colleges', querySuffix: 'hospital university college' },
];

export const IndiaMapsExplorer: React.FC<IndiaMapsExplorerProps> = ({
  filters,
  onUpdateFilters,
  onBookInstantRouteRide,
}) => {
  const map = useMap('india-nashik-explorer');
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [scopeMode, setScopeMode] = useState<'nashik' | 'india'>('nashik');
  const [placeCategory, setPlaceCategory] = useState<string>('all');
  const [cityQuery, setCityQuery] = useState<string>('Nashik');
  const [discoveredPlaces, setDiscoveredPlaces] = useState<ExplorerPlaceItem[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<ExplorerPlaceItem | null>(null);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const [routeSummary, setRouteSummary] = useState<{
    distanceKm: number;
    durationMins: number;
    durationText: string;
  } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const routePolylinesRef = useRef<google.maps.Polyline[]>([]);

  // Search real Google Maps places using modern Place.searchByText
  const runPlaceTextSearch = useCallback(
    async (textQuery: string, centerBias?: LatLngPoint) => {
      if (!placesLib) return;
      setIsSearchingPlaces(true);
      try {
        const request: google.maps.places.SearchByTextRequest = {
          textQuery,
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'types'],
          maxResultCount: 14,
          region: 'IN',
          language: 'en',
        };
        if (centerBias) {
          request.locationBias = {
            center: centerBias,
            radius: 30000,
          };
        }
        const { places } = await placesLib.Place.searchByText(request);
        const mapped: ExplorerPlaceItem[] = (places || [])
          .map((p) => {
            const pos = toLatLngLiteral(p.location);
            if (!pos) return null;
            return {
              id: p.id || `${pos.lat}-${pos.lng}`,
              name: p.displayName || 'Place',
              address: p.formattedAddress || 'India',
              position: pos,
              rating: typeof p.rating === 'number' ? p.rating : undefined,
              types: p.types || [],
            } as ExplorerPlaceItem;
          })
          .filter(Boolean) as ExplorerPlaceItem[];

        setDiscoveredPlaces(mapped);
        if (mapped.length > 0 && map && !filters.originCoords && !filters.destCoords) {
          const bounds = new google.maps.LatLngBounds();
          mapped.forEach((m) => bounds.extend(m.position));
          map.fitBounds(bounds, 56);
        }
      } catch (err) {
        checkAndTriggerMapsQuotaError(err);
      } finally {
        setIsSearchingPlaces(false);
      }
    },
    [placesLib, map, filters.originCoords, filters.destCoords]
  );

  // Automatically load Nashik places once Places library is ready
  useEffect(() => {
    if (!placesLib) return;
    const catMeta = CATEGORY_PLACE_QUERIES.find((c) => c.id === placeCategory);
    const suffix = catMeta?.querySuffix || 'popular places';
    const baseCity = scopeMode === 'nashik' ? 'Nashik, Maharashtra' : `${cityQuery || 'India'}`;
    void runPlaceTextSearch(
      `${suffix} in ${baseCity}`,
      scopeMode === 'nashik' ? NASHIK_CENTER : undefined
    );
  }, [placesLib, scopeMode, placeCategory]);

  // Compute real driving route on the map using Routes API (Route.computeRoutes) whenever pickup & drop exist
  useEffect(() => {
    routePolylinesRef.current.forEach((p) => p.setMap(null));
    routePolylinesRef.current = [];

    if (!routesLib || !map) return;

    const originInput = filters.originCoords || (filters.origin.trim() ? `${filters.origin}, India` : null);
    const destInput =
      filters.destCoords || (filters.destination.trim() ? `${filters.destination}, India` : null);

    if (!originInput || !destInput) {
      setRouteSummary(null);
      setRouteError(null);
      return;
    }

    let cancelled = false;
    setRouteError(null);

    const travelMode = filters.category === 'bikes' ? 'TWO_WHEELER' : 'DRIVING';
    const request: any = {
      origin: originInput,
      destination: destInput,
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    (routesLib.Route as any)
      .computeRoutes(request)
      .then(({ routes }: { routes: any[] }) => {
        if (cancelled) return;
        if (!routes || routes.length === 0) {
          setRouteSummary(null);
          setRouteError('No driving route found between these two places.');
          return;
        }
        const primaryRoute = routes[0];
        const newPolylines: google.maps.Polyline[] = primaryRoute.createPolylines();
        newPolylines.forEach((pl) => {
          pl.setOptions({
            strokeColor: '#0284c7',
            strokeOpacity: 0.92,
            strokeWeight: 6,
          });
          pl.setMap(map);
        });
        routePolylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 60);
        }

        const distanceKm = Number(((primaryRoute.distanceMeters || 0) / 1000).toFixed(1));
        const durationMins = Math.max(5, Math.round((primaryRoute.durationMillis || 0) / 60000));
        const hrs = Math.floor(durationMins / 60);
        const mins = durationMins % 60;
        const durationText = hrs > 0 ? `${hrs}h ${mins}m` : `${durationMins} mins`;

        setRouteSummary({ distanceKm, durationMins, durationText });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        checkAndTriggerMapsQuotaError(err);
        setRouteSummary(null);
        setRouteError('Unable to compute route right now. Try selecting places from suggestions.');
      });

    return () => {
      cancelled = true;
      routePolylinesRef.current.forEach((p) => p.setMap(null));
      routePolylinesRef.current = [];
    };
  }, [
    routesLib,
    map,
    filters.origin,
    filters.originCoords,
    filters.destination,
    filters.destCoords,
    filters.category,
  ]);

  const handleSelectPresetChip = async (query: string) => {
    setCityQuery(query);
    await runPlaceTextSearch(query);
    if (placesLib && map) {
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: query,
          fields: ['location', 'viewport'],
          maxResultCount: 1,
          region: 'IN',
        });
        const first = places?.[0];
        if (first?.viewport) {
          map.fitBounds(first.viewport);
        } else if (first?.location) {
          map.setCenter(first.location);
          map.setZoom(13);
        }
      } catch (err) {
        checkAndTriggerMapsQuotaError(err);
      }
    }
  };

  const handleCitySearchPick = (picked: SelectedIndiaPlace) => {
    setCityQuery(picked.name);
    if (map) {
      if (picked.viewport) map.fitBounds(picked.viewport);
      else {
        map.setCenter({ lat: picked.lat, lng: picked.lng });
        map.setZoom(13);
      }
    }
    void runPlaceTextSearch(`popular places in ${picked.name}`, {
      lat: picked.lat,
      lng: picked.lng,
    });
  };

  const computeEstimatedFare = (cat: TransportCategory, distanceKm: number) => {
    const km = Math.max(2, distanceKm || 5);
    if (cat === 'bikes') return Math.round(25 + km * 9);
    if (cat === 'autos') return Math.round(35 + km * 15);
    return Math.round(65 + km * 22);
  };

  const handleDispatchInstantRide = (cat: TransportCategory) => {
    const distanceKm = routeSummary?.distanceKm || 6.5;
    const price = computeEstimatedFare(cat, distanceKm);
    const baseFare = Math.round(price * 0.85);
    const taxesAndFees = Math.round(price * 0.1);
    const platformFee = Math.max(0, price - baseFare - taxesAndFees);
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const plateNum =
      scopeMode === 'nashik' ||
      filters.origin.toLowerCase().includes('nashik') ||
      filters.destination.toLowerCase().includes('nashik')
        ? `MH-15-TL-${otp}`
        : `MH-01-TL-${otp}`;

    const vehicleLabel =
      cat === 'bikes'
        ? 'Hero Splendor / Honda Activa Moto'
        : cat === 'autos'
        ? 'Bajaj RE CNG / EV Auto'
        : 'Swift Dzire / Ertiga AC Sedan';

    const captainName =
      cat === 'bikes' ? 'Rohit Pawar' : cat === 'autos' ? 'Suresh Shinde' : 'Vikram Deshmukh';

    const option: TransportOption = {
      id: `instant-${cat}-${Date.now()}`,
      category: cat,
      providerName: `Ticket Life ${cat === 'cars' ? 'Cab' : cat === 'autos' ? 'Auto' : 'Bike'} Dispatch`,
      providerCode: 'TL-LIVE-GPS',
      title: `${filters.origin || 'Pickup'} → ${filters.destination || 'Drop'} (${distanceKm} km)`,
      serviceNumber: plateNum,
      vehicleType: vehicleLabel,
      origin: filters.origin || 'Selected Pickup',
      originCode: filters.originCode || 'PKP',
      originAddress: filters.origin,
      originCoords: filters.originCoords,
      originTerminalOrPlatform: 'Live Map Pickup Pin',
      destination: filters.destination || 'Selected Destination',
      destCode: filters.destCode || 'DRP',
      destAddress: filters.destination,
      destCoords: filters.destCoords,
      destTerminalOrPlatform: 'Exact Drop Pin',
      departureTime: 'Arriving in 3 mins',
      arrivalTime: routeSummary?.durationText || 'Live ETA',
      duration: routeSummary ? `${routeSummary.durationText} · ${distanceKm} km` : 'Direct Ride',
      price,
      baseFare,
      taxesAndFees,
      platformFee,
      availableSeats: cat === 'bikes' ? 1 : cat === 'autos' ? 3 : 4,
      rating: 4.9,
      reviewsCount: 128,
      amenities: ['Pay Driver After Ride', 'Start OTP Verified', 'Google Maps Live Route'],
      travelClass: cat === 'autos' ? 'Meter / Direct Auto' : cat === 'bikes' ? 'Express Bike Taxi' : 'AC Prime Cab',
      cancellationPolicy: {
        freeCancellationAvailable: true,
        cutoffHours: 0,
        refundPercent: 100,
      },
      providerIntegration: {
        partnerName: 'Google Maps Route Dispatch · India',
        status: 'connected_live',
      },
      liveStatus: {
        statusText: 'Captain Assigned · Start OTP Ready',
        delayMinutes: 0,
        currentStationOrLocation: filters.origin || 'Nashik',
        nextHalt: filters.destination || 'Drop Point',
        platformOrGate: 'Live GPS',
        lastUpdated: 'Just now',
        driverDetails: {
          name: captainName,
          phone: '+91 98230 15420',
          rating: 4.9,
          vehicleNumber: plateNum,
          otp,
        },
      },
    };

    onBookInstantRouteRide(option);
  };

  return (
    <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-lg overflow-hidden">
      {/* Top Header & Nashik / All-India Switcher */}
      <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-sky-50 via-white to-emerald-50/40 dark:from-stone-900 dark:via-stone-900 dark:to-emerald-950/20">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
            <LocateFixed className="w-3.5 h-3.5" />
            <span>Live Google Maps · All India &amp; Nashik Full Places</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white tracking-tight mt-0.5">
            Explore Nashik &amp; Every Indian City on Live Map
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Tap any place pin to set Pickup or Drop, view real route distance, and book Uber/Ola-style (OTP + Pay Driver After Ride).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setScopeMode('nashik');
              setCityQuery('Nashik');
              if (map) {
                map.setCenter(NASHIK_CENTER);
                map.setZoom(12);
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              scopeMode === 'nashik'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Nashik All Places
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeMode('india');
              if (map) {
                map.setCenter(INDIA_CENTER);
                map.setZoom(5);
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              scopeMode === 'india'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            All India Cities Map
          </button>
        </div>
      </div>

      {/* Search Bar & Category Chips */}
      <div className="p-4 border-b border-stone-200 dark:border-stone-800 space-y-3 bg-stone-50/70 dark:bg-stone-950/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5">
            <IndiaPlaceInput
              value={cityQuery}
              onChangeText={setCityQuery}
              onSelectPlace={handleCitySearchPick}
              biasMode={scopeMode}
              placeholder="Search any city, area, temple, station in Nashik or India..."
              inputClassName="w-full pl-9 pr-8 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="lg:col-span-7 flex flex-wrap items-center gap-1.5">
            {CATEGORY_PLACE_QUERIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setPlaceCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  placeCategory === cat.id
                    ? 'bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950'
                    : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-sky-500'
                }`}
              >
                {cat.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                runPlaceTextSearch(
                  cityQuery.trim()
                    ? `${cityQuery} places`
                    : scopeMode === 'nashik'
                    ? 'Nashik landmarks'
                    : 'India major cities'
                )
              }
              className="ml-auto px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              {isSearchingPlaces ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Search Area</span>
            </button>
          </div>
        </div>

        {/* Preset Search Chips — trigger live Google Places searches */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 shrink-0">
            {scopeMode === 'nashik' ? 'Nashik Areas:' : 'All India Hubs:'}
          </span>
          {(scopeMode === 'nashik' ? NASHIK_QUERY_PRESETS : ALL_INDIA_CITY_PRESETS).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSelectPresetChip(preset)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-sky-500 text-[11px] font-semibold text-stone-700 dark:text-stone-300 whitespace-nowrap cursor-pointer transition-colors"
            >
              {preset.replace(' Maharashtra', '').replace(' India', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Interactive Google Map + Route Dispatch Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Map Canvas — explicit height required (CF2) */}
        <div className="lg:col-span-8 relative h-[380px] sm:h-[440px] w-full bg-stone-100 dark:bg-stone-800">
          <GoogleMap
            id="india-nashik-explorer"
            mapId="DEMO_MAP_ID"
            defaultCenter={NASHIK_CENTER}
            defaultZoom={12}
            gestureHandling="greedy"
            internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Discovered Places Pins */}
            {discoveredPlaces.map((place) => (
              <AdvancedMarker
                key={place.id}
                position={place.position}
                title={place.name}
                onClick={() => setSelectedMarker(place)}
              >
                <Pin background="#0284c7" borderColor="#0369a1" glyphColor="#ffffff" />
              </AdvancedMarker>
            ))}

            {/* Selected Origin Pin */}
            {filters.originCoords && (
              <AdvancedMarker position={filters.originCoords} title={`Pickup: ${filters.origin}`}>
                <Pin background="#10b981" borderColor="#047857" glyphColor="#ffffff" glyphText="P" />
              </AdvancedMarker>
            )}

            {/* Selected Destination Pin */}
            {filters.destCoords && (
              <AdvancedMarker position={filters.destCoords} title={`Drop: ${filters.destination}`}>
                <Pin background="#ef4444" borderColor="#b91c1c" glyphColor="#ffffff" glyphText="D" />
              </AdvancedMarker>
            )}

            {/* Interactive InfoWindow for clicked Place */}
            {selectedMarker && (
              <InfoWindow
                position={selectedMarker.position}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-1 max-w-[230px] text-stone-900 space-y-2">
                  <div>
                    <div className="font-extrabold text-xs leading-snug">{selectedMarker.name}</div>
                    <div className="text-[11px] text-stone-600 mt-0.5 line-clamp-2">
                      {selectedMarker.address}
                    </div>
                    {selectedMarker.rating && (
                      <div className="text-[10px] font-bold text-amber-600 mt-0.5">
                        ★ {selectedMarker.rating} on Google Maps
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateFilters({
                          origin: selectedMarker.name,
                          originCode: selectedMarker.name.slice(0, 3).toUpperCase(),
                          originCoords: selectedMarker.position,
                        });
                        setSelectedMarker(null);
                      }}
                      className="flex-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Set Pickup
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateFilters({
                          destination: selectedMarker.name,
                          destCode: selectedMarker.name.slice(0, 3).toUpperCase(),
                          destCoords: selectedMarker.position,
                        });
                        setSelectedMarker(null);
                      }}
                      className="flex-1 px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Set Drop
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>

        {/* Right Side Panel: Discovered Places & Quick Uber/Ola Booking */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-stone-800 flex flex-col justify-between bg-white dark:bg-stone-900">
          <div className="p-4 space-y-3 overflow-y-auto max-h-[260px] lg:max-h-[250px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Places Found ({discoveredPlaces.length})
              </span>
              {isSearchingPlaces && <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />}
            </div>

            {discoveredPlaces.length === 0 ? (
              <div className="text-xs text-stone-500 dark:text-stone-400 py-4">
                Search any locality in Nashik or across India to load verified Google Maps places.
              </div>
            ) : (
              <div className="space-y-2">
                {discoveredPlaces.slice(0, 8).map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-sky-500/60 transition-colors bg-stone-50/60 dark:bg-stone-800/40"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMarker(p);
                        if (map) {
                          map.setCenter(p.position);
                          map.setZoom(14);
                        }
                      }}
                      className="text-left w-full cursor-pointer"
                    >
                      <div className="font-bold text-xs text-stone-900 dark:text-white truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                        {p.address}
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateFilters({
                            origin: p.name,
                            originCode: p.name.slice(0, 3).toUpperCase(),
                            originCoords: p.position,
                          })
                        }
                        className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/25 cursor-pointer"
                      >
                        + Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateFilters({
                            destination: p.name,
                            destCode: p.name.slice(0, 3).toUpperCase(),
                            destCoords: p.position,
                          })
                        }
                        className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px] font-bold hover:bg-rose-500/25 cursor-pointer"
                      >
                        + Drop
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instant Uber/Ola Style Dispatch Strip */}
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-sky-500" />
                <span>Instant Route Ride</span>
              </div>
              {routeSummary ? (
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                  {routeSummary.distanceKm} km · {routeSummary.durationText}
                </span>
              ) : (
                <span className="text-[10px] text-stone-400">Pick Pickup &amp; Drop</span>
              )}
            </div>

            {routeError && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                {routeError}
              </div>
            )}

            <div className="text-[11px] text-stone-600 dark:text-stone-400 flex items-center gap-1.5 truncate">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[44%]">
                {filters.origin || 'Choose Pickup'}
              </span>
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="font-bold text-rose-600 dark:text-rose-400 truncate max-w-[44%]">
                {filters.destination || 'Choose Drop'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['cars', 'autos', 'bikes'] as TransportCategory[]).map((cat) => {
                const estFare = computeEstimatedFare(cat, routeSummary?.distanceKm || 6.5);
                const disabled = !filters.origin.trim() || !filters.destination.trim();
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDispatchInstantRide(cat)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      filters.category === cat
                        ? 'bg-stone-900 text-white border-stone-900 dark:bg-amber-500 dark:text-stone-950 dark:border-amber-500'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 hover:border-sky-500 text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      {cat === 'cars' ? (
                        <Car className="w-4 h-4" />
                      ) : cat === 'autos' ? (
                        <Compass className="w-4 h-4" />
                      ) : (
                        <Bike className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-[10px] font-black uppercase">{cat}</div>
                    <div className="text-xs font-mono font-extrabold">₹{estFare}</div>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>Start Ride OTP → Live Map → Pay Driver After Ride</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
