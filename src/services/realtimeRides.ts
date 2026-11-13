import { ref, onValue, get, push, set, update } from 'firebase/database';
import { rtdb } from './firebaseAuth';
import {
  BookingRecord,
  LatLngPoint,
  TransportCategory,
  TransportOption,
} from '../types/travel';

export type DatabaseConnectionState =
  | 'connecting'
  | 'connected'
  | 'permission_denied'
  | 'error';

export interface DatabaseRidesResult {
  rides: TransportOption[];
  status: DatabaseConnectionState;
  errorMessage?: string;
  sourceNode?: string;
  readablePaths?: string[];
}

const VALID_CATEGORIES: TransportCategory[] = ['cars', 'autos', 'bikes'];

const CANDIDATE_RIDE_PATHS = [
  'rides',
  'cars',
  'autos',
  'auto_rickshaws',
  'bikes',
  'cabs',
  'vehicles',
  'drivers',
  'trips',
  'real_rides',
  'available_rides',
];

const NON_RIDE_BRANCHES = new Set([
  'users',
  'user',
  'bookings',
  'booking',
  'supportTickets',
  'support_tickets',
  'tickets',
  'wallet',
  'walletTransactions',
  'notifications',
  'alerts',
  'priceAlerts',
  'chats',
  'messages',
  'settings',
  'config',
  'trains',
  'flights',
  'buses',
]);

function inferCategory(raw: any, parentKey?: string): TransportCategory | null {
  const candidates = [
    raw?.category,
    raw?.type,
    raw?.mode,
    raw?.vehicleCategory,
    raw?.transportType,
    raw?.vehicleType,
    parentKey,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase().trim());

  for (const c of candidates) {
    if (VALID_CATEGORIES.includes(c as TransportCategory)) {
      return c as TransportCategory;
    }
    if (
      c.includes('flight') ||
      c.includes('airplane') ||
      c.includes('airline') ||
      c.includes('train') ||
      c.includes('rail') ||
      c.includes('bus') ||
      c.includes('coach')
    ) {
      return null;
    }
    if (c.includes('auto') || c.includes('rickshaw') || c.includes('tuk') || c.includes('3w')) {
      return 'autos';
    }
    if (
      c.includes('bike') ||
      c.includes('moto') ||
      c.includes('scooter') ||
      c.includes('scooty') ||
      c.includes('2w') ||
      c.includes('two')
    ) {
      return 'bikes';
    }
    if (
      c.includes('car') ||
      c.includes('cab') ||
      c.includes('taxi') ||
      c.includes('suv') ||
      c.includes('sedan') ||
      c.includes('hatch') ||
      c.includes('4w')
    ) {
      return 'cars';
    }
  }

  return 'cars';
}

function makeCode(name: string, fallback: string): string {
  const clean = (name || '').trim();
  if (!clean) return fallback;
  const parenMatch = clean.match(/\(([A-Z0-9-]{2,8})\)/);
  if (parenMatch) return parenMatch[1];
  return clean.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || fallback;
}

function deterministicOtp(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 9000;
  }
  return String(Math.abs(hash) + 1000);
}

/**
 * Normalizes any ride document/node from Firebase Realtime Database into a TransportOption.
 * Returns null if the item belongs to a removed non-mobility category (train/flight/bus).
 */
