import React, { useState } from 'react';
import {
  X,
  Bell,
  TrendingDown,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { PriceAlert, TransportCategory, TransportOption, UserAccount } from '../types/travel';
import { createPriceAlert, evaluatePriceAlerts } from '../services/api';
import { sendPriceDropAlertNotification } from '../services/gmailService';
import { getAccessToken } from '../services/firebaseAuth';

interface SetPriceAlertModalProps {
  initialOrigin?: string;
  initialOriginCode?: string;
  initialDestination?: string;
  initialDestCode?: string;
  initialCategory?: TransportCategory;
  initialCurrentPrice?: number;
  catalogOptions: TransportOption[];
  currentUser?: UserAccount | null;
  onClose: () => void;
  onAlertCreated: (alert: PriceAlert, triggeredMatches?: { triggeredAlert: PriceAlert; matchingOption: TransportOption }[]) => void;
}

export const SetPriceAlertModal: React.FC<SetPriceAlertModalProps> = ({
  initialOrigin = 'Chennai Central',
  initialOriginCode = 'MAS',
  initialDestination = 'KSR Bengaluru',
  initialDestCode = 'SBC',
  initialCategory = 'trains',
  initialCurrentPrice = 2850,
  catalogOptions,
  currentUser,
  onClose,
  onAlertCreated,
}) => {
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [category, setCategory] = useState<TransportCategory>(initialCategory);

  // Compute current lowest price for this route from catalog
  const matchingFares = catalogOptions
    .filter(
      (opt) =>
        opt.category === category &&
        (opt.origin.toLowerCase().includes(origin.toLowerCase()) || !origin) &&
        (opt.destination.toLowerCase().includes(destination.toLowerCase()) || !destination)
    )
    .map((o) => o.price);

  const lowestCurrent =
    matchingFares.length > 0 ? Math.min(...matchingFares) : initialCurrentPrice || 2500;

  // Threshold price
  const [targetPrice, setTargetPrice] = useState<number>(() => {
    // Default to ~15% below lowest current
    return Math.floor((lowestCurrent * 0.85) / 50) * 50;
  });

  const [notificationEmail, setNotificationEmail] = useState(currentUser?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuickPercent = (percent: number) => {
    const discounted = Math.round((lowestCurrent * (1 - percent / 100)) / 50) * 50;
    setTargetPrice(Math.max(50, discounted));
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!origin.trim()) {
      setErrorMsg('Please specify the origin city or station.');
      return;
    }
    if (!destination.trim()) {
      setErrorMsg('Please specify the destination city or station.');
      return;
    }
    if (targetPrice <= 0) {
      setErrorMsg('Target price must be greater than ₹0.');
      return;
    }

    setIsSaving(true);
    try {
      const newAlert = createPriceAlert({
        category,
        origin: origin.trim(),
        originCode: initialOriginCode || undefined,
        destination: destination.trim(),
        destCode: initialDestCode || undefined,
        targetPrice,
        currentLowestPrice: lowestCurrent,
        serviceTitle: `${category.toUpperCase()} Route Monitor`,
      });

      // Immediately evaluate against current catalog options
      const immediateMatches = evaluatePriceAlerts(catalogOptions, [newAlert]);

      // If already below threshold, trigger notification immediately!
      if (immediateMatches.length > 0) {
        const match = immediateMatches[0];
        try {
          const token = await getAccessToken();
          await sendPriceDropAlertNotification(
            notificationEmail || currentUser?.email || 'Passenger',
            `${origin} → ${destination}`,
            category,
            match.matchingOption.price,
            targetPrice,
            match.matchingOption.title,
            token
          );
        } catch (e) {
          console.warn('Immediate price drop alert email queued:', e);
        }
      }

      onAlertCreated(newAlert, immediateMatches);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save price alert.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="relative bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-lg overflow-hidden my-6 transition-all animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Fare Drop Radar
              </span>
              <h2 className="text-base font-black text-stone-900 dark:text-white">
                Set Route Price Alert
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAlert} className="p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
              Travel Mode Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(['trains', 'flights', 'buses', 'cars', 'autos', 'bikes'] as TransportCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-1 text-center font-bold rounded-xl border text-[11px] capitalize transition-colors ${
                    category === cat
                      ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Route Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                From (Origin City / Station)
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Chennai Central, Delhi"
                className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                To (Destination City / Station)
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Bengaluru, Mumbai"
                className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Current Lowest Price Benchmark */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Current Live Lowest Fare
              </span>
              <div className="text-xl font-black text-amber-900 dark:text-amber-300 font-mono mt-0.5">
                ₹{lowestCurrent.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right text-[11px] text-amber-800 dark:text-amber-300">
              <span className="font-bold">{matchingFares.length} option(s)</span> active now
            </div>
          </div>

          {/* Target Price Threshold Input & Quick Buttons */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-stone-700 dark:text-stone-300 font-bold">
                Notify Me When Price Drops Below (Threshold)
              </label>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {targetPrice < lowestCurrent
                  ? `₹${(lowestCurrent - targetPrice).toLocaleString('en-IN')} below current`
                  : 'At or above current'}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(parseInt(e.target.value, 10) || 0)}
                className="w-full pl-8 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-black text-base text-stone-900 dark:text-white focus:outline-none"
                min="10"
                step="50"
                required
              />
            </div>

            {/* Quick Percent Presets */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold uppercase text-stone-400">Quick set:</span>
              <button
                type="button"
                onClick={() => handleQuickPercent(5)}
                className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[10px] font-bold transition-colors"
              >
                5% Off (₹{Math.round((lowestCurrent * 0.95) / 50) * 50})
              </button>
              <button
                type="button"
                onClick={() => handleQuickPercent(10)}
                className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[10px] font-bold transition-colors"
              >
                10% Off (₹{Math.round((lowestCurrent * 0.9) / 50) * 50})
              </button>
              <button
                type="button"
                onClick={() => handleQuickPercent(20)}
                className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[10px] font-bold transition-colors"
              >
                20% Off (₹{Math.round((lowestCurrent * 0.8) / 50) * 50})
              </button>
            </div>
          </div>

          {/* Destination Notification Email */}
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
              Deliver Alert Notification To Email
            </label>
            <input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="Enter your email for Gmail delivery"
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Also appears in the in-app Notification Center the moment any ride or ticket drops below ₹{targetPrice.toLocaleString('en-IN')}.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-black rounded-xl transition-transform active:scale-95 flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              <span>{isSaving ? 'Activating Alert...' : 'Set Price Alert'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
