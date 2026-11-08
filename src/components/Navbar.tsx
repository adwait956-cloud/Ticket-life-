import React from 'react';
import {
  Compass,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Mail,
  Moon,
  Sun,
  Ticket,
  Wallet,
  History,
  Settings,
  Smartphone,
} from 'lucide-react';
import { UserAccount } from '../types/travel';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserAccount | null;
  googleUserEmail: string | null;
  onOpenAuth: () => void;
  onOpenNotifications?: () => void;
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
  onOpenNotifications,
  onLogout,
  isAdminMode,
  onToggleAdminMode,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#fafaf9]/95 dark:bg-[#080b11]/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Brand Logo & Wordmark */}
          <button
            onClick={() => setActiveTab('booking')}
            className="flex items-center gap-2.5 text-left text-stone-900 dark:text-stone-100 group focus:outline-none shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 flex items-center justify-center font-bold shadow-xs transition-colors">
              <Compass className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight whitespace-nowrap leading-tight text-stone-900 dark:text-white">
                TICKET LIFE
              </span>
              <span className="text-[9px] tracking-widest uppercase text-stone-400 dark:text-stone-500 font-bold">
                Real Travel Super App
              </span>
            </div>
          </button>

          {/* THE 4 PRIMARY HUB BUTTONS (DESKTOP & TABLET) */}
          <nav className="hidden lg:flex items-center gap-2 bg-stone-100/90 dark:bg-stone-800/90 p-1.5 rounded-2xl border border-stone-200/70 dark:border-stone-700/70 text-xs font-bold">
            {/* 1st Button: Booking Ticket (Car, Auto, Bus, Bike, Train, Airplane) */}
            <button
              onClick={() => setActiveTab('booking')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'booking' || activeTab === 'home'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-amber-400 shadow-xs font-black border border-stone-200/60 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Ticket className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>1. Booking Ticket</span>
              <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 hidden xl:inline">
                (6 Modes)
              </span>
            </button>

            {/* 2nd Button: Payment History & Wallet */}
            <button
              onClick={() => setActiveTab('wallet_payments')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'wallet_payments'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-amber-400 shadow-xs font-black border border-stone-200/60 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>2. Payment History & Wallet</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px]">
                ₹{currentUser?.walletBalance ?? 2450}
              </span>
            </button>

            {/* 3rd Button: Travelling History (travel kab hua, kidhar se kidhar gaye the) */}
            <button
              onClick={() => setActiveTab('travel_history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'travel_history'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-amber-400 shadow-xs font-black border border-stone-200/60 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>3. Travelling History</span>
            </button>

            {/* 4th Button: Account Setting */}
            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'account'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-amber-400 shadow-xs font-black border border-stone-200/60 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>4. Account Setting</span>
            </button>
          </nav>

          {/* Right Tools Area */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* PWA Home Screen Install Button */}
            <PWAInstallButton variant="navbar" />

            {/* Email Notifications & Gmail Dispatch Center */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-lg transition-colors border border-stone-200/60 dark:border-stone-700/60"
                title="Official Email Notifications & Dispatcher"
              >
                <Mail className="w-3.5 h-3.5 text-red-500" />
                <span className="hidden md:inline">Email Alerts</span>
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Admin Switch shortcut */}
            <button
              onClick={onToggleAdminMode}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                isAdminMode
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title="Admin Control Center"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAdminMode ? 'Admin Portal' : 'Admin'}</span>
            </button>

            {/* User Account / Sign In */}
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('account')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors whitespace-nowrap"
                  title="Open Account Settings"
                >
                  <UserIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="max-w-[110px] truncate">{currentUser.fullName}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 rounded-xl transition-colors whitespace-nowrap shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Sign In / Join</span>
              </button>
            )}
          </div>
        </div>

        {/* SECONDARY ROW FOR MOBILE / RESPONSIVE (4 Primary Hub Buttons) */}
        <div className="lg:hidden pb-3 pt-1 border-t border-stone-200/60 dark:border-stone-800/60 grid grid-cols-4 gap-1 text-[11px] font-bold text-center">
          <button
            onClick={() => setActiveTab('booking')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'booking' || activeTab === 'home'
                ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span className="leading-tight">1. Booking</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet_payments')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'wallet_payments'
                ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="leading-tight">2. Wallet</span>
          </button>

          <button
            onClick={() => setActiveTab('travel_history')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'travel_history'
                ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="leading-tight">3. History</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'account'
                ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="leading-tight">4. Account</span>
          </button>
        </div>
      </div>
    </header>
  );
};
