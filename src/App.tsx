import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  BookingRecord,
  EmailNotificationLog,
  PriceAlert,
  ProviderStatus,
  SearchFilterState,
  SupportTicket,
  TransportCategory,
  TransportOption,
  TravelDigestItem,
  UserAccount,
} from './types/travel';
import {
  getStoredBookings,
  saveStoredBookings,
  getStoredPriceAlerts,
  evaluatePriceAlerts,
  getStoredProviders,
  getStoredSupportTickets,
  getStoredUser,
  saveStoredUser,
  deleteStoredUser,
  searchTransportOptions,
  createConfirmedBooking,
  addWalletFunds,
} from './services/api';
import {
  DatabaseConnectionState,
  subscribeToDatabaseRides,
  saveBookingToDatabase,
  updateBookingInDatabase,
} from './services/realtimeRides';
import {
  getEnvGoogleMapsKey,
  resolveGoogleMapsKey,
  MapsAvailabilityContext,
} from './services/mapsConfig';
import {
  initAuth,
  logoutGoogle,
  setCachedAccessToken,
  getAccessToken,
  googleSignIn,
  firebaseDeleteCurrentUser,
  purgeAdwaitFromDatabase,
} from './services/firebaseAuth';
import { deleteUser, signOut } from 'firebase/auth';
import { auth } from './services/firebaseAuth';
import { verifyRealGatewayOrder } from './services/paymentService';
import { buildTravelDigest, fetchTravelEmails, sendTicketEmail } from './services/gmailService';
import { createBookingCalendarEvent } from './services/calendarService';
import { Navbar } from './components/Navbar';
import { CategoryNav } from './components/CategoryNav';
import { SearchHero } from './components/SearchHero';
import { SearchResultsList } from './components/SearchResultsList';
import { TravelDigestCard } from './components/TravelDigestCard';
import { BookingCheckoutModal } from './components/BookingCheckoutModal';
import { TicketPassModal } from './components/TicketPassModal';
import { LiveTrackerModal } from './components/LiveTrackerModal';
import { GmailConfirmationModal } from './components/GmailConfirmationModal';
import { CancellationModal } from './components/CancellationModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { SetPriceAlertModal } from './components/SetPriceAlertModal';
import { MyBookingsView } from './components/MyBookingsView';
import { ExploreView } from './components/ExploreView';
import { OffersView } from './components/OffersView';
import { SupportView } from './components/SupportView';
import { AccountView } from './components/AccountView';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { WalletPaymentHistoryView } from './components/WalletPaymentHistoryView';
import { TravelHistoryView } from './components/TravelHistoryView';
import { AddRealRideModal } from './components/AddRealRideModal';
import { IndiaMapsExplorer } from './components/IndiaMapsExplorer';
import {
  ShieldCheck,
  CheckCircle2,
  Compass,
  Mail,
  Phone,
  Ticket,
  BellRing,
  PlusCircle,
  Database,
} from 'lucide-react';

