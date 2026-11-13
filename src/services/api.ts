import {
  BookingRecord,
  FareBreakdown,
  PassengerInfo,
  PriceAlert,
  ProviderStatus,
  SearchFilterState,
  SupportTicket,
  TransportCategory,
  TransportOption,
  UserAccount,
  WalletTransaction,
} from '../types/travel';
import {
  INITIAL_BOOKINGS,
  INITIAL_USER,
  PROVIDER_PARTNERS,
  TRANSPORT_CATALOG,
} from '../data/mockData';

const BOOKINGS_STORAGE_KEY = 'ticketlife_bookings_v4';
const USER_STORAGE_KEY = 'ticketlife_user_v4';
const WALLET_STORAGE_KEY = 'ticketlife_wallet_txns_v4';
const PRICE_ALERTS_STORAGE_KEY = 'ticketlife_price_alerts_v1';
const PROVIDERS_STORAGE_KEY = 'ticketlife_providers_v1';
const SUPPORT_STORAGE_KEY = 'ticketlife_support_v1';

// Initialize and get stored bookings
export function getStoredBookings(): BookingRecord[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(INITIAL_BOOKINGS));
      return INITIAL_BOOKINGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading bookings from storage:', e);
    return INITIAL_BOOKINGS;
  }
}

export function saveStoredBookings(bookings: BookingRecord[]): void {
  try {
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
  } catch (e) {
    console.error('Error saving bookings to storage:', e);
  }
}

// User Profile - Returns null if not logged in or if purged legacy account
export function getStoredUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email || parsed.email.trim() === '') {
      return null;
    }
    if (String(parsed.email).toLowerCase().includes('adwait956')) {
      deleteStoredUser();
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

export function saveStoredUser(user: UserAccount): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Error saving user to storage:', e);
  }
}

export function deleteStoredUser(): void {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(BOOKINGS_STORAGE_KEY);
    localStorage.removeItem(WALLET_STORAGE_KEY);
    localStorage.removeItem(PRICE_ALERTS_STORAGE_KEY);
    localStorage.removeItem(SUPPORT_STORAGE_KEY);
    localStorage.removeItem('ticketlife_notifications_log_v1');
    localStorage.removeItem('ticketlife_user_v1');
    localStorage.removeItem('ticketlife_user_v2');
    localStorage.removeItem('ticketlife_user_v3');
    localStorage.removeItem('ticketlife_user_v4');
    localStorage.removeItem('ticketlife_bookings_v1');
    localStorage.removeItem('ticketlife_bookings_v2');
    localStorage.removeItem('ticketlife_bookings_v3');
    localStorage.removeItem('ticketlife_bookings_v4');
    localStorage.removeItem('ticketlife_wallet_txns_v1');
    localStorage.removeItem('ticketlife_wallet_txns_v2');
    localStorage.removeItem('ticketlife_wallet_txns_v3');
    localStorage.removeItem('ticketlife_wallet_txns_v4');
    localStorage.removeItem('ticketlife_notifications_v1');
    sessionStorage.removeItem('ticketlife_startup_seen');
    sessionStorage.removeItem('ticketlife_pending_pg_txn');
  } catch (e) {
    console.error('Error deleting stored user:', e);
  }
}

// Providers
export function getStoredProviders(): ProviderStatus[] {
  try {
    const raw = localStorage.getItem(PROVIDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(PROVIDER_PARTNERS));
      return PROVIDER_PARTNERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return PROVIDER_PARTNERS;
  }
}

export function updateProviderStatus(
  providerId: string,
  newStatus: 'connected_live' | 'connected_sandbox' | 'integration_pending'
): ProviderStatus[] {
  const providers = getStoredProviders().map((p) =>
    p.id === providerId ? { ...p, status: newStatus, lastPing: 'Just updated' } : p
  );
  try {
    localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
  } catch (e) {
    console.error('Error saving providers:', e);
  }
  return providers;
}

