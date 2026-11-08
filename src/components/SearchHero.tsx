import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import { LocationItem, SearchFilterState, TransportCategory } from '../types/travel';
import { LOCATIONS_LIST } from '../data/mockData';

interface SearchHeroProps {
  filters: SearchFilterState;
  onUpdateFilters: (newFilters: Partial<SearchFilterState>) => void;
  onExecuteSearch: () => void;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  filters,
  onUpdateFilters,
  onExecuteSearch,
}) => {
  const [showOriginSuggest, setShowOriginSuggest] = useState(false);
  const [showDestSuggest, setShowDestSuggest] = useState(false);

  // Filter locations relevant to current category
  const filteredLocations = LOCATIONS_LIST.filter((loc) => {
    if (filters.category === 'flights') return loc.type === 'airport';
    if (filters.category === 'trains') return loc.type === 'railway';
    if (filters.category === 'buses') return loc.type === 'bus_station' || loc.type === 'airport';
    return true; // cars, autos, bikes can use any location
  });

  const handleSwapLocations = () => {
    onUpdateFilters({
      origin: filters.destination,
      originCode: filters.destCode,
      destination: filters.origin,
      destCode: filters.originCode,
    });
  };

  const selectOrigin = (loc: LocationItem) => {
    onUpdateFilters({ origin: loc.name, originCode: loc.code });
    setShowOriginSuggest(false);
  };

  const selectDest = (loc: LocationItem) => {
    onUpdateFilters({ destination: loc.name, destCode: loc.code });
    setShowDestSuggest(false);
  };

  const getCategoryHeading = () => {
    switch (filters.category) {
      case 'trains':
        return {
          title: 'Authorized Railway Ticket Booking',
          subtitle: 'Search Vande Bharat, Shatabdi, Rajdhani & Superfast Express trains with genuine PNR status.',
          badge: 'IRCTC Authorized Gateway',
        };
      case 'flights':
        return {
          title: 'Domestic & International Airline Flights',
          subtitle: 'Compare live fares across IndiGo, Air India, Emirates, Vistara with zero hidden surcharges.',
          badge: 'Global GDS Flight Engine',
        };
      case 'buses':
        return {
          title: 'Intercity Volvo & Sleeper Buses',
          subtitle: 'Book sanitized AC luxury multi-axle sleeper and seater coaches with live GPS route tracking.',
          badge: 'RedBus Verified Network',
        };
      case 'cars':
        return {
          title: 'Taxi & Private Chauffeur Rides',
          subtitle: 'Instant city pickups, outstation trips & airport transfers with background-verified chauffeurs.',
          badge: 'Ticket Life Mobility Fleet',
        };
      case 'autos':
        return {
          title: 'Local Auto Rickshaw Booking',
          subtitle: 'Transparent government-approved meter fares and eco-friendly electric rickshaws with ride OTP.',
          badge: 'City Meter Dispatch',
        };
      case 'bikes':
        return {
          title: 'Fast Bike Taxi & Cruiser Rentals',
          subtitle: 'Beat city traffic on quick moto taxi rides or rent a self-drive cruiser for weekend road trips.',
          badge: 'Insured Commuter Fleet',
        };
    }
  };

  const info = getCategoryHeading();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-xl">
      {/* Background Hero Image with measured scrim */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img
          src="/src/assets/images/hero_travel_superapp_1794029176296.jpg"
          alt="Ticket Life Travel Hub"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
      </div>

      <div className="relative z-10 p-6 sm:p-8 lg:p-10 max-w-6xl mx-auto">
        {/* Editorial Title Section */}
        <div className="max-w-2xl mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{info.badge}</span>
            <span aria-hidden="true">·</span>
            <span>Live Availability Verified</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white text-balance leading-tight font-serif sm:font-sans">
            {info.title}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-stone-300 font-normal leading-relaxed">
            {info.subtitle}
          </p>
        </div>

        {/* Search Matrix */}
        <div className="bg-white dark:bg-stone-900/90 rounded-2xl p-4 sm:p-6 text-stone-900 dark:text-white shadow-2xl border border-stone-200 dark:border-stone-800 backdrop-blur-md">
          {/* Trip type selector if flight or train */}
          {(filters.category === 'flights' || filters.category === 'trains') && (
            <div className="flex items-center gap-4 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800 text-xs font-semibold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tripType"
                  checked={!filters.isRoundTrip}
                  onChange={() => onUpdateFilters({ isRoundTrip: false })}
                  className="accent-amber-600"
                />
                <span>One-Way Journey</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tripType"
                  checked={filters.isRoundTrip}
                  onChange={() => onUpdateFilters({ isRoundTrip: true })}
                  className="accent-amber-600"
                />
                <span>Round-Trip</span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Origin */}
            <div className="relative md:col-span-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                From / Pickup
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={filters.origin}
                  onFocus={() => setShowOriginSuggest(true)}
                  onChange={(e) => onUpdateFilters({ origin: e.target.value })}
                  placeholder="Enter city, station, or airport..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Suggestions dropdown */}
              {showOriginSuggest && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto">
                  <div className="p-2 text-[11px] font-bold text-slate-400 uppercase">
                    Select Departure Point
                  </div>
                  {filteredLocations.slice(0, 7).map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => selectOrigin(loc)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between group"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {loc.name}
                      </span>
                      <span className="text-slate-500 group-hover:text-sky-600 font-mono">
                        {loc.code}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowOriginSuggest(false)}
                    className="w-full text-center py-1 text-[11px] text-slate-400 hover:text-slate-600 border-t border-slate-100 dark:border-slate-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div className="hidden md:flex md:col-span-1 justify-center pt-5">
              <button
                type="button"
                onClick={handleSwapLocations}
                className="p-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:border-sky-500 transition-colors shadow-sm"
                title="Swap origin and destination"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Destination */}
            <div className="relative md:col-span-3">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                To / Destination
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={filters.destination}
                  onFocus={() => setShowDestSuggest(true)}
                  onChange={(e) => onUpdateFilters({ destination: e.target.value })}
                  placeholder="Enter destination..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Suggestions dropdown */}
              {showDestSuggest && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto">
                  <div className="p-2 text-[11px] font-bold text-slate-400 uppercase">
                    Select Destination
                  </div>
                  {filteredLocations.slice(0, 7).map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => selectDest(loc)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between group"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {loc.name}
                      </span>
                      <span className="text-slate-500 group-hover:text-sky-600 font-mono">
                        {loc.code}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowDestSuggest(false)}
                    className="w-full text-center py-1 text-[11px] text-slate-400 hover:text-slate-600 border-t border-slate-100 dark:border-slate-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            {/* Travel Date */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Travel Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={filters.departDate}
                  onChange={(e) => onUpdateFilters({ departDate: e.target.value })}
                  className="w-full pl-9 pr-2 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Passengers / Search CTA */}
            <div className="md:col-span-2 flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Travelers
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <select
                  value={filters.passengers}
                  onChange={(e) => onUpdateFilters({ passengers: parseInt(e.target.value, 10) })}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={1}>1 Passenger</option>
                  <option value={2}>2 Passengers</option>
                  <option value={3}>3 Passengers</option>
                  <option value={4}>4 Passengers</option>
                  <option value={5}>5+ Passengers</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.acOnly || false}
                  onChange={(e) => onUpdateFilters({ acOnly: e.target.checked })}
                  className="rounded text-sky-600 accent-sky-600"
                />
                <span>AC / Air-Conditioned only</span>
              </label>
              <span aria-hidden="true">·</span>
              <span>Authorized Provider Guaranteed</span>
            </div>

            <button
              type="button"
              onClick={onExecuteSearch}
              className="flex items-center justify-center gap-2 px-7 py-3 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-stone-950 text-white font-bold rounded-xl transition-all shadow-md text-xs uppercase tracking-wider whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              <span>Search {info.title.split(' ')[0]}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
