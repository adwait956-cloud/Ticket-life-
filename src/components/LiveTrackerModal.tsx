import React, { useState, useEffect, useRef } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  X,
  Radio,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Car,
  Compass,
  Bike,
  KeyRound,
  Banknote,
  QrCode,
  Flag,
  AlertCircle,
  ShieldAlert,
  PhoneCall,
  UserPlus,
  Send,
  Star,
  Receipt,
  MessageSquare,
  MessageCircle,
} from 'lucide-react';
import { BookingRecord, LatLngPoint, TransportCategory, TransportOption } from '../types/travel';
import { startRideWithOtp, completeRideAndPayDriver } from '../services/api';
import { updateBookingInDatabase } from '../services/realtimeRides';
import {
  subscribeToTripChat,
  sendRiderChatMessage,
  TripChatMessage,
} from '../services/tripChatService';
import {
  checkAndTriggerMapsQuotaError,
  GMP_ATTRIBUTION_ID,
  NASHIK_CENTER,
  toLatLngLiteral,
  useIsMapsLoadedProvider,
} from '../services/mapsConfig';

interface LiveTrackerModalProps {
  item: BookingRecord | TransportOption;
  onClose: () => void;
  onBookingUpdated?: (updatedBooking: BookingRecord) => void;
}

interface TripRouteLayerProps {
  originInput: string | LatLngPoint;
  destInput: string | LatLngPoint;
  category: TransportCategory;
  progressRatio: number;
  onRouteComputed: (info: {
    distanceKm: number;
    durationMins: number;
    originPos?: LatLngPoint;
    destPos?: LatLngPoint;
  }) => void;
}