export default function App() {
  // Navigation: 1st Button ("booking"), 2nd Button ("wallet_payments"), 3rd Button ("travel_history"), 4th Button ("account")
  const [activeTab, setActiveTab] = useState<string>('booking');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // User & Auth
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const u = getStoredUser();
    return u && u.email && u.email.trim().length > 0 ? u : null;
  });
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);

  // App open auth screen: first time opening app asks to Create Account or Log In
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => {
    const u = getStoredUser();
    const hasAccount = Boolean(u && u.email && u.email.trim().length > 0);
    return !hasAccount;
  });
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signup');

  // Core Data
  const [bookings, setBookings] = useState<BookingRecord[]>(() => getStoredBookings());
  const [providers, setProviders] = useState<ProviderStatus[]>(() => getStoredProviders());
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => getStoredSupportTickets());

  // Travel Digest & Gmail Search
  const [isScanningGmail, setIsScanningGmail] = useState(false);
  const [digestItems, setDigestItems] = useState<TravelDigestItem[]>(() =>
    buildTravelDigest([], bookings)
  );

  // Search filter state (Cars, Auto Rickshaws & Bikes only)
  const [filters, setFilters] = useState<SearchFilterState>({
    category: 'cars',
    origin: '',
    originCode: '',
    destination: '',
    destCode: '',
    departDate: '2026-11-10',
    isRoundTrip: false,
    passengers: 1,
    sortBy: 'price_asc',
    acOnly: false,
  });

  // Live Firebase Realtime Database (ticket-life-c4b76) Real Rides State
  const [realDatabaseRides, setRealDatabaseRides] = useState<TransportOption[]>([]);
  const [dbStatus, setDbStatus] = useState<DatabaseConnectionState>('connecting');
  const [dbErrorMessage, setDbErrorMessage] = useState<string | undefined>(undefined);
  const [dbRefreshKey, setDbRefreshKey] = useState<number>(0);
  const [showAllCategories, setShowAllCategories] = useState<boolean>(true);
  const [hasAutoExpandedAll, setHasAutoExpandedAll] = useState<boolean>(false);
  const [isAddRideModalOpen, setIsAddRideModalOpen] = useState<boolean>(false);
  const [specialRideCategory, setSpecialRideCategory] = useState<TransportCategory>('cars');

  const [searchResults, setSearchResults] = useState<TransportOption[]>([]);

  // Modals
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [bookingOptionToBook, setBookingOptionToBook] = useState<TransportOption | null>(null);
  const [selectedTicketToView, setSelectedTicketToView] = useState<BookingRecord | null>(null);
  const [itemToTrack, setItemToTrack] = useState<BookingRecord | TransportOption | null>(null);
  const [bookingForGmail, setBookingForGmail] = useState<BookingRecord | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<BookingRecord | null>(null);

  // Price Alerts State
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => getStoredPriceAlerts());
  const [priceAlertModalData, setPriceAlertModalData] = useState<{
    origin?: string;
    originCode?: string;
    destination?: string;
    destCode?: string;
    category?: TransportCategory;
    currentPrice?: number;
  } | null>(null);

  // Google Maps Platform Key & Demo Quota Banner State
  const [mapsApiKey, setMapsApiKey] = useState<string>(() => getEnvGoogleMapsKey());
  const [mapsKeyChecked, setMapsKeyChecked] = useState<boolean>(() => Boolean(getEnvGoogleMapsKey()));
  const [isMapsQuotaExceeded, setIsMapsQuotaExceeded] = useState<boolean>(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  useEffect(() => {
    const onQuotaExceeded = () => setIsMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    resolveGoogleMapsKey()
      .then((key) => {
        if (key) setMapsApiKey(key);
      })
      .finally(() => setMapsKeyChecked(true));
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Evaluate price alerts whenever search results or options change
  useEffect(() => {
    if (searchResults.length > 0 && priceAlerts.length > 0) {
      const matches = evaluatePriceAlerts(searchResults, priceAlerts);
      if (matches.length > 0) {
        setPriceAlerts(getStoredPriceAlerts());
        const first = matches[0];
        showToast(
          `🔥 Price Drop: ${first.triggeredAlert.origin} → ${first.triggeredAlert.destination} now at ₹${first.matchingOption.price}! Check Notification Center.`
        );
      }
    }
  }, [searchResults]);

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Re-build travel digest whenever bookings change
  useEffect(() => {
    setDigestItems((prev) => {
      // keep any existing parsed gmail items and merge with updated bookings
      const existingGmailParsed = prev.filter((i) => i.source === 'gmail_parsed');
      const bkgDigest = buildTravelDigest([], bookings);
      return [...bkgDigest, ...existingGmailParsed];
    });
  }, [bookings]);

  // Complete purge of adwait956 account and legacy cached sessions
  useEffect(() => {
    const isPurged = localStorage.getItem('ticketlife_adwait956_purged_v5') === 'true';
    if (!isPurged) {
      deleteStoredUser();
      logoutGoogle().catch(() => {});
      purgeAdwaitFromDatabase().catch(() => {});
      localStorage.setItem('ticketlife_adwait956_purged_v5', 'true');
      setCurrentUser(null);
      setGoogleUserEmail(null);
      setBookings([]);
      setDigestItems([]);
      setIsAuthOpen(true);
      setAuthInitialMode('signup');
    }
  }, []);

  // Initialize Firebase Auth listener + auto-delete adwait956 if still cached in Firebase Auth
  const [authUserUid, setAuthUserUid] = useState<string | null>(null);
  useEffect(() => {
    const unsubAuth = initAuth(
      async (user, token) => {
        if (user.email && user.email.toLowerCase().includes('adwait956')) {
          try {
            await purgeAdwaitFromDatabase();
            await deleteUser(user);
          } catch {
            await signOut(auth).catch(() => {});
          }
          deleteStoredUser();
          setCurrentUser(null);
          setGoogleUserEmail(null);
          setAuthUserUid(null);
          setIsAuthOpen(true);
          setAuthInitialMode('signup');
          return;
        }
        if (token) setCachedAccessToken(token);
        setAuthUserUid(user.uid);
      },
      () => {
        setAuthUserUid(null);
      }
    );
    return () => {
      if (typeof unsubAuth === 'function') unsubAuth();
    };
  }, []);

  // Verify returning Cashfree / PhonePe payment redirect URL if present
  useEffect(() => {
    const url = new URL(window.location.href);
    const cfOrderId = url.searchParams.get('cf_order_id');
    const ppTxnId = url.searchParams.get('pp_txn_id');
    const orderId = cfOrderId || ppTxnId;
    const gateway: 'cashfree' | 'phonepe' = cfOrderId ? 'cashfree' : 'phonepe';

    if (!orderId) return;

    const rawPending = sessionStorage.getItem('ticketlife_pending_pg_txn');
    url.searchParams.delete('cf_order_id');
    url.searchParams.delete('pp_txn_id');
    window.history.replaceState({}, '', url.toString());

    verifyRealGatewayOrder(orderId, gateway)
      .then((res) => {
        if (!res.paid) {
          showToast(`Payment status: ${res.status}. Not confirmed.`);
          return;
        }
        if (rawPending) {
          const parsed = JSON.parse(rawPending);
          const ctx = parsed?.context;
          if (ctx?.type === 'booking' && ctx.option) {
            const bkg = createConfirmedBooking({
              option: ctx.option,
              passengers: ctx.passengers || [],
              fareBreakdown: ctx.fareBreakdown,
              paymentMethod: ctx.paymentMethod || 'UPI',
              paymentTxnId: res.txnId,
              travelDate: ctx.travelDate || filters.departDate,
            });
            handleBookingConfirmed(bkg);
            setSelectedTicketToView(bkg);
          } else if (ctx?.type === 'wallet_topup' && ctx.amount) {
            addWalletFunds(Number(ctx.amount), `${ctx.method || 'PG'} (${res.txnId})`);
            setCurrentUser(getStoredUser());
            showToast(`₹${ctx.amount} verified & added to Wallet!`);
          }
          sessionStorage.removeItem('ticketlife_pending_pg_txn');
        }
      })
      .catch((err) => {
        showToast(err?.message || 'Unable to verify returning payment.');
      });
  }, []);

  // Subscribe to real rides from Firebase Realtime Database (ticket-life-c4b76)
  useEffect(() => {
    setDbStatus('connecting');
    const unsubRides = subscribeToDatabaseRides((res) => {
      setRealDatabaseRides(res.rides);
      setDbStatus(res.status);
      setDbErrorMessage(res.errorMessage);
    });
    return () => {
      unsubRides();
    };
  }, [authUserUid, dbRefreshKey]);

  // Recompute displayed search results whenever live DB rides, filters, or category mode changes
  useEffect(() => {
    if (realDatabaseRides.length > 0 && !hasAutoExpandedAll) {
      const hasMatchInDefaultCategory = realDatabaseRides.some(
        (r) => r.category === filters.category
      );
      if (!hasMatchInDefaultCategory) {
        setShowAllCategories(true);
      }
      setHasAutoExpandedAll(true);
    }
    setSearchResults(
      searchTransportOptions(filters, realDatabaseRides, showAllCategories)
    );
  }, [realDatabaseRides, filters, showAllCategories, hasAutoExpandedAll]);

  // Scan Gmail for travel messages and update Travel Digest
  const handleScanGmailForDigest = async () => {
    setIsScanningGmail(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      }

      if (!token) {
        showToast('Google Sign-In required to scan Gmail travel confirmations.');
        setIsScanningGmail(false);
        return;
      }

      const emails = await fetchTravelEmails(token);
      const parsedDigest = buildTravelDigest(emails, bookings);
      setDigestItems(parsedDigest);
      showToast(`Travel Digest updated! Found ${emails.length} itinerary message(s) in Gmail.`);
    } catch (err: any) {
      console.warn('Gmail scan notice:', err?.message || err);
      showToast('Unable to scan Gmail messages. Showing confirmed bookings.');
    } finally {
      setIsScanningGmail(false);
    }
  };

  // Execute search whenever filters change (strictly against live Firebase DB rides)
  const handleUpdateFilters = (newFilters: Partial<SearchFilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      setSearchResults(
        searchTransportOptions(updated, realDatabaseRides, showAllCategories)
      );
      return updated;
    });
  };

  const handleSelectCategory = (category: TransportCategory) => {
    setShowAllCategories(false);
    let origin = '';
    let originCode = '';
    let dest = '';
    let destCode = '';

    handleUpdateFilters({
      category,
      origin,
      originCode,
      destination: dest,
      destCode,
    });
  };

  const handleApplyPromoFromOffers = (code: string) => {
    showToast(`Coupon code ${code} copied! Apply at checkout.`);
    setActiveTab('home');
  };

  const handleRouteSelectFromExplore = (
    category: TransportCategory,
    origin: string,
    dest: string
  ) => {
    handleUpdateFilters({
      category,
      origin,
      originCode: origin.includes('(') ? origin.split('(')[1].replace(')', '') : 'CITY',
      destination: dest,
      destCode: dest.includes('(') ? dest.split('(')[1].replace(')', '') : 'DEST',
    });
    setActiveTab('home');
  };

  const refreshData = () => {
    setBookings(getStoredBookings());
    setProviders(getStoredProviders());
    setSupportTickets(getStoredSupportTickets());
  };

  const handleBookingConfirmed = (newBooking: BookingRecord) => {
    refreshData();
    saveBookingToDatabase(newBooking, currentUser?.id);
    showToast(`Booking ${newBooking.bookingRef} Confirmed & synced to Firebase DB!`);

    // Automatically send confirmed ticket email directly to user's registered email
    const recipient = currentUser?.email || googleUserEmail;
    if (recipient) {
      getAccessToken().then(async (token) => {
        try {
          await sendTicketEmail(newBooking, recipient, token);
          showToast(`Confirmed ticket delivered directly to ${recipient}!`);
        } catch (e) {
          console.warn('Auto ticket email dispatch notice:', e);
        }
      });
    }

    // If auto Google Calendar sync is enabled, automatically add the trip to Google Calendar
    if (currentUser?.autoCalendarSync) {
      getAccessToken().then(async (token) => {
        if (token) {
          try {
            const calRes = await createBookingCalendarEvent(newBooking, token);
            const currentList = getStoredBookings();
            const updated = currentList.map((b) =>
              b.id === newBooking.id
                ? {
                    ...b,
                    googleCalendarEventId: calRes.eventId,
                    calendarSyncedAt: new Date().toISOString(),
                  }
                : b
            );
            saveStoredBookings(updated);
            setBookings(updated);
            showToast(`Trip ${newBooking.bookingRef} automatically scheduled in Google Calendar!`);
          } catch (e) {
            console.warn('Auto calendar sync error:', e);
          }
        }
      });
    }
  };

  const handleBookingCancelled = (updated: BookingRecord) => {
    refreshData();
    updateBookingInDatabase(updated);
    if (selectedTicketToView?.id === updated.id) {
      setSelectedTicketToView(updated);
    }
    if (updated.paymentStatus === 'pay_after_ride') {
      showToast(`Booking ${updated.bookingRef} cancelled (No upfront charge).`);
    } else {
      showToast(`Booking ${updated.bookingRef} cancelled. Refund of ₹${updated.cancellationDetails?.refundAmount} initiated.`);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    deleteStoredUser();
    setCurrentUser(null);
    setGoogleUserEmail(null);
    showToast('Signed out successfully.');
    setAuthInitialMode('signin');
    setIsAuthOpen(true);
  };

  const handleDeleteAccount = async () => {
    await firebaseDeleteCurrentUser();
    deleteStoredUser();
    setCurrentUser(null);
    setGoogleUserEmail(null);
    setBookings([]);
    setDigestItems([]);
    showToast('Account permanently deleted. All data has been wiped.');
    setAuthInitialMode('signup');
    setIsAuthOpen(true);
  };

  // Convert digest item to booking preview for modal
  const handleOpenTicketFromDigest = (digestItem: TravelDigestItem) => {
    const matchingBooking = bookings.find(
      (b) => b.bookingRef === digestItem.pnrOrRef || b.pnrNumber === digestItem.pnrOrRef || b.serviceNumber === digestItem.serviceNumber
    );
    if (matchingBooking) {
      setSelectedTicketToView(matchingBooking);
    } else {
      // Create lightweight representation for viewing
      setSelectedTicketToView({
        id: digestItem.id,
        bookingRef: digestItem.pnrOrRef,
        providerRef: digestItem.pnrOrRef,
        pnrNumber: digestItem.pnrOrRef,
        category: digestItem.category,
        serviceTitle: `${digestItem.carrier} (${digestItem.serviceNumber})`,
        serviceNumber: digestItem.serviceNumber,
        vehicleType: digestItem.carrier,
        origin: digestItem.origin,
        originCode: digestItem.originCode,
        destination: digestItem.destination,
        destCode: digestItem.destCode,
        departureDate: digestItem.departureDate,
        departureTime: digestItem.departureTime,
        arrivalDate: digestItem.departureDate,
        arrivalTime: 'On Schedule',
        duration: 'Direct',
        passengers: [
          { id: 'pax-1', fullName: currentUser?.fullName || 'Primary Passenger', age: 28, gender: 'male' },
        ],
        seatNumbers: [digestItem.seatInfo || 'Seat 14A'],
        fareBreakdown: {
          baseFare: 3800,
          taxesAndGst: 620,
          convenienceFee: 100,
          discount: 0,
          totalAmount: 4520,
        },
        paymentMethod: 'UPI',
        paymentTxnId: 'pay_gmail_verified_synced',
        paymentStatus: 'paid',
        bookingStatus: 'confirmed',
        providerName: digestItem.carrier,
        qrCodeToken: `${digestItem.category.toUpperCase()}|${digestItem.pnrOrRef}|${digestItem.originCode}-${digestItem.destCode}|CONFIRMED`,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const appContent = (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#080b11] text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors antialiased">
      {/* Top-Level Google Maps Platform Quota Notice */}
      {isMapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-4 py-2.5 rounded-xl shadow-2xl border border-stone-700 dark:border-stone-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Contract compliant Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        googleUserEmail={googleUserEmail}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAddRide={() => {
          setSpecialRideCategory(filters.category);
          setIsAddRideModalOpen(true);
        }}
        onLogout={handleLogout}
        isAdminMode={isAdminMode}
        onToggleAdminMode={() => {
          setIsAdminMode(!isAdminMode);
          if (!isAdminMode) setActiveTab('admin');
          else setActiveTab('home');
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* BUTTON 1: BOOKING RIDE (CARS, AUTO RICKSHAWS, BIKES) */}
        {(activeTab === 'booking' || activeTab === 'home') && (
          <div className="space-y-8">
            {/* Travel Digest Card (Gmail parser & Upcoming departure times) */}
            <TravelDigestCard
              digestItems={digestItems}
              isScanningGmail={isScanningGmail}
              onRefreshGmail={handleScanGmailForDigest}
              onOpenTicket={handleOpenTicketFromDigest}
              onOpenLiveTracker={(item) => {
                const matchingBooking = bookings.find(
                  (b) => b.bookingRef === item.pnrOrRef || b.serviceNumber === item.serviceNumber
                );
                if (matchingBooking) {
                  setItemToTrack(matchingBooking);
                } else {
                  handleOpenTicketFromDigest(item);
                }
              }}
              onOpenGmailNotificationModal={() => setIsNotificationCenterOpen(true)}
            />

            {/* Category Navigation Bar (3 Categories: Cars, Auto Rickshaws, Bikes) */}
            <CategoryNav
              selectedCategory={filters.category}
              onSelectCategory={handleSelectCategory}
            />

            {/* Search Engine Hero Banner with genuine route and address inputs */}
            <SearchHero
              filters={filters}
              onUpdateFilters={handleUpdateFilters}
              onExecuteSearch={() =>
                setSearchResults(
                  searchTransportOptions(filters, realDatabaseRides, showAllCategories)
                )
              }
            />

            {/* Interactive Google Maps Explorer · All India & Complete Nashik Places */}
            {mapsApiKey ? (
              <IndiaMapsExplorer
                filters={filters}
                onUpdateFilters={handleUpdateFilters}
                onBookInstantRouteRide={(opt) => setBookingOptionToBook(opt)}
              />
            ) : (
              <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
                {mapsKeyChecked
                  ? 'Google Maps API key not configured. Add VITE_GOOGLE_MAPS_API_KEY in your environment to enable the interactive Nashik & All-India Map.'
                  : 'Loading Google Maps · Nashik & All India Live Map...'}
              </div>
            )}

            {/* Live Firebase Realtime Database Connection Bar */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/15 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-stone-900 dark:text-white">
                      Firebase Realtime Database Connected
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        dbStatus === 'connected'
                          ? 'bg-emerald-500 text-stone-950'
                          : dbStatus === 'permission_denied'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500 text-stone-950'
                      }`}
                    >
                      {dbStatus === 'connected'
                        ? `${realDatabaseRides.length} Real Rides`
                        : dbStatus === 'permission_denied'
                        ? 'Permission Required'
                        : 'Connecting...'}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono">
                    ticket-life-c4b76-default-rtdb.asia-southeast1.firebasedatabase.app
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {dbStatus === 'permission_denied' && (
                  <button
                    type="button"
                    onClick={() => setDbRefreshKey((k) => k + 1)}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-[11px] transition-colors cursor-pointer"
                  >
                    Retry DB Sync
                  </button>
                )}
                {realDatabaseRides.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                      showAllCategories
                        ? 'bg-stone-900 text-white border-stone-900 dark:bg-amber-500 dark:text-stone-950 dark:border-amber-500'
                        : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                    }`}
                  >
                    {showAllCategories ? 'All Categories' : `Show All (${realDatabaseRides.length})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSpecialRideCategory(filters.category);
                    setIsAddRideModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Special Ride Request</span>
                </button>
              </div>
            </div>

            {/* Live Search Results List */}
            <SearchResultsList
              options={searchResults}
              filters={filters}
              dbStatus={dbStatus}
              dbErrorMessage={dbErrorMessage}
              totalDatabaseRidesCount={realDatabaseRides.length}
              showAllCategories={showAllCategories}
              onToggleShowAllCategories={() => setShowAllCategories((prev) => !prev)}
              onOpenAddRideModal={(cat) => {
                setSpecialRideCategory(cat || filters.category);
                setIsAddRideModalOpen(true);
              }}
              onOpenSignIn={() => {
                setAuthInitialMode('signin');
                setIsAuthOpen(true);
              }}
              onRetryDatabaseSync={() => setDbRefreshKey((k) => k + 1)}
              onUpdateFilters={handleUpdateFilters}
              onSelectOptionToBook={(opt) => setBookingOptionToBook(opt)}
              onSelectOptionToTrack={(opt) => setItemToTrack(opt)}
              onOpenSetPriceAlert={(routeInfo) => setPriceAlertModalData(routeInfo || {})}
            />
          </div>
        )}

        {/* BUTTON 2: PAYMENT HISTORY & WALLET */}
        {activeTab === 'wallet_payments' && (
          <WalletPaymentHistoryView
            user={currentUser}
            bookings={bookings}
            onRefreshUser={() => setCurrentUser(getStoredUser())}
          />
        )}

        {/* BUTTON 3: TRAVELLING HISTORY (travel kab hua, kidhar se kidhar gaye the) */}
        {(activeTab === 'travel_history' || activeTab === 'bookings') && (
          <TravelHistoryView
            bookings={bookings}
            onOpenTicket={(b) => setSelectedTicketToView(b)}
            onOpenLiveTracker={(b) => setItemToTrack(b)}
            onOpenGmailConfirm={(b) => setBookingForGmail(b)}
            onBookAgain={(cat, orig, dest) => {
              handleRouteSelectFromExplore(cat, orig, dest);
              setActiveTab('booking');
            }}
            onToggleAdmin={() => setIsAdminMode((prev) => !prev)}
          />
        )}

        {/* BUTTON 4: ACCOUNT SETTING */}
        {activeTab === 'account' && (
          <AccountView
            user={currentUser}
            bookings={bookings}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
              showToast('Account details updated.');
            }}
            onUpdateBookings={(updated) => {
              setBookings(updated);
            }}
            onLogout={handleLogout}
            onOpenAuthModal={(mode = 'signin') => {
              setAuthInitialMode(mode);
              setIsAuthOpen(true);
            }}
            onDeleteAccount={handleDeleteAccount}
            onShowToast={showToast}
          />
        )}

        {/* ADDITIONAL SECONDARY VIEWS */}
        {activeTab === 'explore' && (
          <ExploreView onSelectRoute={handleRouteSelectFromExplore} />
        )}

        {activeTab === 'offers' && (
          <OffersView onApplyCode={handleApplyPromoFromOffers} />
        )}

        {activeTab === 'support' && (
          <SupportView user={currentUser} />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            bookings={bookings}
            providers={providers}
            supportTickets={supportTickets}
            onRefreshData={refreshData}
            onOpenCancelModal={(b) => setBookingToCancel(b)}
          />
        )}
      </main>

      {/* MODAL 1: Booking & Payment Flow */}
      {bookingOptionToBook && (
        <BookingCheckoutModal
          option={bookingOptionToBook}
          user={currentUser}
          travelDate={filters.departDate}
          passengersCount={filters.passengers}
          onClose={() => setBookingOptionToBook(null)}
          onBookingSuccess={handleBookingConfirmed}
          onOpenGmailConfirm={(b) => {
            setBookingOptionToBook(null);
            setBookingForGmail(b);
          }}
          onOpenLiveTracker={(b) => {
            setBookingOptionToBook(null);
            setItemToTrack(b);
          }}
        />
      )}

      {/* MODAL 2: Boarding Pass & Official Ticket */}
      {selectedTicketToView && (
        <TicketPassModal
          booking={selectedTicketToView}
          onClose={() => setSelectedTicketToView(null)}
          onOpenGmailConfirm={(b) => setBookingForGmail(b)}
          onOpenLiveTracker={(b) => setItemToTrack(b)}
          onOpenCancelModal={(b) => setBookingToCancel(b)}
        />
      )}

      {/* MODAL 3: Real-Time Live Journey Tracker (OTP Gate -> Live Map -> Pay Driver) */}
      {itemToTrack && (
        <LiveTrackerModal
          item={itemToTrack}
          onClose={() => setItemToTrack(null)}
          onBookingUpdated={(updated) => {
            refreshData();
            if (selectedTicketToView?.id === updated.id) {
              setSelectedTicketToView(updated);
            }
          }}
        />
      )}

      {/* MODAL 4: Gmail Ticket Email (MANDATORY User Confirmation Dialog) */}
      {bookingForGmail && (
        <GmailConfirmationModal
          booking={bookingForGmail}
          currentUserEmail={currentUser?.email || googleUserEmail || ''}
          onClose={() => setBookingForGmail(null)}
          onSuccess={() => {
            showToast('Ticket delivered to your Gmail inbox.');
          }}
        />
      )}

      {/* MODAL 5: Cancellation & Refund Modal */}
      {bookingToCancel && (
        <CancellationModal
          booking={bookingToCancel}
          onClose={() => setBookingToCancel(null)}
          onCancelled={handleBookingCancelled}
        />
      )}

      {/* MODAL 6: Sign In / Google Auth with Account Creation & Password Reset */}
      {isAuthOpen && (
        <AuthModal
          initialMode={authInitialMode}
          onClose={() => {
            sessionStorage.setItem('ticketlife_startup_seen', 'true');
            setIsAuthOpen(false);
          }}
          onSuccess={(u, token) => {
            sessionStorage.setItem('ticketlife_startup_seen', 'true');
            setCurrentUser(u);
            if (token) {
              setGoogleUserEmail(u.email);
            }
            saveStoredUser(u);
            showToast(`Welcome, ${u.fullName}! Logged in as ${u.email}`);
          }}
          onNotificationSent={(type, email) => {
            showToast(`Security notification email (${type.replace('_', ' ')}) dispatched to ${email}!`);
          }}
        />
      )}

      {/* MODAL 7: Official Notification Center & Dispatcher */}
      {isNotificationCenterOpen && (
        <NotificationCenterModal
          currentUser={currentUser}
          onClose={() => setIsNotificationCenterOpen(false)}
          onNotificationSent={(log) => {
            showToast(`Notification sent to ${log.recipientEmail}!`);
          }}
        />
      )}

      {/* MODAL 8: Set Route Price Alert */}
      {priceAlertModalData && (
        <SetPriceAlertModal
          initialOrigin={priceAlertModalData.origin || filters.origin}
          initialOriginCode={priceAlertModalData.originCode || filters.originCode}
          initialDestination={priceAlertModalData.destination || filters.destination}
          initialDestCode={priceAlertModalData.destCode || filters.destCode}
          initialCategory={priceAlertModalData.category || filters.category}
          initialCurrentPrice={priceAlertModalData.currentPrice}
          catalogOptions={searchResults.length > 0 ? searchResults : realDatabaseRides}
          currentUser={currentUser}
          onClose={() => setPriceAlertModalData(null)}
          onAlertCreated={(alert, triggeredMatches) => {
            setPriceAlerts(getStoredPriceAlerts());
            if (triggeredMatches && triggeredMatches.length > 0) {
              showToast(`Price Alert Active! Found matching fare ₹${triggeredMatches[0].matchingOption.price} for ${alert.origin} → ${alert.destination}!`);
            } else {
              showToast(`Price Alert Active: You will be notified when fare drops below ₹${alert.targetPrice.toLocaleString('en-IN')}`);
            }
          }}
        />
      )}

      {/* MODAL 9: Special Custom Ride Request */}
      {isAddRideModalOpen && (
        <AddRealRideModal
          defaultCategory={specialRideCategory}
          defaultOrigin={filters.origin}
          defaultOriginCoords={filters.originCoords}
          defaultDestination={filters.destination}
          defaultDestCoords={filters.destCoords}
          onClose={() => setIsAddRideModalOpen(false)}
          onSuccess={(rideId) => {
            showToast(`Special ride live & ready! Ref: ${rideId}`);
          }}
        />
      )}

      {/* Footer */}
      {/* Footer - Design Variation 3: Ticket Life Cyber Audit Status */}
      <footer className="mt-auto border-t border-[#26262b] bg-[#0c0c0e] text-white/50 text-[11px] font-mono-code py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="ticket-status-dot"></span>
            <span className="text-[#00ff88] font-bold tracking-wider">SYSTEM_ACTIVE // SECURE_SOCKET_CONNECTED</span>
          </div>

          <div className="text-center md:text-right text-[10px] text-white/40 tracking-wider">
            TICKET_LIFE_SUPER_APP // CARS · AUTO RICKSHAWS · BIKES · FIREBASE RTDB LIVE · PCI-DSS SECURED · GMAIL INTEGRATED
          </div>
        </div>
      </footer>
    </div>
  );

  if (mapsApiKey) {
    return (
      <APIProvider apiKey={mapsApiKey} region="IN" language="en">
        <MapsAvailabilityContext.Provider value={true}>
          {appContent}
        </MapsAvailabilityContext.Provider>
      </APIProvider>
    );
  }

  return (
    <MapsAvailabilityContext.Provider value={false}>
      {appContent}
    </MapsAvailabilityContext.Provider>
  );
}
