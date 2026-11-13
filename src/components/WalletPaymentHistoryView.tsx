import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Plus,
  Receipt,
  Download,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  FileText,
  X,
} from 'lucide-react';
import { BookingRecord, UserAccount, WalletTransaction } from '../types/travel';
import { addWalletFunds, getStoredWalletTransactions } from '../services/api';
import { processRealGatewayPayment } from '../services/paymentService';

interface WalletPaymentHistoryViewProps {
  user: UserAccount | null;
  bookings: BookingRecord[];
  onRefreshUser?: () => void;
  onTopUpSuccess?: (amount: number, newBalance: number) => void;
}

export const WalletPaymentHistoryView: React.FC<WalletPaymentHistoryViewProps> = ({
  user,
  bookings,
  onRefreshUser,
  onTopUpSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'wallet' | 'payments'>('all');
  const [transactions, setTransactions] = useState<WalletTransaction[]>(() =>
    getStoredWalletTransactions()
  );
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [addAmount, setAddAmount] = useState<number>(1000);
  const [customAmountInput, setCustomAmountInput] = useState('');
  const [selectedPayMethod, setSelectedPayMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [topupSuccessMsg, setTopupSuccessMsg] = useState('');
  const [topupErrorMsg, setTopupErrorMsg] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pay_after_ride' | 'refunded'>('all');

  // Selected receipt for modal
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState<BookingRecord | null>(null);

  const walletBalance = user?.walletBalance ?? 0;

  const handleQuickAdd = (amt: number) => {
    setAddAmount(amt);
    setCustomAmountInput('');
  };

  const handleExecuteAddMoney = async () => {
    const finalAmt = customAmountInput ? parseInt(customAmountInput, 10) : addAmount;
    if (!finalAmt || isNaN(finalAmt) || finalAmt < 50) {
      setTopupErrorMsg('Minimum wallet top-up is ₹50.');
      return;
    }

    setTopupErrorMsg('');
    setIsProcessingTopup(true);
    try {
      const pgRes = await processRealGatewayPayment({
        amount: finalAmt,
        customerName: user?.fullName || 'Ticket Life User',
        customerEmail: user?.email || 'passenger@ticketlife.app',
        customerPhone: user?.phone || '9999999999',
        bookingRef: `WALLET-TOPUP-${Date.now()}`,
        gatewayPreference: 'auto',
        pendingContext: {
          type: 'wallet_topup',
          amount: finalAmt,
          method: selectedPayMethod,
        },
      });

      if (pgRes.redirected) return;
      if (!pgRes.paid) {
        setTopupErrorMsg('Payment was not confirmed by the gateway.');
        setIsProcessingTopup(false);
        return;
      }

      const txn = addWalletFunds(finalAmt, `${selectedPayMethod} (${pgRes.txnId})`);
      const updatedTxns = getStoredWalletTransactions();
      setTransactions(updatedTxns);
      if (onRefreshUser) onRefreshUser();
      if (onTopUpSuccess) onTopUpSuccess(finalAmt, txn.balanceAfter);
      setIsProcessingTopup(false);
      setTopupSuccessMsg(`₹${finalAmt.toLocaleString('en-IN')} verified & added to your Ticket Life Wallet!`);
      setTimeout(() => {
        setTopupSuccessMsg('');
        setIsAddMoneyOpen(false);
      }, 1600);
    } catch (err: any) {
      setTopupErrorMsg(err?.message || 'Unable to verify real payment for wallet top-up.');
      setIsProcessingTopup(false);
    }
  };

  // Filter bookings for payment history
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.paymentStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = b.bookingRef.toLowerCase().includes(q);
      const matchTxn = b.paymentTxnId.toLowerCase().includes(q);
      const matchTitle = b.serviceTitle.toLowerCase().includes(q);
      const matchRoute = `${b.origin} ${b.destination}`.toLowerCase().includes(q);
      if (!matchRef && !matchTxn && !matchTitle && !matchRoute) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            FINANCIAL ATELIER · 2ND HUB
          </span>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
            Payment History & Wallet
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Manage your prepaid travel wallet balance, passbook debits, instant refunds, and official tax invoices.
          </p>
        </div>

        {/* Header Actions (Top-up Wallet & View Toggle) */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsAddMoneyOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
            title="Recharge or increase prepaid travel wallet balance"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Top-up Wallet</span>
          </button>

          {/* View Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700/80 text-xs font-bold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'wallet'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Wallet & Passbook
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'payments'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Payment Invoices ({filteredBookings.length})
            </button>
          </div>
        </div>
      </div>

      {/* WALLET SUMMARY HERO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Luxury Wallet Card */}
        <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 text-white p-6 sm:p-7 shadow-xl border border-stone-800">
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Ticket Life Prepaid Passbook
                </span>
                <h3 className="text-sm font-semibold text-stone-300 mt-0.5">
                  Available Travel Balance
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white flex items-baseline gap-1">
                <span className="text-amber-400 text-3xl sm:text-4xl">₹</span>
                <span>{walletBalance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-stone-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero convenience fee & 1-tap checkout enabled for all modes</span>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-stone-400">
                Linked Account: <strong className="text-stone-200">{user?.email || 'No Account Linked'}</strong>
              </div>
              <button
                onClick={() => setIsAddMoneyOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Top-up Wallet</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Insights / Perks Card */}
        <div className="rounded-2xl bg-white dark:bg-stone-900 p-6 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Wallet Privileges</span>
            </div>
            <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
              Instant Refund Guarantee
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              Cancelled car, auto rickshaw, and bike bookings credit back directly to your wallet within 60 seconds with 0% bank settlement wait.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600 dark:text-stone-400">
              <span>Total Bookings Paid:</span>
              <span className="font-bold text-stone-900 dark:text-white">{bookings.length} trips</span>
            </div>
            <div className="flex justify-between text-stone-600 dark:text-stone-400">
              <span>Lifetime Cashback:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">₹650.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* WALLET PASSBOOK SECTION */}
      {(activeTab === 'all' || activeTab === 'wallet') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
                Wallet Ledger & Passbook
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Chronological statement of wallet recharges, booking debits, and instant cancellation refunds.
              </p>
            </div>
          </div>

          <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-white dark:bg-stone-900 shadow-xs">
            {transactions.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                  <Wallet className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white">Passbook is Empty</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Aapke wallet mein abhi koi transaction ya top-up record nahi hai. Wallet balance increase karne ke liye top-up karein.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setIsAddMoneyOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Top-up Wallet Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 uppercase font-bold text-[9px] tracking-wider border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="px-4 py-3">Transaction Details</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Payment Instrument</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                  {transactions.map((txn) => {
                    const isCredit = txn.type === 'credit';
                    return (
                      <tr key={txn.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-stone-900 dark:text-stone-100">
                            {txn.description}
                          </div>
                          <div className="text-[10px] font-mono text-stone-400 mt-0.5">
                            ID: {txn.id} {txn.referenceId && `· Ref: ${txn.referenceId}`}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              isCredit
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {txn.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                          {new Date(txn.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3.5 text-stone-600 dark:text-stone-400">
                          {txn.paymentMethod || 'Internal Wallet Ledger'}
                        </td>
                        <td className={`px-4 py-3.5 text-right font-mono font-bold text-sm ${
                          isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-900 dark:text-white'
                        }`}>
                          {isCredit ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-stone-500">
                          ₹{txn.balanceAfter.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}

      {/* COMPLETE PAYMENT HISTORY TABLE */}
      {(activeTab === 'all' || activeTab === 'payments') && (
        <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
                Official Travel Payment Invoices & Receipts
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Real gateway payment confirmations, merchant references, and GST-compliant tax invoices.
              </p>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Txn ID, Ref, City..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-medium text-stone-900 dark:text-white focus:outline-none w-48 sm:w-60"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg font-bold text-stone-700 dark:text-stone-300 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid Only</option>
                <option value="pay_after_ride">Pay Driver After Ride</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-white dark:bg-stone-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 uppercase font-bold text-[9px] tracking-wider border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="px-4 py-3">Booking Ref & Service</th>
                    <th className="px-4 py-3">Payment Txn ID</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Payment Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                    <th className="px-4 py-3 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                          <span>{b.bookingRef}</span>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            {b.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate max-w-xs">
                          {b.serviceTitle} · {b.origin} ➔ {b.destination}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-stone-700 dark:text-stone-300 text-[11px]">
                          {b.paymentTxnId}
                        </span>
                        <div className="text-[10px] text-stone-400">
                          Gateway: {b.providerName}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded text-[10px] font-bold font-mono">
                          {b.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            b.paymentStatus === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                              : b.paymentStatus === 'pay_after_ride'
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {b.paymentStatus === 'pay_after_ride' ? 'Pay After Ride' : b.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-sm text-stone-900 dark:text-white">
                        ₹{b.fareBreakdown.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedReceiptBooking(b)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold transition-colors text-[11px]"
                        >
                          <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD MONEY TO WALLET */}
      {isAddMoneyOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  TICKET LIFE WALLET TOP-UP
                </span>
                <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
                  Add Funds to Wallet
                </h3>
              </div>
              <button
                onClick={() => setIsAddMoneyOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {topupSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{topupSuccessMsg}</span>
                </div>
              )}

              {topupErrorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold leading-relaxed">
                  {topupErrorMsg}
                </div>
              )}

              {/* Predefined Recharge Chips */}
              <div>
                <label className="block text-stone-600 dark:text-stone-400 font-bold mb-2">
                  Select Quick Recharge Amount
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAdd(amt)}
                      className={`py-2 text-center rounded-xl font-bold border transition-all ${
                        addAmount === amt && !customAmountInput
                          ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-black'
                          : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div>
                <label className="block text-stone-600 dark:text-stone-400 font-bold mb-1">
                  Or Enter Custom Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">₹</span>
                  <input
                    type="number"
                    placeholder="Enter amount (min ₹50)"
                    value={customAmountInput}
                    onChange={(e) => {
                      setCustomAmountInput(e.target.value);
                      if (e.target.value) setAddAmount(parseInt(e.target.value, 10) || 0);
                    }}
                    className="w-full pl-7 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-mono font-bold text-stone-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Instrument Selector */}
              <div>
                <label className="block text-stone-600 dark:text-stone-400 font-bold mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'Card', 'NetBanking'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedPayMethod(mode)}
                      className={`py-2 px-3 text-center rounded-xl font-bold border transition-colors ${
                        selectedPayMethod === mode
                          ? 'border-stone-900 dark:border-amber-400 bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950'
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {mode === 'UPI' ? 'Instant UPI' : mode === 'Card' ? 'Debit/Credit Card' : 'Net Banking'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 text-[11px] text-stone-500">
                🔒 Secured by 256-bit SSL Banking Gateway. Wallet balance never expires and can be used for any transport booking.
              </div>

              <button
                type="button"
                onClick={handleExecuteAddMoney}
                disabled={isProcessingTopup}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-black rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {isProcessingTopup ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Top-Up via {selectedPayMethod}...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>
                      Add ₹{(customAmountInput ? parseInt(customAmountInput, 10) || 0 : addAmount).toLocaleString('en-IN')} to Wallet
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL PAYMENT RECEIPT / TAX INVOICE */}
      {selectedReceiptBooking && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  OFFICIAL TAX INVOICE
                </span>
                <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
                  Payment Receipt #{selectedReceiptBooking.paymentTxnId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceiptBooking(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between items-start pb-3 border-b border-stone-100 dark:border-stone-800">
                <div>
                  <div className="font-extrabold text-sm text-stone-900 dark:text-white">
                    Ticket Life Verified Receipt
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    HSN/SAC: 996411 · Merchant PAN/GST issued on seller KYC
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-extrabold uppercase text-[10px] rounded">
                    {selectedReceiptBooking.paymentStatus === 'pay_after_ride'
                      ? 'DUE TO DRIVER AT DROP'
                      : 'PAID & SETTLED'}
                  </span>
                  <div className="text-[11px] text-stone-400 mt-1 font-mono">
                    {new Date(selectedReceiptBooking.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Journey Details */}
              <div className="bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-xl space-y-1.5">
                <div className="flex justify-between text-stone-500">
                  <span>Booking Reference:</span>
                  <strong className="text-stone-900 dark:text-white font-mono">{selectedReceiptBooking.bookingRef}</strong>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Service:</span>
                  <strong className="text-stone-900 dark:text-white">{selectedReceiptBooking.serviceTitle}</strong>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Route:</span>
                  <strong className="text-stone-900 dark:text-white">{selectedReceiptBooking.origin} ➔ {selectedReceiptBooking.destination}</strong>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Travel Date:</span>
                  <strong className="text-stone-900 dark:text-white">{selectedReceiptBooking.departureDate} at {selectedReceiptBooking.departureTime}</strong>
                </div>
              </div>

              {/* Fare Breakdown */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Base Transportation Fare</span>
                  <span className="font-mono">₹{selectedReceiptBooking.fareBreakdown.baseFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Taxes & Government GST (18%)</span>
                  <span className="font-mono">₹{selectedReceiptBooking.fareBreakdown.taxesAndGst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Authorized Platform Convenience Fee</span>
                  <span className="font-mono">₹{selectedReceiptBooking.fareBreakdown.convenienceFee.toLocaleString('en-IN')}</span>
                </div>
                {selectedReceiptBooking.fareBreakdown.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Promotional Discount</span>
                    <span className="font-mono">-₹{selectedReceiptBooking.fareBreakdown.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-700 font-black text-sm text-stone-900 dark:text-white">
                  <span>Total Amount Paid</span>
                  <span className="font-mono text-base">₹{selectedReceiptBooking.fareBreakdown.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-3">
                <span className="text-[11px] text-stone-400">
                  Method: <strong>{selectedReceiptBooking.paymentMethod}</strong> (Txn: {selectedReceiptBooking.paymentTxnId})
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 font-bold rounded-xl transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
