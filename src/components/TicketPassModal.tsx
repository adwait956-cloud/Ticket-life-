import React from 'react';
import {
  X,
  Printer,
  Mail,
  QrCode,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  User,
  Radio,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { BookingRecord } from '../types/travel';

interface TicketPassModalProps {
  booking: BookingRecord;
  onClose: () => void;
  onOpenGmailConfirm: (booking: BookingRecord) => void;
  onOpenLiveTracker: (booking: BookingRecord) => void;
  onOpenCancelModal: (booking: BookingRecord) => void;
}

export const TicketPassModal: React.FC<TicketPassModalProps> = ({
  booking,
  onClose,
  onOpenGmailConfirm,
  onOpenLiveTracker,
  onOpenCancelModal,
}) => {
  const isCancelled = booking.bookingStatus === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white">
      <div className="relative bg-[#faf9f6] dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-2xl overflow-hidden my-6 transition-all print:shadow-none print:border-none print:max-w-full">
        {/* Top Action Bar (hidden in print) */}
        <div className="px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-white dark:bg-stone-900/60 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              OFFICIAL ATELIER PASS
            </span>
            <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
            <span className="text-xs font-bold text-stone-900 dark:text-white uppercase">
              {booking.category}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
              title="Print Boarding Pass"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenGmailConfirm(booking)}
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
              title="Send to Gmail"
            >
              <Mail className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Boarding Pass Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header row: Brand & Status */}
          <div className="flex justify-between items-start pb-5 border-b border-stone-200 dark:border-stone-800">
            <div>
              <div className="text-[10px] font-bold tracking-widest text-stone-400 dark:text-stone-500 uppercase">
                TICKET LIFE TRAVEL SYSTEM
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight mt-1 font-serif sm:font-sans">
                {booking.serviceTitle}
              </h2>
              <div className="text-xs text-stone-500 font-semibold mt-1">
                {booking.vehicleType} · Operated by {booking.providerName}
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 text-[11px] font-black uppercase rounded tracking-wider ${
                  isCancelled
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                }`}
              >
                {booking.bookingStatus}
              </span>
              <div className="text-[11px] text-stone-400 font-mono mt-1">
                Ref: {booking.bookingRef}
              </div>
            </div>
          </div>

          {/* Key Reference Grid (PNR, Terminal, Date) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700/80 text-xs shadow-xs">
            <div>
              <div className="text-stone-400 uppercase font-bold text-[9px] tracking-widest">
                {booking.category === 'trains' || booking.category === 'flights' ? 'Authorized PNR' : 'Ride Confirmation'}
              </div>
              <div className="text-base font-black text-amber-700 dark:text-amber-400 font-mono tracking-tight mt-0.5">
                {booking.pnrNumber || booking.providerRef}
              </div>
            </div>

            <div>
              <div className="text-stone-400 uppercase font-bold text-[9px] tracking-widest">
                Travel Date
              </div>
              <div className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                {booking.departureDate}
              </div>
            </div>

            <div>
              <div className="text-stone-400 uppercase font-bold text-[9px] tracking-widest">
                Platform / Terminal
              </div>
              <div className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                {booking.terminalOrPlatform || 'Main Terminal'}
              </div>
            </div>

            <div>
              <div className="text-stone-400 uppercase font-bold text-[9px] tracking-widest">
                Seat Allocation
              </div>
              <div className="text-sm font-bold text-amber-700 dark:text-amber-400 font-mono mt-0.5">
                {booking.seatNumbers.join(', ')}
              </div>
            </div>
          </div>

          {/* Perforated Divider Visual Effect */}
          <div className="relative flex items-center my-2">
            <div className="w-5 h-5 -ml-8 bg-[#fafaf9] dark:bg-[#080b11] rounded-full border border-stone-200 dark:border-stone-800"></div>
            <div className="flex-1 border-b-2 border-dashed border-stone-300 dark:border-stone-700 mx-1"></div>
            <div className="w-5 h-5 -mr-8 bg-[#fafaf9] dark:bg-[#080b11] rounded-full border border-stone-200 dark:border-stone-800"></div>
          </div>

          {/* Origin & Destination Segment */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="w-2/5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Departure Station</span>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight mt-0.5 font-mono">
                {booking.originCode}
              </div>
              <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate mt-0.5">
                {booking.origin}
              </div>
              <div className="text-sm font-extrabold text-amber-700 dark:text-amber-400 mt-1">
                {booking.departureTime}
              </div>
            </div>

            <div className="w-1/5 flex flex-col items-center">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono">
                {booking.duration}
              </span>
              <div className="w-full flex items-center my-1.5">
                <div className="h-[2px] flex-1 bg-stone-300 dark:bg-stone-700"></div>
                <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-1 shrink-0" />
                <div className="h-[2px] flex-1 bg-stone-300 dark:bg-stone-700"></div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Confirmed</span>
            </div>

            <div className="w-2/5 text-right">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Arrival Station</span>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight mt-0.5 font-mono">
                {booking.destCode}
              </div>
              <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate mt-0.5">
                {booking.destination}
              </div>
              <div className="text-sm font-extrabold text-amber-700 dark:text-amber-400 mt-1">
                {booking.arrivalTime}
              </div>
            </div>
          </div>

          {/* Verified Pickup & Destination Addresses (Real Address Mention) */}
          <div className="p-3.5 bg-stone-100/80 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700/70 text-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                  Official Boarding / Pickup Location Address
                </span>
                <p className="text-stone-800 dark:text-stone-200 font-semibold leading-relaxed mt-0.5">
                  {booking.originAddress || `${booking.terminalOrPlatform || 'Main Boarding Terminal'}, ${booking.origin}, India`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
              <div className="w-5 h-5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                  Arrival / Drop-off Destination Address
                </span>
                <p className="text-stone-800 dark:text-stone-200 font-semibold leading-relaxed mt-0.5">
                  {booking.destAddress || `${booking.destination}, India`}
                </p>
              </div>
            </div>
          </div>

          {/* Passengers Table */}
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Confirmed Passengers
            </div>
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden bg-white dark:bg-stone-800/40">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500 font-bold uppercase text-[9px] tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">Passenger Name</th>
                    <th className="px-3.5 py-2.5">Age / Gender</th>
                    <th className="px-3.5 py-2.5">Seat / Berth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-medium">
                  {booking.passengers.map((p, i) => (
                    <tr key={p.id}>
                      <td className="px-3.5 py-2.5 font-bold text-stone-900 dark:text-white">
                        {p.fullName}
                      </td>
                      <td className="px-3.5 py-2.5 text-stone-600 dark:text-stone-400">
                        {p.age} yrs · {p.gender}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {booking.seatNumbers[i] || 'Allocated'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Driver & Ride Details (If Car, Auto, or Bike) */}
          {booking.driverInfo && (
            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/80 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-amber-200/60 dark:border-amber-800/60">
                <span className="font-bold text-amber-950 dark:text-amber-200">
                  Assigned Chauffeur: {booking.driverInfo.name}
                </span>
                <span className="font-black text-amber-950 dark:text-amber-200 text-sm">
                  Ride OTP: <span className="bg-amber-200/80 dark:bg-amber-800 px-2 py-0.5 rounded font-mono">{booking.driverInfo.otp}</span>
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 text-amber-900 dark:text-amber-300 font-medium">
                <span>Vehicle: {booking.driverInfo.vehicleNumber}</span>
                <span>Contact: {booking.driverInfo.phone}</span>
              </div>
            </div>
          )}

          {/* Cancellation Info if cancelled */}
          {isCancelled && booking.cancellationDetails && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Trip Cancelled on {new Date(booking.cancellationDetails.cancelledAt).toLocaleDateString()}</span>
              </div>
              <div>Refund Amount: ₹{booking.cancellationDetails.refundAmount.toLocaleString('en-IN')} (Ref: {booking.cancellationDetails.refundReference})</div>
              <div>Deduction Fee: ₹{booking.cancellationDetails.deductionAmount.toLocaleString('en-IN')}</div>
            </div>
          )}

          {/* Fare & Barcode Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-800">
            <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
              <div>
                Base Fare: <span className="font-mono font-bold text-stone-900 dark:text-stone-100">₹{booking.fareBreakdown.baseFare.toLocaleString('en-IN')}</span>
              </div>
              <div>
                Taxes & Surcharges: <span className="font-mono font-bold text-stone-900 dark:text-stone-100">₹{booking.fareBreakdown.taxesAndGst.toLocaleString('en-IN')}</span>
              </div>
              <div className="font-extrabold text-stone-900 dark:text-white pt-1 border-t border-stone-200 dark:border-stone-700">
                Total Paid: ₹{booking.fareBreakdown.totalAmount.toLocaleString('en-IN')} via {booking.paymentMethod}
              </div>
            </div>

            {/* Authentic SVG QR Code Presentation */}
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 bg-white p-1 rounded-lg border border-stone-300 dark:border-stone-600 flex items-center justify-center shadow-xs">
                <QrCode className="w-16 h-16 text-stone-900" />
              </div>
              <div className="text-[10px] text-stone-400 max-w-[130px] font-mono leading-tight">
                AUTHENTIC BOARDING TOKEN SIGNED BY TICKET LIFE & {booking.providerName.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (hidden in print) */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-900/60 print:hidden">
          <div className="flex items-center gap-2">
            {!isCancelled && (
              <button
                type="button"
                onClick={() => onOpenCancelModal(booking)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
              >
                Request Cancellation
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenLiveTracker(booking)}
              className="px-4 py-2 text-xs font-bold text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 transition-colors flex items-center gap-1.5 border border-stone-200 dark:border-stone-700"
            >
              <Radio className="w-3.5 h-3.5 text-amber-500" />
              <span>Track Live Radar</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenGmailConfirm(booking)}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email via Gmail</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