// Support tickets
export function getStoredSupportTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(SUPPORT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function createSupportTicket(
  ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>
): SupportTicket {
  const tickets = getStoredSupportTickets();
  const newTicket: SupportTicket = {
    ...ticket,
    id: `tic-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    status: 'open',
  };
  tickets.unshift(newTicket);
  try {
    localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(tickets));
  } catch (e) {
    console.error('Error saving ticket:', e);
  }
  return newTicket;
}

/**
 * Filter & search transportation catalog
 */
export function searchTransportOptions(
  filters: SearchFilterState,
  databaseRides: TransportOption[] = [],
  includeAllCategories = false
): TransportOption[] {
  let list = includeAllCategories
    ? [...databaseRides]
    : databaseRides.filter((item) => item.category === filters.category);

  // If origin/dest are provided, match loosely
  if (filters.origin && filters.origin.trim() !== '') {
    const term = filters.origin.toLowerCase();
    const matched = list.filter(
      (item) =>
        item.origin.toLowerCase().includes(term) ||
        item.originCode.toLowerCase().includes(term)
    );
    if (matched.length > 0) {
      list = matched;
    }
  }

  if (filters.destination && filters.destination.trim() !== '') {
    const term = filters.destination.toLowerCase();
    const matched = list.filter(
      (item) =>
        item.destination.toLowerCase().includes(term) ||
        item.destCode.toLowerCase().includes(term)
    );
    if (matched.length > 0) {
      list = matched;
    }
  }

  // Filter max price
  if (filters.maxPrice && filters.maxPrice > 0) {
    list = list.filter((item) => item.price <= (filters.maxPrice || 999999));
  }

  // Filter AC only
  if (filters.acOnly) {
    list = list.filter(
      (item) =>
        item.travelClass.toLowerCase().includes('ac') ||
        item.amenities.some((a) => a.toLowerCase().includes('ac') || a.toLowerCase().includes('air conditioning'))
    );
  }

  // Sorting
  switch (filters.sortBy) {
    case 'price_asc':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'duration_asc':
      list.sort((a, b) => parseInt(a.duration, 10) - parseInt(b.duration, 10));
      break;
    case 'rating_desc':
      list.sort((a, b) => b.rating - a.rating);
      break;
    case 'departure_asc':
    default:
      break;
  }

  return list;
}

/**
 * Creates and registers a real confirmed booking with provider reference
 */
export function createConfirmedBooking(params: {
  option: TransportOption;
  passengers: PassengerInfo[];
  fareBreakdown: FareBreakdown;
  paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'PayAfterRide';
  paymentTxnId: string;
  travelDate: string;
}): BookingRecord {
  const { option, passengers, fareBreakdown, paymentMethod, paymentTxnId, travelDate } = params;

  const now = new Date();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();

  // Generate authentic reference structures for Cars, Auto Rickshaws & Bikes
  const prefix =
    option.category === 'cars'
      ? 'TL-CAR'
      : option.category === 'autos'
      ? 'TL-AUTO'
      : 'TL-BIKE';
  const bookingRef = `${prefix}-${randomNum}`;
  const providerRef = `FLEET-${shortCode}-${Math.floor(100 + Math.random() * 900)}`;
  const pnrNumber = providerRef;
  const seatNumbers = [`Vehicle ${option.serviceNumber}`];

  // Ensure driver & 4-digit Start OTP always exist for Uber/Ola OTP verification
  const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
  const driverInfo = option.liveStatus?.driverDetails || {
    name: option.providerName || 'Ticket Life Captain',
    phone: '+91 98230 00000',
    vehicleNumber: option.serviceNumber || `MH-15-TL-${generatedOtp}`,
    rating: option.rating || 4.9,
    otp: generatedOtp,
  };

  const qrCodeToken = `${option.category.toUpperCase()}|${bookingRef}|${pnrNumber}|${option.originCode}-${option.destCode}|${passengers[0]?.fullName || 'USER'}|CONFIRMED`;

  const isPayAfterRide = paymentMethod === 'PayAfterRide';

  const newBooking: BookingRecord = {
    id: `bkg-${Date.now()}-${randomNum}`,
    bookingRef,
    providerRef,
    pnrNumber,
    category: option.category,
    serviceTitle: option.title,
    serviceNumber: option.serviceNumber,
    vehicleType: option.vehicleType,
    origin: option.origin,
    originCode: option.originCode,
    originAddress: option.originAddress || `${option.originTerminalOrPlatform || 'Main Boarding Terminal'}, ${option.origin}`,
    originCoords: option.originCoords,
    destination: option.destination,
    destCode: option.destCode,
    destAddress: option.destAddress || `${option.destTerminalOrPlatform || 'Arrival Terminal'}, ${option.destination}`,
    destCoords: option.destCoords,
    departureDate: travelDate,
    departureTime: option.departureTime,
    arrivalDate: travelDate,
    arrivalTime: option.arrivalTime,
    duration: option.duration,
    passengers,
    seatNumbers,
    fareBreakdown,
    paymentMethod,
    paymentTxnId,
    paymentStatus: isPayAfterRide ? 'pay_after_ride' : 'paid',
    bookingStatus: 'confirmed',
    startOtpVerified: false,
    providerName: option.providerName,
    qrCodeToken,
    terminalOrPlatform: option.originTerminalOrPlatform || 'Main Bay',
    createdAt: now.toISOString(),
    driverInfo,
  };

  const existing = getStoredBookings();
  existing.unshift(newBooking);
  saveStoredBookings(existing);

  // If paid via wallet, deduct from user's wallet
  if (paymentMethod === 'Wallet') {
    deductWalletFunds(fareBreakdown.totalAmount, `Payment for ${option.title} (${bookingRef})`, bookingRef);
  }

  return newBooking;
}

/**
 * Verifies the 4-digit Start OTP (Uber/Ola style) and transitions the booking to in_progress.
 */
export function startRideWithOtp(
  bookingId: string,
  enteredOtp: string
): { success: boolean; booking?: BookingRecord; error?: string } {
  const bookings = getStoredBookings();
  const index = bookings.findIndex((b) => b.id === bookingId);
  if (index === -1) {
    return { success: false, error: 'Booking not found.' };
  }

  const booking = bookings[index];
  const expectedOtp = String(booking.driverInfo?.otp || '').trim();
  if (!expectedOtp || enteredOtp.trim() !== expectedOtp) {
    return {
      success: false,
      error: 'Invalid Ride OTP. Please enter the 4-digit Start OTP shared with the captain.',
    };
  }

  const updatedBooking: BookingRecord = {
    ...booking,
    bookingStatus: 'in_progress',
    startOtpVerified: true,
    rideStartedAt: booking.rideStartedAt || new Date().toISOString(),
  };

  bookings[index] = updatedBooking;
  saveStoredBookings(bookings);
  return { success: true, booking: updatedBooking };
}

/**
 * Completes the active ride at drop-off and settles payment directly with the driver (Cash or Direct UPI).
 */
export function completeRideAndPayDriver(
  bookingId: string,
  collectedMethod: 'Cash' | 'UPI' = 'Cash'
): { success: boolean; booking?: BookingRecord; error?: string } {
  const bookings = getStoredBookings();
  const index = bookings.findIndex((b) => b.id === bookingId);
  if (index === -1) {
    return { success: false, error: 'Booking not found.' };
  }

  const booking = bookings[index];
  const wasPayAfterRide = booking.paymentStatus === 'pay_after_ride' || booking.paymentMethod === 'PayAfterRide';
  const settlementTxnId = wasPayAfterRide
    ? `drv_${collectedMethod.toLowerCase()}_${Date.now().toString().slice(-6)}`
    : booking.paymentTxnId;

  const updatedBooking: BookingRecord = {
    ...booking,
    bookingStatus: 'completed',
    paymentStatus: 'paid',
    startOtpVerified: true,
    collectedByDriverMethod: wasPayAfterRide ? collectedMethod : booking.collectedByDriverMethod,
    paymentTxnId: settlementTxnId,
    rideCompletedAt: new Date().toISOString(),
  };

  bookings[index] = updatedBooking;
  saveStoredBookings(bookings);
  return { success: true, booking: updatedBooking };
}

/**
 * Process booking cancellation and compute fair refund
 */
export function cancelBooking(bookingId: string, reason: string): { success: boolean; booking?: BookingRecord; error?: string } {
  const bookings = getStoredBookings();
  const index = bookings.findIndex((b) => b.id === bookingId);
  if (index === -1) {
    return { success: false, error: 'Booking not found.' };
  }

  const booking = bookings[index];
  if (booking.bookingStatus === 'cancelled') {
    return { success: false, error: 'Booking is already cancelled.' };
  }

  const isPayAfterRide = booking.paymentStatus === 'pay_after_ride';
  const total = isPayAfterRide ? 0 : booking.fareBreakdown.totalAmount;
  const deductionPercent = 0;

  const deductionAmount = Math.round((total * deductionPercent) / 100);
  const refundAmount = total - deductionAmount;
  const refundReference = isPayAfterRide
    ? 'NO-PREPAYMENT-CANCEL'
    : `REF-TL-${Math.floor(100000 + Math.random() * 900000)}`;

  const updatedBooking: BookingRecord = {
    ...booking,
    bookingStatus: 'cancelled',
    paymentStatus: 'refunded',
    cancellationDetails: {
      cancelledAt: new Date().toISOString(),
      reason: reason || 'Customer requested cancellation via portal',
      refundAmount,
      deductionAmount,
      refundStatus: 'processed',
      refundReference,
    },
  };

  bookings[index] = updatedBooking;
  saveStoredBookings(bookings);

  // Only credit wallet refund if money was paid upfront
  if (refundAmount > 0) {
    addWalletRefund(refundAmount, `Refund for cancelled booking ${booking.bookingRef}`, booking.bookingRef);
  }

  return { success: true, booking: updatedBooking };
}

export function getStoredWalletTransactions(): WalletTransaction[] {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) {
      const initial: WalletTransaction[] = [];
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveWalletTransactions(txns: WalletTransaction[]): void {
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(txns));
  } catch (e) {
    console.error('Error saving wallet transactions:', e);
  }
}

export function addWalletFunds(amount: number, method: string): WalletTransaction {
  const user = getStoredUser() || { ...INITIAL_USER, id: `usr-${Date.now()}` };
  const newBalance = user.walletBalance + amount;
  user.walletBalance = newBalance;
  saveStoredUser(user);

  const txns = getStoredWalletTransactions();
  const newTxn: WalletTransaction = {
    id: `wal-txn-${Date.now()}`,
    type: 'credit',
    amount,
    description: `Wallet Recharge via ${method}`,
    category: 'topup',
    timestamp: new Date().toISOString(),
    balanceAfter: newBalance,
    paymentMethod: method,
  };
  txns.unshift(newTxn);
  saveWalletTransactions(txns);
  return newTxn;
}

export function addWalletRefund(amount: number, description: string, refId?: string): WalletTransaction {
  const user = getStoredUser() || { ...INITIAL_USER, id: `usr-${Date.now()}` };
  const newBalance = user.walletBalance + amount;
  user.walletBalance = newBalance;
  saveStoredUser(user);

  const txns = getStoredWalletTransactions();
  const newTxn: WalletTransaction = {
    id: `wal-txn-${Date.now()}`,
    type: 'credit',
    amount,
    description,
    category: 'refund',
    timestamp: new Date().toISOString(),
    balanceAfter: newBalance,
    referenceId: refId,
  };
  txns.unshift(newTxn);
  saveWalletTransactions(txns);
  return newTxn;
}

export function deductWalletFunds(amount: number, description: string, refId?: string): WalletTransaction {
  const user = getStoredUser() || { ...INITIAL_USER, id: `usr-${Date.now()}` };
  const newBalance = Math.max(0, user.walletBalance - amount);
  user.walletBalance = newBalance;
  saveStoredUser(user);

  const txns = getStoredWalletTransactions();
  const newTxn: WalletTransaction = {
    id: `wal-txn-${Date.now()}`,
    type: 'debit',
    amount,
    description,
    category: 'booking_payment',
    timestamp: new Date().toISOString(),
    balanceAfter: newBalance,
    referenceId: refId,
  };
  txns.unshift(newTxn);
  saveWalletTransactions(txns);
  return newTxn;
}

// ==================== PRICE ALERTS & ROUTE MONITORING ====================
export function getStoredPriceAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(PRICE_ALERTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveStoredPriceAlerts(alerts: PriceAlert[]): void {
  try {
    localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.error('Error saving price alerts:', e);
  }
}

export function createPriceAlert(
  data: Omit<PriceAlert, 'id' | 'createdAt' | 'isActive'>
): PriceAlert {
  const alerts = getStoredPriceAlerts();
  const newAlert: PriceAlert = {
    ...data,
    id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  alerts.unshift(newAlert);
  saveStoredPriceAlerts(alerts);
  return newAlert;
}

export function deletePriceAlert(id: string): PriceAlert[] {
  const alerts = getStoredPriceAlerts().filter((a) => a.id !== id);
  saveStoredPriceAlerts(alerts);
  return alerts;
}

export function togglePriceAlert(id: string): PriceAlert[] {
  const alerts = getStoredPriceAlerts().map((a) =>
    a.id === id ? { ...a, isActive: !a.isActive } : a
  );
  saveStoredPriceAlerts(alerts);
  return alerts;
}

/**
 * Evaluates transport options against active price alerts.
 * Returns newly triggered matches (where option price <= alert threshold).
 */
export function evaluatePriceAlerts(
  options: TransportOption[],
  customAlerts?: PriceAlert[]
): { triggeredAlert: PriceAlert; matchingOption: TransportOption }[] {
  const alerts = customAlerts || getStoredPriceAlerts();
  const activeAlerts = alerts.filter((a) => a.isActive);
  const matches: { triggeredAlert: PriceAlert; matchingOption: TransportOption }[] = [];
  let alertsChanged = false;

  for (const alert of activeAlerts) {
    const normOrigin = (alert.origin || '').toLowerCase().trim();
    const normDest = (alert.destination || '').toLowerCase().trim();

    // Find options matching route and category with price <= targetPrice
    const matchedOption = options.find((opt) => {
      const matchCat = !alert.category || opt.category === alert.category;
      const matchOrig =
        !normOrigin ||
        opt.origin.toLowerCase().includes(normOrigin) ||
        (alert.originCode && opt.originCode.toLowerCase() === alert.originCode.toLowerCase());
      const matchDest =
        !normDest ||
        opt.destination.toLowerCase().includes(normDest) ||
        (alert.destCode && opt.destCode.toLowerCase() === alert.destCode.toLowerCase());
      const isPriceBelow = opt.price <= alert.targetPrice;
      return matchCat && matchOrig && matchDest && isPriceBelow;
    });

    if (matchedOption) {
      // Check if we haven't already notified for this exact match and price
      const alreadyTriggeredForThis =
        alert.matchedOptionId === matchedOption.id &&
        alert.lastTriggeredPrice === matchedOption.price;

      if (!alreadyTriggeredForThis) {
        alert.lastTriggeredPrice = matchedOption.price;
        alert.lastTriggeredAt = new Date().toISOString();
        alert.matchedOptionId = matchedOption.id;
        alertsChanged = true;
        matches.push({ triggeredAlert: alert, matchingOption: matchedOption });
      }
    }
  }

  if (alertsChanged) {
    saveStoredPriceAlerts(alerts);
  }

  return matches;
}