export function normalizeDatabaseRide(
  id: string,
  raw: any,
  parentKey?: string
): TransportOption | null {
  const category = inferCategory(raw, parentKey);
  if (!category) return null;

  const origin = String(
    raw.origin ||
      raw.from ||
      raw.pickup ||
      raw.pickupLocation ||
      raw.pickupPoint ||
      raw.source ||
      raw.startLocation ||
      (typeof raw.pickup === 'object' ? raw.pickup?.name || raw.pickup?.address : '') ||
      'Pickup Point'
  );
  const destination = String(
    raw.destination ||
      raw.to ||
      raw.drop ||
      raw.dropLocation ||
      raw.dropPoint ||
      raw.endLocation ||
      (typeof raw.drop === 'object' ? raw.drop?.name || raw.drop?.address : '') ||
      'Drop Point'
  );

  const price = Math.max(
    1,
    Number(raw.price ?? raw.fare ?? raw.amount ?? raw.cost ?? raw.totalFare ?? raw.rate ?? 150)
  );
  const baseFare = Number(raw.baseFare ?? Math.round(price * 0.85));
  const taxesAndFees = Number(raw.taxesAndFees ?? raw.taxes ?? Math.round(price * 0.1));
  const platformFee = Number(raw.platformFee ?? Math.max(0, price - baseFare - taxesAndFees));

  const driverName = raw.driverName || raw.driver?.name || raw.captainName || raw.riderName;
  const driverPhone = raw.driverPhone || raw.driver?.phone || raw.phone || raw.contact || raw.mobile;
  const vehicleNumber =
    raw.vehicleNumber ||
    raw.serviceNumber ||
    raw.plateNumber ||
    raw.cabNumber ||
    raw.registrationNumber ||
    raw.vehicle?.number ||
    `LIVE-${id.slice(-4).toUpperCase()}`;

  const defaultVehicleType =
    category === 'autos'
      ? 'Auto Rickshaw'
      : category === 'bikes'
      ? 'Bike Taxi / Moto'
      : 'Verified Sedan / Cab';

  const vehicleType = String(
    raw.vehicleType ||
      raw.vehicle?.model ||
      raw.vehicle ||
      raw.carModel ||
      raw.model ||
      defaultVehicleType
  );

  const title = String(
    raw.title ||
      raw.name ||
      raw.rideName ||
      raw.serviceTitle ||
      raw.vehicleName ||
      (driverName ? `${driverName} · ${vehicleType}` : `${origin} → ${destination}`)
  );

  const originCode = String(raw.originCode || raw.fromCode || makeCode(origin, 'ORG'));
  const destCode = String(raw.destCode || raw.toCode || makeCode(destination, 'DST'));

  const parseLatLng = (val: any): LatLngPoint | undefined => {
    if (!val || typeof val !== 'object') return undefined;
    const lat = Number(val.lat ?? val.latitude);
    const lng = Number(val.lng ?? val.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng };
    }
    return undefined;
  };

  return {
    id: String(raw.id || id),
    category,
    providerName: String(
      raw.providerName || raw.operator || raw.agency || raw.driverName || 'Ticket Life Live Database'
    ),
    providerCode: String(raw.providerCode || 'RTDB-LIVE'),
    title,
    serviceNumber: String(vehicleNumber),
    vehicleType,
    origin,
    originCode,
    originAddress: raw.originAddress || raw.pickupAddress || raw.pickupLocation,
    originCoords: parseLatLng(raw.originCoords || raw.pickupCoords),
    originTerminalOrPlatform: raw.originTerminalOrPlatform || raw.pickupPoint || 'Pickup Zone',
    destination,
    destCode,
    destAddress: raw.destAddress || raw.dropAddress || raw.dropLocation,
    destCoords: parseLatLng(raw.destCoords || raw.dropCoords),
    destTerminalOrPlatform: raw.destTerminalOrPlatform || raw.dropPoint || 'Drop Point',
    departureTime: String(
      raw.departureTime || raw.departTime || raw.pickupTime || raw.time || 'Available Now'
    ),
    arrivalTime: String(raw.arrivalTime || raw.reachTime || raw.eta || 'Live ETA'),
    duration: String(raw.duration || raw.estimatedTime || 'Direct Ride'),
    price,
    baseFare,
    taxesAndFees,
    platformFee,
    availableSeats:
      raw.availableSeats ??
      raw.seatsAvailable ??
      raw.seats ??
      (category === 'bikes' ? 1 : category === 'autos' ? 3 : 4),
    rating: Number(raw.rating ?? 4.8),
    reviewsCount: Number(raw.reviewsCount ?? 1),
    amenities: Array.isArray(raw.amenities)
      ? raw.amenities.map(String)
      : ['Live Firebase RTDB Ride', 'GPS Verified', 'Instant Ride OTP'],
    travelClass: String(
      raw.travelClass ||
        raw.classType ||
        raw.rideType ||
        (category === 'autos' ? 'Meter / EV Auto' : category === 'bikes' ? 'Express Moto' : 'Private Ride')
    ),
    cancellationPolicy:
      typeof raw.cancellationPolicy === 'object' && raw.cancellationPolicy !== null
        ? {
            freeCancellationAvailable: Boolean(
              raw.cancellationPolicy.freeCancellationAvailable ?? true
            ),
            cutoffHours: Number(raw.cancellationPolicy.cutoffHours ?? 0),
            refundPercent: Number(raw.cancellationPolicy.refundPercent ?? 100),
          }
        : {
            freeCancellationAvailable: true,
            cutoffHours: 0,
            refundPercent: 100,
          },
    providerIntegration: {
      partnerName: 'Firebase Realtime Database (ticket-life-c4b76)',
      status: 'connected_live',
      credentialId: String(id),
    },
    liveStatus: {
      statusText: String(raw.status || raw.liveStatus?.statusText || 'Live in Database · Ready for Pickup'),
      delayMinutes: Number(raw.liveStatus?.delayMinutes ?? 0),
      currentStationOrLocation: String(
        raw.currentLocation || raw.liveStatus?.currentStationOrLocation || origin
      ),
      nextHalt: String(raw.liveStatus?.nextHalt || destination),
      platformOrGate: String(raw.liveStatus?.platformOrGate || 'Live GPS'),
      lastUpdated: 'Live Firebase RTDB',
      driverDetails: {
        name: String(driverName || raw.providerName || 'Verified Captain'),
        phone: String(driverPhone || 'Available on Booking'),
        rating: Number(raw.rating ?? 4.8),
        vehicleNumber: String(vehicleNumber),
        otp: String(raw.otp || deterministicOtp(String(id))),
      },
    },
  };
}

function isRideLikeObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Boolean(
    obj.origin ||
      obj.from ||
      obj.pickup ||
      obj.pickupLocation ||
      obj.pickupPoint ||
      obj.source ||
      obj.destination ||
      obj.to ||
      obj.drop ||
      obj.dropLocation ||
      obj.dropPoint ||
      obj.title ||
      obj.name ||
      obj.rideName ||
      obj.serviceTitle ||
      obj.price !== undefined ||
      obj.fare !== undefined ||
      obj.amount !== undefined ||
      obj.driverName ||
      obj.vehicleNumber ||
      obj.plateNumber
  );
}

/**
 * Extracts real mobility rides (Cars, Auto Rickshaws, Bikes) from a Firebase RTDB snapshot tree.
 */
export function extractRidesFromSnapshotValue(
  val: any,
  parentKey?: string
): TransportOption[] {
  if (!val || typeof val !== 'object') return [];

  const results: TransportOption[] = [];
  const seen = new Set<string>();

  const pushNormalized = (id: string, raw: any, categoryHint?: string) => {
    if (seen.has(id)) return;
    const normalized = normalizeDatabaseRide(id, raw, categoryHint);
    if (normalized) {
      seen.add(id);
      results.push(normalized);
    }
  };

  const collect = (node: any, keyPath: string, categoryHint?: string) => {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach((item, idx) => {
        if (item && typeof item === 'object') {
          if (isRideLikeObject(item)) {
            const id = String(item.id || `${keyPath}-${idx}`);
            pushNormalized(id, item, categoryHint);
          } else {
            collect(item, `${keyPath}-${idx}`, categoryHint);
          }
        }
      });
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (!child || typeof child !== 'object') continue;
      if (NON_RIDE_BRANCHES.has(key.toLowerCase())) continue;

      if (isRideLikeObject(child)) {
        const id = String((child as any).id || key);
        pushNormalized(id, child, categoryHint);
      } else {
        const lowerKey = key.toLowerCase();
        const nextHint =
          lowerKey.includes('auto') || lowerKey.includes('rickshaw')
            ? 'autos'
            : lowerKey.includes('bike') || lowerKey.includes('moto') || lowerKey.includes('scooter')
            ? 'bikes'
            : lowerKey.includes('car') || lowerKey.includes('cab') || lowerKey.includes('taxi')
            ? 'cars'
            : categoryHint;
        collect(child, `${keyPath}_${key}`, nextHint);
      }
    }
  };

  collect(val, parentKey || 'rtdb', parentKey);
  return results;
}

/**
 * Subscribes to live rides in Firebase Realtime Database (ticket-life-c4b76).
 * Starts on root `/` and if root read is denied, concurrently probes ALL ride branches
 * (`rides`, `cars`, `autos`, `auto_rickshaws`, `bikes`, `cabs`, `vehicles`, `drivers`, `trips`, etc.)
 * and aggregates all readable nodes cleanly.
 */