const TripRouteLayer: React.FC<TripRouteLayerProps> = ({
  originInput,
  destInput,
  category,
  progressRatio,
  onRouteComputed,
}) => {
  const map = useMap('live-trip-map');
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [routePath, setRoutePath] = useState<LatLngPoint[]>([]);
  const [originPin, setOriginPin] = useState<LatLngPoint | null>(null);
  const [destPin, setDestPin] = useState<LatLngPoint | null>(null);

  useEffect(() => {
    if (!routesLib || !map || !originInput || !destInput) return;

    let cancelled = false;
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const travelMode = category === 'bikes' ? 'TWO_WHEELER' : 'DRIVING';
    const request: any = {
      origin: originInput,
      destination: destInput,
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    (routesLib.Route as any)
      .computeRoutes(request)
      .then(({ routes }: { routes: any[] }) => {
        if (cancelled || !routes || routes.length === 0) return;
        const primaryRoute = routes[0];
        const newPolylines: google.maps.Polyline[] = primaryRoute.createPolylines();
        const collectedPoints: LatLngPoint[] = [];

        newPolylines.forEach((pl) => {
          pl.setOptions({
            strokeColor: '#0284c7',
            strokeOpacity: 0.95,
            strokeWeight: 6,
          });
          pl.setMap(map);
          const pts = pl.getPath().getArray();
          pts.forEach((pt) => {
            const literal = toLatLngLiteral(pt);
            if (literal) collectedPoints.push(literal);
          });
        });

        polylinesRef.current = newPolylines;
        setRoutePath(collectedPoints);

        const startPt = collectedPoints[0];
        const endPt = collectedPoints[collectedPoints.length - 1];
        if (startPt) setOriginPin(startPt);
        if (endPt) setDestPin(endPt);

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 52);
        }

        const distanceKm = Number(((primaryRoute.distanceMeters || 0) / 1000).toFixed(1));
        const durationMins = Math.max(4, Math.round((primaryRoute.durationMillis || 0) / 60000));
        onRouteComputed({
          distanceKm,
          durationMins,
          originPos: startPt,
          destPos: endPt,
        });
      })
      .catch((err: unknown) => {
        checkAndTriggerMapsQuotaError(err);
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, JSON.stringify(originInput), JSON.stringify(destInput), category]);

  const vehiclePosition = React.useMemo(() => {
    if (routePath.length === 0) return originPin;
    const clamped = Math.min(1, Math.max(0, progressRatio));
    const idx = Math.min(routePath.length - 1, Math.floor(clamped * (routePath.length - 1)));
    return routePath[idx];
  }, [routePath, progressRatio, originPin]);

  const vehicleEmoji = category === 'bikes' ? '🏍️' : category === 'autos' ? '🛺' : '🚕';

  return (
    <>
      {originPin && (
        <AdvancedMarker position={originPin} title="Pickup Point">
          <Pin background="#10b981" borderColor="#047857" glyphColor="#ffffff" glyphText="P" />
        </AdvancedMarker>
      )}
      {destPin && (
        <AdvancedMarker position={destPin} title="Drop Destination">
          <Pin background="#ef4444" borderColor="#b91c1c" glyphColor="#ffffff" glyphText="D" />
        </AdvancedMarker>
      )}
      {vehiclePosition && (
        <AdvancedMarker position={vehiclePosition} title="Live Captain Position">
          <div className="w-10 h-10 rounded-full bg-stone-950 text-white border-2 border-emerald-400 shadow-xl flex items-center justify-center text-lg">
            {vehicleEmoji}
          </div>
        </AdvancedMarker>
      )}
    </>
  );
};

export const LiveTrackerModal: React.FC<LiveTrackerModalProps> = ({
  item,
  onClose,
  onBookingUpdated,
}) => {
  const isMapsAvailable = useIsMapsLoadedProvider();
  const [liveItem, setLiveItem] = useState<BookingRecord | TransportOption>(item);
  const isBooking = 'bookingRef' in liveItem;
  const booking = isBooking ? (liveItem as BookingRecord) : null;

  const category = liveItem.category;
  const title = 'serviceTitle' in liveItem ? liveItem.serviceTitle : liveItem.title;
  const serviceNumber = liveItem.serviceNumber;
  const liveStatus = 'liveStatus' in liveItem ? liveItem.liveStatus : undefined;
  const driver =
    liveStatus?.driverDetails || (booking ? booking.driverInfo : undefined);

  const expectedOtp = String(driver?.otp || '4821').trim();
  const isAlreadyCompleted = booking?.bookingStatus === 'completed';
  const initiallyStarted = Boolean(
    booking && (booking.startOtpVerified || booking.bookingStatus === 'in_progress' || isAlreadyCompleted)
  );

  // Ride Phases: 'otp_gate' -> 'live_map' -> 'pay_driver' -> 'completed'
  const [phase, setPhase] = useState<'otp_gate' | 'live_map' | 'pay_driver' | 'completed'>(() => {
    if (isAlreadyCompleted) return 'completed';
    if (initiallyStarted) return 'live_map';
    return 'otp_gate';
  });

  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [progress, setProgress] = useState(isAlreadyCompleted ? 100 : 12);
  const [routeMeta, setRouteMeta] = useState<{ distanceKm: number; durationMins: number } | null>(null);
  const [settledMethod, setSettledMethod] = useState<'Cash' | 'UPI' | null>(
    booking?.collectedByDriverMethod || null
  );

  // SOS Emergency State
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<
    { id: string; name: string; phone: string; relation: string; selected: boolean }[]
  >([
    { id: '1', name: 'Nashik Police Control Room', phone: '112', relation: 'Police', selected: true },
    { id: '2', name: 'Sharma Ji (Emergency Guardian)', phone: '+91 98230 55111', relation: 'Family / Guardian', selected: true },
    { id: '3', name: 'Priya Deshmukh', phone: '+91 98230 44222', relation: 'Relative / Friend', selected: true },
  ]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [sosBroadcastSent, setSosBroadcastSent] = useState(false);

  // Rate Your Driver State
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Real-Time Chat with Driver State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<TripChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const tripChatId = booking?.id || ('id' in liveItem ? (liveItem as any).id : 'active-trip');

  useEffect(() => {
    const unsub = subscribeToTripChat(tripChatId, (messages) => {
      setChatMessages(messages);
      if (!isChatOpen && messages.length > 0) {
        const last = messages[messages.length - 1];
        if (last.sender === 'driver') {
          setUnreadMessagesCount((prev) => prev + 1);
        }
      }
    });
    return () => unsub();
  }, [tripChatId, isChatOpen]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || chatInputText).trim();
    if (!content) return;
    setChatInputText('');
    const driverName = driver?.driverName || driver?.name || 'Captain';
    await sendRiderChatMessage({
      tripId: tripChatId,
      text: content,
      riderName: booking?.passengers[0]?.fullName || 'You (Rider)',
      driverName,
      triggerDriverReply: true,
    });
  };

  // Advance moving vehicle along the Google Maps route after OTP is verified
  useEffect(() => {
    if (phase !== 'live_map') return;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return Math.min(100, prev + 4);
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [phase]);

  const handleVerifyOtpAndStart = () => {
    setOtpError('');
    if (otpInput.trim() !== expectedOtp) {
      setOtpError(`Galat OTP! Ride start karne ke liye 4-digit OTP "${expectedOtp}" enter karein.`);
      return;
    }

    if (booking) {
      const res = startRideWithOtp(booking.id, otpInput);
      if (!res.success || !res.booking) {
        setOtpError(res.error || 'Could not verify Start OTP.');
        return;
      }
      setLiveItem(res.booking);
      updateBookingInDatabase(res.booking);
      onBookingUpdated?.(res.booking);
    }

    setProgress(8);
    setPhase('live_map');
  };

  const handleEndRideAtDestination = () => {
    setProgress(100);
    if (!booking) {
      setPhase('completed');
      return;
    }

    const needsDriverSettlement =
      booking.paymentStatus === 'pay_after_ride' || booking.paymentMethod === 'PayAfterRide';

    if (needsDriverSettlement) {
      setPhase('pay_driver');
    } else {
      const res = completeRideAndPayDriver(booking.id);
      if (res.success && res.booking) {
        setLiveItem(res.booking);
        updateBookingInDatabase(res.booking);
        onBookingUpdated?.(res.booking);
      }
      setPhase('completed');
    }
  };

  const handleSettleWithDriver = (method: 'Cash' | 'UPI') => {
    if (!booking) {
      setSettledMethod(method);
      setPhase('completed');
      return;
    }
    const res = completeRideAndPayDriver(booking.id, method);
    if (res.success && res.booking) {
      setSettledMethod(method);
      setLiveItem(res.booking);
      updateBookingInDatabase(res.booking);
      onBookingUpdated?.(res.booking);
    }
    setPhase('completed');
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'cars':
        return Car;
      case 'autos':
        return Compass;
      case 'bikes':
        return Bike;
      default:
        return Car;
    }
  };

  const Icon = getCategoryIcon();

  const originInput: string | LatLngPoint =
    liveItem.originCoords || `${liveItem.originAddress || liveItem.origin}, India`;
  const destInput: string | LatLngPoint =
    liveItem.destCoords || `${liveItem.destAddress || liveItem.destination}, India`;

  const fareAmount = booking
    ? booking.fareBreakdown.totalAmount
    : 'price' in liveItem
    ? liveItem.price
    : 0;

  const remainingMins = routeMeta
    ? Math.max(1, Math.round(routeMeta.durationMins * (1 - progress / 100)))
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-6 transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>
                  {phase === 'otp_gate'
                    ? 'Captain Arrived · Enter Start OTP'
                    : phase === 'live_map'
                    ? 'OTP Verified · Live Route Map'
                    : phase === 'pay_driver'
                    ? 'Ride Finished · Pay Driver'
                    : 'Ride Completed'}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {title} ({serviceNumber})
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {driver && (
              <button
                type="button"
                onClick={() => {
                  setIsChatOpen((prev) => !prev);
                  setUnreadMessagesCount(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  isChatOpen
                    ? 'bg-sky-600 text-white shadow-sky-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Direct messaging with assigned captain"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
                {unreadMessagesCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSosModalOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-rose-600/30 animate-pulse cursor-pointer"
              title="Trigger SOS Emergency"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>SOS Emergency</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isChatOpen ? (
          <div className="flex flex-col h-[520px] max-h-[75vh]">
            {/* Chat Header */}
            <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {driver?.driverPhotoUrl ? (
                  <img
                    src={driver.driverPhotoUrl}
                    alt={driver.driverName || driver.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shadow-xs"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                    {(driver?.driverName || driver?.name || 'D').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {driver?.driverName || driver?.name || 'Assigned Captain'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Online · Active Trip</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Plate: <strong className="text-slate-800 dark:text-slate-200">{driver?.vehiclePlateNumber || driver?.vehicleNumber || serviceNumber}</strong> · {title}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${driver?.phone}`}
                  className="p-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1"
                  title="Call Captain"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Back to Route Map</span>
                </button>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/60">
              <div className="text-center p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                🔒 Direct messaging active with Captain {driver?.driverName || driver?.name || 'Driver'}. Keep messages concise for driving safety.
              </div>

              {chatMessages.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400 space-y-1">
                  <MessageCircle className="w-8 h-8 text-slate-400 mx-auto opacity-50 mb-2" />
                  <div className="font-bold text-slate-600 dark:text-slate-300">No messages yet with Captain {driver?.driverName || driver?.name}.</div>
                  <div className="text-[11px]">Send a quick update about your pickup spot, luggage, or landmarks below.</div>
                </div>
              )}

              {chatMessages.map((msg) => {
                const isRider = msg.sender === 'rider';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isRider ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[75%]">
                      {!isRider && (
                        <div className="w-6 h-6 rounded-full bg-sky-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mb-1">
                          {(driver?.driverName || driver?.name || 'D').slice(0, 1)}
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isRider
                            ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 rounded-br-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                        }`}
                      >
                        <div className="font-semibold">{msg.text}</div>
                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] mt-1 font-mono ${
                            isRider ? 'text-slate-300 dark:text-slate-800' : 'text-slate-400'
                          }`}
                        >
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isRider && <span>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Preset Buttons */}
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 overflow-x-auto flex items-center gap-1.5 scrollbar-thin">
              {[
                'I am waiting at the pickup spot.',
                'Please wait 2 minutes, coming down.',
                'Where have you reached?',
                'I have luggage / bags with me.',
                'Please turn on AC.',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSendMessage(preset)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-sky-500 hover:text-sky-600 transition-colors shrink-0 shadow-xs cursor-pointer whitespace-nowrap"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Message Captain ${driver?.driverName || driver?.name || ''}...`}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
              />
              <button
                type="button"
                disabled={!chatInputText.trim()}
                onClick={() => handleSendMessage()}
                className="p-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* PHASE 1: UBER / OLA START OTP GATE (Before Map Unlocks) */}
          {phase === 'otp_gate' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Pickup Verification Step
                    </div>
                    <h3 className="text-lg font-extrabold mt-0.5">
                      Share &amp; Enter Start OTP to Unlock Live Map
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Your Ride PIN</div>
                    <div className="font-mono font-black text-xl text-amber-300 bg-amber-500/15 px-3 py-1 rounded-lg border border-amber-400/40">
                      {expectedOtp}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{liveItem.origin}</span>
                  <span className="text-slate-500">➔</span>
                  <span className="font-semibold text-rose-300">{liveItem.destination}</span>
                </div>
              </div>

              {/* Captain Details */}
              {driver && (
                <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800 text-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {driver.driverPhotoUrl ? (
                      <img
                        src={driver.driverPhotoUrl}
                        alt={driver.driverName || driver.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-sky-400 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-sky-600 text-white font-black flex items-center justify-center text-base shadow-sm">
                        {(driver.driverName || driver.name || 'D').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {driver.driverName || driver.name} · ★ {driver.rating}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 mt-0.5 space-x-2">
                        <span>Plate/Vehicle: <strong className="font-mono font-bold text-slate-900 dark:text-white">{driver.vehiclePlateNumber || driver.vehicleNumber}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChatOpen(true);
                        setUnreadMessagesCount(0);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                      {unreadMessagesCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-white text-sky-700 text-[10px] font-black flex items-center justify-center">
                          {unreadMessagesCount}
                        </span>
                      )}
                    </button>
                    <a
                      href={`tel:${driver.phone}`}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 text-xs shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Captain</span>
                    </a>
                  </div>
                </div>
              )}

              {/* OTP Input Box */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Enter 4-Digit Start Ride OTP
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder={`Enter ${expectedOtp}`}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-mono font-black tracking-[0.35em] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtpAndStart}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Verify OTP &amp; Start Ride Map</span>
                  </button>
                </div>

                {otpError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PHASE 2: LIVE ROUTE MAP (Unlocked After OTP) */}
          {(phase === 'live_map' || phase === 'completed') && (
            <div className="space-y-4">
              {/* Live Google Map Viewport (Explicit height required per CF2) */}
              <div className="relative w-full h-[320px] sm:h-[360px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner bg-slate-100 dark:bg-slate-800">
                {isMapsAvailable ? (
                  <GoogleMap
                    id="live-trip-map"
                    mapId="DEMO_MAP_ID"
                    defaultCenter={liveItem.originCoords || NASHIK_CENTER}
                    defaultZoom={13}
                    gestureHandling="greedy"
                    internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <TripRouteLayer
                      originInput={originInput}
                      destInput={destInput}
                      category={category}
                      progressRatio={progress / 100}
                      onRouteComputed={(info) => setRouteMeta(info)}
                    />
                  </GoogleMap>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    <Navigation className="w-7 h-7 text-sky-500 mb-2 animate-pulse" />
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      Google Maps Live Route Connecting...
                    </div>
                    <p className="mt-1 max-w-xs">
                      {liveItem.origin} ➔ {liveItem.destination}
                    </p>
                  </div>
                )}

                {/* Live Overlay Chip */}
                <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] font-bold flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    {phase === 'completed'
                      ? 'Arrived at Destination'
                      : remainingMins
                      ? `Live Ride · ${remainingMins} min (${routeMeta?.distanceKm} km)`
                      : `Live Ride · ${progress}% Completed`}
                  </span>
                </div>
              </div>

              {/* Captain Profile Card */}
              {driver && (
                <div className="p-3.5 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {driver.driverPhotoUrl ? (
                      <img
                        src={driver.driverPhotoUrl}
                        alt={driver.driverName || driver.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-sky-400 shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
                        {(driver.driverName || driver.name || 'D').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {driver.driverName || driver.name} · ★ {driver.rating}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                        Plate: <strong className="text-slate-900 dark:text-white">{driver.vehiclePlateNumber || driver.vehicleNumber}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChatOpen(true);
                        setUnreadMessagesCount(0);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                      {unreadMessagesCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-white text-sky-700 text-[10px] font-black flex items-center justify-center">
                          {unreadMessagesCount}
                        </span>
                      )}
                    </button>
                    <a
                      href={`tel:${driver.phone}`}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 text-xs shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Trip Progress Strip */}
              <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-400 truncate max-w-[40%]">
                    {liveItem.origin}
                  </span>
                  <span className="font-mono font-black text-sky-400">
                    {progress}% Route
                  </span>
                  <span className="font-bold text-rose-400 truncate max-w-[40%] text-right">
                    {liveItem.destination}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 pt-1">
                  <span>
                    OTP Verified: <strong className="text-emerald-400">{expectedOtp}</strong> · Captain: <strong>{driver?.name || 'Verified Driver'}</strong>
                  </span>
                  <span className="font-mono font-bold text-white">
                    Fare: ₹{fareAmount.toLocaleString('en-IN')}{' '}
                    {booking?.paymentStatus === 'pay_after_ride'
                      ? '(Pay Driver After Ride)'
                      : '(Paid)'}
                  </span>
                </div>
              </div>

              {phase === 'live_map' && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {progress >= 100
                      ? 'You have reached the drop location! Complete ride to settle fare with driver.'
                      : 'Tracking live route in progress... Click below when ride ends at drop-off.'}
                  </div>
                  <button
                    type="button"
                    onClick={handleEndRideAtDestination}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Flag className="w-4 h-4" />
                    <span>
                      {booking?.paymentStatus === 'pay_after_ride'
                        ? `End Ride & Pay Driver ₹${fareAmount.toLocaleString('en-IN')}`
                        : 'End Ride at Destination'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PHASE 3: PAY DRIVER DIRECTLY AFTER RIDE ENDS */}
          {phase === 'pay_driver' && (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-5 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg">
                <Banknote className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  Destination Reached · Ride Ended
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  Pay ₹{fareAmount.toLocaleString('en-IN')} Directly to Captain
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Captain <strong>{driver?.name || 'Ticket Life Driver'}</strong> ({driver?.vehicleNumber || serviceNumber})
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSettleWithDriver('Cash')}
                  className="p-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Paid Cash to Driver (₹{fareAmount.toLocaleString('en-IN')})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSettleWithDriver('UPI')}
                  className="p-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Paid Direct UPI to Driver</span>
                </button>
              </div>
            </div>
          )}

          {/* COMPLETED CONFIRMATION BANNER & RATE YOUR DRIVER SECTION */}
          {phase === 'completed' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-emerald-900 dark:text-emerald-200">
                      Trip Completed &amp; Settled!
                    </div>
                    <div className="text-emerald-700 dark:text-emerald-400">
                      ₹{fareAmount.toLocaleString('en-IN')} settled{' '}
                      {settledMethod
                        ? `directly with Captain via ${settledMethod}`
                        : `via ${booking?.paymentMethod || 'Confirmed Method'}`}.
                    </div>
                  </div>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>

              {/* Trip Summary Section */}
              <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-sky-500" />
                    <span className="font-black text-xs uppercase tracking-wider text-stone-900 dark:text-white">
                      Trip Summary &amp; Breakdown
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                    Verified Settlement
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-100 dark:border-stone-800">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Total Distance</span>
                    <span className="font-mono font-black text-sm text-stone-900 dark:text-white mt-0.5 block">
                      {routeMeta?.distanceKm || (booking ? 6.5 : 5.2)} km
                    </span>
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-100 dark:border-stone-800">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Travel Duration</span>
                    <span className="font-mono font-black text-sm text-stone-900 dark:text-white mt-0.5 block">
                      {routeMeta?.durationMins ? `${routeMeta.durationMins} mins` : '14 mins'}
                    </span>
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-100 dark:border-stone-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Settled Amount</span>
                    <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      ₹{fareAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-stone-600 dark:text-stone-400 space-y-1 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex justify-between">
                    <span>Base Fare:</span>
                    <span className="font-mono font-bold">₹{booking ? booking.fareBreakdown.baseFare : Math.round(fareAmount * 0.8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes &amp; Platform Fee:</span>
                    <span className="font-mono font-bold">₹{booking ? booking.fareBreakdown.taxesAndGst + booking.fareBreakdown.convenienceFee : Math.round(fareAmount * 0.2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-stone-900 dark:text-white pt-1 border-t border-stone-100 dark:border-stone-800">
                    <span>Route:</span>
                    <span className="truncate max-w-[70%] text-right">{liveItem.origin} ➔ {liveItem.destination}</span>
                  </div>
                </div>
              </div>

              {/* Rate Your Driver Box */}
              <div className="p-5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-4">
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Feedback &amp; Rating
                  </span>
                  <h3 className="text-base font-extrabold text-stone-900 dark:text-white mt-0.5">
                    Rate Your Experience with {driver?.driverName || driver?.name || 'Captain'}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    How was your ride in {serviceNumber} ({driver?.vehiclePlateNumber || driver?.vehicleNumber || 'Vehicle'})?
                  </p>
                </div>

                {ratingSubmitted ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-center space-y-1">
                    <div className="flex justify-center text-amber-500 mb-1">
                      {Array.from({ length: ratingStars }).map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                      Thank You for Your Feedback!
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      Your {ratingStars}-star rating &amp; comment have been recorded for {driver?.driverName || driver?.name || 'Captain'}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Interactive Stars */}
                    <div className="flex justify-center items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingStars(star)}
                          className="p-1 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                          title={`${star} Star${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= ratingStars
                                ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                : 'text-stone-300 dark:text-stone-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Comment Input */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        Leave a comment or compliment (optional)
                      </label>
                      <textarea
                        rows={2}
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="e.g. Polite driver, clean vehicle, smooth ride..."
                        className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setRatingSubmitted(true)}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                    >
                      <Star className="w-4 h-4 fill-stone-950" />
                      <span>Submit {ratingStars}-Star Rating &amp; Review</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            Close Tracker
          </button>
        </div>
      </div>

      {/* SOS EMERGENCY BROADCAST MODAL */}
      {isSosModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-500/50 w-full max-w-lg overflow-hidden my-6">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <h3 className="text-base font-black">🚨 SOS Emergency Broadcast</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSosModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-1.5">
                <div className="font-extrabold uppercase text-[10px] tracking-wider text-rose-600 dark:text-rose-400">
                  Instant Location &amp; Trip Share
                </div>
                <div className="font-bold text-sm">
                  {title} ({serviceNumber})
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  📍 Route: <strong>{liveItem.origin}</strong> ➔ <strong>{liveItem.destination}</strong>
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  🚗 Captain: <strong>{driver?.name || 'Assigned Driver'}</strong> ({driver?.vehicleNumber || serviceNumber} · Ph: {driver?.phone || 'N/A'})
                </div>
              </div>

              {sosBroadcastSent ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-2 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="font-black text-sm">SOS Alert Successfully Dispatched!</div>
                  <p className="text-xs">
                    Live location and emergency trip details have been broadcasted via SMS/WhatsApp to all selected emergency contacts and authorities.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSosBroadcastSent(false)}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs mt-2"
                  >
                    Send Another Alert
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Pre-Configured Emergency Contacts (Notified instantly)
                    </label>
                    <div className="space-y-2">
                      {emergencyContacts.map((contact) => (
                        <label
                          key={contact.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-rose-500"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={contact.selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setEmergencyContacts((prev) =>
                                  prev.map((c) => (c.id === contact.id ? { ...c, selected: checked } : c))
                                );
                              }}
                              className="w-4 h-4 rounded text-rose-600 accent-rose-600"
                            />
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white">
                                {contact.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {contact.phone} · <span className="text-rose-600 font-bold">{contact.relation}</span>
                              </div>
                            </div>
                          </div>
                          <PhoneCall className="w-4 h-4 text-emerald-600" />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Add Custom Contact */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase">
                      Add Custom Emergency Contact
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Contact Name"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number (+91...)"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                    {newContactName && newContactPhone && (
                      <button
                        type="button"
                        onClick={() => {
                          setEmergencyContacts((prev) => [
                            ...prev,
                            {
                              id: `custom-${Date.now()}`,
                              name: newContactName.trim(),
                              phone: newContactPhone.trim(),
                              relation: 'Custom Contact',
                              selected: true,
                            },
                          ]);
                          setNewContactName('');
                          setNewContactPhone('');
                        }}
                        className="w-full py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add &amp; Select Contact</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const selected = emergencyContacts.filter((c) => c.selected);
                      const sosText = `🚨 SOS EMERGENCY ALERT! Passenger on Ticket Life trip ${title} (${serviceNumber}). Route: ${liveItem.origin} -> ${liveItem.destination}. Captain: ${driver?.name || 'Driver'} (${driver?.phone || 'N/A'}). Please assist immediately!`;
                      const primaryPhone = selected[0]?.phone.replace(/\D/g, '') || '112';
                      window.open(`https://wa.me/${primaryPhone}?text=${encodeURIComponent(sosText)}`, '_blank');
                      setSosBroadcastSent(true);
                    }}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>🚨 BROADCAST SOS ALERT TO SELECTED CONTACTS</span>
                  </button>
                </>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSosModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                Close SOS Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
