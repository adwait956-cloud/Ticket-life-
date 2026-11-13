import React, { useState, useMemo } from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Filter,
  IndianRupee,
  Layers,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  UserCheck,
  Zap,
  Car,
  Compass,
  Bike,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  FileSpreadsheet,
  History,
  Send,
  Building,
} from 'lucide-react';
import { BookingRecord, DriverPayoutSummary, DriverTripPayoutItem, TransportCategory } from '../types/travel';
import {
  calculateDriverPayoutSummaries,
  settleDriverPayout,
  settleSingleTripPayout,
  batchSettleAllPendingPayouts,
  generatePayoutsCsv,
  getPayoutTransactionHistory,
  PayoutTransactionRecord,
} from '../services/driverPayoutsService';

interface DriverPayoutsSectionProps {
  bookings: BookingRecord[];
  onRefreshData: () => void;
}

export const DriverPayoutsSection: React.FC<DriverPayoutsSectionProps> = ({
  bookings,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TransportCategory | 'all'>('all');
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'drivers' | 'history'>('drivers');

  // Modal states
  const [selectedDriverForPayout, setSelectedDriverForPayout] = useState<DriverPayoutSummary | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'IMPS_Bank' | 'Cash'>('UPI');
  const [payoutCustomRef, setPayoutCustomRef] = useState('');
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [payoutNotification, setPayoutNotification] = useState<string | null>(null);

  // Compute driver summaries
  const summaries = useMemo(() => {
    return calculateDriverPayoutSummaries(bookings);
  }, [bookings]);

  // Aggregate Metrics
  const totalCompletedTrips = summaries.reduce((acc, d) => acc + d.completedRidesCount, 0);
  const totalGrossFares = summaries.reduce((acc, d) => acc + d.totalGrossFares, 0);
  const totalNetEarnings = summaries.reduce((acc, d) => acc + d.totalEarnings, 0);
  const totalPendingAmount = summaries.reduce((acc, d) => acc + d.pendingAmount, 0);
  const totalSettledAmount = summaries.reduce((acc, d) => acc + d.settledAmount, 0);
  const totalPlatformCut = summaries.reduce((acc, d) => acc + d.platformFeeTotal, 0);
  const driversWithPendingCount = summaries.filter((d) => d.pendingAmount > 0).length;

  const historyRecords = useMemo(() => {
    return getPayoutTransactionHistory();
  }, [summaries, payoutNotification]);

  // Filtering
  const filteredSummaries = useMemo(() => {
    return summaries.filter((d) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        d.driverName.toLowerCase().includes(q) ||
        d.driverPhone.toLowerCase().includes(q) ||
        d.vehiclePlateNumber.toLowerCase().includes(q) ||
        d.upiId.toLowerCase().includes(q);

      // Status
      let matchStatus = true;
      if (statusFilter === 'pending') matchStatus = d.pendingAmount > 0;
      if (statusFilter === 'settled') matchStatus = d.pendingAmount === 0 && d.settledAmount > 0;

      // Category
      let matchCategory = true;
      if (categoryFilter !== 'all') matchCategory = d.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [summaries, searchQuery, statusFilter, categoryFilter]);

  const triggerToast = (msg: string) => {
    setPayoutNotification(msg);
    setTimeout(() => {
      setPayoutNotification(null);
    }, 4500);
  };

  const handleOpenPayoutModal = (driver: DriverPayoutSummary) => {
    setSelectedDriverForPayout(driver);
    setPayoutMethod('UPI');
    setPayoutCustomRef(`TL-PAY-UPI-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleConfirmPayout = () => {
    if (!selectedDriverForPayout) return;
    setIsProcessingPayout(true);

    setTimeout(() => {
      const res = settleDriverPayout({
        driverPhoneOrName: selectedDriverForPayout.driverPhone || selectedDriverForPayout.driverName,
        paymentMethod: payoutMethod,
        customRef: payoutCustomRef,
      });

      setIsProcessingPayout(false);
      setSelectedDriverForPayout(null);
      if (res.success) {
        triggerToast(
          `Success: ₹${res.amountSettled.toLocaleString('en-IN')} paid to ${selectedDriverForPayout.driverName} (${res.payoutRef}).`
        );
        onRefreshData();
      }
    }, 400);
  };

  const handleSettleTrip = (bookingId: string) => {
    const res = settleSingleTripPayout(bookingId, 'UPI');
    if (res.success) {
      triggerToast(`Trip marked as settled (${res.payoutRef})`);
      onRefreshData();
    }
  };

  const handleBatchSettle = () => {
    setIsProcessingPayout(true);
    setTimeout(() => {
      const res = batchSettleAllPendingPayouts('UPI');
      setIsProcessingPayout(false);
      setShowBatchModal(false);
      if (res.success) {
        triggerToast(
          `Batch settlement complete: ₹${res.totalAmount.toLocaleString('en-IN')} across ${res.settledDriversCount} drivers.`
        );
        onRefreshData();
      }
    }, 500);
  };

  const handleDownloadCsv = () => {
    const csv = generatePayoutsCsv(summaries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TicketLife_Driver_Payouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Payouts CSV manifest downloaded successfully.');
  };

  const getCategoryIcon = (cat: TransportCategory) => {
    switch (cat) {
      case 'cars':
        return <Car className="w-3.5 h-3.5 text-sky-500" />;
      case 'autos':
        return <Compass className="w-3.5 h-3.5 text-amber-500" />;
      case 'bikes':
        return <Bike className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {payoutNotification && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{payoutNotification}</span>
          </div>
          <button
            onClick={() => setPayoutNotification(null)}
            className="text-white hover:text-emerald-200 text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest">
            <Banknote className="w-4 h-4" />
            <span>Driver Payouts &amp; Earnings Telemetry</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            Fleet Captain Payouts &amp; Completed Ride Earnings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tracks total ride earnings, 15% platform commissions, and pending payout balances owed to drivers across Cars, Auto Rickshaws, and Bikes.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {totalPendingAmount > 0 && (
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Settle All Pending (₹{totalPendingAmount.toLocaleString('en-IN')})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Driver Earnings */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Net Driver Earnings</span>
            <IndianRupee className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1.5 tabular-nums">
            ₹{totalNetEarnings.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            85% fleet driver share
          </div>
        </div>

        {/* Pending Payouts Owed (High Priority Highlight) */}
        <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border-2 border-amber-400 dark:border-amber-600 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            <span>Pending Payouts Owed</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-950 dark:text-amber-100 font-mono mt-1.5 tabular-nums">
            ₹{totalPendingAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-amber-800 dark:text-amber-300 font-bold mt-1">
            {driversWithPendingCount} driver{driversWithPendingCount !== 1 ? 's' : ''} awaiting settlement
          </div>
        </div>

        {/* Settled Payouts */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Settled Payouts</span>
            <CheckCircle2 className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1.5 tabular-nums">
            ₹{totalSettledAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Transferred via UPI / IMPS
          </div>
        </div>

        {/* Total Platform Fee Retained */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Platform Revenue</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1.5 tabular-nums">
            ₹{totalPlatformCut.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            15% Ticket Life commission
          </div>
        </div>

        {/* Completed Rides */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Completed Rides</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1.5 tabular-nums">
            {totalCompletedTrips}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Gross GMV: ₹{totalGrossFares.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Driver Balances vs Payout History */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('drivers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'drivers'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Driver Accounts ({summaries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Payout Audit Log ({historyRecords.length})</span>
          </button>
        </div>

        {activeSubTab === 'drivers' && (
          <div className="text-xs text-slate-500 hidden sm:block">
            Showing {filteredSummaries.length} of {summaries.length} drivers
          </div>
        )}
      </div>

      {/* DRIVERS SUB-TAB */}
      {activeSubTab === 'drivers' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search driver by name, phone, plate number (e.g. MH 15), or UPI ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-md text-[11px] ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Pending Owed ({driversWithPendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('settled')}
                  className={`px-2.5 py-1 rounded-md text-[11px] ${
                    statusFilter === 'settled'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Fully Settled
                </button>
              </div>

              {/* Mode Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="all">All Modes</option>
                <option value="cars">Cars</option>
                <option value="autos">Auto Rickshaws</option>
                <option value="bikes">Bike Taxis</option>
              </select>
            </div>
          </div>

          {/* Drivers List */}
          {filteredSummaries.length === 0 ? (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <UserCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No drivers match the current filters
              </div>
              <div className="text-xs text-slate-400">
                Try clearing your search or switching the status filter.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSummaries.map((driver) => {
                const isExpanded = expandedDriverId === driver.driverId;
                const hasPending = driver.pendingAmount > 0;

                return (
                  <div
                    key={driver.driverId}
                    className={`bg-white dark:bg-slate-900 rounded-xl border transition-all ${
                      hasPending
                        ? 'border-amber-300 dark:border-amber-800/80 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Driver Card Header */}
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Driver Identity */}
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="relative">
                          <img
                            src={driver.driverPhotoUrl}
                            alt={driver.driverName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                          />
                          <div className="absolute -bottom-1 -right-1 p-0.5 bg-white dark:bg-slate-800 rounded-full">
                            {getCategoryIcon(driver.category)}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                              {driver.driverName}
                            </h3>
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-black">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{driver.rating}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {driver.category}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {driver.vehiclePlateNumber}
                            </span>
                            <span>·</span>
                            <span>{driver.vehicleType}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {driver.driverPhone}
                            </span>
                          </div>

                          {/* Bank & UPI info */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1 font-mono">
                            <span>UPI: <strong className="text-slate-600 dark:text-slate-300">{driver.upiId}</strong></span>
                            <span>·</span>
                            <span>A/C: <strong className="text-slate-600 dark:text-slate-300">{driver.bankAccount}</strong> ({driver.bankIfsc})</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Metrics Strip & Actions */}
                      <div className="flex flex-wrap items-center gap-4 lg:gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                        {/* Completed Rides */}
                        <div className="text-left lg:text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            Completed Rides
                          </div>
                          <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                            {driver.completedRidesCount} trips
                          </div>
                        </div>

                        {/* Total Earnings */}
                        <div className="text-left lg:text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            Total Net Earnings
                          </div>
                          <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                            ₹{driver.totalEarnings.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Settled */}
                        <div className="text-left lg:text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            Paid Out
                          </div>
                          <div className="text-sm font-bold font-mono text-slate-600 dark:text-slate-400">
                            ₹{driver.settledAmount.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Pending Balance Badge */}
                        <div className="text-left lg:text-right p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-w-[120px]">
                          <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                            Pending Owed
                          </div>
                          <div className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                            ₹{driver.pendingAmount.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {hasPending ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPayoutModal(driver)}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Pay Driver (₹{driver.pendingAmount.toLocaleString('en-IN')})</span>
                            </button>
                          ) : (
                            <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Settled</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedDriverId(isExpanded ? null : driver.driverId)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title={isExpanded ? 'Collapse trips' : 'Expand completed trips'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* EXPANDED TRIPS LIST */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 rounded-b-xl space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Ride-by-Ride Payout Audit for {driver.driverName} ({driver.rides.length} trips)
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Fare Split: 85% Driver Share / 15% Platform Fee
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                              <tr>
                                <th className="px-3.5 py-2.5">Trip Ref / Route</th>
                                <th className="px-3.5 py-2.5">Completed Date</th>
                                <th className="px-3.5 py-2.5">Customer Payment</th>
                                <th className="px-3.5 py-2.5">Gross Fare</th>
                                <th className="px-3.5 py-2.5">Driver Share (85%)</th>
                                <th className="px-3.5 py-2.5">Platform Fee (15%)</th>
                                <th className="px-3.5 py-2.5">Payout Status</th>
                                <th className="px-3.5 py-2.5 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                              {driver.rides.map((trip) => {
                                const isTripSettled = trip.payoutStatus === 'settled';

                                return (
                                  <tr key={trip.bookingId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-3.5 py-2.5">
                                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                                        {trip.bookingRef}
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        {trip.origin} ➔ {trip.destination}
                                      </div>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 font-mono">
                                      {trip.completedAt.slice(0, 10)}
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {trip.paymentMethod} ({trip.collectedBy})
                                      </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                                      ₹{trip.fareAmount}
                                    </td>
                                    <td className="px-3.5 py-2.5 font-mono font-black text-emerald-600 dark:text-emerald-400">
                                      ₹{trip.driverCut}
                                    </td>
                                    <td className="px-3.5 py-2.5 font-mono text-slate-400">
                                      ₹{trip.platformCut}
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                      {isTripSettled ? (
                                        <div>
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                                            Settled
                                          </span>
                                          {trip.payoutRef && (
                                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                              {trip.payoutRef}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                          Pending
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right">
                                      {!isTripSettled ? (
                                        <button
                                          type="button"
                                          onClick={() => handleSettleTrip(trip.bookingId)}
                                          className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                        >
                                          Mark Settled
                                        </button>
                                      ) : (
                                        <span className="text-[11px] text-slate-400 font-mono">Paid</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PAYOUT AUDIT LOG SUB-TAB */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Payout Transaction Audit Log
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {historyRecords.length} historical transfer(s)
            </span>
          </div>

          {historyRecords.length === 0 ? (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
              No historical payout transactions recorded yet. When you settle a driver payout, the audit trail will appear here.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Reference / ID</th>
                    <th className="px-4 py-3">Recipient Captain</th>
                    <th className="px-4 py-3">Settlement Method</th>
                    <th className="px-4 py-3">Amount Paid</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {historyRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {rec.referenceNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{rec.driverName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{rec.driverPhone} · {rec.vehiclePlateNumber}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {rec.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ₹{rec.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {new Date(rec.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          Dispatched / Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SINGLE DRIVER PAYOUT MODAL */}
      {selectedDriverForPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                  Direct Payout Gateway
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  Settle Payment to Driver
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriverForPayout(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            {/* Recipient Details */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <img
                src={selectedDriverForPayout.driverPhotoUrl}
                alt={selectedDriverForPayout.driverName}
                className="w-10 h-10 rounded-full object-cover border border-slate-300 dark:border-slate-600"
              />
              <div className="text-xs">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {selectedDriverForPayout.driverName}
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  {selectedDriverForPayout.vehiclePlateNumber} · {selectedDriverForPayout.driverPhone}
                </div>
                <div className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
                  UPI: {selectedDriverForPayout.upiId}
                </div>
              </div>
            </div>

            {/* Amount details */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                Total Pending Settlement
              </span>
              <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{selectedDriverForPayout.pendingAmount.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                Calculated for completed rides after 15% platform commission
              </span>
            </div>

            {/* Settlement Channel */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Disbursement Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'Instant UPI', desc: selectedDriverForPayout.upiId },
                  { id: 'IMPS_Bank', label: 'IMPS Bank', desc: selectedDriverForPayout.bankIfsc },
                  { id: 'Cash', label: 'Cash / Direct', desc: 'Counter Handover' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      const m = mode.id as 'UPI' | 'IMPS_Bank' | 'Cash';
                      setPayoutMethod(m);
                      setPayoutCustomRef(`TL-PAY-${m.toUpperCase().replace('_', '')}-${Math.floor(100000 + Math.random() * 900000)}`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      payoutMethod === mode.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{mode.label}</div>
                    <div className="text-[10px] font-mono opacity-80 truncate">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Payout Reference Code
              </label>
              <input
                type="text"
                value={payoutCustomRef}
                onChange={(e) => setPayoutCustomRef(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* CTA */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDriverForPayout(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayout}
                onClick={handleConfirmPayout}
                className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessingPayout ? (
                  <span>Processing Transfer...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Authorize &amp; Settle ₹{selectedDriverForPayout.pendingAmount.toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH PAYOUT CONFIRMATION MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                  Batch Disbursal
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  Confirm Batch Fleet Payout
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This will simultaneously settle all pending earnings across <strong>{driversWithPendingCount} driver(s)</strong> with balances owed after completing rides.
            </p>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">
                Total Batch Disbursal
              </span>
              <div className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                ₹{totalPendingAmount.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5 block">
                Direct UPI / IMPS to verified driver bank accounts
              </span>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayout}
                onClick={handleBatchSettle}
                className="flex-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessingPayout ? (
                  <span>Processing Batch...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Confirm Batch Payout</span>
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
