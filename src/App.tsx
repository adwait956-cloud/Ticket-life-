import React, { useState, useEffect } from 'react';
import {
  BookingRecord,
  EmailNotificationLog,
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
  getStoredProviders,
  getStoredSupportTickets,
  getStoredUser,
  saveStoredUser,
  searchTransportOptions,
} from './services/api';
import { initAuth, logoutGoogle, setCachedAccessToken, getAccessToken, googleSignIn } from './services/firebaseAuth';
import { buildTravelDigest, fetchTravelEmails } from './services/gmailService';
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
import { MyBookingsView } from './components/MyBookingsView';
import { ExploreView } from './components/ExploreView';
import { OffersView } from './components/OffersView';
import { SupportView } from './components/SupportView';
import { AccountView } from './components/AccountView';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { WalletPaymentHistoryView } from './components/WalletPaymentHistoryView';
import { TravelHistoryView } from './components/TravelHistoryView';
import {
  ShieldCheck,
  CheckCircle2,
  Compass,
  Mail,
  Phone,
  Ticket,
  BellRing,
} from 'lucide-react';

export default function App() {
  // Navigation: 1st Button ("booking"), 2nd Button ("wallet_payments"), 3rd Button ("travel_history"), 4th Button ("account")
  const [activeTab, setActiveTab] = useState<string>('booking');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // User & Auth
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getStoredUser());
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);

  // App open login screen: triggers when app opens
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => {
    return sessionStorage.getItem('ticketlife_startup_seen') !== 'true';
  });

  // Core Data
  const [bookings, setBookings] = useState<BookingRecord[]>(() => getStoredBookings());
  const [providers, setProviders] = useState<ProviderStatus[]>(() => getStoredProviders());
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => getStoredSupportTickets());

  // Travel Digest & Gmail Search
  const [isScanningGmail, setIsScanningGmail] = useState(false);
  const [digestItems, setDigestItems] = useState<TravelDigestItem[]>(() =>
    buildTravelDigest([], bookings)
  );

  // Search filter state
  const [filters, setFilters] = useState<SearchFilterState>({
    category: 'trains',
    origin: 'Chennai Central',
    originCode: 'MAS',
    destination: 'KSR Bengaluru',
    destCode: 'SBC',
    departDate: '2026-11-10',
    isRoundTrip: false,
    passengers: 1,
    sortBy: 'price_asc',
    acOnly: false,
  });

  const [searchResults, setSearchResults] = useState<TransportOption[]>(() =>
    searchTransportOptions(filters)
  );

  // Modals
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [bookingOptionToBook, setBookingOptionToBook] = useState<TransportOption | null>(null);
  const [selectedTicketToView, setSelectedTicketToView] = useState<BookingRecord | null>(null);
  const [itemToTrack, setItemToTrack] = useState<BookingRecord | TransportOption | null>(null);
  const [bookingForGmail, setBookingForGmail] = useState<BookingRecord | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<BookingRecord | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

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

  // Initialize Firebase Auth listener
  useEffect(() => {
    initAuth((user, token) => {
      if (user) {
        setGoogleUserEmail(user.email);
        if (token) setCachedAccessToken(token);
        setCurrentUser((prev) => ({
          id: user.uid,
          email: user.email || '',
          fullName: user.displayName || 'Passenger',
          phone: user.phoneNumber || '',
          role: prev?.role || 'passenger',
          walletBalance: prev?.walletBalance ?? 0,
          savedPassengers: prev?.savedPassengers || [],
        }));
      }
    });
  }, []);

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
      console.error('Error scanning Gmail:', err);
      showToast('Unable to scan Gmail messages. Showing confirmed bookings.');
    } finally {
      setIsScanningGmail(false);
    }
  };

  // Execute search whenever filters change
  const handleUpdateFilters = (newFilters: Partial<SearchFilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      setSearchResults(searchTransportOptions(updated));
      return updated;
    });
  };

  const handleSelectCategory = (category: TransportCategory) => {
    let origin = 'Chennai Central';
    let originCode = 'MAS';
    let dest = 'KSR Bengaluru';
    let destCode = 'SBC';

    if (category === 'flights') {
      origin = 'New Delhi (DEL)';
      originCode = 'DEL';
      dest = 'Mumbai (BOM)';
      destCode = 'BOM';
    } else if (category === 'buses') {
      origin = 'Delhi Kashmere Gate ISBT';
      originCode = 'ISBT-DEL';
      dest = 'Jaipur Sindhi Camp';
      destCode = 'SC-JP';
    } else if (category === 'cars' || category === 'autos' || category === 'bikes') {
      origin = 'Connaught Place';
      originCode = 'CP-DEL';
      dest = 'New Delhi Railway Station (NDLS)';
      destCode = 'NDLS';
    }

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
    showToast(`Booking ${newBooking.bookingRef} Confirmed! Official confirmation ready.`);
  };

  const handleBookingCancelled = (updated: BookingRecord) => {
    refreshData();
    if (selectedTicketToView?.id === updated.id) {
      setSelectedTicketToView(updated);
    }
    showToast(`Booking ${updated.bookingRef} cancelled. Refund of ₹${updated.cancellationDetails?.refundAmount} initiated.`);
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setGoogleUserEmail(null);
    showToast('Signed out successfully.');
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
          { id: 'pax-1', fullName: currentUser?.fullName || 'Adwait Sharma', age: 28, gender: 'male' },
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

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#080b11] text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors antialiased">
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
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
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
        {/* BUTTON 1: BOOKING TICKET (CARS, AUTOS, BUSES, BIKES, TRAINS, AIRPLANES) */}
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

            {/* Category Navigation Bar (All 6 Categories: Cars, Autos, Bikes, Trains, Airplanes, Buses) */}
            <CategoryNav
              selectedCategory={filters.category}
              onSelectCategory={handleSelectCategory}
            />

            {/* Search Engine Hero Banner with genuine route and address inputs */}
            <SearchHero
              filters={filters}
              onUpdateFilters={handleUpdateFilters}
              onExecuteSearch={() => setSearchResults(searchTransportOptions(filters))}
            />

            {/* Live Search Results List */}
            <SearchResultsList
              options={searchResults}
              filters={filters}
              onUpdateFilters={handleUpdateFilters}
              onSelectOptionToBook={(opt) => setBookingOptionToBook(opt)}
              onSelectOptionToTrack={(opt) => setItemToTrack(opt)}
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
          />
        )}

        {/* BUTTON 4: ACCOUNT SETTING */}
        {activeTab === 'account' && currentUser && (
          <AccountView
            user={currentUser}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
              showToast('Account details updated.');
            }}
            onLogout={handleLogout}
            onOpenAuthModal={() => setIsAuthOpen(true)}
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

      {/* MODAL 3: Real-Time Live Journey Tracker */}
      {itemToTrack && (
        <LiveTrackerModal
          item={itemToTrack}
          onClose={() => setItemToTrack(null)}
        />
      )}

      {/* MODAL 4: Gmail Ticket Email (MANDATORY User Confirmation Dialog) */}
      {bookingForGmail && (
        <GmailConfirmationModal
          booking={bookingForGmail}
          currentUserEmail={googleUserEmail || currentUser?.email || 'adwait956@gmail.com'}
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
          onClose={() => {
            sessionStorage.setItem('ticketlife_startup_seen', 'true');
            setIsAuthOpen(false);
          }}
          onSuccess={(u) => {
            sessionStorage.setItem('ticketlife_startup_seen', 'true');
            setCurrentUser(u);
            saveStoredUser(u);
            showToast(`Welcome, ${u.fullName}! Security sign-in alert sent to ${u.email}`);
          }}
          onNotificationSent={(type, email) => {
            showToast(`Security notification email (${type.replace('_', ' ')}) dispatched to ${email}!`);
          }}
        />
      )}

      {/* MODAL 7: Official Notification Center & Dispatcher from adwait956@gmail.com */}
      {isNotificationCenterOpen && (
        <NotificationCenterModal
          onClose={() => setIsNotificationCenterOpen(false)}
          onNotificationSent={(log) => {
            showToast(`Notification sent to ${log.recipientEmail}!`);
          }}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-500 text-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100">
              <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>TICKET LIFE TRAVEL SUPER APP</span>
              <span className="font-normal text-stone-400">· Real Travel, Verified Tickets</span>
            </div>

            <div className="flex items-center gap-4 text-stone-400">
              <span>IRCTC Authorized Railway</span>
              <span aria-hidden="true">·</span>
              <span>IATA / GDS Flights</span>
              <span aria-hidden="true">·</span>
              <span>PCI-DSS Secured</span>
              <span aria-hidden="true">·</span>
              <span>Gmail Integrated</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-[11px] text-stone-400">
            <p>© 2026 Ticket Life Technologies. All Rights Reserved.</p>
            <p>Verified Partner Gateway Architecture · adwait956@gmail.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
