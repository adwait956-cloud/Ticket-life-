import React, { useState } from 'react';
import { Tag, Check, Copy, Sparkles, ArrowRight } from 'lucide-react';
import { POPULAR_OFFERS } from '../data/mockData';

interface OffersViewProps {
  onApplyCode: (code: string) => void;
}

export const OffersView: React.FC<OffersViewProps> = ({ onApplyCode }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
    onApplyCode(code);
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Exclusive Travel Offers & Verified Deals
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Save on your next train, flight, bus, cab, auto, or bike trip with verified authorized partner coupons.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {POPULAR_OFFERS.map((offer) => {
          const isCopied = copiedCode === offer.code;

          return (
            <div
              key={offer.code}
              className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-sky-400 transition-colors"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    {offer.category === 'all' ? 'All Travel Modes' : offer.category.toUpperCase()}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600 font-mono">
                    {offer.flatDiscount ? `₹${offer.flatDiscount} OFF` : `${offer.discountPercent}% OFF`}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {offer.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {offer.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                    {offer.code}
                  </span>
                  <span className="text-[11px] text-slate-400">Min. ₹{offer.minBooking}</span>
                </div>

                <button
                  onClick={() => handleCopy(offer.code)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
