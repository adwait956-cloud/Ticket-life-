import {
  BookingRecord,
  LocationItem,
  ProviderStatus,
  TransportOption,
  UserAccount,
} from '../types/travel';

export const LOCATIONS_LIST: LocationItem[] = [
  // City Pickup & Drop Hubs (for Cars, Auto Rickshaws & Bikes)
  { id: 'loc-cp-delhi', name: 'Connaught Place / Central District', code: 'CP-DEL', city: 'New Delhi', state: 'Delhi', type: 'city_point' },
  { id: 'loc-aerocity-delhi', name: 'Aerocity / IGI Pickup Bay', code: 'AERO-DEL', city: 'New Delhi', state: 'Delhi', type: 'city_point' },
  { id: 'loc-cyberhub-ggn', name: 'DLF CyberHub Gurugram', code: 'CYB-GGN', city: 'Gurugram', state: 'Haryana', type: 'city_point' },
  { id: 'loc-sector18-noida', name: 'Sector 18 Metro Hub Noida', code: 'N18-DEL', city: 'Noida', state: 'Uttar Pradesh', type: 'city_point' },
  { id: 'loc-bkc-mumbai', name: 'Bandra Kurla Complex (BKC)', code: 'BKC-BOM', city: 'Mumbai', state: 'Maharashtra', type: 'city_point' },
  { id: 'loc-andheri-mumbai', name: 'Andheri West Transit Hub', code: 'AND-BOM', city: 'Mumbai', state: 'Maharashtra', type: 'city_point' },
  { id: 'loc-koramangala-blr', name: 'Koramangala 4th Block Hub', code: 'KOR-BLR', city: 'Bengaluru', state: 'Karnataka', type: 'city_point' },
  { id: 'loc-whitefield-blr', name: 'ITPL Tech Park / Whitefield', code: 'WTF-BLR', city: 'Bengaluru', state: 'Karnataka', type: 'city_point' },
  { id: 'loc-indiranagar-blr', name: 'Indiranagar 100ft Road', code: 'IND-BLR', city: 'Bengaluru', state: 'Karnataka', type: 'city_point' },
  { id: 'loc-hitec-hyd', name: 'HITEC City Cyber Towers', code: 'HIT-HYD', city: 'Hyderabad', state: 'Telangana', type: 'city_point' },
  { id: 'loc-tnagar-maa', name: 'T. Nagar / Anna Salai Hub', code: 'TNG-MAA', city: 'Chennai', state: 'Tamil Nadu', type: 'city_point' },
  { id: 'loc-panjim-goa', name: 'Panaji City Promenade', code: 'PAN-GOA', city: 'Goa', state: 'Goa', type: 'city_point' },
];

// All fake/mock rides removed — rides are loaded live from Firebase Realtime Database (ticket-life-c4b76)
export const TRANSPORT_CATALOG: TransportOption[] = [];

export const INITIAL_USER: UserAccount = {
  id: 'usr-new-guest',
  email: '',
  fullName: '',
  phone: '',
  role: 'passenger',
  walletBalance: 0,
  savedPassengers: [],
};

export const INITIAL_BOOKINGS: BookingRecord[] = [];

export const PROVIDER_PARTNERS: ProviderStatus[] = [
  {
    id: 'prov-cars-fleet',
    category: 'cars',
    name: 'Ticket Life Cab & Chauffeur Fleet (RTDB)',
    authEndpoint: 'https://ticket-life-c4b76-default-rtdb.asia-southeast1.firebasedatabase.app/cars',
    status: 'connected_live',
    apiVersion: 'v3.2-RTDB',
    lastPing: 'Live',
    totalSyncedTrips: 0,
    notes: 'Connected directly to Firebase Realtime Database for live car & cab rides.',
  },
  {
    id: 'prov-autos-fleet',
    category: 'autos',
    name: 'Ticket Life Auto Rickshaw Dispatch (RTDB)',
    authEndpoint: 'https://ticket-life-c4b76-default-rtdb.asia-southeast1.firebasedatabase.app/autos',
    status: 'connected_live',
    apiVersion: 'v3.2-RTDB',
    lastPing: 'Live',
    totalSyncedTrips: 0,
    notes: 'Connected directly to Firebase Realtime Database for meter & EV auto rickshaws.',
  },
  {
    id: 'prov-bikes-fleet',
    category: 'bikes',
    name: 'Ticket Life Bike Taxi & Moto Dispatch (RTDB)',
    authEndpoint: 'https://ticket-life-c4b76-default-rtdb.asia-southeast1.firebasedatabase.app/bikes',
    status: 'connected_live',
    apiVersion: 'v3.2-RTDB',
    lastPing: 'Live',
    totalSyncedTrips: 0,
    notes: 'Connected directly to Firebase Realtime Database for express bike taxis & rentals.',
  },
];

export const POPULAR_OFFERS = [
  {
    code: 'FIRSTTRIP',
    title: 'Flat 15% Off on Your First Ride',
    description: 'Valid across Cars, Auto Rickshaws, and Bikes. Maximum savings of ₹250.',
    discountPercent: 15,
    maxDiscount: 250,
    minBooking: 100,
    category: 'all',
  },
  {
    code: 'RIDEFREE',
    title: 'Flat ₹50 Off on Cars, Autos & Bikes',
    description: 'Daily city commutes made affordable. Apply code on your next verified ride.',
    flatDiscount: 50,
    minBooking: 120,
    category: 'cars',
  },
  {
    code: 'AUTORUSH',
    title: '₹30 Instant Off on Auto Rickshaws',
    description: 'Beat peak-hour traffic with verified meter and EV auto rickshaw rides.',
    flatDiscount: 30,
    minBooking: 80,
    category: 'autos',
  },
  {
    code: 'BIKESPRINT',
    title: 'Flat ₹25 Off on Bike Taxi Rides',
    description: 'Fast two-wheeler pickups for solo city commutes and quick last-mile drops.',
    flatDiscount: 25,
    minBooking: 50,
    category: 'bikes',
  },
];

export const FAQS = [
  {
    q: 'How does Ticket Life confirm real rides?',
    a: 'Ticket Life connects directly to your live Firebase Realtime Database (ticket-life-c4b76) for real Cars, Auto Rickshaws, and Bikes and persists confirmed bookings directly in the database.',
  },
  {
    q: 'How do online payments work on Ticket Life?',
    a: 'We support all major payment instruments: Instant UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit cards (Visa, Mastercard, RuPay), and Net Banking via Cashfree & PhonePe PG.',
  },
  {
    q: 'Can I send my confirmed ride pass to Gmail?',
    a: 'Yes! Ticket Life includes built-in Google Workspace Gmail integration. With one click, your confirmed ride pass and tax invoice are formatted and sent directly to your Gmail inbox.',
  },
  {
    q: 'What is the cancellation and refund policy?',
    a: 'Cars, Auto Rickshaws, and Bikes offer 100% free cancellation before pickup, with instant refunds credited straight back to your Ticket Life Wallet.',
  },
  {
    q: 'How does live ride status tracking work?',
    a: 'Live ride statuses, driver details, vehicle plate numbers, and pickup OTPs synchronize directly from Firebase Realtime Database updates in real time.',
  },
];
