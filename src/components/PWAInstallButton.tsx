import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  // If already running in standalone PWA, hide the button
  if (isInstalled || hasDismissed) {
    return null;
  }

  // Variant: Card style (for Account Settings or Banner)
  if (variant === 'card') {
    return (
      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shrink-0 shadow-sm">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
              Install Ticket Life on Home Screen
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Add app icon to your phone screen for instant 1-tap bookings, live radar tracking, and offline tickets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isInstallable ? (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs rounded-xl transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install to Home Screen</span>
            </button>
          ) : (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs rounded-xl transition-colors shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Install Guide</span>
            </button>
          )}

          <button
            onClick={() => setHasDismissed(true)}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg text-xs"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* iOS Safari Guide Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800">
                <h3 className="text-sm font-extrabold">Add Ticket Life to Home Screen</h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-stone-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Tap the <strong>Share</strong> button (box with upward arrow) in your browser toolbar.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Scroll down the action sheet and tap <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0">3</span>
                  <span>Tap <strong>Add</strong> in the top-right corner. The golden Ticket Life icon will appear on your home screen!</span>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Variant: Navbar compact button
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/40 hover:bg-amber-200/80 rounded-lg border border-amber-300 dark:border-amber-800 transition-colors"
        title="Add Ticket Life icon to your mobile / desktop home screen"
      >
        <Download className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 rounded-lg border border-stone-200 dark:border-stone-700 transition-colors"
          title="Add to iPhone Home Screen"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Add to Phone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800">
                <h3 className="text-sm font-extrabold">Add to Home Screen (iOS)</h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-stone-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                1. Tap <strong>Share</strong> in Safari toolbar.<br />
                2. Tap <strong>Add to Home Screen</strong>.<br />
                3. The golden Ticket Life icon will be installed.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
