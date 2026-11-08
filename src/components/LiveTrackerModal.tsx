import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Train,
  Plane,
  Car,
  Compass,
  Bike,
  Bus,
} from 'lucide-react';
import { BookingRecord, TransportOption } from '../types/travel';

interface LiveTrackerModalProps {
  item: BookingRecord | TransportOption;
  onClose: () => void;
}

export const LiveTrackerModal: React.FC<LiveTrackerModalProps> = ({ item, onClose }) => {
  const isBooking = 'bookingRef' in item;
  const category = item.category;
  const title = 'serviceTitle' in item ? item.serviceTitle : item.title;
  const serviceNumber = item.serviceNumber;
  const liveStatus = 'liveStatus' in item ? item.liveStatus : undefined;
  const platformOrGate = liveStatus?.platformOrGate || (item as any).terminalOrPlatform || 'Platform 1';
  const driver = liveStatus?.driverDetails || ('driverInfo' in item ? (item as BookingRecord).driverInfo : undefined);

  // Simulated live progress
  const [progress, setProgress] = useState(48);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 45 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const getCategoryIcon = () => {
    switch (category) {
      case 'trains': return Train;
      case 'flights': return Plane;
      case 'buses': return Bus;
      case 'cars': return Car;
      case 'autos': return Compass;
      case 'bikes': return Bike;
    }
  };

  const Icon = getCategoryIcon();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-6 transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-sky-600 dark:text-sky-400">
                <Radio className="w-3 h-3 animate-pulse text-emerald-500" />
                <span>Live Provider Telemetry</span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {title} ({serviceNumber})
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status summary banner */}
          <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                  Operational Status
                </span>
                <div className="text-lg font-bold mt-0.5 text-emerald-400">
                  {liveStatus?.statusText || 'On Schedule · Verified Telemetry'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Last updated: {liveStatus?.lastUpdated || 'Just now'} via authorized partner API
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {category === 'flights' ? 'Assigned Gate' : 'Platform / Bay'}
                </span>
                <div className="text-base font-mono font-extrabold text-white mt-0.5">
                  {platformOrGate}
                </div>
              </div>
            </div>

            {/* Simulated Live Route Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{item.origin} ({item.originCode})</span>
                <span className="text-sky-400 font-bold">{progress}% Route Completed</span>
                <span>{item.destination} ({item.destCode})</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Category-Specific Breakdown */}
          {category === 'trains' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Live Station Sequence (IRCTC Verified)
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 dark:text-white">Departed: {item.origin}</div>
                    <div className="text-slate-400">Passed On Time at {item.departureTime}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Navigation className="w-4 h-4 text-sky-500 shrink-0 animate-bounce" />
                  <div className="flex-1">
                    <div className="font-bold text-sky-600 dark:text-sky-400">
                      Current: {liveStatus?.currentStationOrLocation || 'En Route'}
                    </div>
                    <div className="text-slate-500">Speed: 110 km/h · Signals Clear</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      Next Halt: {liveStatus?.nextHalt || item.destination}
                    </div>
                    <div className="text-slate-400">Estimated Arrival: In 42 mins</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {category === 'flights' && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Radar Altitude</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono">34,000 ft</div>
                <div className="text-slate-400 text-[11px]">Cruising Ground Speed 840 km/h</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Baggage Carousel</div>
                <div className="text-base font-bold text-sky-600 mt-1 font-mono">Belt 05 (T2)</div>
                <div className="text-slate-400 text-[11px]">Arrival Hall Priority Access</div>
              </div>
            </div>
          )}

          {(category === 'cars' || category === 'autos' || category === 'bikes') && driver && (
            <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-sky-200 dark:border-sky-800">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {driver.name}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Rating: {driver.rating} ★ · Ticket Life Verified Chauffeur
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Trip OTP</div>
                  <div className="font-mono font-black text-sky-700 dark:text-sky-300 text-base bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-700">
                    {driver.otp}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-500">License Plate: </span>
                  <span className="font-mono font-bold">{driver.vehicleNumber}</span>
                </div>
                <a
                  href={`tel:${driver.phone}`}
                  className="flex items-center gap-1 font-bold text-sky-600 hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Chauffeur</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
};
