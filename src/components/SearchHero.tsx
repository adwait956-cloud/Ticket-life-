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
import { SearchFilterState, TransportCategory } from '../types/travel';
import { IndiaPlaceInput } from './IndiaPlaceInput';
import { WeatherWidget } from './WeatherWidget';

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
  const handleSwapLocations = () => {
    onUpdateFilters({
      origin: filters.destination,
      originCode: filters.destCode,
      originCoords: filters.destCoords,
      destination: filters.origin,
      destCode: filters.originCode,
      destCoords: filters.originCoords,
    });
  };

  const getCategoryHeading = () => {
    switch (filters.category) {
      case 'cars':
        return {
          title: 'Cars & Private Chauffeur Rides',
          subtitle: 'Live verified cars, cabs, and chauffeur pickups directly from your Firebase Realtime Database.',
          badge: 'Ticket Life Mobility Fleet',
        };
      case 'autos':
        return {
          title: 'Local Auto Rickshaw Booking',
          subtitle: 'Transparent meter fares and eco-friendly electric auto rickshaws with instant ride OTP.',
          badge: 'City Meter Dispatch',
        };
      case 'bikes':
        return {
          title: 'Fast Bike Taxi & Cruiser Rentals',
          subtitle: 'Beat city traffic on quick bike taxi rides or book a verified commuter two-wheeler.',
          badge: 'Insured Commuter Fleet',
        };
    }
  };

  const info = getCategoryHeading();

  // Smart Fare Calendar State
  const [showFareCalendar, setShowFareCalendar] = useState(false);

  // Generate 30-day price fluctuation data for selected route and category
  const fareCalendarData = React.useMemo(() => {
    // Base fare estimation by category
    const categoryBaseRates: Record<TransportCategory, number> = {
      cars: 450,
      autos: 160,
      bikes: 85,
    };

    const baseRate = categoryBaseRates[filters.category] || 1000;
    const today = new Date();

    // Deterministic pseudo-random helper based on route string
    const routeSeed = (filters.origin + filters.destination).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${dayNum}`;

      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue, etc.
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });

      // Realistic weekday/weekend pricing model
      // Fri/Sat/Sun have weekend peak surge
      // Tue/Wed have mid-week super saver discounts
      let multiplier = 1.0;
      if (dayOfWeek === 'Fri') multiplier = 1.18;
      else if (dayOfWeek === 'Sat') multiplier = 1.25;
      else if (dayOfWeek === 'Sun') multiplier = 1.22;
      else if (dayOfWeek === 'Mon') multiplier = 1.05;
      else if (dayOfWeek === 'Tue') multiplier = 0.88;
      else if (dayOfWeek === 'Wed') multiplier = 0.85;
      else if (dayOfWeek === 'Thu') multiplier = 0.95;

      // Last minute surge for today/tomorrow
      if (i === 0) multiplier *= 1.2;
      else if (i === 1) multiplier *= 1.12;
      // Advance saver for 2 weeks ahead
      else if (i >= 12 && i <= 18) multiplier *= 0.92;

      // Small deterministic variance (+-5%) based on day index and seed
      const variance = ((Math.sin(routeSeed + i * 7) + 1) / 2) * 0.1 - 0.05;
      multiplier += variance;

      // Calculate final fare rounded to neat step
      const step = filters.category === 'cars' ? 50 : 10;
      const fare = Math.max(step, Math.round((baseRate * multiplier) / step) * step);

      days.push({
        date: d,
        dateString,
        dayOfWeek,
        monthShort,
        dayNum,
        fare,
        isWeekend: dayOfWeek === 'Sat' || dayOfWeek === 'Sun',
      });
    }

    const minFare = Math.min(...days.map((d) => d.fare));
    const maxFare = Math.max(...days.map((d) => d.fare));
    const avgFare = Math.round(days.reduce((acc, d) => acc + d.fare, 0) / days.length);
    const cheapestDay = days.find((d) => d.fare === minFare) || days[0];

    return {
      days,
      minFare,
      maxFare,
      avgFare,
      cheapestDay,
    };
  }, [filters.category, filters.origin, filters.destination]);

  const handleSelectCalendarDate = (dateString: string) => {
    onUpdateFilters({ departDate: dateString });
    onExecuteSearch();
  };

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
        <div className="max-w-3xl mb-6">
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

        {/* Live Weather Widget */}
        <WeatherWidget
          origin={filters.origin}
          originCoords={filters.originCoords}
          destination={filters.destination}
          destCoords={filters.destCoords}
        />

        {/* Search Matrix */}
        <div className="bg-white dark:bg-stone-900/90 rounded-2xl p-4 sm:p-6 text-stone-900 dark:text-white shadow-2xl border border-stone-200 dark:border-stone-800 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800 text-xs font-semibold">
            <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Route Pricing & Verified Dispatch (Cars · Auto Rickshaws · Bikes)</span>
            </div>

            {/* Smart Fare Calendar Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFareCalendar(!showFareCalendar)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
                showFareCalendar
                  ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-amber-500/20'
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Smart Fare Calendar (30 Days)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-stone-900/10 dark:bg-white/10 font-mono">
                {showFareCalendar ? 'Close' : 'View'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Origin */}
            <div className="relative md:col-span-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                From / Pickup (Nashik &amp; All India)
              </label>
              <IndiaPlaceInput
                value={filters.origin}
                onChangeText={(text) =>
                  onUpdateFilters({ origin: text, originCoords: undefined })
                }
                onSelectPlace={(place) =>
                  onUpdateFilters({
                    origin: place.name,
                    originCode: place.shortCode,
                    originCoords: { lat: place.lat, lng: place.lng },
                  })
                }
                biasMode="nashik"
                placeholder="Pickup in Nashik or any Indian city..."
                iconColorClassName="text-emerald-500"
              />
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
              <IndiaPlaceInput
                value={filters.destination}
                onChangeText={(text) =>
                  onUpdateFilters({ destination: text, destCoords: undefined })
                }
                onSelectPlace={(place) =>
                  onUpdateFilters({
                    destination: place.name,
                    destCode: place.shortCode,
                    destCoords: { lat: place.lat, lng: place.lng },
                  })
                }
                biasMode="nashik"
                placeholder="Drop location across India..."
                iconColorClassName="text-rose-500"
              />
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

          {/* SMART FARE CALENDAR VIEW (30-DAY BAR CHART) */}
          {showFareCalendar && (
            <div className="mt-5 pt-5 border-t border-stone-200 dark:border-stone-800 animate-in fade-in duration-300">
              {/* Header with Stats & Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-stone-900 dark:text-white">
                      30-Day Fare Trend: {filters.origin || 'Origin'} ➔ {filters.destination || 'Destination'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                      Live Bar Chart
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Click any day's bar below to instantly select that date and view live fares.
                  </p>
                </div>

                {/* Quick Info & Cheapest Day Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 text-[11px] px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                    <span className="text-stone-400">Lowest:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ₹{fareCalendarData.minFare.toLocaleString('en-IN')}
                    </span>
                    <span className="text-stone-300 dark:text-stone-700">·</span>
                    <span className="text-stone-400">Avg:</span>
                    <span className="font-bold text-stone-700 dark:text-stone-300 font-mono">
                      ₹{fareCalendarData.avgFare.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectCalendarDate(fareCalendarData.cheapestDay.dateString)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                    title={`Select cheapest day: ${fareCalendarData.cheapestDay.dateString}`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Select Cheapest ({fareCalendarData.cheapestDay.dayNum} {fareCalendarData.cheapestDay.monthShort} · ₹{fareCalendarData.cheapestDay.fare})</span>
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-stone-400 mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0"></span>
                  <span>Lowest / Saver Fare</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0"></span>
                  <span>Average / Standard</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0"></span>
                  <span>Weekend Peak Surge</span>
                </div>
              </div>

              {/* 30-Day Bar Chart Viewport */}
              <div className="relative bg-stone-50 dark:bg-stone-950/60 rounded-2xl p-4 border border-stone-200 dark:border-stone-800/80 overflow-x-auto scrollbar-thin">
                <div className="flex items-end gap-2 min-w-[780px] h-48 pt-6 pb-2 px-1">
                  {fareCalendarData.days.map((day) => {
                    const isSelected = filters.departDate === day.dateString;
                    const isLowest = day.fare === fareCalendarData.minFare;

                    // Calculate height percentage normalized between 28% and 100%
                    const range = Math.max(1, fareCalendarData.maxFare - fareCalendarData.minFare);
                    const normalized = ((day.fare - fareCalendarData.minFare) / range);
                    const barHeightPercent = Math.round(28 + normalized * 68);

                    // Color determination
                    let barColor = 'bg-amber-400 hover:bg-amber-500';
                    if (isLowest || day.fare <= fareCalendarData.minFare * 1.06) {
                      barColor = 'bg-emerald-500 hover:bg-emerald-400';
                    } else if (day.isWeekend || day.fare >= fareCalendarData.maxFare * 0.9) {
                      barColor = 'bg-rose-500 hover:bg-rose-400';
                    }

                    return (
                      <button
                        key={day.dateString}
                        type="button"
                        onClick={() => handleSelectCalendarDate(day.dateString)}
                        className={`flex-1 flex flex-col items-center justify-end h-full group focus:outline-none transition-all ${
                          isSelected ? 'scale-105' : 'hover:scale-102'
                        }`}
                        title={`${day.dayOfWeek}, ${day.dayNum} ${day.monthShort}: ₹${day.fare.toLocaleString('en-IN')}${isLowest ? ' (Lowest Fare!)' : ''}`}
                      >
                        {/* Fare Price label on top */}
                        <div className="mb-1.5 text-center">
                          {isLowest && (
                            <span className="inline-block text-[9px] font-black uppercase tracking-wider px-1 py-0.2 bg-emerald-600 text-white rounded shadow-xs mb-0.5">
                              Best
                            </span>
                          )}
                          <span
                            className={`block text-[10px] font-bold font-mono ${
                              isSelected
                                ? 'text-sky-600 dark:text-sky-400 font-black'
                                : isLowest
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-stone-600 dark:text-stone-400'
                            }`}
                          >
                            ₹{day.fare >= 1000 ? `${(day.fare / 1000).toFixed(1)}k` : day.fare}
                          </span>
                        </div>

                        {/* Bar Pillar */}
                        <div className="w-full max-w-[22px] flex items-end justify-center h-28">
                          <div
                            style={{ height: `${barHeightPercent}%` }}
                            className={`w-full rounded-t-md transition-all duration-300 relative ${barColor} ${
                              isSelected
                                ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-stone-900 shadow-md'
                                : ''
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-white animate-pulse" />
                            )}
                          </div>
                        </div>

                        {/* Date and Day label at bottom */}
                        <div
                          className={`mt-2 text-center pt-1 border-t w-full transition-colors ${
                            isSelected
                              ? 'border-sky-500 font-black text-sky-600 dark:text-sky-400'
                              : 'border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                          }`}
                        >
                          <div className="text-[11px] font-extrabold leading-none">{day.dayNum}</div>
                          <div className="text-[9px] uppercase tracking-wider mt-0.5">{day.dayOfWeek}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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

