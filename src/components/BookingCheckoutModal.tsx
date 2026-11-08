import React, { useState } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  User,
  Plus,
  Trash2,
  Tag,
  Sparkles,
  AlertCircle,
  Clock,
  Printer,
  Mail,
} from 'lucide-react';
import {
  BookingRecord,
  FareBreakdown,
  PassengerInfo,
  TransportOption,
  UserAccount,
} from '../types/travel';
import { createConfirmedBooking } from '../services/api';
import { POPULAR_OFFERS } from '../data/mockData';

interface BookingCheckoutModalProps {
  option: TransportOption;
  user: UserAccount | null;
  travelDate: string;
  passengersCount: number;
  onClose: () => void;
  onBookingSuccess: (booking: BookingRecord) => void;
  onOpenGmailConfirm: (booking: BookingRecord) => void;
}

export const BookingCheckoutModal: React.FC<BookingCheckoutModalProps> = ({
  option,
  user,
  travelDate,
  passengersCount,
  onClose,
  onBookingSuccess,
  onOpenGmailConfirm,
}) => {
  // Step: 1 = Passengers & Addons, 2 = Payment Gateway, 3 = Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Passengers list initialized from user's saved passengers or default
  const [passengers, setPassengers] = useState<PassengerInfo[]>(() => {
    if (user && user.savedPassengers.length > 0) {
      const initial = user.savedPassengers.slice(0, passengersCount);
      while (initial.length < passengersCount) {
        initial.push({
          id: `pax-${Date.now()}-${initial.length}`,
          fullName: '',
          age: 28,
          gender: 'male',
          seatPreference: 'Window / Lower',
        });
      }
      return initial;
    }
    return Array.from({ length: passengersCount }).map((_, i) => ({
      id: `pax-${Date.now()}-${i}`,
      fullName: i === 0 && user ? user.fullName : '',
      age: 28,
      gender: 'male',
      seatPreference: 'Window / Lower',
    }));
  });

  // Contact info
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');

  // Promo Code
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'NetBanking' | 'Wallet'>('UPI');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'qr'>('gpay');
  const [upiIdInput, setUpiIdInput] = useState('');
  
  // Test Card details
  const [cardNumber, setCardNumber] = useState('4532 8901 2289 4410');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('882');
  const [cardHolder, setCardHolder] = useState(user?.fullName || '');

  // Processing state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  // Fare calculations
  const count = passengers.length;
  const baseTotal = option.baseFare * count;
  const taxesTotal = option.taxesAndFees * count;
  const convenienceFee = option.platformFee;
  const discountTotal = appliedPromo ? appliedPromo.discount : 0;
  const grandTotal = Math.max(0, baseTotal + taxesTotal + convenienceFee - discountTotal);

  const fareBreakdown: FareBreakdown = {
    baseFare: baseTotal,
    taxesAndGst: taxesTotal,
    convenienceFee,
    discount: discountTotal,
    totalAmount: grandTotal,
  };

  const handleApplyPromo = () => {
    setPromoError('');
    const code = promoCodeInput.trim().toUpperCase();
    const found = POPULAR_OFFERS.find((o) => o.code === code);
    if (!found) {
      setPromoError('Invalid promo code. Try FIRSTTRIP or TRAINPASS.');
      return;
    }
    if (baseTotal < (found.minBooking || 0)) {
      setPromoError(`Minimum booking amount of ₹${found.minBooking} required for ${code}.`);
      return;
    }

    let discount = 0;
    if (found.flatDiscount) {
      discount = found.flatDiscount;
    } else if (found.discountPercent) {
      discount = Math.min(found.maxDiscount || 9999, Math.round((baseTotal * found.discountPercent) / 100));
    }
    setAppliedPromo({ code, discount });
  };

  const handleAddPassenger = () => {
    setPassengers((prev) => [
      ...prev,
      {
        id: `pax-${Date.now()}-${prev.length}`,
        fullName: '',
        age: 25,
        gender: 'male',
        seatPreference: 'Window',
      },
    ]);
  };

  const handleRemovePassenger = (id: string) => {
    if (passengers.length <= 1) return;
    setPassengers((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePassengerField = (id: string, field: keyof PassengerInfo, value: any) => {
    setPassengers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Execute payment and create confirmed booking
  const handleCompletePayment = async () => {
    setIsProcessingPayment(true);

    // Simulate server-side cryptographic payment verification
    setTimeout(() => {
      const txnId = `pay_rzp_mock_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      // Finalize booking with authorized provider
      const booking = createConfirmedBooking({
        option,
        passengers: passengers.map((p) => ({
          ...p,
          fullName: p.fullName.trim() || 'Passenger',
        })),
        fareBreakdown,
        paymentMethod,
        paymentTxnId: txnId,
        travelDate,
      });

      setConfirmedBooking(booking);
      setIsProcessingPayment(false);
      setCurrentStep(3);
      onBookingSuccess(booking);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden my-6 transition-all">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              <span>{option.category.toUpperCase()} BOOKING</span>
              <span aria-hidden="true">·</span>
              <span>Authorized Gateway</span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              {option.title} ({option.serviceNumber})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Indicators */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-center">
          <div
            className={`py-3 ${
              currentStep === 1
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-b-2 border-sky-600'
                : currentStep > 1
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            1. Passenger & Journey
          </div>
          <div
            className={`py-3 ${
              currentStep === 2
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-b-2 border-sky-600'
                : currentStep > 2
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            2. Secure Payment
          </div>
          <div
            className={`py-3 ${
              currentStep === 3
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600'
                : 'text-slate-400'
            }`}
          >
            3. Confirmed Ticket
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {/* STEP 1: Passengers & Add-ons */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Journey Snapshot */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white">Travel Date: {travelDate}</span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">{option.travelClass}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="max-w-[42%]">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">{option.departureTime}</span>
                    <span className="block text-slate-700 dark:text-slate-300 font-semibold">{option.origin} ({option.originCode})</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      📍 {option.originAddress || `${option.originTerminalOrPlatform || 'Main Station/Bay'}, ${option.origin}`}
                    </span>
                  </div>
                  <div className="text-center text-slate-400 font-mono text-xs px-2 shrink-0">
                    {option.duration} ➔
                  </div>
                  <div className="text-right max-w-[42%]">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">{option.arrivalTime}</span>
                    <span className="block text-slate-700 dark:text-slate-300 font-semibold">{option.destination} ({option.destCode})</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      🏁 {option.destAddress || `${option.destTerminalOrPlatform || 'Arrival Terminal'}, ${option.destination}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Passenger Inputs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Passenger Details ({passengers.length})
                  </h3>
                  <button
                    onClick={handleAddPassenger}
                    className="flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Traveler</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {passengers.map((pax, idx) => (
                    <div
                      key={pax.id}
                      className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 text-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-[160px]">
                        <input
                          type="text"
                          value={pax.fullName}
                          onChange={(e) => updatePassengerField(pax.id, 'fullName', e.target.value)}
                          placeholder="Full Name as per Govt ID"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          value={pax.age}
                          onChange={(e) => updatePassengerField(pax.id, 'age', parseInt(e.target.value, 10))}
                          placeholder="Age"
                          className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-center"
                        />
                      </div>

                      <div className="w-24">
                        <select
                          value={pax.gender}
                          onChange={(e) => updatePassengerField(pax.id, 'gender', e.target.value)}
                          className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="w-32">
                        <select
                          value={pax.seatPreference}
                          onChange={(e) => updatePassengerField(pax.id, 'seatPreference', e.target.value)}
                          className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value="Window">Window</option>
                          <option value="Aisle">Aisle</option>
                          <option value="Lower Berth">Lower</option>
                          <option value="Upper Berth">Upper</option>
                        </select>
                      </div>

                      {passengers.length > 1 && (
                        <button
                          onClick={() => handleRemovePassenger(pax.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title="Remove passenger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information for Tickets & Receipts */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                  Contact Details for Ticket & PNR Delivery
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Email Address (Ticket Sent Here)
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Mobile Number (SMS Updates & Driver OTP)
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-semibold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Promo Code Section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter promo code (e.g. FIRSTTRIP)"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md uppercase font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleApplyPromo}
                    className="px-4 py-1.5 text-xs font-bold text-sky-600 bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-600 rounded-md hover:bg-sky-50 transition-colors"
                  >
                    Apply
                  </button>
                </div>

                {appliedPromo && (
                  <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Coupon {appliedPromo.code} applied! Saved ₹{appliedPromo.discount}.</span>
                  </div>
                )}
                {promoError && (
                  <div className="mt-2 text-xs text-rose-500 font-medium">
                    {promoError}
                  </div>
                )}
              </div>

              {/* Step 1 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500">Total Payable Amount</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-2 shadow-sm shadow-sky-600/20"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Secure Payment Gateway */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Payment Security Badge */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">PCI-DSS 256-Bit Encrypted Gateway</span>
                  <span className="block text-[11px] text-emerald-700/80 dark:text-emerald-400">
                    Never storing your CVV or UPI PIN. Verified server-side payment callback.
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                    paymentMethod === 'UPI'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span>Instant UPI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Card')}
                  className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                    paymentMethod === 'Card'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Credit / Debit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('NetBanking')}
                  className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                    paymentMethod === 'NetBanking'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Net Banking</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Wallet')}
                  className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                    paymentMethod === 'Wallet'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>TL Wallet (₹2,450)</span>
                </button>
              </div>

              {/* UPI Form */}
              {paymentMethod === 'UPI' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('gpay')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                        selectedUpiApp === 'gpay'
                          ? 'bg-white dark:bg-slate-900 border-sky-600 text-sky-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Google Pay
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('phonepe')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                        selectedUpiApp === 'phonepe'
                          ? 'bg-white dark:bg-slate-900 border-sky-600 text-sky-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      PhonePe
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('paytm')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                        selectedUpiApp === 'paytm'
                          ? 'bg-white dark:bg-slate-900 border-sky-600 text-sky-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Paytm UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('qr')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                        selectedUpiApp === 'qr'
                          ? 'bg-white dark:bg-slate-900 border-sky-600 text-sky-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Scan QR
                    </button>
                  </div>

                  {selectedUpiApp === 'qr' ? (
                    <div className="text-center py-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="w-32 h-32 mx-auto bg-slate-100 dark:bg-slate-800 p-2 rounded-lg flex items-center justify-center">
                        <QrCode className="w-24 h-24 text-slate-800 dark:text-white" />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Scan with any UPI app to pay ₹{grandTotal.toLocaleString('en-IN')}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Virtual Payment Address (VPA / UPI ID)
                      </label>
                      <input
                        type="text"
                        value={upiIdInput}
                        onChange={(e) => setUpiIdInput(e.target.value)}
                        placeholder="yourname@okhdfcbank"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Card Form */}
              {paymentMethod === 'Card' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* NetBanking */}
              {paymentMethod === 'NetBanking' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                  <p className="mb-2 font-semibold">Select Authorized Bank:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        className="p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-left font-semibold text-slate-800 dark:text-slate-200 hover:border-sky-500"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wallet */}
              {paymentMethod === 'Wallet' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Available Ticket Life Wallet Balance:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white font-mono">₹2,450.00</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    Instant 1-click debit without OTP requirement.
                  </div>
                </div>
              )}

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Back to Details
                </button>

                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleCompletePayment}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-400 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-2 shadow-sm shadow-sky-600/20"
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying with Provider...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay ₹{grandTotal.toLocaleString('en-IN')} & Confirm Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirmed Ticket View */}
          {currentStep === 3 && confirmedBooking && (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  BOOKING CONFIRMED BY PROVIDER
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  Ticket Life Reference: {confirmedBooking.bookingRef}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Official Provider Confirmation / PNR:{' '}
                  <span className="font-extrabold text-sky-600 dark:text-sky-400 font-mono text-sm">
                    {confirmedBooking.pnrNumber || confirmedBooking.providerRef}
                  </span>
                </p>
              </div>

              {/* Pass details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span>{confirmedBooking.serviceTitle}</span>
                  <span className="text-sky-600 font-mono">{confirmedBooking.serviceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Departure:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {confirmedBooking.departureTime}, {confirmedBooking.departureDate} ({confirmedBooking.originCode})
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Seat(s) Allocated:</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">
                    {confirmedBooking.seatNumbers.join(', ')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Total Amount Paid:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₹{confirmedBooking.fareBreakdown.totalAmount.toLocaleString('en-IN')} (Txn: {confirmedBooking.paymentTxnId})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenGmailConfirm(confirmedBooking)}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-red-600/20"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Ticket via Gmail</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ticket</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Done & View My Bookings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