export function subscribeToDatabaseRides(
  onUpdate: (result: DatabaseRidesResult) => void
): () => void {
  const unsubscribers: Array<() => void> = [];
  let active = true;
  let fallbackStarted = false;

  const pathResults = new Map<
    string,
    { status: 'ok' | 'denied' | 'error'; rides: TransportOption[]; error?: string }
  >();

  const emitAggregated = (primarySource: string) => {
    if (!active) return;

    const merged: TransportOption[] = [];
    const seenIds = new Set<string>();
    const readablePaths: string[] = [];
    let anyOk = false;
    let lastError = '';
    let allDenied = true;

    for (const [p, entry] of pathResults.entries()) {
      if (entry.status === 'ok') {
        anyOk = true;
        allDenied = false;
        readablePaths.push(p);
        for (const r of entry.rides) {
          if (!seenIds.has(r.id)) {
            seenIds.add(r.id);
            merged.push(r);
          }
        }
      } else {
        if (entry.status !== 'denied') {
          allDenied = false;
        }
        if (entry.error) {
          lastError = entry.error;
        }
      }
    }

    if (anyOk) {
      onUpdate({
        rides: merged,
        status: 'connected',
        sourceNode: readablePaths.join(', ') || primarySource,
        readablePaths,
      });
    } else if (pathResults.size > 0) {
      onUpdate({
        rides: [],
        status: allDenied ? 'permission_denied' : 'error',
        errorMessage: lastError || 'Permission denied',
        sourceNode: primarySource,
      });
    }
  };

  const attachChildListeners = () => {
    if (fallbackStarted || !active) return;
    fallbackStarted = true;

    CANDIDATE_RIDE_PATHS.forEach((childPath) => {
      const childRef = ref(rtdb, childPath);
      const unsubChild = onValue(
        childRef,
        (snapshot) => {
          if (!active) return;
          const val = snapshot.val();
          const rides = extractRidesFromSnapshotValue(val, childPath);
          pathResults.set(childPath, { status: 'ok', rides });
          emitAggregated(childPath);
        },
        (error: any) => {
          if (!active) return;
          const msg = String(error?.message || error || '');
          const isPermissionDenied =
            msg.toLowerCase().includes('permission_denied') ||
            msg.toLowerCase().includes('permission denied');
          pathResults.set(childPath, {
            status: isPermissionDenied ? 'denied' : 'error',
            rides: [],
            error: msg,
          });
          emitAggregated(childPath);
        }
      );
      unsubscribers.push(unsubChild);
    });
  };

  const rootRef = ref(rtdb, '/');
  const unsubRoot = onValue(
    rootRef,
    (snapshot) => {
      if (!active) return;
      const val = snapshot.val();
      const rides = extractRidesFromSnapshotValue(val);
      pathResults.set('/', { status: 'ok', rides });
      emitAggregated('/');
    },
    (error: any) => {
      if (!active) return;
      const msg = String(error?.message || error || '');
      const isPermissionDenied =
        msg.toLowerCase().includes('permission_denied') ||
        msg.toLowerCase().includes('permission denied');
      pathResults.set('/', {
        status: isPermissionDenied ? 'denied' : 'error',
        rides: [],
        error: msg,
      });
      attachChildListeners();
      emitAggregated('/');
    }
  );
  unsubscribers.push(unsubRoot);

  return () => {
    active = false;
    unsubscribers.forEach((u) => {
      try {
        u();
      } catch {
        // ignore cleanup error
      }
    });
  };
}

/**
 * Publishes a new real ride directly into Firebase Realtime Database.
 * Writes to `/rides/{id}` first, and falls back to `/{category}/{id}` if `/rides` write rule is restricted.
 */
