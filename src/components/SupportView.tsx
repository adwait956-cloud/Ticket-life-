import React, { useState } from 'react';
import {
  HelpCircle,
  Phone,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { FAQS } from '../data/mockData';
import { createSupportTicket } from '../services/api';
import { UserAccount } from '../types/travel';

interface SupportViewProps {
  user: UserAccount | null;
}

export const SupportView: React.FC<SupportViewProps> = ({ user }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Cancellation & Refund');
  const [ticketMessage, setTicketMessage] = useState('');
  const [bookingRefInput, setBookingRefInput] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    createSupportTicket({
      userId: user?.id || 'guest',
      userEmail: user?.email || 'guest@ticketlife.travel',
      category: ticketCategory,
      bookingRef: bookingRefInput.trim() || undefined,
      subject: ticketSubject.trim(),
      message: ticketMessage.trim(),
    });

    setTicketSubmitted(true);
    setTicketSubject('');
    setTicketMessage('');
    setBookingRefInput('');
  };

  return (
    <div className="w-full space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Ticket Life Help Center & Customer Support
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          24/7 dedicated support for real-time ticket issuance, refunds, PNR status, and journey safety.
        </p>
      </div>

      {/* Emergency Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center mb-2">
            <Phone className="w-4 h-4" />
          </div>
          <div className="font-bold text-slate-900 dark:text-white">24/7 Toll-Free Helpline</div>
          <div className="text-slate-500 mt-0.5">1800-419-8800</div>
          <div className="text-emerald-600 font-semibold mt-1">Instant Voice Response</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mb-2">
            <Mail className="w-4 h-4" />
          </div>
          <div className="font-bold text-slate-900 dark:text-white">Official Support Email</div>
          <div className="text-slate-500 mt-0.5">support@ticketlife.travel</div>
          <div className="text-sky-600 font-semibold mt-1">Response within 15 mins</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="font-bold text-slate-900 dark:text-white">Refund Guarantee</div>
          <div className="text-slate-500 mt-0.5">Zero-fee deductions on cabs</div>
          <div className="text-emerald-600 font-semibold mt-1">Auto-credited to wallet</div>
        </div>
      </div>

      {/* Interactive FAQ Section */}
      <div>
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;

            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Support Request Form */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-sky-600" />
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            Create an Official Support Ticket
          </h2>
        </div>

        {ticketSubmitted ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Your support request has been registered in the system.</span>
              <p className="text-[11px] mt-0.5">
                Our operations desk has queued ticket #{Math.floor(10000 + Math.random() * 90000)}. We will update your account shortly.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Issue Category
                </label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Cancellation & Refund">Cancellation & Refund</option>
                  <option value="PNR & Boarding Pass">PNR & Boarding Pass Verification</option>
                  <option value="Payment & Transaction">Payment & Gateway Status</option>
                  <option value="Driver / Vehicle Dispatch">Driver / Vehicle Dispatch</option>
                  <option value="Baggage & Amenities">Baggage & Amenities</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Booking Reference / PNR (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TL-RAIL-90218"
                  value={bookingRefInput}
                  onChange={(e) => setBookingRefInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Subject
              </label>
              <input
                type="text"
                placeholder="Brief summary of your inquiry..."
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Detailed Message
              </label>
              <textarea
                rows={3}
                placeholder="Provide travel details, transaction reference, or question..."
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white focus:outline-none"
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-sky-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Ticket</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
