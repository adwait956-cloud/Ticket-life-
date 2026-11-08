import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { BookingRecord } from '../types/travel';
import { sendTicketEmail } from '../services/gmailService';
import { getAccessToken, googleSignIn } from '../services/firebaseAuth';

interface GmailConfirmationModalProps {
  booking: BookingRecord;
  currentUserEmail: string | null;
  onClose: () => void;
  onSuccess: (messageId: string) => void;
}

export const GmailConfirmationModal: React.FC<GmailConfirmationModalProps> = ({
  booking,
  currentUserEmail,
  onClose,
  onSuccess,
}) => {
  const [recipient, setRecipient] = useState(currentUserEmail || '');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sendSuccessId, setSendSuccessId] = useState<string | null>(null);

  const subject = `Your Confirmed Ticket: ${booking.serviceTitle} (${booking.bookingRef}) - Ticket Life`;

  const handleConfirmSend = async () => {
    setErrorMessage('');
    setIsSending(true);

    try {
      let token = await getAccessToken();
      if (!token) {
        // Need to authenticate with Google Auth with Gmail scopes
        const authRes = await googleSignIn();
        if (!authRes?.accessToken) {
          throw new Error('Google Sign-In failed or was cancelled. Unable to obtain Gmail permissions.');
        }
        token = authRes.accessToken;
      }

      const res = await sendTicketEmail(booking, recipient.trim(), token);
      setSendSuccessId(res.id);
      setIsSending(false);
      onSuccess(res.id);
    } catch (err: any) {
      console.error('Failed to send email:', err);
      setErrorMessage(err.message || 'An error occurred while sending the email via Gmail API.');
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Send Ticket via Gmail
              </h2>
              <p className="text-xs text-slate-500">Google Workspace Email Delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {sendSuccessId ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Ticket Sent Successfully!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                We delivered the official confirmed itinerary and tax invoice to{' '}
                <strong className="text-slate-800 dark:text-slate-200">{recipient}</strong>.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-sky-600 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mandatory User Confirmation Notice */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Explicit User Confirmation Required</span>
                </div>
                <p className="text-amber-800/90 dark:text-amber-300 text-[11px] leading-relaxed">
                  Ticket Life will send an email from your authorized Gmail account with the complete ticket details, PNR number, and tax invoice. Please confirm before we proceed.
                </p>
              </div>

              {/* Recipient Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="recipient@example.com"
                />
              </div>

              {/* Email Preview Summary */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Subject: </span>
                  <span className="text-slate-900 dark:text-white font-medium">{subject}</span>
                </div>
                <div className="text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Itinerary: </span>
                  <span>{booking.origin} ➔ {booking.destination} on {booking.departureDate}</span>
                </div>
                <div className="text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">PNR / Ref: </span>
                  <span className="font-mono font-bold text-sky-600">{booking.pnrNumber || booking.providerRef}</span>
                </div>
                <div className="text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Fare: </span>
                  <span>₹{booking.fareBreakdown.totalAmount.toLocaleString('en-IN')} (Confirmed Paid)</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSending}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSend}
                  disabled={isSending || !recipient.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:bg-slate-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-red-600/20"
                >
                  {isSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm & Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
