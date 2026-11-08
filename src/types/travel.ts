export type TransportCategory = 'cars' | 'autos' | 'bikes' | 'trains' | 'flights' | 'buses';

export interface LocationItem {
  id: string;
  name: string;
  code: string;
  city: string;
  state?: string;
  type: 'airport' | 'railway' | 'bus_station' | 'city_point';
}

export interface SearchFilterState {
  category: TransportCategory;
  origin: string;
  originCode: string;
  destination: string;
  destCode: string;
  departDate: string;
  returnDate?: string;
  isRoundTrip: boolean;
  passengers: number;
  travelClass?: string;
  sortBy: 'price_asc' | 'duration_asc' | 'departure_asc' | 'rating_desc';
  maxPrice?: number;
  timeSlot?: 'morning' | 'afternoon' | 'evening' | 'night' | 'all';
  acOnly?: boolean;
}

export interface TransportOption {
  id: string;
  category: TransportCategory;
  providerName: string;
  providerCode: string;
  operatorLogo?: string;
  title: string;
  serviceNumber: string; // e.g. "AI-802", "12002 - Shatabdi", "KA-01-EQ-9921"
  vehicleType: string;   // e.g. "Boeing 787 Dreamliner", "Vande Bharat Express 2.0", "Prime Sedan (Honda City)", "Electric Rickshaw"
  origin: string;
  originCode: string;
  originAddress?: string;
  originTerminalOrPlatform?: string;
  destination: string;
  destCode: string;
  destAddress?: string;
  destTerminalOrPlatform?: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  baseFare: number;
  taxesAndFees: number;
  platformFee: number;
  availableSeats: number | string; // e.g. 18 or "2 mins away"
  rating: number;
  reviewsCount: number;
  amenities: string[];
  travelClass: string;
  cancellationPolicy: {
    freeCancellationAvailable: boolean;
    cutoffHours: number;
    refundPercent: number;
  };
  providerIntegration: {
    partnerName: string;
    status: 'connected_live' | 'connected_sandbox' | 'integration_pending';
    credentialId?: string;
  };
  liveStatus?: {
    statusText: string;
    delayMinutes: number;
    currentStationOrLocation: string;
    nextHalt: string;
    platformOrGate: string;
    lastUpdated: string;
    driverDetails?: {
      name: string;
      phone: string;
      rating: number;
      vehicleNumber: string;
      otp: string;
    };
  };
}

export interface PassengerInfo {
  id: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  seatPreference?: string;
  berthPreference?: string;
  idNumber?: string;
}

export interface FareBreakdown {
  baseFare: number;
  taxesAndGst: number;
  convenienceFee: number;
  discount: number;
  totalAmount: number;
}

export interface BookingRecord {
  id: string;
  bookingRef: string;
  providerRef: string;
  pnrNumber?: string;
  category: TransportCategory;
  serviceTitle: string;
  serviceNumber: string;
  vehicleType: string;
  origin: string;
  originCode: string;
  originAddress?: string;
  destination: string;
  destCode: string;
  destAddress?: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  duration: string;
  passengers: PassengerInfo[];
  seatNumbers: string[];
  fareBreakdown: FareBreakdown;
  paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'Wallet';
  paymentTxnId: string;
  paymentStatus: 'paid' | 'refunded' | 'partially_refunded';
  bookingStatus: 'confirmed' | 'completed' | 'cancelled' | 'in_progress';
  providerName: string;
  qrCodeToken: string;
  terminalOrPlatform?: string;
  createdAt: string;
  cancellationDetails?: {
    cancelledAt: string;
    reason: string;
    refundAmount: number;
    deductionAmount: number;
    refundStatus: 'processed' | 'pending';
    refundReference: string;
  };
  driverInfo?: {
    name: string;
    phone: string;
    vehicleNumber: string;
    rating: number;
    otp: string;
  };
}

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'passenger' | 'admin';
  savedPassengers: PassengerInfo[];
  walletBalance: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  category: string;
  bookingRef?: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  reply?: string;
}

export interface ProviderStatus {
  id: string;
  category: TransportCategory;
  name: string;
  authEndpoint: string;
  status: 'connected_live' | 'connected_sandbox' | 'integration_pending';
  apiVersion: string;
  lastPing: string;
  totalSyncedTrips: number;
  notes: string;
}

export interface TravelDigestItem {
  id: string;
  source: 'gmail_parsed' | 'confirmed_booking';
  carrier: string;
  serviceNumber: string;
  category: TransportCategory;
  origin: string;
  originCode: string;
  destination: string;
  destCode: string;
  departureDate: string;
  departureTime: string;
  departureCountdown: string;
  pnrOrRef: string;
  platformOrTerminal: string;
  seatInfo?: string;
  statusText: string;
  gmailSnippet?: string;
  rawDate?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category: 'topup' | 'booking_payment' | 'refund' | 'cashback';
  timestamp: string;
  balanceAfter: number;
  referenceId?: string;
  paymentMethod?: string;
}

export type NotificationType = 'account_created' | 'forgot_password' | 'travel_booking' | 'login_alert';

export interface EmailNotificationLog {
  id: string;
  type: NotificationType;
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  timestamp: string;
  status: 'sent' | 'pending' | 'failed';
  gmailMessageId?: string;
  meta?: Record<string, any>;
}

