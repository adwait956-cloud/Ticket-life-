import React, { useState } from 'react';
import {
  X,
  Mail,
  CheckCircle2,
  AlertCircle,
  Bell,
  Trash2,
  TrendingDown,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  EmailNotificationLog,
  PriceAlert,
  TransportOption,
  UserAccount,
} from '../types/travel';
import {
  getStoredNotificationLogs,
  sendPriceDropAlertNotification,
} from '../services/gmailService';
import {
  getStoredPriceAlerts,
  deletePriceAlert,
  togglePriceAlert,
  evaluatePriceAlerts,
} from '../services/api';
import { getAccessToken } from '../services/firebaseAuth';
import { requestFCMToken } from '../services/fcmService';

interface NotificationCenterModalProps {
  currentUser?: UserAccount | null;
  catalogOptions?: TransportOption[];
  onClose: () => void;
  onNotificationSent: (log: EmailNotificationLog) => void;
  onOpenSetPriceAlert?: () => void;
  onSelectOptionToBook?: (option: TransportOption) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  currentUser,
  catalogOptions = [],
  onClose,
  onNotificationSent,
  onOpenSetPriceAlert,
  onSelectOptionToBook,
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'history'>('alerts');

  // Price alerts state
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => getStoredPriceAlerts());
  const [isCheckingPrices, setIsCheckingPrices] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fcmRegistered, setFcmRegistered] = useState(false);

  const handleEnableFCM = async () => {
    const token = await requestFCMToken();
    if (token) {
      setFcmRegistered(true);
      setStatusMessage('🔔 Firebase Cloud Messaging (FCM) Push Notifications successfully enabled for this device!');
      setTimeout(() => setStatusMessage(null), 4000);
    } else {
      setErrorMessage('Notification permission denied or FCM not supported in this browser.');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const [logs, setLogs] = useState<EmailNotificationLog[]>(() => getStoredNotificationLogs());

  const refreshLogs = () => {
    setLogs(getStoredNotificationLogs());
  };

  const refreshAlerts = () => {
    setPriceAlerts(getStoredPriceAlerts());
  };

  const handleDeleteAlert = (id: string) => {
    const updated = deletePriceAlert(id);
    setPriceAlerts(updated);
    setStatusMessage('Price alert removed from monitoring.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleToggleAlert = (id: string) => {
    const updated = togglePriceAlert(id);
    setPriceAlerts(updated);
  };

  // Instant Price Evaluation across catalog
  const handleCheckLivePricesNow = async () => {
    setIsCheckingPrices(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const matches = evaluatePriceAlerts(catalogOptions, priceAlerts);
      refreshAlerts();

      if (matches.length === 0) {
        setStatusMessage(
          `Checked ${catalogOptions.length} live services. All current prices are currently above your active alert thresholds.`
        );
      } else {
        const token = await getAccessToken();
        let notifiedCount = 0;

        for (const match of matches) {
          try {
            await sendPriceDropAlertNotification(
              currentUser?.email || 'Passenger',
              `${match.triggeredAlert.origin} → ${match.triggeredAlert.destination}`,
              match.triggeredAlert.category,
              match.matchingOption.price,
              match.triggeredAlert.targetPrice,
              match.matchingOption.title,
              token
            );
            notifiedCount++;
          } catch (e) {
            console.warn('Price drop notification delivery error:', e);
          }
        }

        refreshLogs();
        setStatusMessage(
          `🔥 Found ${matches.length} option(s) below threshold! Notified via Notification Center and Gmail.`
        );
      }
    } catch (e: any) {
      setErrorMessage('Failed to evaluate price thresholds.');
    } finally {
      setIsCheckingPrices(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="relative bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-2xl overflow-hidden my-6 transition-all animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                NOTIFICATION CENTER & PRICE WATCH
              </span>
              <h2 className="text-base font-extrabold text-stone-900 dark:text-white">
                Price Alerts & Notifications
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

        {/* Tab switcher */}
        <div className="grid grid-cols-2 border-b border-stone-100 dark:border-stone-800 text-xs font-bold text-center">
          <button
            onClick={() => { setActiveTab('alerts'); refreshAlerts(); }}
            className={`py-3 px-1 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'alerts'
                ? 'border-b-2 border-stone-900 dark:border-amber-400 text-stone-900 dark:text-amber-400 font-black'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Price Alerts ({priceAlerts.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('history'); refreshLogs(); }}
            className={`py-3 px-1 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-b-2 border-stone-900 dark:border-amber-400 text-stone-900 dark:text-amber-400 font-black'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Delivered Log ({logs.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {statusMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: PRICE ALERTS WATCHLIST */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* FCM Push Notification Device Registration Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-500/30 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-black text-xs text-amber-800 dark:text-amber-300">
                    <Bell className="w-4 h-4 text-amber-600" />
                    <span>Firebase Cloud Messaging (FCM) Push Notifications</span>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    Enable real-time push alerts on this device for instant booking status updates and price drop triggers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnableFCM}
                  disabled={fcmRegistered}
                  className={`px-4 py-2 font-black text-xs rounded-xl shadow-xs transition-all shrink-0 ${
                    fcmRegistered
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer active:scale-95'
                  }`}
                >
                  {fcmRegistered ? 'FCM Enabled ✓' : 'Enable FCM Push'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div>
                  <h3 className="font-extrabold text-stone-900 dark:text-white text-sm">
                    Monitored Route Price Thresholds
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Ticket Life automatically notifies you whenever fares drop below your specified target.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCheckLivePricesNow}
                    disabled={isCheckingPrices || priceAlerts.length === 0}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPrices ? 'animate-spin' : ''}`} />
                    <span>Check Live Fares</span>
                  </button>

                  {onOpenSetPriceAlert && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSetPriceAlert();
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ New Alert</span>
                    </button>
                  )}
                </div>
              </div>

              {priceAlerts.length === 0 ? (
                <div className="text-center py-12 px-4 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-stone-900 dark:text-white text-sm">
                      No Price Alerts Active
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                      Set a price threshold for any route (cars, auto rickshaws, or bikes). You will be notified the second fares drop below your target.
                    </p>
                  </div>
                  {onOpenSetPriceAlert && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSetPriceAlert();
                      }}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-black rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Set First Price Alert</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {priceAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700/80 space-y-2.5 transition-all hover:border-amber-400 dark:hover:border-amber-500"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200">
                            {alert.category}
                          </span>
                          <span className="font-black text-stone-900 dark:text-white text-sm">
                            {alert.origin} → {alert.destination}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleAlert(alert.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                              alert.isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-400'
                            }`}
                          >
                            {alert.isActive ? 'Active' : 'Paused'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                            title="Delete Alert"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                        <div className="space-y-0.5">
                          <div className="text-stone-500 dark:text-stone-400">
                            Threshold: <strong className="text-stone-900 dark:text-white font-mono">Alert when ≤ ₹{alert.targetPrice.toLocaleString('en-IN')}</strong>
                          </div>
                          {alert.currentLowestPrice && (
                            <div className="text-stone-400">
                              Benchmark fare at setup: ₹{alert.currentLowestPrice.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>

                        {alert.lastTriggeredPrice ? (
                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 rounded font-black text-[10px] uppercase">
                              🔥 Dropped to ₹{alert.lastTriggeredPrice.toLocaleString('en-IN')}
                            </span>
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              {alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt).toLocaleDateString() : 'Recently'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-400 italic">
                            Monitoring live feeds...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DELIVERED NOTIFICATIONS LOG */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  No notifications recorded yet.
                </div>
              ) : (
                logs.map((log, idx) => {
                  const isPriceAlert = log.type === 'price_alert';
                  return (
                    <div
                      key={`${log.id}-${idx}`}
                      className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                        isPriceAlert
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 shadow-xs'
                          : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {isPriceAlert && <TrendingDown className="w-3.5 h-3.5 text-amber-600" />}
                            <span className="font-extrabold text-stone-900 dark:text-white">
                              {log.subject}
                            </span>
                          </div>
                          {log.meta?.route && (
                            <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                              Route: {log.meta.route} · Live Fare: ₹{log.meta.currentPrice} (Target: ₹{log.meta.targetPrice})
                            </div>
                          )}
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                          isPriceAlert
                            ? 'bg-amber-500 text-stone-950'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}>
                          {isPriceAlert ? 'PRICE DROP' : log.status}
                        </span>
                      </div>

                      <div className="text-stone-500 text-[11px] flex flex-wrap items-center gap-2 pt-1 border-t border-stone-200/50 dark:border-stone-700/50">
                        <span>To: <strong>{log.recipientEmail}</strong></span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
                        {log.gmailMessageId && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[10px] text-stone-400">Gmail Ref: {log.gmailMessageId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
