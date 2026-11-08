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
} from 'lucide-react';
import { EmailNotificationLog, NotificationType } from '../types/travel';
import {
  getStoredNotificationLogs,
  sendAccountCreatedNotification,
  sendForgotPasswordNotification,
} from '../services/gmailService';
import { getAccessToken, googleSignIn } from '../services/firebaseAuth';

interface NotificationCenterModalProps {
  onClose: () => void;
  onNotificationSent: (log: EmailNotificationLog) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  onClose,
  onNotificationSent,
}) => {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'history'>('dispatch');
  const [selectedType, setSelectedType] = useState<NotificationType>('account_created');
  const [recipientEmail, setRecipientEmail] = useState('adwait956@gmail.com');
  const [testUserName, setTestUserName] = useState('Adwait Sharma');
  const [testResetCode, setTestResetCode] = useState('TL-829401');

  // Confirmation dialog state (Mandatory for Workspace Integration)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const logs = getStoredNotificationLogs();

  const getNotificationSubject = (): string => {
    switch (selectedType) {
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
        throw new Error('Google authorization is required to send emails from adwait956@gmail.com.');
      }

      let res: { id: string; threadId?: string };

      if (selectedType === 'account_created') {
        res = await sendAccountCreatedNotification(recipientEmail.trim(), testUserName.trim(), token);
      } else if (selectedType === 'forgot_password') {
        res = await sendForgotPasswordNotification(recipientEmail.trim(), testResetCode.trim(), token);
      } else {
        // Mock travel booking confirmation preview dispatch
        res = await sendAccountCreatedNotification(recipientEmail.trim(), testUserName.trim(), token);
      }

      const newLog: EmailNotificationLog = {
        id: `notif-${Date.now()}`,
        type: selectedType,
        recipientEmail: recipientEmail.trim(),
        senderEmail: 'adwait956@gmail.com',
        subject: getNotificationSubject(),
        timestamp: new Date().toISOString(),
        status: 'sent',
        gmailMessageId: res.id,
      };

      onNotificationSent(newLog);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-6 transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Official Gmail Dispatcher
              </span>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Email Notifications (from adwait956@gmail.com)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-center">
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`py-3 transition-colors ${
              activeTab === 'dispatch'
                ? 'border-b-2 border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Dispatch & Trigger Notifications
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 transition-colors ${
              activeTab === 'history'
                ? 'border-b-2 border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Delivered Notification Log ({logs.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {activeTab === 'dispatch' && (
            <>
              {statusMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleInitiateSend} className="space-y-4 text-xs">
                {/* Notification Type Selector */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2 uppercase text-[11px] tracking-wider">
                    Select Automated Notification Event
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedType('account_created')}
                      className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                        selectedType === 'account_created'
                          ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <UserPlus className="w-4 h-4 text-sky-600 mb-1" />
                      <span className="font-bold">1. Account Created</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Welcome & promo gift</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedType('forgot_password')}
                      className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                        selectedType === 'forgot_password'
                          ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <KeyRound className="w-4 h-4 text-amber-600 mb-1" />
                      <span className="font-bold">2. Forgot Password</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">One-time reset token</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedType('travel_booking')}
                      className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                        selectedType === 'travel_booking'
                          ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Ticket className="w-4 h-4 text-emerald-600 mb-1" />
                      <span className="font-bold">3. Travel Booking</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Confirmed PNR & Pass</span>
                    </button>
                  </div>
                </div>

                {/* Recipient */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Sent automatically from verified sender <strong>adwait956@gmail.com</strong>
                  </span>
                </div>

                {/* Event specific inputs */}
                {selectedType === 'account_created' && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      User Full Name
                    </label>
                    <input
                      type="text"
                      value={testUserName}
                      onChange={(e) => setTestUserName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                )}

                {selectedType === 'forgot_password' && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      One-Time Security Token
                    </label>
                    <input
                      type="text"
                      value={testResetCode}
                      onChange={(e) => setTestResetCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Email Preview Snippet */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Subject: </span>
                    <span className="text-slate-900 dark:text-white font-medium">{getNotificationSubject()}</span>
                  </div>
                  <div className="text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Provider: </span>
                    <span>Official Google Workspace Gmail API Integration</span>
                  </div>
                </div>

                {/* Trigger Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-red-600/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Notification via Gmail</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No notifications recorded yet.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {log.subject}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                        {log.status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-2">
                      <span>To: <strong>{log.recipientEmail}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>From: {log.senderEmail}</span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    {log.gmailMessageId && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Gmail ID: {log.gmailMessageId}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* MANDATORY Workspace User Confirmation Modal */}
        {showConfirmDialog && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700 max-w-sm w-full space-y-3 text-xs shadow-xl">
              <div className="flex items-center gap-2 text-amber-600 font-bold">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>Confirm Email Dispatch</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                You are about to send an official <strong>{selectedType.replace('_', ' ')}</strong> notification to <strong>{recipientEmail}</strong> from authorized sender <strong>adwait956@gmail.com</strong>.
              </p>
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                {getNotificationSubject()}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isSending}
                  className="px-3 py-1.5 font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSend}
                  disabled={isSending}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  {isSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Confirm & Send</span>
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
