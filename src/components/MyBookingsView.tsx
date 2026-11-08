import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Printer,
  Mail,
  Radio,
  AlertTriangle,
  ArrowRight,
  Search,
  Ticket,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { BookingRecord } from '../types/travel';
import { fetchTravelEmails, GmailMessageSummary } from '../services/gmailService';
import { getAccessToken, googleSignIn } from '../services/firebaseAuth';

interface MyBookingsViewProps {
  bookings: BookingRecord[];
  onOpenTicket: (booking: BookingRecord) => void;
  onOpenLiveTracker: (booking: BookingRecord) => void;
  onOpenGmailConfirm: (booking: BookingRecord) => void;
  onOpenCancelModal: (booking: BookingRecord) => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  bookings,
  onOpenTicket,
  onOpenLiveTracker,
  onOpenGmailConfirm,
  onOpenCancelModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Gmail sync state
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  const [syncedGmailEmails, setSyncedGmailEmails] = useState<GmailMessageSummary[]>([]);
  const [gmailSyncMessage, setGmailSyncMessage] = useState('');

  const handleSyncGmail = async () => {
    setIsSyncingGmail(true);
    setGmailSyncMessage('');

    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      }

      if (!token) {
        setGmailSyncMessage('Google authentication required to scan Gmail for travel itineraries.');
        setIsSyncingGmail(false);
        return;
      }

      const emails = await fetchTravelEmails(token);
      setSyncedGmailEmails(emails);
      if (emails.length === 0) {
        setGmailSyncMessage('No external travel emails found in your connected Gmail inbox.');
      } else {
        setGmailSyncMessage(`Found ${emails.length} travel confirmation(s) in your Gmail account.`);
      }
    } catch (err: any) {
      console.error('Error syncing Gmail:', err);
      setGmailSyncMessage('Unable to access Gmail. Please ensure permissions are granted.');
    } finally {
      setIsSyncingGmail(false);
    }
  };

  const filtered = bookings.filter((b) => {
    if (activeSubTab === 'cancelled') {
      return b.bookingStatus === 'cancelled';
    }
    if (activeSubTab === 'completed') {
      return b.bookingStatus === 'completed';
    }
    // upcoming
    return b.bookingStatus === 'confirmed';
  }).filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.bookingRef.toLowerCase().includes(q) ||
      (b.pnrNumber && b.pnrNumber.toLowerCase().includes(q)) ||
      b.serviceTitle.toLowerCase().includes(q) ||
      b.origin.toLowerCase().includes(q) ||
      b.destination.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Travel Bookings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your confirmed tickets, download receipts, track live journeys, and request refunds.
          </p>
        </div>

        {/* Gmail Sync Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncGmail}
            disabled={isSyncingGmail}
            className="px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg transition-colors border border-red-200 dark:border-red-800 flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGmail ? 'animate-spin' : ''}`} />
            <span>{isSyncingGmail ? 'Scanning Gmail...' : 'Scan Gmail for Bookings'}</span>
          </button>
        </div>
      </div>

      {/* Gmail Synced Inboxes Banner if found */}
      {gmailSyncMessage && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-red-500" />
            <span>{gmailSyncMessage}</span>
          </div>

          {syncedGmailEmails.length > 0 && (
            <div className="space-y-2 mt-3">
              {syncedGmailEmails.map((msg) => (
                <div
                  key={msg.id}
                  className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-md">
                      {msg.subject}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {msg.from} · {msg.date}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded">
                    Gmail Verified
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 self-start">
          <button
            onClick={() => setActiveSubTab('upcoming')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeSubTab === 'upcoming'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Upcoming Trips
          </button>
          <button
            onClick={() => setActiveSubTab('completed')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeSubTab === 'completed'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveSubTab('cancelled')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeSubTab === 'cancelled'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Cancelled & Refunds
          </button>
        </div>

        {/* Search by PNR or destination */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PNR or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
          />
        </div>
      </div>

      {/* Bookings List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Ticket className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No {activeSubTab} bookings found
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Book any train, flight, bus, cab, auto, or bike to view tickets here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => (
            <div
              key={booking.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400">
                      {booking.category}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      {booking.bookingRef}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-xs text-slate-500">
                      Booked {new Date(booking.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    {booking.serviceTitle} ({booking.serviceNumber})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded ${
                      booking.bookingStatus === 'cancelled'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                    }`}
                  >
                    {booking.bookingStatus}
                  </span>
                </div>
              </div>

              {/* Route & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-4 items-center">
                <div className="sm:col-span-8 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                      {booking.departureTime}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {booking.origin} ({booking.originCode})
                    </div>
                    <div className="text-[11px] text-slate-400">{booking.departureDate}</div>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-semibold text-slate-400">{booking.duration}</span>
                    <div className="w-16 sm:w-24 flex items-center my-1">
                      <div className="h-[2px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
                      <ArrowRight className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 mx-1 shrink-0" />
                      <div className="h-[2px] flex-1 bg-slate-200 dark:bg-slate-700"></div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                      {booking.arrivalTime}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {booking.destination} ({booking.destCode})
                    </div>
                    <div className="text-[11px] text-slate-400">{booking.arrivalDate}</div>
                  </div>
                </div>

                <div className="sm:col-span-4 sm:border-l sm:border-slate-100 sm:dark:border-slate-800 sm:pl-4 flex flex-col justify-center sm:items-end">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">
                    {booking.category === 'trains' || booking.category === 'flights' ? 'Authorized PNR' : 'Ride Confirmation'}
                  </div>
                  <div className="text-sm font-extrabold text-sky-600 dark:text-sky-400 font-mono">
                    {booking.pnrNumber || booking.providerRef}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    Seat(s): <span className="font-bold text-slate-800 dark:text-slate-200">{booking.seatNumbers.join(', ')}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-bold font-mono mt-0.5">
                    Paid: ₹{booking.fareBreakdown.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenTicket(booking)}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>View Boarding Pass</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onOpenGmailConfirm(booking)}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Email Ticket</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenLiveTracker(booking)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Radio className="w-3 h-3 text-sky-500" />
                    <span>Live Radar</span>
                  </button>

                  {booking.bookingStatus !== 'cancelled' && (
                    <button
                      onClick={() => onOpenCancelModal(booking)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    >
                      Cancel Trip
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
