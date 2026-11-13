import React, { useState } from 'react';
import {
  Clock,
  ArrowRight,
  ShieldCheck,
  Star,
  Sparkles,
  Info,
  SlidersHorizontal,
  ChevronRight,
  AlertCircle,
  Bell,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Car,
  Compass,
  Bike,
  Zap,
} from 'lucide-react';
import { SearchFilterState, TransportCategory, TransportOption } from '../types/travel';
import { DatabaseConnectionState } from '../services/realtimeRides';

interface SearchResultsListProps {
  options: TransportOption[];
  filters: SearchFilterState;
  dbStatus?: DatabaseConnectionState;
  dbErrorMessage?: string;
  totalDatabaseRidesCount?: number;
  showAllCategories?: boolean;
  onToggleShowAllCategories?: () => void;
  onOpenAddRideModal?: (category?: TransportCategory) => void;
  onOpenSignIn?: () => void;
  onRetryDatabaseSync?: () => void;
  onUpdateFilters: (newFilters: Partial<SearchFilterState>) => void;
  onSelectOptionToBook: (option: TransportOption) => void;
  onSelectOptionToTrack: (option: TransportOption) => void;
  onOpenSetPriceAlert?: (routeInfo?: {
    origin: string;
    originCode?: string;
    destination: string;
    destCode?: string;
    category: TransportCategory;
    currentPrice?: number;
  }) => void;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  options,
  filters,
  dbStatus = 'connected',
  dbErrorMessage,
  totalDatabaseRidesCount = 0,
  showAllCategories = false,
  onToggleShowAllCategories,
  onOpenAddRideModal,
  onOpenSignIn,
  onRetryDatabaseSync,
  onUpdateFilters,
  onSelectOptionToBook,
  onSelectOptionToTrack,
  onOpenSetPriceAlert,
}) => {
  const [selectedFareDetailId, setSelectedFareDetailId] = useState<string | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);

  const rtdbRulesSnippet = `{
  "rules": {
    ".read": true,
    ".write": true
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard?.writeText(rtdbRulesSnippet).catch(() => {});
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
  };

  return (
    <div className="w-full">
      {/* Route Price Watch Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-stone-900 dark:text-white text-sm">
                Track Fares for {filters.origin || 'Route'} → {filters.destination || 'Destination'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300">
                Fare Drop Alert
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Set a price threshold. You'll receive instant in-app and Gmail notifications the second prices fall.
            </p>
          </div>
        </div>

        {onOpenSetPriceAlert && (
          <button
            type="button"
            onClick={() =>
              onOpenSetPriceAlert({
                origin: filters.origin,
                originCode: filters.originCode,
                destination: filters.destination,
                destCode: filters.destCode,
                category: filters.category,
                currentPrice: options.length > 0 ? Math.min(...options.map((o) => o.price)) : undefined,
              })
            }
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-black rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Set Price Alert</span>
          </button>
        )}
      </div>

      {/* Controls & Sorter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Available Real Rides ({options.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Firebase RTDB: ticket-life-c4b76
            </span>
            <span aria-hidden="true">·</span>
            <span>Live Real Rides Only</span>
            {onToggleShowAllCategories && totalDatabaseRidesCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onToggleShowAllCategories}
                  className="font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  {showAllCategories
                    ? `Showing All Categories (${totalDatabaseRidesCount})`
                    : `View All Categories (${totalDatabaseRidesCount})`}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Sort:
          </span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onUpdateFilters({ sortBy: 'price_asc' })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                filters.sortBy === 'price_asc'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Lowest Price
            </button>
            <button
              onClick={() => onUpdateFilters({ sortBy: 'duration_asc' })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                filters.sortBy === 'duration_asc'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Fastest
            </button>
            <button
              onClick={() => onUpdateFilters({ sortBy: 'rating_desc' })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                filters.sortBy === 'rating_desc'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Top Rated
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {options.length === 0 ? (
        <div className="text-center py-14 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />

          {dbStatus === 'connecting' ? (
            <>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Connecting to Firebase Database (ticket-life-c4b76)...
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Loading real rides from your Firebase Realtime Database.
              </p>
            </>
          ) : dbStatus === 'permission_denied' ? (
            <>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Firebase Realtime Database Read Blocked (Permission Denied)
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl mx-auto">
                Aapke database <span className="font-mono font-bold">ticket-life-c4b76-default-rtdb</span> par abhi Firebase Rules locked hain ({dbErrorMessage || 'PERMISSION_DENIED'}). Isliye rides load nahi ho pa rahi hain. Firebase Console mein neeche diye rules paste karke Publish karein:
              </p>
              <div className="mt-4 max-w-md mx-auto text-left p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800 relative">
                <pre className="whitespace-pre-wrap">{rtdbRulesSnippet}</pre>
                <button
                  type="button"
                  onClick={handleCopyRules}
                  className="mt-2 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-md text-[10px] font-sans font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedRules ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRules ? 'Rules Copied!' : 'Copy Rules JSON'}</span>
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {onRetryDatabaseSync && (
                  <button
                    type="button"
                    onClick={onRetryDatabaseSync}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Database Sync</span>
                  </button>
                )}
                <a
                  href="https://console.firebase.google.com/project/ticket-life-c4b76/database/ticket-life-c4b76-default-rtdb/rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Firebase RTDB Rules</span>
                </a>
                {onOpenSignIn && (
                  <button
                    type="button"
                    onClick={onOpenSignIn}
                    className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors cursor-pointer"
                  >
                    Sign In to Database
                  </button>
                )}
              </div>
            </>
          ) : totalDatabaseRidesCount > 0 ? (
            <>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                No {filters.category} rides found for this filter
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Your Firebase database has {totalDatabaseRidesCount} real ride(s) in other categories or routes.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {onToggleShowAllCategories && (
                  <button
                    type="button"
                    onClick={onToggleShowAllCategories}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                  >
                    Show All {totalDatabaseRidesCount} Real Rides
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ origin: '', destination: '', acOnly: false })}
                  className="px-4 py-2 text-xs font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/60 rounded-lg hover:bg-sky-100 transition-colors"
                >
                  Reset Route Filter
                </button>
              </div>
            </>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5 py-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Priority Dispatch Active</span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Live Mobility Hub — Book Your Next Ride
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-lg mx-auto">
                  Choose a Car, Auto Rickshaw, or Bike below for instant route scheduling, verified captain OTP, and Cashfree &amp; PhonePe checkout.
                </p>
              </div>

              {/* Special Quick-Dispatch Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-1">
                <button
                  type="button"
                  onClick={() => onOpenAddRideModal?.('cars')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 hover:border-emerald-500/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Car className="w-5 h-5 text-emerald-500" />
                    <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">Priority</span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-2">
                    Special Car Ride
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Sedan / SUV · Custom Route &amp; Fare
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAddRideModal?.('autos')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 hover:border-amber-500/60 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Compass className="w-5 h-5 text-amber-500" />
                    <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400">Fast Pickup</span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-2">
                    Auto Rickshaw
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    3-Wheeler · Quick City Hop
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAddRideModal?.('bikes')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 hover:border-sky-500/60 hover:bg-sky-50/40 dark:hover:bg-sky-950/20 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Bike className="w-5 h-5 text-sky-500" />
                    <span className="text-[10px] font-extrabold uppercase text-sky-600 dark:text-sky-400">Beat Traffic</span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white mt-2">
                    Express Bike Moto
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    2-Wheeler · Solo Express Ride
                  </div>
                </button>
              </div>

              {onOpenAddRideModal && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenAddRideModal(filters.category)}
                    className="px-6 py-2.5 text-xs font-black text-stone-950 bg-gradient-to-r from-emerald-400 to-amber-400 hover:from-emerald-300 hover:to-amber-300 rounded-xl transition-all inline-flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Request Special Custom Ride</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {options.map((item) => {
            const isFareOpen = selectedFareDetailId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all p-5 shadow-sm"
              >
                {/* Header row: Operator & Service Number */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {item.title}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Live DB Ride
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {item.serviceNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.vehicleType}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-600 dark:text-sky-400 font-medium">
                          {item.travelClass}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{item.rating}</span>
                      <span className="text-slate-400 font-normal">({item.reviewsCount})</span>
                    </div>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      {typeof item.availableSeats === 'number'
                        ? `${item.availableSeats} Available`
                        : item.availableSeats}
                    </span>
                  </div>
                </div>

                {/* Main Schedule & Price Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-4 items-center">
                  {/* Schedule Column */}
                  <div className="lg:col-span-8">
                    <div className="flex items-center justify-between gap-4">
                      {/* Origin */}
                      <div className="w-2/5">
                        <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {item.departureTime}
                        </div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                          {item.origin}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {item.originCode}{' '}
                          {item.originTerminalOrPlatform && `· ${item.originTerminalOrPlatform}`}
                        </div>
                      </div>

                      {/* Route divider */}
                      <div className="w-1/5 flex flex-col items-center">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {item.duration}
                        </span>
                        <div className="w-full flex items-center my-1">
                          <div className="h-[2px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
                          <ArrowRight className="w-4 h-4 text-sky-600 dark:text-sky-400 mx-1 shrink-0" />
                          <div className="h-[2px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Direct
                        </span>
                      </div>

                      {/* Destination */}
                      <div className="w-2/5 text-right">
                        <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {item.arrivalTime}
                        </div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                          {item.destination}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {item.destCode}{' '}
                          {item.destTerminalOrPlatform && `· ${item.destTerminalOrPlatform}`}
                        </div>
                      </div>
                    </div>

                    {/* Amenities list */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3.5 text-[11px] text-slate-600 dark:text-slate-400">
                      {item.amenities.slice(0, 4).map((amenity, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                          <span>{amenity}</span>
                        </span>
                      ))}
                    </div>

                    {/* Exact Address Mention */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-stone-500 dark:text-stone-400 flex flex-wrap items-center justify-between gap-2">
                      <span className="truncate max-w-[48%]">
                        📍 <strong>Boarding:</strong> {item.originAddress || `${item.originTerminalOrPlatform || 'Main Station/Bay'}, ${item.origin}`}
                      </span>
                      <span className="truncate max-w-[48%] text-right">
                        🏁 <strong>Drop:</strong> {item.destAddress || `${item.destination}, India`}
                      </span>
                    </div>
                  </div>

                  {/* Price & Booking Actions */}
                  <div className="lg:col-span-4 lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-6 flex flex-col justify-center items-start lg:items-end">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Total:
                      </span>
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                        ₹{item.price.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => setSelectedFareDetailId(isFareOpen ? null : item.id)}
                        className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
                      >
                        <Info className="w-3 h-3" />
                        <span>{isFareOpen ? 'Hide fare breakup' : 'View fare breakup'}</span>
                      </button>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        per traveler
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 flex items-center gap-2 w-full lg:w-auto">
                      {onOpenSetPriceAlert && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenSetPriceAlert({
                              origin: item.origin,
                              originCode: item.originCode,
                              destination: item.destination,
                              destCode: item.destCode,
                              category: item.category,
                              currentPrice: item.price,
                            })
                          }
                          className="p-2 text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                          title="Set Price Alert for this route"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      )}
                      {item.liveStatus && (
                        <button
                          onClick={() => onSelectOptionToTrack(item)}
                          className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Live Status
                        </button>
                      )}
                      <button
                        onClick={() => onSelectOptionToBook(item)}
                        className="flex-1 lg:flex-initial px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm shadow-sky-600/20 whitespace-nowrap flex items-center justify-center gap-1.5"
                      >
                        <span>Book Service</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Fare Breakdown Drawer */}
                {isFareOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Official Fare Breakdown & Authorized Charges
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-slate-500 dark:text-slate-400">Base Operator Fare</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                          ₹{item.baseFare.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400">Taxes, GST & Surcharges</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                          ₹{item.taxesAndFees.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400">Platform Convenience Fee</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                          ₹{item.platformFee.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400">Authorized Provider API</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 truncate">
                          {item.providerIntegration.partnerName}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
