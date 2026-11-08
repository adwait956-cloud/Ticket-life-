import {
  BookingRecord,
  FareBreakdown,
  PassengerInfo,
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

const BOOKINGS_STORAGE_KEY = 'ticketlife_bookings_v2';
const USER_STORAGE_KEY = 'ticketlife_user_v2';
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

// User Profile
export function getStoredUser(): UserAccount {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(INITIAL_USER));
      return INITIAL_USER;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_USER;
  }
}

export function saveStoredUser(user: UserAccount): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Error saving user to storage:', e);
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
export function searchTransportOptions(filters: SearchFilterState): TransportOption[] {
  let list = TRANSPORT_CATALOG.filter((item) => item.category === filters.category);

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
  paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'Wallet';
  paymentTxnId: string;
  travelDate: string;
}): BookingRecord {
  const { option, passengers, fareBreakdown, paymentMethod, paymentTxnId, travelDate } = params;

  const now = new Date();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();

  // Generate authentic reference structures according to category
  let pnrNumber = '';
  let bookingRef = '';
  let providerRef = '';
  let seatNumbers: string[] = [];

  if (option.category === 'trains') {
    pnrNumber = `${Math.floor(200 + Math.random() * 800)}-${Math.floor(1000000 + Math.random() * 9000000)}`;
    bookingRef = `TL-RAIL-${randomNum}`;
    providerRef = `IRCTC-CONF-${pnrNumber.replace('-', '')}`;
    const coaches = ['B1', 'B2', 'C1', 'C2', 'E1', 'A1'];
    const chosenCoach = coaches[Math.floor(Math.random() * coaches.length)];
    seatNumbers = passengers.map((_, i) => `${chosenCoach} - ${Math.floor(10 + Math.random() * 60)} (${i % 2 === 0 ? 'Window' : 'Aisle'})`);
  } else if (option.category === 'flights') {
    pnrNumber = `${option.serviceNumber.substring(0, 2)}-TL${shortCode}`;
    bookingRef = `TL-AIR-${randomNum}`;
    providerRef = pnrNumber;
    const rows = [10, 11, 12, 14, 15, 16, 18, 20];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const row = rows[Math.floor(Math.random() * rows.length)];
    seatNumbers = passengers.map((_, i) => `${row}${letters[i % letters.length]}`);
  } else if (option.category === 'buses') {
    bookingRef = `TL-BUS-${randomNum}`;
    providerRef = `RB-CONF-${shortCode}${Math.floor(1000 + Math.random() * 9000)}`;
    pnrNumber = providerRef;
    seatNumbers = passengers.map((_, i) => `Seat ${Math.floor(1 + Math.random() * 30)} (${i % 2 === 0 ? 'Lower' : 'Upper'})`);
  } else {
    // Mobility (cars, autos, bikes)
    bookingRef = `TL-RIDE-${randomNum}`;
    providerRef = `FLEET-${shortCode}-${Math.floor(100 + Math.random() * 900)}`;
    pnrNumber = providerRef;
    seatNumbers = [`Vehicle ${option.serviceNumber}`];
  }

  // Cryptographic mock token for QR
  const qrCodeToken = `${option.category.toUpperCase()}|${bookingRef}|${pnrNumber}|${option.originCode}-${option.destCode}|${passengers[0]?.fullName || 'USER'}|CONFIRMED`;

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
    destination: option.destination,
    destCode: option.destCode,
    destAddress: option.destAddress || `${option.destTerminalOrPlatform || 'Arrival Terminal'}, ${option.destination}`,
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
    paymentStatus: 'paid',
    bookingStatus: 'confirmed',
    providerName: option.providerName,
    qrCodeToken,
    terminalOrPlatform: option.originTerminalOrPlatform || 'Main Bay',
    createdAt: now.toISOString(),
    driverInfo: option.liveStatus?.driverDetails,
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

  // Calculate refund
  const total = booking.fareBreakdown.totalAmount;
  let deductionPercent = 10; // 90% refund default
  if (booking.category === 'cars' || booking.category === 'autos' || booking.category === 'bikes') {
    deductionPercent = 0; // 100% free cancellation for mobility rides
  } else if (booking.category === 'flights') {
    deductionPercent = 20; // 80% refund
  }

  const deductionAmount = Math.round((total * deductionPercent) / 100);
  const refundAmount = total - deductionAmount;
  const refundReference = `REF-TL-${Math.floor(100000 + Math.random() * 900000)}`;

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

  // Automatically credit refund amount to wallet
  addWalletRefund(refundAmount, `Refund for cancelled booking ${booking.bookingRef}`, booking.bookingRef);

  return { success: true, booking: updatedBooking };
}

const WALLET_STORAGE_KEY = 'ticketlife_wallet_txns_v2';

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
  const user = getStoredUser();
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
  const user = getStoredUser();
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
  const user = getStoredUser();
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
