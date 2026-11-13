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
  Bike,
  Sparkles,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { BookingRecord, TransportCategory } from '../types/travel';

interface TravelHistoryViewProps {
  bookings: BookingRecord[];
  onOpenTicket: (booking: BookingRecord) => void;
  onOpenLiveTracker: (booking: BookingRecord) => void;
  onOpenGmailConfirm: (booking: BookingRecord) => void;
  onBookAgain?: (category: TransportCategory, origin: string, dest: string) => void;
  onToggleAdmin?: () => void;
}

export const TravelHistoryView: React.FC<TravelHistoryViewProps> = ({
  bookings,
  onOpenTicket,
  onOpenLiveTracker,
  onOpenGmailConfirm,
  onBookAgain,
  onToggleAdmin,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getCategoryIcon = (cat: TransportCategory) => {
    switch (cat) {
      case 'cars':
        return <Car className="w-5 h-5 text-[#00ff88]" />;
      case 'autos':
        return <Compass className="w-5 h-5 text-[#00ff88]" />;
      case 'bikes':
        return <Bike className="w-5 h-5 text-[#00ff88]" />;
      default:
        return <Ticket className="w-5 h-5 text-[#00ff88]" />;
    }
  };

  const filtered = bookings.filter((b) => {
    if (categoryFilter === 'cars' && b.category !== 'cars') return false;
    if (categoryFilter === 'autos' && b.category !== 'autos') return false;
    if (categoryFilter === 'bikes' && b.category !== 'bikes') return false;
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
  const upcomingTrips = bookings.filter(
    (b) => b.bookingStatus === 'confirmed' || b.bookingStatus === 'in_progress'
  );

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-[300px_1fr] border border-[#26262b] rounded-2xl overflow-hidden bg-[#0c0c0e] text-white">
      {/* SIDEBAR: Archive Metrics & Filter Console */}
      <aside className="p-6 border-b lg:border-b-0 lg:border-r border-[#26262b] flex flex-col gap-6 bg-[#0c0c0e]">
        {/* ARCHIVE METRICS */}
        <div>
          <span className="font-mono-code text-[10px] tracking-widest uppercase text-[#00ff88] block mb-2">
            ARCHIVE METRICS
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#16161a] border border-[#26262b] p-3.5 rounded-lg">
              <span className="font-mono-code text-2xl font-bold block mb-1 text-white">
                {String(upcomingTrips.length).padStart(2, '0')}
              </span>
              <span className="text-white/50 text-[11px] uppercase tracking-wider block">
                Upcoming
              </span>
            </div>

            <div className="bg-[#16161a] border border-[#26262b] p-3.5 rounded-lg">
              <span className="font-mono-code text-2xl font-bold block mb-1 text-white">
                {String(completedTrips.length).padStart(2, '0')}
              </span>
              <span className="text-white/50 text-[11px] uppercase tracking-wider block">
                Finished
              </span>
            </div>
          </div>
        </div>

        {/* SEARCH INPUT */}
        <div>
          <span className="font-mono-code text-[10px] tracking-widest uppercase text-[#00ff88] block mb-2">
            SEARCH ARCHIVE
          </span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station, city, PNR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#16161a] border border-[#26262b] rounded-lg text-xs font-mono-code text-white placeholder-white/40 focus:outline-none focus:border-[#00ff88]"
            />
          </div>
        </div>

        {/* FILTER CONSOLE */}
        <div>
          <span className="font-mono-code text-[10px] tracking-widest uppercase text-[#00ff88] block mb-2">
            FILTER CONSOLE
          </span>
          <div className="flex flex-col gap-2 font-mono-code text-xs">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`text-left px-3.5 py-2.5 rounded border transition-colors uppercase cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-[#16161a] text-[#00ff88] border-[#00ff88] font-bold'
                  : 'text-white/50 border-[#26262b] hover:text-white hover:border-white/30'
              }`}
            >
              All Modes ({bookings.length})
            </button>

            <button
              onClick={() => setCategoryFilter('cars')}
              className={`text-left px-3.5 py-2.5 rounded border transition-colors uppercase cursor-pointer ${
                categoryFilter === 'cars'
                  ? 'bg-[#16161a] text-[#00ff88] border-[#00ff88] font-bold'
                  : 'text-white/50 border-[#26262b] hover:text-white hover:border-white/30'
              }`}
            >
              Cars Only
            </button>

            <button
              onClick={() => setCategoryFilter('autos')}
              className={`text-left px-3.5 py-2.5 rounded border transition-colors uppercase cursor-pointer ${
                categoryFilter === 'autos'
                  ? 'bg-[#16161a] text-[#00ff88] border-[#00ff88] font-bold'
                  : 'text-white/50 border-[#26262b] hover:text-white hover:border-white/30'
              }`}
            >
              Auto Rickshaws Only
            </button>

            <button
              onClick={() => setCategoryFilter('bikes')}
              className={`text-left px-3.5 py-2.5 rounded border transition-colors uppercase cursor-pointer ${
                categoryFilter === 'bikes'
                  ? 'bg-[#16161a] text-[#00ff88] border-[#00ff88] font-bold'
                  : 'text-white/50 border-[#26262b] hover:text-white hover:border-white/30'
              }`}
            >
              Bikes Only
            </button>
          </div>
        </div>

        {/* STATUS FILTER */}
        <div>
          <span className="font-mono-code text-[10px] tracking-widest uppercase text-white/50 block mb-2">
            TRIP STATUS
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#16161a] border border-[#26262b] rounded text-xs font-mono-code text-white focus:outline-none focus:border-[#00ff88]"
          >
            <option value="all">ALL JOURNEYS</option>
            <option value="confirmed">UPCOMING (OTP READY)</option>
            <option value="in_progress">LIVE MAP IN PROGRESS</option>
            <option value="completed">FINISHED ONLY</option>
            <option value="cancelled">CANCELLED</option>
          </select>
        </div>

        {/* ADMIN CONTROL SHORTCUT */}
        {onToggleAdmin && (
          <div className="pt-2 border-t border-[#26262b]">
            <button
              onClick={onToggleAdmin}
              className="w-full py-2 px-3 border border-[#26262b] hover:border-[#00ff88] text-white/60 hover:text-[#00ff88] rounded font-mono-code text-xs uppercase transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ADMIN CONTROL</span>
            </button>
          </div>
        )}
      </aside>

      {/* CONTENT: Audit Stream // Recent Logs */}
      <main className="p-6 sm:p-8 overflow-y-auto bg-[radial-gradient(circle_at_50%_-20%,#1a2c24_0%,#0c0c0e_60%)]">
        <div className="mb-6">
          <span className="font-mono-code text-[10px] uppercase tracking-widest text-[#00ff88] block mb-1">
            AUDIT STREAM // RECENT LOGS
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Travelling History
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Official travel audit log: dates, departure timestamps, boarding station coordinates, and validated PNRs.
          </p>
        </div>

        {/* TICKET TABLE-STYLE LIST */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-[#16161a] border border-[#26262b] rounded-xl p-8 space-y-3 font-mono-code">
            <span className="text-[#00ff88] text-lg block">NO_ENTRIES_FOUND</span>
            <p className="text-xs text-white/50">
              Zero records matching selected criteria. Reset filters to inspect all travel history logs.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((b) => {
              const isUpcoming = b.bookingStatus === 'confirmed';
              const isCompleted = b.bookingStatus === 'completed';

              return (
                <div
                  key={b.id}
                  className="bg-[#16161a] border border-[#26262b] hover:border-[#00ff88]/60 transition-colors rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-[70px_1fr_160px]"
                >
                  {/* Column 1: Mode Icon */}
                  <div className="bg-[#111] p-4 flex md:flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#26262b]">
                    <div className="w-10 h-10 rounded-lg bg-[#16161a] border border-[#26262b] flex items-center justify-center">
                      {getCategoryIcon(b.category)}
                    </div>
                  </div>

                  {/* Column 2: Details */}
                  <div className="p-5 flex flex-col justify-between gap-4">
                    {/* Location Pair */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono-code bg-white/5 px-2 py-0.5 rounded text-xs text-[#00ff88] font-bold">
                          {b.originCode}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-white">{b.origin}</span>
                          <span className="text-[10px] text-white/50">{b.originAddress || 'Terminal / Platform'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-white/40 font-mono-code text-xs px-2">
                        <span>---&gt;</span>
                      </div>

                      <div className="flex items-center gap-3 sm:text-right">
                        <div className="flex flex-col sm:items-end">
                          <span className="font-bold text-sm text-white">{b.destination}</span>
                          <span className="text-[10px] text-white/50">{b.destAddress || 'Station / City'}</span>
                        </div>
                        <span className="font-mono-code bg-white/5 px-2 py-0.5 rounded text-xs text-[#00ff88] font-bold">
                          {b.destCode}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-[#26262b]">
                      <div>
                        <span className="text-white/40 block text-[10px] uppercase font-mono-code">Service</span>
                        <span className="font-mono-code font-bold text-white/90 truncate block">
                          {b.serviceNumber || b.serviceTitle}
                        </span>
                      </div>

                      <div>
                        <span className="text-white/40 block text-[10px] uppercase font-mono-code">
                          Ride Ref
                        </span>
                        <span className="font-mono-code font-bold text-[#00ff88] truncate block">
                          {b.pnrNumber || b.bookingRef}
                        </span>
                      </div>

                      <div>
                        <span className="text-white/40 block text-[10px] uppercase font-mono-code">Seating / Pax</span>
                        <span className="font-mono-code text-white/90 truncate block">
                          {b.seatNumbers?.length ? b.seatNumbers.join(', ') : 'Assigned Seat'}
                        </span>
                      </div>

                      <div>
                        <span className="text-white/40 block text-[10px] uppercase font-mono-code">Payment / Date</span>
                        <span className="font-mono-code font-bold text-white block">
                          ₹{b.fareBreakdown.totalAmount.toLocaleString('en-IN')}{' '}
                          {b.paymentStatus === 'pay_after_ride' ? '(Pay Driver)' : ''} · {b.departureDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Action Buttons */}
                  <div className="p-4 bg-white/[0.02] border-t md:border-t-0 md:border-l border-[#26262b] flex flex-col justify-center gap-2 font-mono-code text-xs">
                    {/* Status Dot & Badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="ticket-status-dot"></span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#00ff88]">
                        {b.bookingStatus === 'in_progress' ? 'LIVE MAP' : b.bookingStatus}
                      </span>
                    </div>

                    {/* Live Map / OTP (btn-primary neon green #00ff88) */}
                    <button
                      onClick={() => onOpenLiveTracker(b)}
                      className="w-full py-2 px-3 bg-[#00ff88] hover:bg-[#00e67a] text-black font-extrabold text-[11px] uppercase rounded transition-colors text-center cursor-pointer"
                    >
                      {b.bookingStatus === 'confirmed'
                        ? 'OTP & LIVE MAP'
                        : b.bookingStatus === 'in_progress'
                        ? 'TRACK & END RIDE'
                        : 'ROUTE MAP'}
                    </button>

                    {/* Download / View Ticket (btn-outline) */}
                    <button
                      onClick={() => onOpenTicket(b)}
                      className="w-full py-2 px-3 bg-transparent border border-[#26262b] hover:border-white/50 text-white/70 hover:text-white font-bold text-[11px] uppercase rounded transition-colors text-center cursor-pointer"
                    >
                      DOWNLOAD
                    </button>

                    {/* Gmail Dispatch shortcut */}
                    <button
                      onClick={() => onOpenGmailConfirm(b)}
                      className="w-full py-1.5 px-2 text-[10px] text-white/40 hover:text-[#00ff88] transition-colors text-center uppercase"
                      title="Send ticket copy to Gmail"
                    >
                      SYNC_GMAIL
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
