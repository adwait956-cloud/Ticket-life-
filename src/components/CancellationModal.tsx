import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { BookingRecord } from '../types/travel';
import { cancelBooking } from '../services/api';

interface CancellationModalProps {
  booking: BookingRecord;
  onClose: () => void;
  onCancelled: (updatedBooking: BookingRecord) => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
  booking,
  onClose,
  onCancelled,
}) => {
  const [reason, setReason] = useState('Change of travel plan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const total = booking.fareBreakdown.totalAmount;
  let deductionPercent = 10;
  if (booking.category === 'cars' || booking.category === 'autos' || booking.category === 'bikes') {
    deductionPercent = 0; // 100% free
  } else if (booking.category === 'flights') {
    deductionPercent = 20;
  }

  const deductionAmount = Math.round((total * deductionPercent) / 100);
  const refundAmount = total - deductionAmount;

  const handleConfirmCancel = () => {
    setIsSubmitting(true);
    setErrorMsg('');

    setTimeout(() => {
      const result = cancelBooking(booking.id, reason);
      if (result.success && result.booking) {
        setIsSubmitting(false);
        onCancelled(result.booking);
        onClose();
      } else {
        setErrorMsg(result.error || 'Failed to process cancellation.');
        setIsSubmitting(false);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-rose-50 dark:bg-rose-950/40">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 className="text-base font-extrabold">Cancel Journey Booking</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Are you sure you want to cancel your confirmed booking for{' '}
            <strong className="text-slate-900 dark:text-white">{booking.serviceTitle}</strong> (
            {booking.bookingRef})?
          </div>

          {/* Refund Calculation Table */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <div className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              Authorized Refund Estimation
            </div>
            <div className="flex justify-between">
              <span>Total Fare Paid:</span>
              <span className="font-mono font-bold">₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>Provider Cancellation Fee ({deductionPercent}%):</span>
              <span className="font-mono font-bold">-₹{deductionAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-extrabold text-emerald-600">
              <span>Net Refund Credit:</span>
              <span className="font-mono">₹{refundAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              Refund will be credited back to your original {booking.paymentMethod} account or instant Ticket Life wallet within 2-4 hours.
            </div>
          </div>

          {/* Reason Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Cancellation
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Change of travel plan">Change of travel plan</option>
              <option value="Booked another travel mode">Booked another travel mode</option>
              <option value="Personal emergency">Personal emergency</option>
              <option value="Found better timings">Found better timings</option>
            </select>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 text-rose-600 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Keep My Ticket
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:bg-slate-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Refund...</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
