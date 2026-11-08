import React, { useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Ticket,
  Users,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Settings,
  Search,
  ExternalLink,
  Save,
  MessageSquare,
} from 'lucide-react';
import { BookingRecord, ProviderStatus, SupportTicket } from '../types/travel';
import { updateProviderStatus } from '../services/api';

interface AdminDashboardProps {
  bookings: BookingRecord[];
  providers: ProviderStatus[];
  supportTickets: SupportTicket[];
  onRefreshData: () => void;
  onOpenCancelModal: (booking: BookingRecord) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bookings,
  providers,
  supportTickets,
  onRefreshData,
  onOpenCancelModal,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'bookings' | 'support'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingProviderId, setUpdatingProviderId] = useState<string | null>(null);

  // Statistics
  const totalRevenue = bookings.reduce((sum, b) => (b.bookingStatus !== 'cancelled' ? sum + b.fareBreakdown.totalAmount : sum), 0);
  const totalRefunds = bookings
    .filter((b) => b.bookingStatus === 'cancelled' && b.cancellationDetails)
    .reduce((sum, b) => sum + (b.cancellationDetails?.refundAmount || 0), 0);
  const activeTripsCount = bookings.filter((b) => b.bookingStatus === 'confirmed').length;
  const cancellationCount = bookings.filter((b) => b.bookingStatus === 'cancelled').length;

  const handleToggleProvider = (providerId: string, newStatus: 'connected_live' | 'connected_sandbox' | 'integration_pending') => {
    setUpdatingProviderId(providerId);
    updateProviderStatus(providerId, newStatus);
    setTimeout(() => {
      onRefreshData();
      setUpdatingProviderId(null);
    }, 500);
  };

  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.bookingRef.toLowerCase().includes(q) ||
      (b.pnrNumber && b.pnrNumber.toLowerCase().includes(q)) ||
      b.passengers.some((p) => p.fullName.toLowerCase().includes(q)) ||
      b.serviceTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="p-6 bg-slate-900 rounded-2xl text-white border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>ROLE-BASED ADMIN CONSOLE</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            Ticket Life Enterprise Operations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time provider synchronizations, financial telemetry, booking status, and compliance governance.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg border border-slate-700 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'overview' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'providers' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Authorized Providers
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'bookings' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'support' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Support Queue ({supportTickets.length})
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Net Gross GMV</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                +14.2% verified volume this month
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Active Confirmed Trips</span>
                <Ticket className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
                {activeTripsCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Across Railways, Flights, Cabs & Buses
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Total Processed Refunds</span>
                <RotateCcw className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
                ₹{totalRefunds.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-rose-600 font-semibold mt-1">
                {cancellationCount} journeys refunded
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Provider Systems Health</span>
                <Server className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
                99.98%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                4 connected partner channels
              </div>
            </div>
          </div>

          {/* Category Breakdown Strip */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Bookings by Category
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
              {[
                { label: 'Trains', count: bookings.filter((b) => b.category === 'trains').length },
                { label: 'Flights', count: bookings.filter((b) => b.category === 'flights').length },
                { label: 'Buses', count: bookings.filter((b) => b.category === 'buses').length },
                { label: 'Cars', count: bookings.filter((b) => b.category === 'cars').length },
                { label: 'Autos', count: bookings.filter((b) => b.category === 'autos').length },
                { label: 'Bikes', count: bookings.filter((b) => b.category === 'bikes').length },
              ].map((c) => (
                <div key={c.label} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-slate-500 text-xs font-semibold">{c.label}</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">
                    {c.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PROVIDERS TAB */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
            <Server className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Real-World Partner Integration Standard:</span>
              <p className="text-[11px] text-sky-800 dark:text-sky-300 mt-0.5 leading-relaxed">
                As required by system compliance, each transportation category interfaces with an authorized partner API. If production credentials are not yet entered by the merchant, the status can be switched to <strong>Sandbox Mode</strong> or clearly labeled <strong>Integration Pending</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {providers.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400">
                      {p.category} Gateway
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {p.name}
                    </h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Endpoint: {p.authEndpoint}
                    </div>
                  </div>

                  {/* Status Badges & Controls */}
                  <div className="flex items-center gap-2">
                    <select
                      value={p.status}
                      disabled={updatingProviderId === p.id}
                      onChange={(e) =>
                        handleToggleProvider(
                          p.id,
                          e.target.value as 'connected_live' | 'connected_sandbox' | 'integration_pending'
                        )
                      }
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="connected_live">Connected (Live Production)</option>
                      <option value="connected_sandbox">Certified Sandbox Mode</option>
                      <option value="integration_pending">Integration Pending</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">API Version</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{p.apiVersion}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Health / Ping</span>
                    <div className="font-semibold text-emerald-600 font-mono">{p.lastPing}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Synced Bookings</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{p.totalSyncedTrips.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Status Label</span>
                    <div className="font-bold text-sky-600 uppercase text-[11px]">{p.status.replace('_', ' ')}</div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-1">
                  {p.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL BOOKINGS TAB */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Global Booking Records & Audit Trail
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer, PNR or Ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Booking Ref / PNR</th>
                    <th className="px-4 py-3">Category & Service</th>
                    <th className="px-4 py-3">Primary Passenger</th>
                    <th className="px-4 py-3">Travel Date</th>
                    <th className="px-4 py-3">Total Paid</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">{b.bookingRef}</div>
                        <div className="text-slate-400 text-[10px] font-mono">{b.pnrNumber || b.providerRef}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{b.serviceTitle}</div>
                        <div className="text-[11px] text-slate-400">{b.originCode} ➔ {b.destCode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {b.passengers[0]?.fullName || 'Guest User'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {b.departureDate}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        ₹{b.fareBreakdown.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                            b.bookingStatus === 'cancelled'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                          }`}
                        >
                          {b.bookingStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.bookingStatus !== 'cancelled' ? (
                          <button
                            onClick={() => onOpenCancelModal(b)}
                            className="text-xs font-bold text-rose-600 hover:underline"
                          >
                            Trigger Refund
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {b.cancellationDetails?.refundReference || 'Refunded'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUPPORT QUEUE TAB */}
      {activeTab === 'support' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Customer Support Tickets
          </h2>

          {supportTickets.length === 0 ? (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
              No pending support tickets in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {supportTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{t.subject}</span>
                      <span className="text-slate-400 ml-2">from {t.userEmail}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                      {t.status}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{t.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
