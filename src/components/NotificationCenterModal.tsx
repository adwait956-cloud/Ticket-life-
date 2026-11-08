import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  KeyRound,
  UserPlus,
  Ticket,
  Lock,
  Bell,
  Trash2,
  TrendingDown,
  RefreshCw,
  Plus,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  EmailNotificationLog,
  NotificationType,
  PriceAlert,
  TransportOption,
  UserAccount,
} from '../types/travel';
import {
  getStoredNotificationLogs,
  sendAccountCreatedNotification,
  sendForgotPasswordNotification,
  sendPriceDropAlertNotification,
} from '../services/gmailService';
import {
  getStoredPriceAlerts,
  deletePriceAlert,
  togglePriceAlert,
  evaluatePriceAlerts,
} from '../services/api';
import { getAccessToken, googleSignIn } from '../services/firebaseAuth';

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
  const [activeTab, setActiveTab] = useState<'alerts' | 'history' | 'dispatch'>('alerts');
  const [selectedType, setSelectedType] = useState<NotificationType>('price_alert');
  const [recipientEmail, setRecipientEmail] = useState(currentUser?.email || '');
  const [testUserName, setTestUserName] = useState(currentUser?.fullName || 'Valued Passenger');
  const [testResetCode, setTestResetCode] = useState('TL-829401');

  // Test price alert fields
  const [testRoute, setTestRoute] = useState('Chennai Central → KSR Bengaluru');
  const [testCurrentPrice, setTestCurrentPrice] = useState(2150);
  const [testTargetPrice, setTestTargetPrice] = useState(2500);

  // Price alerts state
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => getStoredPriceAlerts());
  const [isCheckingPrices, setIsCheckingPrices] = useState(false);

  // Confirmation dialog state (Mandatory for Workspace Integration)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
              recipientEmail || currentUser?.email || 'Passenger',
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

  const getNotificationSubject = (): string => {
    switch (selectedType) {
      case 'price_alert':
        return `🔥 Price Drop Alert: ${testRoute} now ₹${testCurrentPrice} (Target: ₹${testTargetPrice})`;
      case 'account_created':
        return 'Welcome to Ticket Life! Your Travel Super App Account is Active';
      case 'forgot_password':
        return `Ticket Life Security: Password Reset & Access Code [${testResetCode}]`;
      case 'travel_booking':
        return 'Your Confirmed Ticket: Vande Bharat Express (TL-RAIL-90218) - Ticket Life';
      case 'login_alert':
        return 'Security Alert: New Sign-in Detected on Ticket Life';
      default:
        return 'Ticket Life Official Travel Notification';
    }
  };

  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setShowConfirmDialog(true);
  };

  const handleConfirmAndSend = async () => {
    setIsSending(true);
    setErrorMessage(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      }

      if (!token) {
        throw new Error('Google authorization is required to send emails via Gmail API.');
      }

      let res: { id: string; threadId?: string };

      if (selectedType === 'price_alert') {
        res = await sendPriceDropAlertNotification(
          recipientEmail.trim(),
          testRoute,
          'trains',
          testCurrentPrice,
          testTargetPrice,
          'Vande Bharat Express',
          token
        );
      } else if (selectedType === 'account_created') {
        res = await sendAccountCreatedNotification(recipientEmail.trim(), testUserName.trim(), token);
      } else if (selectedType === 'forgot_password') {
        res = await sendForgotPasswordNotification(recipientEmail.trim(), testResetCode.trim(), token);
      } else {
        res = await sendAccountCreatedNotification(recipientEmail.trim(), testUserName.trim(), token);
      }

      const newLog: EmailNotificationLog = {
        id: `notif-${Date.now()}`,
        type: selectedType,
        recipientEmail: recipientEmail.trim(),
        senderEmail: 'notifications@ticketlife.com',
        subject: getNotificationSubject(),
        timestamp: new Date().toISOString(),
        status: 'sent',
        gmailMessageId: res.id,
      };

      onNotificationSent(newLog);
      refreshLogs();
      setStatusMessage(`Notification successfully delivered via Gmail API! Message ID: ${res.id}`);
      setShowConfirmDialog(false);
    } catch (err: any) {
      console.error('Failed to send notification email:', err);
      setErrorMessage(err.message || 'Failed to dispatch email via Gmail.');
    } finally {
      setIsSending(false);
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
        <div className="grid grid-cols-3 border-b border-stone-100 dark:border-stone-800 text-xs font-bold text-center">
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
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`py-3 px-1 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'dispatch'
                ? 'border-b-2 border-stone-900 dark:border-amber-400 text-stone-900 dark:text-amber-400 font-black'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch & Test</span>
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
                      Set a price threshold for any route (cars, autos, buses, bikes, trains, or flights). You will be notified the second fares drop below your target.
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
                logs.map((log) => {
                  const isPriceAlert = log.type === 'price_alert';
                  return (
                    <div
                      key={log.id}
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

          {/* TAB 3: DISPATCH & TEST FORM */}
          {activeTab === 'dispatch' && (
            <form onSubmit={handleInitiateSend} className="space-y-4">
              {/* Notification Type Selector */}
              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-bold mb-2 uppercase text-[10px] tracking-wider">
                  Select Automated Notification Event
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedType('price_alert')}
                    className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                      selectedType === 'price_alert'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-stone-900 dark:text-amber-200 font-bold'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 text-amber-600 mb-1" />
                    <span className="font-bold">1. Route Price Drop Alert</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Fares drop below threshold</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedType('travel_booking')}
                    className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                      selectedType === 'travel_booking'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-stone-900 dark:text-amber-200 font-bold'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <Ticket className="w-4 h-4 text-emerald-600 mb-1" />
                    <span className="font-bold">2. Travel Booking</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Confirmed PNR & Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedType('account_created')}
                    className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                      selectedType === 'account_created'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-stone-900 dark:text-amber-200 font-bold'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 text-amber-600 mb-1" />
                    <span className="font-bold">3. Account Created</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Welcome & promo gift</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedType('forgot_password')}
                    className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                      selectedType === 'forgot_password'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-stone-900 dark:text-amber-200 font-bold'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <KeyRound className="w-4 h-4 text-amber-600 mb-1" />
                    <span className="font-bold">4. Password Reset Code</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">One-time reset token</span>
                  </button>
                </div>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Event specific inputs */}
              {selectedType === 'price_alert' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-3">
                    <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                      Route
                    </label>
                    <input
                      type="text"
                      value={testRoute}
                      onChange={(e) => setTestRoute(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                      Current Live Fare (₹)
                    </label>
                    <input
                      type="number"
                      value={testCurrentPrice}
                      onChange={(e) => setTestCurrentPrice(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                      Target Threshold (₹)
                    </label>
                    <input
                      type="number"
                      value={testTargetPrice}
                      onChange={(e) => setTestTargetPrice(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Trigger Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Notification via Gmail</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Workspace User Confirmation Modal */}
        {showConfirmDialog && (
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 max-w-sm w-full space-y-3 text-xs shadow-xl animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-amber-600 font-bold">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>Confirm Email Dispatch</span>
              </div>
              <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                You are about to send an official <strong>{selectedType.replace('_', ' ')}</strong> notification to <strong>{recipientEmail}</strong> via the authorized Gmail service.
              </p>
              <div className="p-2.5 bg-stone-100 dark:bg-stone-800 rounded-xl font-mono text-[11px] text-stone-700 dark:text-stone-300 truncate">
                {getNotificationSubject()}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isSending}
                  className="px-3 py-1.5 font-bold text-stone-600 hover:text-stone-900 dark:text-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSend}
                  disabled={isSending}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-black rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSending ? (
                    <span>Sending via Gmail...</span>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Confirm & Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
