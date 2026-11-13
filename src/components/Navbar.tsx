import React from 'react';
import {
  Compass,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  PlusCircle,
  Moon,
  Sun,
  Ticket,
  Wallet,
  History,
  Settings,
  Sparkles,
} from 'lucide-react';
import { UserAccount } from '../types/travel';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserAccount | null;
  googleUserEmail: string | null;
  onOpenAuth: () => void;
  onOpenAddRide?: () => void;
  onLogout: () => void;
  isAdminMode: boolean;
  onToggleAdminMode: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  googleUserEmail,
  onOpenAuth,
  onOpenAddRide,
  onLogout,
  isAdminMode,
  onToggleAdminMode,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const walletAmount = currentUser?.walletBalance ?? 0;
  const displayName = currentUser?.fullName?.toUpperCase() || (currentUser?.email ? currentUser.email.split('@')[0].toUpperCase() : 'GUEST');

  return (
    <header className="sticky top-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-[#26262b] px-4 sm:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo - Variation 3: DotGothic16 with #00ff88 */}
        <button
          onClick={() => setActiveTab('booking')}
          className="flex items-center gap-2 text-left group focus:outline-none shrink-0"
        >
          <span className="font-dotgothic text-xl sm:text-2xl text-[#00ff88] tracking-wider uppercase font-black">
            TICKET_LIFE //
          </span>
        </button>

        {/* The 4 Primary Nav Tabs (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 font-mono-code text-[11px] uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('booking')}
            className={`py-1.5 transition-all cursor-pointer ${
              activeTab === 'booking' || activeTab === 'home'
                ? 'text-white border-b-2 border-[#00ff88] font-bold'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Booking
          </button>

          <button
            onClick={() => setActiveTab('wallet_payments')}
            className={`py-1.5 transition-all cursor-pointer ${
              activeTab === 'wallet_payments'
                ? 'text-white border-b-2 border-[#00ff88] font-bold'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Wallet
          </button>

          <button
            onClick={() => setActiveTab('travel_history')}
            className={`py-1.5 transition-all cursor-pointer ${
              activeTab === 'travel_history'
                ? 'text-white border-b-2 border-[#00ff88] font-bold'
                : 'text-white/50 hover:text-white'
            }`}
          >
            History
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`py-1.5 transition-all cursor-pointer ${
              activeTab === 'account'
                ? 'text-white border-b-2 border-[#00ff88] font-bold'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* User Panel (Wallet & Auth Actions) */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-mono-code text-[11px]">
          {/* PWA Install */}
          <PWAInstallButton variant="navbar" />

          {/* Add Ride shortcut at top */}
          {onOpenAddRide && (
            <button
              onClick={onOpenAddRide}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00ff88] hover:bg-[#00e67a] text-black font-extrabold uppercase rounded text-[10px] transition-colors cursor-pointer"
              title="Add / Request Ride"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Ride</span>
            </button>
          )}

          {/* Admin shortcut */}
          <button
            onClick={onToggleAdminMode}
            className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] uppercase font-bold border transition-colors ${
              isAdminMode
                ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/50'
                : 'text-white/50 border-[#26262b] hover:text-white'
            }`}
            title="Toggle Admin Control Center"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>

          {/* Wallet Stat Badge */}
          <div className="hidden sm:flex items-center bg-[#16161a] border border-[#26262b] px-3 py-1 rounded-full text-white/80 text-[11px] font-mono-code">
            <span>WALLET: ₹{walletAmount.toLocaleString('en-IN')}.00</span>
          </div>

          {/* User Status / Login */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('account')}
                className="text-white hover:text-[#00ff88] font-bold tracking-wider uppercase transition-colors"
                title="Account Settings"
              >
                {displayName}
              </button>

              <button
                onClick={onLogout}
                className="text-white/50 hover:text-rose-400 uppercase tracking-wider transition-colors"
                title="Log Out"
              >
                LOG_OUT
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1 bg-[#00ff88] hover:bg-[#00e67a] text-black font-extrabold uppercase rounded transition-colors text-xs"
            >
              SIGN_IN
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav Row */}
      <div className="md:hidden mt-3 pt-2 border-t border-[#26262b] grid grid-cols-4 gap-1 text-[10px] font-mono-code text-center uppercase">
        <button
          onClick={() => setActiveTab('booking')}
          className={`py-1.5 rounded transition-colors ${
            activeTab === 'booking' || activeTab === 'home'
              ? 'text-[#00ff88] font-bold border-b-2 border-[#00ff88]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          Booking
        </button>
        <button
          onClick={() => setActiveTab('wallet_payments')}
          className={`py-1.5 rounded transition-colors ${
            activeTab === 'wallet_payments'
              ? 'text-[#00ff88] font-bold border-b-2 border-[#00ff88]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          Wallet
        </button>
        <button
          onClick={() => setActiveTab('travel_history')}
          className={`py-1.5 rounded transition-colors ${
            activeTab === 'travel_history'
              ? 'text-[#00ff88] font-bold border-b-2 border-[#00ff88]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`py-1.5 rounded transition-colors ${
            activeTab === 'account'
              ? 'text-[#00ff88] font-bold border-b-2 border-[#00ff88]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          Settings
        </button>
      </div>
    </header>
  );
};
