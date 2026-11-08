import React, { useState } from 'react';
import {
  Sparkles,
  Plane,
  Train,
  Bus,
  Car,
  Compass,
  Bike,
  Clock,
  ArrowRight,
  RefreshCw,
  Mail,
  Radio,
  Ticket,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { TravelDigestItem } from '../types/travel';

interface TravelDigestCardProps {
  digestItems: TravelDigestItem[];
  isScanningGmail: boolean;
  onRefreshGmail: () => void;
  onOpenTicket: (bookingRefOrItem: TravelDigestItem) => void;
  onOpenLiveTracker: (item: TravelDigestItem) => void;
  onOpenGmailNotificationModal: () => void;
}

export const TravelDigestCard: React.FC<TravelDigestCardProps> = ({
  digestItems,
  isScanningGmail,
  onRefreshGmail,
  onOpenTicket,
  onOpenLiveTracker,
  onOpenGmailNotificationModal,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'flights' | 'trains' | 'mobility'>('all');

  const filteredItems = digestItems.filter((item) => {
    if (selectedCategoryFilter === 'all') return true;
    if (selectedCategoryFilter === 'flights') return item.category === 'flights';
    if (selectedCategoryFilter === 'trains') return item.category === 'trains';
    return item.category === 'cars' || item.category === 'buses' || item.category === 'autos' || item.category === 'bikes';
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'flights': return Plane;
      case 'trains': return Train;
      case 'buses': return Bus;
      case 'cars': return Car;
      case 'autos': return Compass;
      default: return Bike;
    }
  };

  return (
    <div className="w-full bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-7 shadow-xs">
      {/* Header with Title and Gmail Synchronization Affordance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            <span>TRAVEL DIGEST</span>
            <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
            <span className="text-stone-500 font-semibold tracking-normal lowercase first-letter:uppercase">
              parsed from Gmail & confirmed journeys
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight mt-1 font-serif sm:font-sans">
            Upcoming Journeys & Departure Schedule
          </h2>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGmailNotificationModal}
            className="px-3.5 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors flex items-center gap-1.5 border border-stone-200/60 dark:border-stone-700/60"
            title="Notification Center"
          >
            <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Email Alerts</span>
          </button>

          <button
            onClick={onRefreshGmail}
            disabled={isScanningGmail}
            className="px-4 py-2 text-xs font-bold text-stone-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl transition-colors border border-amber-200/80 dark:border-amber-800/80 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${isScanningGmail ? 'animate-spin' : ''}`} />
            <span>{isScanningGmail ? 'Scanning Gmail...' : 'Scan Gmail Itineraries'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 py-3.5 overflow-x-auto text-xs">
        <button
          onClick={() => setSelectedCategoryFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg font-bold uppercase tracking-wider text-[11px] transition-colors whitespace-nowrap ${
            selectedCategoryFilter === 'all'
              ? 'bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 shadow-xs'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          All Departures ({digestItems.length})
        </button>
        <button
          onClick={() => setSelectedCategoryFilter('trains')}
          className={`px-3.5 py-1.5 rounded-lg font-bold uppercase tracking-wider text-[11px] transition-colors whitespace-nowrap ${
            selectedCategoryFilter === 'trains'
              ? 'bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 shadow-xs'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          Trains ({digestItems.filter((i) => i.category === 'trains').length})
        </button>
        <button
          onClick={() => setSelectedCategoryFilter('flights')}
          className={`px-3.5 py-1.5 rounded-lg font-bold uppercase tracking-wider text-[11px] transition-colors whitespace-nowrap ${
            selectedCategoryFilter === 'flights'
              ? 'bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 shadow-xs'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          Flights ({digestItems.filter((i) => i.category === 'flights').length})
        </button>
        <button
          onClick={() => setSelectedCategoryFilter('mobility')}
          className={`px-3.5 py-1.5 rounded-lg font-bold uppercase tracking-wider text-[11px] transition-colors whitespace-nowrap ${
            selectedCategoryFilter === 'mobility'
              ? 'bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 shadow-xs'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          Cabs & Buses ({digestItems.filter((i) => i.category !== 'trains' && i.category !== 'flights').length})
        </button>
      </div>

      {/* Travel Digest Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 px-4 bg-stone-50/50 dark:bg-stone-800/30 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 space-y-2 mt-2">
          <Ticket className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
          <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">No Upcoming Journeys Yet</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Aapka travel schedule blank hai. Jab aap Ticket Life se ticket book karenge ya wallet top-up karke journey confirm karenge, tabhi yahan live schedule aur passes show honge.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {filteredItems.map((item) => {
            const Icon = getCategoryIcon(item.category);

            return (
              <div
                key={item.id}
              className="p-5 bg-stone-50/80 dark:bg-stone-800/40 rounded-2xl border border-stone-200/90 dark:border-stone-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all flex flex-col justify-between group shadow-xs"
            >
              <div>
                {/* Top Badge: Highlighted Upcoming Departure Time */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-stone-700/80">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-tight">
                      {item.departureCountdown}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-stone-500 font-mono font-bold">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>{item.departureTime}</span>
                  </div>
                </div>

                {/* Carrier & Service */}
                <div className="flex items-center gap-3 mt-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-stone-900 dark:text-white truncate">
                      {item.carrier}
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                      Service {item.serviceNumber} · {item.platformOrTerminal}
                    </div>
                  </div>
                </div>

                {/* Route Segment */}
                <div className="mt-3.5 p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-700/80">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-stone-900 dark:text-white text-base font-mono">
                        {item.originCode}
                      </span>
                      <span className="block text-[11px] text-stone-500 truncate max-w-[100px]">
                        {item.origin}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-[9px] text-stone-400 font-mono uppercase font-bold tracking-widest">Direct</span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-stone-900 dark:text-white text-base font-mono">
                        {item.destCode}
                      </span>
                      <span className="block text-[11px] text-stone-500 truncate max-w-[100px]">
                        {item.destination}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500">
                  <span>Authorized PNR / Ref:</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                    {item.pnrOrRef}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3.5 mt-3.5 border-t border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenLiveTracker(item)}
                  className="text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-amber-600 flex items-center gap-1"
                >
                  <Radio className="w-3.5 h-3.5 text-amber-500" />
                  <span>Live Status</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTicket(item)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-stone-900 dark:bg-amber-500 dark:text-stone-950 hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                >
                  <span>Boarding Pass</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
};
