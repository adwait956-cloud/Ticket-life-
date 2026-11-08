import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Ticket,
  Radio,
  Mail,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Car,
  Compass,
  Bus,
  Plane,
  Train,
  Bike,
  Sparkles,
} from 'lucide-react';
import { BookingRecord, TransportCategory } from '../types/travel';

interface TravelHistoryViewProps {
  bookings: BookingRecord[];
  onOpenTicket: (booking: BookingRecord) => void;
  onOpenLiveTracker: (booking: BookingRecord) => void;
  onOpenGmailConfirm: (booking: BookingRecord) => void;
  onBookAgain?: (category: TransportCategory, origin: string, dest: string) => void;
}

export const TravelHistoryView: React.FC<TravelHistoryViewProps> = ({
  bookings,
  onOpenTicket,
  onOpenLiveTracker,
  onOpenGmailConfirm,
  onBookAgain,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getCategoryIcon = (cat: TransportCategory) => {
    switch (cat) {
      case 'trains':
        return <Train className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'flights':
        return <Plane className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'buses':
        return <Bus className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case 'cars':
        return <Car className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'autos':
        return <Compass className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'bikes':
        return <Bike className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <Ticket className="w-4 h-4" />;
    }
  };

  const filtered = bookings.filter((b) => {
    if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && b.bookingStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRoute = `${b.origin} ${b.destination} ${b.originCode} ${b.destCode}`.toLowerCase().includes(q);
      const matchService = b.serviceTitle.toLowerCase().includes(q);
      const matchRef = (b.bookingRef + (b.pnrNumber || '')).toLowerCase().includes(q);
      const matchPax = b.passengers.some((p) => p.fullName.toLowerCase().includes(q));
      if (!matchRoute && !matchService && !matchRef && !matchPax) return false;
    }
    return true;
  });

  // Calculate statistics
  const completedTrips = bookings.filter((b) => b.bookingStatus === 'completed');
  const upcomingTrips = bookings.filter((b) => b.bookingStatus === 'confirmed');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            TRAVEL LOGS ARCHIVE · 3RD HUB
          </span>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
            Travelling History
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Pura travel record: travel kab hua, kidhar se kidhar gaye the, exact addresses, dates, seat numbers, and boarding passes.
          </p>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 text-xs shadow-xs">
            <span className="text-stone-400 text-[10px] uppercase font-bold block">Upcoming Trips</span>
            <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {upcomingTrips.length} scheduled
            </span>
          </div>
          <div className="px-3.5 py-1.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 text-xs shadow-xs">
            <span className="text-stone-400 text-[10px] uppercase font-bold block">Completed Journeys</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {completedTrips.length} finished
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              categoryFilter === 'all'
                ? 'bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            All Modes ({bookings.length})
          </button>
          {[
            { id: 'trains', label: 'Trains' },
            { id: 'flights', label: 'Flights' },
            { id: 'buses', label: 'Buses' },
            { id: 'cars', label: 'Cars' },
            { id: 'autos', label: 'Autos' },
            { id: 'bikes', label: 'Bikes' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station, city, PNR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-900 dark:text-white focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg font-bold text-stone-700 dark:text-stone-300 focus:outline-none"
          >
            <option value="all">All Journeys</option>
            <option value="confirmed">Upcoming Only</option>
            <option value="completed">Completed Only</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* TRAVEL LOGS TIMELINE CARDS */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 space-y-3">
          <MapPin className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
          <h4 className="text-sm font-bold text-stone-900 dark:text-white">
            No journeys match your filter
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try resetting your search query or mode filter to view your travel archives.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const isCompleted = b.bookingStatus === 'completed';
            const isUpcoming = b.bookingStatus === 'confirmed';
            const isCancelled = b.bookingStatus === 'cancelled';

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all space-y-5"
              >
                {/* Row 1: Category, Service, Status Badge & Travel Date ("Travel kab hua") */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                      {getCategoryIcon(b.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-stone-900 dark:text-white">
                          {b.serviceTitle}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono">
                          {b.serviceNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400">
                        Operated by {b.providerName}
                      </span>
                    </div>
                  </div>

                  {/* Travel Date Badge ("Kab hua") */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-50 dark:bg-stone-800/80 rounded-lg text-xs font-bold text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{b.departureDate}</span>
                      <span className="text-stone-400 font-normal">at {b.departureTime}</span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        isUpcoming
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : isCompleted
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {b.bookingStatus}
                    </span>
                  </div>
                </div>

                {/* Row 2: Route & Addresses ("Kidhar se kidhar gaye the") */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-stone-50/70 dark:bg-stone-800/40 p-4 rounded-xl border border-stone-200/70 dark:border-stone-700/60">
                  {/* Origin */}
                  <div className="md:col-span-5 space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      From (Starting Point)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black font-mono text-stone-900 dark:text-white">
                        {b.originCode}
                      </span>
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        {b.origin}
                      </span>
                    </div>
                    <div className="flex items-start gap-1 text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <span>{b.originAddress || `${b.terminalOrPlatform || 'Main Station/Bay'}, ${b.origin}`}</span>
                    </div>
                  </div>

                  {/* Arrow Indicator & Duration */}
                  <div className="md:col-span-2 flex flex-col items-center justify-center py-1">
                    <span className="text-[10px] font-mono text-stone-400 font-bold">
                      {b.duration}
                    </span>
                    <div className="w-full flex items-center my-1">
                      <div className="h-0.5 flex-1 bg-stone-300 dark:bg-stone-700" />
                      <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-1 shrink-0" />
                      <div className="h-0.5 flex-1 bg-stone-300 dark:bg-stone-700" />
                    </div>
                    <span className="text-[10px] text-stone-400">Direct Route</span>
                  </div>

                  {/* Destination */}
                  <div className="md:col-span-5 space-y-1 md:text-right">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400 flex items-center md:justify-end gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      To (Destination Point)
                    </span>
                    <div className="flex items-baseline md:justify-end gap-2">
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        {b.destination}
                      </span>
                      <span className="text-lg font-black font-mono text-stone-900 dark:text-white">
                        {b.destCode}
                      </span>
                    </div>
                    <div className="flex items-start md:justify-end gap-1 text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <span>{b.destAddress || `${b.destination}, India`}</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: Travelers, Seat Info, References & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <span className="text-stone-400 text-[10px] font-bold block uppercase">
                        Traveler(s)
                      </span>
                      <strong className="text-stone-800 dark:text-stone-200">
                        {b.passengers.map((p) => p.fullName).join(', ')}
                      </strong>
                    </div>

                    <div>
                      <span className="text-stone-400 text-[10px] font-bold block uppercase">
                        Seat / Berth Info
                      </span>
                      <strong className="font-mono text-amber-700 dark:text-amber-400">
                        {b.seatNumbers.join(', ')}
                      </strong>
                    </div>

                    <div>
                      <span className="text-stone-400 text-[10px] font-bold block uppercase">
                        {b.category === 'trains' || b.category === 'flights' ? 'Authorized PNR' : 'Ride Ref'}
                      </span>
                      <strong className="font-mono text-stone-700 dark:text-stone-300">
                        {b.pnrNumber || b.providerRef}
                      </strong>
                    </div>

                    <div>
                      <span className="text-stone-400 text-[10px] font-bold block uppercase">
                        Fare Paid
                      </span>
                      <strong className="font-mono text-stone-900 dark:text-white font-extrabold">
                        ₹{b.fareBreakdown.totalAmount.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* View Boarding Pass Button */}
                    <button
                      onClick={() => onOpenTicket(b)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>View Confirmed Ticket</span>
                    </button>

                    {/* Live Tracker Button */}
                    <button
                      onClick={() => onOpenLiveTracker(b)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl text-xs transition-colors"
                      title="Open Live Radar & GPS Tracker"
                    >
                      <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Live Tracker</span>
                    </button>

                    {/* Gmail Dispatch Button */}
                    <button
                      onClick={() => onOpenGmailConfirm(b)}
                      className="p-2 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
                      title="Deliver official boarding pass to your Gmail inbox"
                    >
                      <Mail className="w-4 h-4" />
                    </button>

                    {/* Book Again Shortcut */}
                    {onBookAgain && (
                      <button
                        onClick={() => onBookAgain(b.category, b.origin, b.destination)}
                        className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
                        title="Book this exact route again"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
