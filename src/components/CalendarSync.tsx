import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CalendarCheck2,
  CalendarPlus,
  Clock,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { BookingRecord, UserAccount } from '../types/travel';
import { getAccessToken, googleSignIn } from '../services/firebaseAuth';
import { createBookingCalendarEvent } from '../services/calendarService';
import { saveStoredBookings, saveStoredUser } from '../services/api';

interface CalendarSyncProps {
  user: UserAccount | null;
  bookings: BookingRecord[];
  onUpdateUser: (updatedUser: UserAccount) => void;
  onUpdateBookings: (updatedBookings: BookingRecord[]) => void;
  onShowToast: (message: string) => void;
}

export const CalendarSync: React.FC<CalendarSyncProps> = ({
  user,
  bookings,
  onUpdateUser,
  onUpdateBookings,
  onShowToast,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User Confirmation modal for calendar mutations (Workspace skill requirement)
  const [bookingToConfirmSync, setBookingToConfirmSync] = useState<BookingRecord | null>(null);
  const [isConfirmingBulk, setIsConfirmingBulk] = useState(false);

  const autoSyncEnabled = Boolean(user?.autoCalendarSync);

  // Filter confirmed upcoming or non-cancelled bookings
  const syncableBookings = bookings.filter((b) => b.bookingStatus === 'confirmed');
  const alreadySyncedCount = syncableBookings.filter((b) => b.googleCalendarEventId).length;

  const handleToggleAutoSync = async () => {
    if (!user) return;

    const newSetting = !autoSyncEnabled;
    const updatedUser: UserAccount = {
      ...user,
      autoCalendarSync: newSetting,
    };

    saveStoredUser(updatedUser);
    onUpdateUser(updatedUser);

    if (newSetting) {
      onShowToast('Automated Google Calendar sync enabled for upcoming trips.');
    } else {
      onShowToast('Automated Google Calendar sync disabled.');
    }
  };

  const handleInitiateSingleSync = (booking: BookingRecord) => {
    setErrorMsg(null);
    setSyncStatusMsg(null);
    setBookingToConfirmSync(booking);
  };

  const handleConfirmSingleSync = async () => {
    if (!bookingToConfirmSync) return;
    setIsSyncing(true);
    setErrorMsg(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      }

      if (!token) {
        throw new Error('Google Calendar authorization required. Please sign in with Google.');
      }

      const result = await createBookingCalendarEvent(bookingToConfirmSync, token);

      // Update booking with Google Calendar event ID
      const updatedBookings = bookings.map((b) =>
        b.id === bookingToConfirmSync.id
          ? {
              ...b,
              googleCalendarEventId: result.eventId,
              calendarSyncedAt: new Date().toISOString(),
            }
          : b
      );

      saveStoredBookings(updatedBookings);
      onUpdateBookings(updatedBookings);

      setSyncStatusMsg(`Successfully added "${bookingToConfirmSync.serviceTitle}" to your Google Calendar!`);
      onShowToast(`Event scheduled on your Google Calendar!`);
      setBookingToConfirmSync(null);
    } catch (err: any) {
      console.error('Failed to sync booking to calendar:', err);
      setErrorMsg(err.message || 'Failed to add event to Google Calendar.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmBulkSync = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    setSyncStatusMsg(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      }

      if (!token) {
        throw new Error('Google Calendar authorization required. Please sign in with Google.');
      }

      const pending = syncableBookings.filter((b) => !b.googleCalendarEventId);
      if (pending.length === 0) {
        setSyncStatusMsg('All confirmed trips are already synced to your Google Calendar.');
        setIsConfirmingBulk(false);
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      let currentBookings = [...bookings];

      for (const bkg of pending) {
        try {
          const res = await createBookingCalendarEvent(bkg, token);
          currentBookings = currentBookings.map((b) =>
            b.id === bkg.id
              ? {
                  ...b,
                  googleCalendarEventId: res.eventId,
                  calendarSyncedAt: new Date().toISOString(),
                }
              : b
          );
          successCount++;
        } catch (e) {
          console.warn(`Could not sync booking ${bkg.id}:`, e);
        }
      }

      saveStoredBookings(currentBookings);
      onUpdateBookings(currentBookings);

      setSyncStatusMsg(`Synced ${successCount} journey(s) to your Google Calendar.`);
      onShowToast(`Synced ${successCount} confirmed trips to Google Calendar.`);
      setIsConfirmingBulk(false);
    } catch (err: any) {
      console.error('Bulk calendar sync error:', err);
      setErrorMsg(err.message || 'Failed to sync all trips to Google Calendar.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shadow-inner">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-stone-900 dark:text-white">
                Google Calendar Sync
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                Workspace Active
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Sync departure times, seat numbers, and boarding station alerts directly into your personal Google Calendar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncableBookings.length > 0 && (
            <button
              type="button"
              onClick={() => setIsConfirmingBulk(true)}
              disabled={isSyncing || alreadySyncedCount === syncableBookings.length}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync All Trips ({syncableBookings.length - alreadySyncedCount} pending)</span>
            </button>
          )}

          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Open Google Calendar"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TOGGLE SWITCH: Automated Event Creation for Upcoming Trips */}
      <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700/80 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-white text-xs">
            <CalendarCheck2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Automated Event Creation for Upcoming Trips</span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
            Automatically create a 2-hour departure alert and detailed itinerary event on your Google Calendar every time a flight, train, bus, or ride is confirmed.
          </p>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          onClick={handleToggleAutoSync}
          disabled={!user}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            autoSyncEnabled ? 'bg-sky-600 dark:bg-sky-500' : 'bg-stone-300 dark:bg-stone-700'
          }`}
          role="switch"
          aria-checked={autoSyncEnabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Confirmed Bookings Sync Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Confirmed Trips Available for Calendar Sync ({syncableBookings.length})
          </h3>
          <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
            {alreadySyncedCount} / {syncableBookings.length} Synced
          </span>
        </div>

        {syncableBookings.length === 0 ? (
          <div className="p-6 bg-stone-50 dark:bg-stone-800/30 rounded-2xl text-center text-xs text-stone-400 border border-stone-100 dark:border-stone-800">
            No confirmed bookings available yet. Once you book a flight, train, bus, or ride, it will appear here for 1-tap Google Calendar sync.
          </div>
        ) : (
          <div className="space-y-2">
            {syncableBookings.map((b) => {
              const isSynced = Boolean(b.googleCalendarEventId);
              return (
                <div
                  key={b.id}
                  className="p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-stone-900 dark:text-white">
                        {b.serviceTitle}
                      </span>
                      <span className="font-mono text-[11px] text-stone-400">
                        ({b.originCode} → {b.destCode})
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2">
                      <span>📅 {b.departureDate} at {b.departureTime}</span>
                      <span aria-hidden="true">·</span>
                      <span>Seat: {b.seatNumbers.join(', ') || 'Confirmed'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Ref: {b.bookingRef}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSynced ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl text-xs border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Synced to Calendar</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInitiateSingleSync(b)}
                        disabled={isSyncing}
                        className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-stone-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Add to Google Calendar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SINGLE SYNC CONFIRMATION MODAL (Mandatory per Workspace Skill for data mutation) */}
      {bookingToConfirmSync && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 max-w-md w-full space-y-4 text-xs shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
              <CalendarIcon className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-stone-900 dark:text-white">
                Add Trip to Google Calendar?
              </h3>
              <p className="text-stone-500 dark:text-stone-400">
                Ticket Life will create an event on your primary Google Calendar with verified journey times and boarding alerts.
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700/80 space-y-1.5 text-[11px]">
              <div>
                <strong>Event:</strong> {bookingToConfirmSync.serviceTitle} ({bookingToConfirmSync.originCode} → {bookingToConfirmSync.destCode})
              </div>
              <div>
                <strong>Departure:</strong> {bookingToConfirmSync.departureDate} at {bookingToConfirmSync.departureTime}
              </div>
              <div>
                <strong>Boarding Location:</strong> {bookingToConfirmSync.originAddress || bookingToConfirmSync.origin}
              </div>
              <div>
                <strong>Reminders:</strong> 2 hours and 30 minutes before departure
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setBookingToConfirmSync(null)}
                disabled={isSyncing}
                className="px-4 py-2 font-bold text-stone-600 hover:text-stone-900 dark:text-stone-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleSync}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-stone-950 font-black rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSyncing ? (
                  <span>Syncing...</span>
                ) : (
                  <>
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Confirm & Add Event</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK SYNC CONFIRMATION MODAL */}
      {isConfirmingBulk && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 max-w-md w-full space-y-4 text-xs shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
              <CalendarCheck2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-stone-900 dark:text-white">
                Sync All Upcoming Trips to Google Calendar?
              </h3>
              <p className="text-stone-500 dark:text-stone-400">
                You are about to add {syncableBookings.filter((b) => !b.googleCalendarEventId).length} confirmed upcoming trip(s) to your primary Google Calendar.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsConfirmingBulk(false)}
                disabled={isSyncing}
                className="px-4 py-2 font-bold text-stone-600 hover:text-stone-900 dark:text-stone-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkSync}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-stone-950 font-black rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSyncing ? (
                  <span>Syncing...</span>
                ) : (
                  <>
                    <CalendarCheck2 className="w-3.5 h-3.5" />
                    <span>Confirm & Sync All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