export async function publishRealRideToDatabase(rideInput: {
  title: string;
  category: TransportCategory;
  origin: string;
  originAddress?: string;
  originCoords?: LatLngPoint;
  destination: string;
  destAddress?: string;
  destCoords?: LatLngPoint;
  price: number;
  departureTime: string;
  arrivalTime?: string;
  duration?: string;
  vehicleType?: string;
  serviceNumber?: string;
  driverName?: string;
  driverPhone?: string;
  availableSeats?: number;
}): Promise<string> {
  const defaultSeats =
    rideInput.category === 'bikes' ? 1 : rideInput.category === 'autos' ? 3 : 4;

  const buildPayload = (rideId: string) => {
    const payload = {
      id: rideId,
      title: rideInput.title.trim(),
      category: rideInput.category,
      origin: rideInput.origin.trim(),
      originAddress: rideInput.originAddress?.trim() || undefined,
      originCoords: rideInput.originCoords || undefined,
      originCode: makeCode(rideInput.origin, 'ORG'),
      destination: rideInput.destination.trim(),
      destAddress: rideInput.destAddress?.trim() || undefined,
      destCoords: rideInput.destCoords || undefined,
      destCode: makeCode(rideInput.destination, 'DST'),
      price: Number(rideInput.price),
      departureTime: rideInput.departureTime.trim() || 'Available Now',
      arrivalTime: rideInput.arrivalTime?.trim() || 'On Schedule',
      duration: rideInput.duration?.trim() || 'Direct',
      vehicleType:
        rideInput.vehicleType?.trim() ||
        (rideInput.category === 'autos'
          ? 'Auto Rickshaw'
          : rideInput.category === 'bikes'
          ? 'Bike Taxi'
          : 'Sedan / Cab'),
      serviceNumber:
        rideInput.serviceNumber?.trim() || `TL-${Math.floor(1000 + Math.random() * 9000)}`,
      driverName: rideInput.driverName?.trim() || undefined,
      driverPhone: rideInput.driverPhone?.trim() || undefined,
      availableSeats: Number(rideInput.availableSeats ?? defaultSeats),
      providerName: 'Ticket Life Live Database',
      rating: 4.9,
      createdAt: new Date().toISOString(),
    };

    return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
  };

  try {
    const ridesRef = ref(rtdb, 'rides');
    const newRideRef = push(ridesRef);
    const rideId = newRideRef.key || `ride-${Date.now()}`;
    await set(newRideRef, buildPayload(rideId));
    return rideId;
  } catch (err) {
    // Fallback: try category branch (e.g. /cars, /autos, /bikes)
    const catRef = ref(rtdb, rideInput.category);
    const newCatRef = push(catRef);
    const rideId = newCatRef.key || `ride-${Date.now()}`;
    await set(newCatRef, buildPayload(rideId));
    return rideId;
  }
}

/**
 * Saves a confirmed booking record into Firebase Realtime Database `/bookings/{bookingId}`.
 */
export async function saveBookingToDatabase(
  booking: BookingRecord,
  userId?: string
): Promise<void> {
  try {
    const bookingRef = ref(rtdb, `bookings/${booking.id}`);
    await set(bookingRef, {
      ...booking,
      userId: userId || 'guest',
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not sync booking to RTDB (check RTDB write rules):', err);
  }
}

/**
 * Updates an existing booking status/OTP/payment in Firebase Realtime Database.
 */
export async function updateBookingInDatabase(booking: BookingRecord): Promise<void> {
  try {
    const bookingRef = ref(rtdb, `bookings/${booking.id}`);
    await update(bookingRef, {
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      paymentTxnId: booking.paymentTxnId,
      startOtpVerified: Boolean(booking.startOtpVerified),
      rideStartedAt: booking.rideStartedAt || null,
      rideCompletedAt: booking.rideCompletedAt || null,
      collectedByDriverMethod: booking.collectedByDriverMethod || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not update booking in RTDB:', err);
  }
}

/**
 * Fetches all rides once from Firebase RTDB across root or candidate ride branches.
 */
export async function fetchAllRidesOnce(): Promise<TransportOption[]> {
  try {
    const snap = await get(ref(rtdb, '/'));
    return extractRidesFromSnapshotValue(snap.val());
  } catch {
    const all: TransportOption[] = [];
    const seen = new Set<string>();
    await Promise.all(
      CANDIDATE_RIDE_PATHS.map(async (path) => {
        try {
          const snap = await get(ref(rtdb, path));
          const list = extractRidesFromSnapshotValue(snap.val(), path);
          for (const item of list) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              all.push(item);
            }
          }
        } catch {
          // ignore restricted node
        }
      })
    );
    return all;
  }
}
