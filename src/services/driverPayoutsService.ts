import { BookingRecord, DriverPayoutSummary, DriverTripPayoutItem, TransportCategory } from '../types/travel';
import { getStoredBookings, saveStoredBookings } from './api';

const PAYOUT_STORAGE_KEY = 'ticketlife_driver_payouts_seed_v2';
const PAYOUT_HISTORY_KEY = 'ticketlife_payout_transactions_v1';

export interface PayoutTransactionRecord {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehiclePlateNumber: string;
  amount: number;
  tripsCount: number;
  paymentMethod: 'UPI' | 'IMPS_Bank' | 'Cash';
  referenceNumber: string;
  timestamp: string;
  notes: string;
}

// Baseline realistic completed trips for Nashik & Indian mobility fleet
const SEED_COMPLETED_TRIPS: BookingRecord[] = [
  {
    id: 'comp-ride-101',
    bookingRef: 'TL-C-881290',
    providerRef: 'PV-CAR-01',
    category: 'cars',
    serviceTitle: 'Prime Sedan (Maruti Dzire)',
    serviceNumber: 'MH 15 AB 8912',
    vehicleType: 'Sedan Cab',
    origin: 'Panchavati Temple Area, Nashik',
    originCode: 'PNCH',
    destination: 'Nashik Road Railway Station',
    destCode: 'NKRD',
    departureDate: '2026-11-12',
    departureTime: '08:30 AM',
    arrivalDate: '2026-11-12',
    arrivalTime: '09:05 AM',
    duration: '35 mins',
    passengers: [{ id: 'p1', fullName: 'Vikram Joshi', age: 34, gender: 'male' }],
    seatNumbers: ['Seat 1'],
    fareBreakdown: {
      baseFare: 420,
      taxesAndGst: 38,
      convenienceFee: 30,
      discount: 0,
      totalAmount: 488,
    },
    paymentMethod: 'UPI',
    paymentTxnId: 'upi_gpay_982103819',
    paymentStatus: 'paid',
    bookingStatus: 'completed',
    startOtpVerified: true,
    rideStartedAt: '2026-11-12T08:30:00.000Z',
    rideCompletedAt: '2026-11-12T09:05:00.000Z',
    collectedByDriverMethod: undefined,
    providerName: 'Ticket Life Mobility Fleet',
    qrCodeToken: 'TLQR-881290',
    createdAt: '2026-11-12T08:15:00.000Z',
    payoutStatus: 'pending',
    driverInfo: {
      name: 'Rajesh Patil',
      driverName: 'Rajesh Patil',
      phone: '+91 98220 14890',
      vehicleNumber: 'MH 15 AB 8912',
      vehiclePlateNumber: 'MH 15 AB 8912',
      rating: 4.92,
      otp: '4821',
      driverPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
  },
  {
    id: 'comp-ride-102',
    bookingRef: 'TL-C-881291',
    providerRef: 'PV-CAR-01',
    category: 'cars',
    serviceTitle: 'Prime Sedan (Maruti Dzire)',
    serviceNumber: 'MH 15 AB 8912',
    vehicleType: 'Sedan Cab',
    origin: 'Gangapur Road, Nashik',
    originCode: 'GANG',
    destination: 'Trimbakeshwar Temple Highway',
    destCode: 'TRMB',
    departureDate: '2026-11-12',
    departureTime: '11:15 AM',
    arrivalDate: '2026-11-12',
    arrivalTime: '12:10 PM',
    duration: '55 mins',
    passengers: [{ id: 'p2', fullName: 'Ananya Sen', age: 28, gender: 'female' }],
    seatNumbers: ['Seat 1'],
    fareBreakdown: {
      baseFare: 680,
      taxesAndGst: 60,
      convenienceFee: 40,
      discount: 0,
      totalAmount: 780,
    },
    paymentMethod: 'Card',
    paymentTxnId: 'card_txn_992101',
    paymentStatus: 'paid',
    bookingStatus: 'completed',
    startOtpVerified: true,
    rideStartedAt: '2026-11-12T11:15:00.000Z',
    rideCompletedAt: '2026-11-12T12:10:00.000Z',
    providerName: 'Ticket Life Mobility Fleet',
    qrCodeToken: 'TLQR-881291',
    createdAt: '2026-11-12T11:00:00.000Z',
    payoutStatus: 'pending',
    driverInfo: {
      name: 'Rajesh Patil',
      driverName: 'Rajesh Patil',
      phone: '+91 98220 14890',
      vehicleNumber: 'MH 15 AB 8912',
      vehiclePlateNumber: 'MH 15 AB 8912',
      rating: 4.92,
      otp: '4821',
      driverPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
  },
  {
    id: 'comp-ride-103',
    bookingRef: 'TL-C-881280',
    providerRef: 'PV-CAR-01',
    category: 'cars',
    serviceTitle: 'Prime Sedan (Maruti Dzire)',
    serviceNumber: 'MH 15 AB 8912',
    vehicleType: 'Sedan Cab',
    origin: 'Cidco Bus Stand, Nashik',
    originCode: 'CDCO',
    destination: 'Mumbai Naka Chowk, Nashik',
    destCode: 'MNAK',
    departureDate: '2026-11-11',
    departureTime: '06:20 PM',
    arrivalDate: '2026-11-11',
    arrivalTime: '06:45 PM',
    duration: '25 mins',
    passengers: [{ id: 'p3', fullName: 'Sameer Kulkarni', age: 41, gender: 'male' }],
    seatNumbers: ['Seat 1'],
    fareBreakdown: {
      baseFare: 310,
      taxesAndGst: 28,
      convenienceFee: 20,
      discount: 0,
      totalAmount: 358,
    },
    paymentMethod: 'UPI',
    paymentTxnId: 'upi_txn_771829',
    paymentStatus: 'paid',
    bookingStatus: 'completed',
    startOtpVerified: true,
    rideStartedAt: '2026-11-11T18:20:00.000Z',
    rideCompletedAt: '2026-11-11T18:45:00.000Z',
    providerName: 'Ticket Life Mobility Fleet',
    qrCodeToken: 'TLQR-881280',
    createdAt: '2026-11-11T18:00:00.000Z',
    payoutStatus: 'settled',
    payoutRef: 'IMPS-SBI-991201',
    payoutSettledAt: '2026-11-11T20:00:00.000Z',
    driverInfo: {
      name: 'Rajesh Patil',
      driverName: 'Rajesh Patil',
      phone: '+91 98220 14890',
      vehicleNumber: 'MH 15 AB 8912',
      vehiclePlateNumber: 'MH 15 AB 8912',
      rating: 4.92,
      otp: '4821',
      driverPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
  },
  // Auto Rickshaw Driver: Suresh Shinde
  {
    id: 'comp-ride-201',
    bookingRef: 'TL-A-552019',
    providerRef: 'PV-AUTO-01',
    category: 'autos',
    serviceTitle: 'Local Green Auto (Bajaj RE)',
    serviceNumber: 'MH 15 CR 3341',
    vehicleType: 'Auto Rickshaw',
    origin: 'Dwarka Circle, Nashik',
    originCode: 'DWRK',
    destination: 'College Road Center, Nashik',
    destCode: 'COLG',
    departureDate: '2026-11-12',
    departureTime: '10:00 AM',
    arrivalDate: '2026-11-12',
    arrivalTime: '10:22 AM',
    duration: '22 mins',
    passengers: [{ id: 'p4', fullName: 'Pooja Rathi', age: 22, gender: 'female' }],
    seatNumbers: ['Seat 1'],
    fareBreakdown: {
      baseFare: 140,
      taxesAndGst: 10,
      convenienceFee: 10,
      discount: 0,
      totalAmount: 160,
    },
    paymentMethod: 'UPI',
    paymentTxnId: 'upi_phonepe_331029',
    paymentStatus: 'paid',
    bookingStatus: 'completed',
    startOtpVerified: true,
    rideStartedAt: '2026-11-12T10:00:00.000Z',
    rideCompletedAt: '2026-11-12T10:22:00.000Z',
    providerName: 'Ticket Life Auto Dispatch',
    qrCodeToken: 'TLQR-552019',
    createdAt: '2026-11-12T09:50:00.000Z',
    payoutStatus: 'pending',
    driverInfo: {
      name: 'Suresh Shinde',
      driverName: 'Suresh Shinde',
      phone: '+91 98231 66209',
      vehicleNumber: 'MH 15 CR 3341',
      vehiclePlateNumber: 'MH 15 CR 3341',
      rating: 4.88,
      otp: '7721',
      driverPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    },
  },
  {
    id: 'comp-ride-202',
    bookingRef: 'TL-A-552020',
    providerRef: 'PV-AUTO-01',
    category: 'autos',
    serviceTitle: 'Local Green Auto (Bajaj RE)',
    serviceNumber: 'MH 15 CR 3341',
    vehicleType: 'Auto Rickshaw',
    origin: 'Ashok Stambh, Nashik',
    originCode: 'ASHK',
    destination: 'Indira Nagar Jogging Track, Nashik',
    destCode: 'INDR',
    departureDate: '2026-11-12',
    departureTime: '01:10 PM',
    arrivalDate: '2026-11-12',
    arrivalTime: '01:35 PM',
    duration: '25 mins',
    passengers: [{ id: 'p5', fullName: 'Girish Tare', age: 48, gender: 'male' }],
    seatNumbers: ['Seat 1'],
    fareBreakdown: {
      baseFare: 175,
      taxesAndGst: 15,
      convenienceFee: 10,
      discount: 0,
      totalAmount: 200,
    },
    paymentMethod: 'Wallet',
    paymentTxnId: 'wlt_txn_441209',
    paymentStatus: 'paid',
    bookingStatus: 'completed',
    startOtpVerified: true,
    rideStartedAt: '2026-11-12T13:10:00.000Z',
    rideCompletedAt: '2026-11-12T13:35:00.000Z',
    providerName: 'Ticket Life Auto Dispatch',
    qrCodeToken: 'TLQR-552020',
    createdAt: '2026-11-12T13:00:00.000Z',
    payoutStatus: 'pending',
    driverInfo: {
      name: 'Suresh Shinde',
      driverName: 'Suresh Shinde',
      phone: '+91 98231 66209',
      vehicleNumber: 'MH 15 CR 3341',
      vehiclePlateNumber: 'MH 15 CR 3341',
      rating: 4.88,
      otp: '7721',
      driverPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    },
  },
  // Bike Taxi Driver: Akash More
  {
    id: 'comp-ride-301',
    bookingRef: 'TL-B-119280',
    providerRef: 'PV-BIKE-01',
    category: 'bikes',
    serviceTitle: 'Express Commuter Moto (Honda Shine)',
    serviceNumber: 'MH 15 EQ 7820',
    vehicleType: 'Bike Taxi',
    origin: 'City Center Mall, Nashik',
    originCode: 'CCM',
    destination: 'Govind Nagar Ring Road, Nashik',
    destCode: 'GVDN',
    departureDate: '2026-11-12',
    departureTime: '02:00 PM',
    arrivalDate: '2026-11-12',
    arrivalTime: '02:14 PM',
    duration: '14 mins',
    passengers: [{ id: 'p6', fullName: 'Nikhil Verma', age: 24, gender: 'male' }],
    seatNumbers: ['Seat 1'],
    fareBreakdown: {
      baseFare: 80,
      taxesAndGst: 5,
      convenienceFee: 10,
      discount: 0,
      totalAmount: 95,
    },
    paymentMethod: 'UPI',
    paymentTxnId: 'upi_paytm_11920',
    paymentStatus: 'paid',
    bookingStatus: 'completed',
    startOtpVerified: true,
    rideStartedAt: '2026-11-12T14:00:00.000Z',
    rideCompletedAt: '2026-11-12T14:14:00.000Z',
    providerName: 'Ticket Life Bike Dispatch',
    qrCodeToken: 'TLQR-119280',
    createdAt: '2026-11-12T13:50:00.000Z',
    payoutStatus: 'pending',
    driverInfo: {
      name: 'Akash More',
      driverName: 'Akash More',
      phone: '+91 98229 77810',
      vehicleNumber: 'MH 15 EQ 7820',
      vehiclePlateNumber: 'MH 15 EQ 7820',
      rating: 4.95,
      otp: '9120',
      driverPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    },
  },
  {
    id: 'comp-ride-302',
    bookingRef: 'TL-B-119279',
    providerRef: 'PV-BIKE-01',
    category: 'bikes',
    serviceTitle: 'Express Commuter Moto (Honda Shine)',
    serviceNumber: 'MH 15 EQ 7820',
    vehicleType: 'Bike Taxi',
    origin: 'Panchavati Karanja, Nashik',
    originCode: 'PNCH',
    destination: 'Nashik Road Railway Station',
    destCode: 'NKRD',
    departureDate: '2026-11-11',
    departureTime: '04:00 PM',
    arrivalDate: '2026-11-11',
    arrivalTime: '04:25 PM',
    duration: '25 mins',
    passengers: [{ id: 'p7', fullName: 'Rohit Sawant', age: 29, gender: 'male' }],
    seatNumbers: ['Seat 1'],
    fareBreakdown: {
      baseFare: 110,
      taxesAndGst: 8,
      convenienceFee: 10,
      discount: 0,
      totalAmount: 128,
    },
    paymentMethod: 'UPI',
    paymentTxnId: 'upi_gpay_881920',
    paymentStatus: 'paid',
    bookingStatus: 'completed',
    startOtpVerified: true,
    rideStartedAt: '2026-11-11T16:00:00.000Z',
    rideCompletedAt: '2026-11-11T16:25:00.000Z',
    providerName: 'Ticket Life Bike Dispatch',
    qrCodeToken: 'TLQR-119279',
    createdAt: '2026-11-11T15:45:00.000Z',
    payoutStatus: 'settled',
    payoutRef: 'UPI-PAYTM-992182',
    payoutSettledAt: '2026-11-11T19:00:00.000Z',
    driverInfo: {
      name: 'Akash More',
      driverName: 'Akash More',
      phone: '+91 98229 77810',
      vehicleNumber: 'MH 15 EQ 7820',
      vehiclePlateNumber: 'MH 15 EQ 7820',
      rating: 4.95,
      otp: '9120',
      driverPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    },
  },
  // Chauffeur SUV Driver: Vikram Kulkarni
  {
    id: 'comp-ride-401',
    bookingRef: 'TL-C-990145',
    providerRef: 'PV-CAR-02',
    category: 'cars',
    serviceTitle: 'Chauffeur Executive (Hyundai Creta)',
    serviceNumber: 'MH 15 GH 4419',
    vehicleType: 'Executive SUV',
    origin: 'Ozar Airport Terminal, Nashik',
    originCode: 'OZAR',
    destination: 'Sula Vineyards Resort, Gangapur',
    destCode: 'SULA',
    departureDate: '2026-11-12',
    departureTime: '03:30 PM',
    arrivalDate: '2026-11-12',
    arrivalTime: '04:20 PM',
    duration: '50 mins',
    passengers: [{ id: 'p8', fullName: 'Dr. Manish Kapoor', age: 52, gender: 'male' }],
    seatNumbers: ['Seat 1'],
    fareBreakdown: {
      baseFare: 950,
      taxesAndGst: 85,
      convenienceFee: 50,
      discount: 0,
      totalAmount: 1085,
    },
    paymentMethod: 'UPI',
    paymentTxnId: 'upi_icici_991823',
    paymentStatus: 'paid',
    bookingStatus: 'completed',
    startOtpVerified: true,
    rideStartedAt: '2026-11-12T15:30:00.000Z',
    rideCompletedAt: '2026-11-12T16:20:00.000Z',
    providerName: 'Ticket Life Mobility Fleet',
    qrCodeToken: 'TLQR-990145',
    createdAt: '2026-11-12T15:00:00.000Z',
    payoutStatus: 'pending',
    driverInfo: {
      name: 'Vikram Kulkarni',
      driverName: 'Vikram Kulkarni',
      phone: '+91 98233 11928',
      vehicleNumber: 'MH 15 GH 4419',
      vehiclePlateNumber: 'MH 15 GH 4419',
      rating: 4.90,
      otp: '6543',
      driverPhotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    },
  },
];

// Driver Profile Metadata Dictionary
const DRIVER_METADATA_MAP: Record<
  string,
  {
    upiId: string;
    bankAccount: string;
    bankIfsc: string;
    vehicleType: string;
    category: TransportCategory;
    photoUrl: string;
    completionRate: number;
    acceptanceRate: number;
    ratingCount: number;
    fiveStarPercent: number;
    onTimeRate: number;
    tier: 'Platinum' | 'Gold' | 'Silver';
    badge: string;
  }
> = {
  'Rajesh Patil': {
    upiId: 'rajesh.patil92@oksbi',
    bankAccount: '30918239011',
    bankIfsc: 'SBIN0001452',
    vehicleType: 'Maruti Swift Dzire (Sedan)',
    category: 'cars',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    completionRate: 99.2,
    acceptanceRate: 98.0,
    ratingCount: 348,
    fiveStarPercent: 95,
    onTimeRate: 98.6,
    tier: 'Platinum',
    badge: 'Premier Chauffeur',
  },
  'Suresh Shinde': {
    upiId: 'suresh.shinde@ybl',
    bankAccount: '60128930192',
    bankIfsc: 'MAHB0000108',
    vehicleType: 'Bajaj RE Compact (Auto Rickshaw)',
    category: 'autos',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    completionRate: 98.4,
    acceptanceRate: 96.2,
    ratingCount: 284,
    fiveStarPercent: 92,
    onTimeRate: 97.4,
    tier: 'Gold',
    badge: 'Nashik Route Master',
  },
  'Akash More': {
    upiId: 'akash.more@paytm',
    bankAccount: '5010029381920',
    bankIfsc: 'HDFC0000060',
    vehicleType: 'Honda Shine 125 (Bike Taxi)',
    category: 'bikes',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    completionRate: 99.6,
    acceptanceRate: 99.1,
    ratingCount: 412,
    fiveStarPercent: 97,
    onTimeRate: 99.4,
    tier: 'Platinum',
    badge: 'Express Commuter Ace',
  },
  'Vikram Kulkarni': {
    upiId: 'vikram.k@icici',
    bankAccount: '001201592819',
    bankIfsc: 'ICIC0000012',
    vehicleType: 'Hyundai Creta SX (Executive SUV)',
    category: 'cars',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    completionRate: 97.8,
    acceptanceRate: 95.4,
    ratingCount: 196,
    fiveStarPercent: 91,
    onTimeRate: 96.8,
    tier: 'Gold',
    badge: 'Luxury Specialist',
  },
};

/**
 * Gets or initializes seed completed trips in localStorage
 */
export function getPersistedCompletedTrips(): BookingRecord[] {
  try {
    const raw = localStorage.getItem(PAYOUT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PAYOUT_STORAGE_KEY, JSON.stringify(SEED_COMPLETED_TRIPS));
      return SEED_COMPLETED_TRIPS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_COMPLETED_TRIPS;
  }
}

export function savePersistedCompletedTrips(trips: BookingRecord[]): void {
  try {
    localStorage.setItem(PAYOUT_STORAGE_KEY, JSON.stringify(trips));
  } catch (e) {
    console.error('Error saving persisted completed trips:', e);
  }
}

/**
 * Gets recorded payout transaction audit log
 */
export function getPayoutTransactionHistory(): PayoutTransactionRecord[] {
  try {
    const raw = localStorage.getItem(PAYOUT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordPayoutTransaction(record: PayoutTransactionRecord): void {
  try {
    const list = getPayoutTransactionHistory();
    list.unshift(record);
    localStorage.setItem(PAYOUT_HISTORY_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error recording payout transaction:', e);
  }
}

/**
 * Aggregates all completed rides across user bookings & fleet seed trips into DriverPayoutSummary records.
 */
export function calculateDriverPayoutSummaries(liveBookings: BookingRecord[]): DriverPayoutSummary[] {
  const seedTrips = getPersistedCompletedTrips();

  // Combine real completed bookings from app storage and seed fleet completed trips (avoiding duplicates by id)
  const allCompletedTripsMap = new Map<string, BookingRecord>();

  // 1. Put seed completed trips
  seedTrips.forEach((t) => allCompletedTripsMap.set(t.id, t));

  // 2. Put user's live completed bookings (e.g. from end ride & pay driver)
  liveBookings
    .filter((b) => b.bookingStatus === 'completed')
    .forEach((b) => {
      allCompletedTripsMap.set(b.id, b);
    });

  const allCompleted = Array.from(allCompletedTripsMap.values());

  // Group by driver key (phone or name)
  const driverGroups = new Map<string, BookingRecord[]>();

  allCompleted.forEach((trip) => {
    const driverName =
      trip.driverInfo?.driverName ||
      trip.driverInfo?.name ||
      'Ticket Life Captain';
    const driverKey = trip.driverInfo?.phone || driverName;

    if (!driverGroups.has(driverKey)) {
      driverGroups.set(driverKey, []);
    }
    driverGroups.get(driverKey)!.push(trip);
  });

  const summaries: DriverPayoutSummary[] = [];

  driverGroups.forEach((trips, driverKey) => {
    const firstTrip = trips[0];
    const driverInfo = firstTrip.driverInfo;
    const name = driverInfo?.driverName || driverInfo?.name || 'Ticket Life Captain';
    const phone = driverInfo?.phone || driverKey;
    const meta = DRIVER_METADATA_MAP[name] || {
      upiId: `${name.toLowerCase().replace(/\s+/g, '')}@okaxis`,
      bankAccount: '109283749102',
      bankIfsc: 'HDFC0000001',
      vehicleType: firstTrip.vehicleType || 'Mobility Fleet Vehicle',
      category: firstTrip.category,
      photoUrl: driverInfo?.driverPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      completionRate: 98.5,
      acceptanceRate: 96.0,
      ratingCount: 180,
      fiveStarPercent: 93,
      onTimeRate: 97.5,
      tier: 'Gold' as const,
      badge: 'Verified Fleet Captain',
    };

    let totalGrossFares = 0;
    let platformFeeTotal = 0;
    let totalEarnings = 0;
    let settledAmount = 0;
    let pendingAmount = 0;

    const rideItems: DriverTripPayoutItem[] = trips.map((trip) => {
      const fare = trip.fareBreakdown?.totalAmount || 200;
      // Driver gets 85% of trip fare, platform retains 15%
      const driverCut = Math.round(fare * 0.85);
      const platformCut = fare - driverCut;

      totalGrossFares += fare;
      platformFeeTotal += platformCut;
      totalEarnings += driverCut;

      const isSettled = trip.payoutStatus === 'settled';
      if (isSettled) {
        settledAmount += driverCut;
      } else {
        pendingAmount += driverCut;
      }

      const wasCollectedByDriver =
        trip.paymentMethod === 'PayAfterRide' ||
        Boolean(trip.collectedByDriverMethod);

      return {
        bookingId: trip.id,
        bookingRef: trip.bookingRef,
        serviceTitle: trip.serviceTitle,
        category: trip.category,
        origin: trip.origin,
        destination: trip.destination,
        completedAt: trip.rideCompletedAt || trip.departureDate,
        fareAmount: fare,
        driverCut,
        platformCut,
        paymentMethod: trip.paymentMethod,
        collectedBy: wasCollectedByDriver ? 'Driver' : 'Platform',
        payoutStatus: isSettled ? 'settled' : 'pending',
        payoutRef: trip.payoutRef,
        payoutSettledAt: trip.payoutSettledAt,
      };
    });

    summaries.push({
      driverId: `drv-${phone.replace(/[^0-9]/g, '').slice(-6) || '881290'}`,
      driverName: name,
      driverPhotoUrl: meta.photoUrl,
      driverPhone: phone,
      vehiclePlateNumber: driverInfo?.vehiclePlateNumber || driverInfo?.vehicleNumber || firstTrip.serviceNumber,
      vehicleType: meta.vehicleType,
      category: meta.category,
      rating: driverInfo?.rating || (meta.ratingCount ? 4.9 : 4.9),
      ratingCount: meta.ratingCount,
      completionRate: meta.completionRate,
      acceptanceRate: meta.acceptanceRate,
      fiveStarPercent: meta.fiveStarPercent,
      onTimeRate: meta.onTimeRate,
      tier: meta.tier,
      badge: meta.badge,
      upiId: meta.upiId,
      bankAccount: meta.bankAccount,
      bankIfsc: meta.bankIfsc,
      completedRidesCount: trips.length,
      totalGrossFares,
      platformFeeTotal,
      totalEarnings,
      settledAmount,
      pendingAmount,
      rides: rideItems.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
    });
  });

  return summaries.sort((a, b) => b.pendingAmount - a.pendingAmount);
}

/**
 * Settles all pending rides for a specific driver.
 */
export function settleDriverPayout(params: {
  driverPhoneOrName: string;
  paymentMethod: 'UPI' | 'IMPS_Bank' | 'Cash';
  customRef?: string;
}): { success: boolean; amountSettled: number; settledCount: number; payoutRef: string } {
  const { driverPhoneOrName, paymentMethod, customRef } = params;
  const now = new Date();
  const payoutRef =
    customRef?.trim() ||
    `TL-PAY-${paymentMethod.toUpperCase().replace('_', '')}-${Math.floor(100000 + Math.random() * 900000)}`;

  let amountSettled = 0;
  let settledCount = 0;
  let targetDriverName = '';
  let targetDriverPhone = '';
  let targetPlate = '';

  const updateTripsList = (list: BookingRecord[]) => {
    let changed = false;
    list.forEach((trip) => {
      const matchName = trip.driverInfo?.driverName === driverPhoneOrName || trip.driverInfo?.name === driverPhoneOrName;
      const matchPhone = trip.driverInfo?.phone === driverPhoneOrName;

      if ((matchName || matchPhone) && trip.payoutStatus !== 'settled') {
        trip.payoutStatus = 'settled';
        trip.payoutSettledAt = now.toISOString();
        trip.payoutRef = payoutRef;
        trip.payoutMethod = paymentMethod;

        const fare = trip.fareBreakdown?.totalAmount || 200;
        const driverCut = Math.round(fare * 0.85);
        amountSettled += driverCut;
        settledCount += 1;
        changed = true;

        targetDriverName = trip.driverInfo?.driverName || trip.driverInfo?.name || driverPhoneOrName;
        targetDriverPhone = trip.driverInfo?.phone || '';
        targetPlate = trip.driverInfo?.vehiclePlateNumber || trip.serviceNumber;
      }
    });
    return changed;
  };

  // 1. Update persisted fleet seed trips
  const seedTrips = getPersistedCompletedTrips();
  if (updateTripsList(seedTrips)) {
    savePersistedCompletedTrips(seedTrips);
  }

  // 2. Update user stored bookings
  const userBookings = getStoredBookings();
  if (updateTripsList(userBookings)) {
    saveStoredBookings(userBookings);
  }

  if (settledCount > 0) {
    recordPayoutTransaction({
      id: `payout-${Date.now()}`,
      driverId: targetDriverPhone || driverPhoneOrName,
      driverName: targetDriverName || driverPhoneOrName,
      driverPhone: targetDriverPhone,
      vehiclePlateNumber: targetPlate,
      amount: amountSettled,
      tripsCount: settledCount,
      paymentMethod,
      referenceNumber: payoutRef,
      timestamp: now.toISOString(),
      notes: `Settled ${settledCount} completed trip(s) via ${paymentMethod} to driver.`,
    });
  }

  return {
    success: settledCount > 0,
    amountSettled,
    settledCount,
    payoutRef,
  };
}

/**
 * Settles an individual trip payout directly.
 */
export function settleSingleTripPayout(
  bookingId: string,
  paymentMethod: 'UPI' | 'IMPS_Bank' | 'Cash' = 'UPI'
): { success: boolean; payoutRef: string } {
  const now = new Date();
  const payoutRef = `TL-TRIP-${paymentMethod.toUpperCase().replace('_', '')}-${Math.floor(100000 + Math.random() * 900000)}`;

  const updateInList = (list: BookingRecord[]) => {
    const item = list.find((b) => b.id === bookingId);
    if (item) {
      item.payoutStatus = 'settled';
      item.payoutSettledAt = now.toISOString();
      item.payoutRef = payoutRef;
      item.payoutMethod = paymentMethod;
      return true;
    }
    return false;
  };

  const seedTrips = getPersistedCompletedTrips();
  if (updateInList(seedTrips)) {
    savePersistedCompletedTrips(seedTrips);
  }

  const userBookings = getStoredBookings();
  if (updateInList(userBookings)) {
    saveStoredBookings(userBookings);
  }

  return { success: true, payoutRef };
}

/**
 * Batch settles all pending payouts across all drivers.
 */
export function batchSettleAllPendingPayouts(
  paymentMethod: 'UPI' | 'IMPS_Bank' = 'UPI'
): { success: boolean; totalAmount: number; settledDriversCount: number; batchRef: string } {
  const now = new Date();
  const batchRef = `BATCH-TL-${paymentMethod}-${Date.now().toString().slice(-6)}`;

  let totalAmount = 0;
  const affectedDrivers = new Set<string>();

  const processList = (list: BookingRecord[]) => {
    let changed = false;
    list.forEach((b) => {
      if (b.bookingStatus === 'completed' && b.payoutStatus !== 'settled') {
        b.payoutStatus = 'settled';
        b.payoutSettledAt = now.toISOString();
        b.payoutRef = batchRef;
        b.payoutMethod = paymentMethod;

        const fare = b.fareBreakdown?.totalAmount || 200;
        const driverCut = Math.round(fare * 0.85);
        totalAmount += driverCut;

        const dName = b.driverInfo?.driverName || b.driverInfo?.name || 'Captain';
        affectedDrivers.add(dName);
        changed = true;
      }
    });
    return changed;
  };

  const seedTrips = getPersistedCompletedTrips();
  if (processList(seedTrips)) {
    savePersistedCompletedTrips(seedTrips);
  }

  const userBookings = getStoredBookings();
  if (processList(userBookings)) {
    saveStoredBookings(userBookings);
  }

  if (affectedDrivers.size > 0) {
    recordPayoutTransaction({
      id: `payout-batch-${Date.now()}`,
      driverId: 'all-fleet-captains',
      driverName: `Batch Payout (${affectedDrivers.size} drivers)`,
      driverPhone: 'Fleet Dispatch',
      vehiclePlateNumber: 'Multi-Vehicle',
      amount: totalAmount,
      tripsCount: 0,
      paymentMethod,
      referenceNumber: batchRef,
      timestamp: now.toISOString(),
      notes: `Batch settlement across ${affectedDrivers.size} drivers (${Array.from(affectedDrivers).join(', ')}).`,
    });
  }

  return {
    success: totalAmount > 0,
    totalAmount,
    settledDriversCount: affectedDrivers.size,
    batchRef,
  };
}

/**
 * Exports Driver Payouts report as downloadable CSV
 */
export function generatePayoutsCsv(summaries: DriverPayoutSummary[]): string {
  const headers = [
    'Driver Name',
    'Phone',
    'Category',
    'Vehicle Plate Number',
    'Vehicle Type',
    'Rating',
    'UPI ID',
    'Bank Account',
    'Bank IFSC',
    'Completed Trips',
    'Gross Fare Volume (INR)',
    'Platform Fee (15%) (INR)',
    'Total Driver Net Earnings (85%) (INR)',
    'Amount Settled (INR)',
    'Pending Amount Owed (INR)',
    'Payout Status',
  ];

  const rows = summaries.map((s) => [
    `"${s.driverName}"`,
    `"${s.driverPhone}"`,
    `"${s.category.toUpperCase()}"`,
    `"${s.vehiclePlateNumber}"`,
    `"${s.vehicleType}"`,
    s.rating,
    `"${s.upiId}"`,
    `"'${s.bankAccount}"`,
    `"${s.bankIfsc}"`,
    s.completedRidesCount,
    s.totalGrossFares,
    s.platformFeeTotal,
    s.totalEarnings,
    s.settledAmount,
    s.pendingAmount,
    s.pendingAmount > 0 ? 'PENDING_PAYOUT' : 'SETTLED',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
