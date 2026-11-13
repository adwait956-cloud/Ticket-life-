import React, { useState, useEffect } from 'react';
import { X, PlusCircle, AlertCircle, CheckCircle2, MapPin } from 'lucide-react';
import { LatLngPoint, TransportCategory } from '../types/travel';
import { publishRealRideToDatabase } from '../services/realtimeRides';
import { IndiaPlaceInput } from './IndiaPlaceInput';

interface AddRealRideModalProps {
  defaultCategory: TransportCategory;
  defaultOrigin?: string;
  defaultOriginCoords?: LatLngPoint;
  defaultDestination?: string;
  defaultDestCoords?: LatLngPoint;
  onClose: () => void;
  onSuccess: (rideId: string) => void;
}

export const AddRealRideModal: React.FC<AddRealRideModalProps> = ({
  defaultCategory,
  defaultOrigin = '',
  defaultOriginCoords,
  defaultDestination = '',
  defaultDestCoords,
  onClose,
  onSuccess,
}) => {
  const trimmedDefaultOrigin = defaultOrigin.trim();
  const trimmedDefaultDestination = defaultDestination.trim();

  const [title, setTitle] = useState(() =>
    trimmedDefaultOrigin && trimmedDefaultDestination
      ? `${trimmedDefaultOrigin} → ${trimmedDefaultDestination}`
      : ''
  );
  const [category, setCategory] = useState<TransportCategory>(defaultCategory);
  const [origin, setOrigin] = useState(trimmedDefaultOrigin);
  const [originAddress, setOriginAddress] = useState(trimmedDefaultOrigin);
  const [originCoords, setOriginCoords] = useState<LatLngPoint | undefined>(defaultOriginCoords);
  const [destination, setDestination] = useState(trimmedDefaultDestination);
  const [destAddress, setDestAddress] = useState(trimmedDefaultDestination);
  const [destCoords, setDestCoords] = useState<LatLngPoint | undefined>(defaultDestCoords);
  const [price, setPrice] = useState('250');
  const [departureTime, setDepartureTime] = useState('Available Now');
  const [vehicleType, setVehicleType] = useState('');
  const [serviceNumber, setServiceNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [availableSeats, setAvailableSeats] = useState('4');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setCategory(defaultCategory);
  }, [defaultCategory]);

  useEffect(() => {
    const nextOrigin = defaultOrigin.trim();
    if (nextOrigin) {
      setOrigin(nextOrigin);
      setOriginAddress(nextOrigin);
      setOriginCoords(defaultOriginCoords);
    }
  }, [defaultOrigin, defaultOriginCoords]);

  useEffect(() => {
    const nextDest = defaultDestination.trim();
    if (nextDest) {
      setDestination(nextDest);
      setDestAddress(nextDest);
      setDestCoords(defaultDestCoords);
    }
  }, [defaultDestination, defaultDestCoords]);

  const hasPrefilledRoute = Boolean(trimmedDefaultOrigin || trimmedDefaultDestination);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!origin.trim() || !destination.trim()) {
      setErrorMsg('Please enter both Pickup / Origin and Drop / Destination.');
      return;
    }

    const numericPrice = Number(price);
    if (!numericPrice || numericPrice <= 0) {
      setErrorMsg('Please enter a valid fare price greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      const rideId = await publishRealRideToDatabase({
        title: title.trim() || `${origin.trim()} → ${destination.trim()}`,
        category,
        origin,
        originAddress: originAddress || undefined,
        originCoords,
        destination,
        destAddress: destAddress || undefined,
        destCoords,
        price: numericPrice,
        departureTime,
        vehicleType: vehicleType.trim() || undefined,
        serviceNumber: serviceNumber.trim() || undefined,
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        availableSeats: Number(availableSeats) || 4,
      });
      onSuccess(rideId);
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Failed to write ride to Firebase RTDB. Please ensure database write rules or authentication are enabled.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-500" />
              <span>Special Custom Ride Request</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Cars, Auto Rickshaws &amp; Bikes · Priority Live Dispatch
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {hasPrefilledRoute && (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-[11px] font-semibold">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Pre-filled from your current route search filters. Edit anytime below.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TransportCategory)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="cars">Cars / Cabs</option>
                <option value="autos">Auto Rickshaws</option>
                <option value="bikes">Bikes</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ride / Service Title
              </label>
              <input
                type="text"
                placeholder="e.g. City Express Sedan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Origin / Pickup *
              </label>
              <IndiaPlaceInput
                value={origin}
                onChangeText={(txt) => {
                  setOrigin(txt);
                  setOriginAddress('');
                  setOriginCoords(undefined);
                }}
                onSelectPlace={(p) => {
                  setOrigin(p.name);
                  setOriginAddress(p.formattedAddress);
                  setOriginCoords({ lat: p.lat, lng: p.lng });
                }}
                biasMode="nashik"
                placeholder="e.g. Panchavati, Nashik"
                inputClassName="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Destination / Drop *
              </label>
              <IndiaPlaceInput
                value={destination}
                onChangeText={(txt) => {
                  setDestination(txt);
                  setDestAddress('');
                  setDestCoords(undefined);
                }}
                onSelectPlace={(p) => {
                  setDestination(p.name);
                  setDestAddress(p.formattedAddress);
                  setDestCoords({ lat: p.lat, lng: p.lng });
                }}
                biasMode="nashik"
                placeholder="e.g. Nashik Road Station"
                inputClassName="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fare (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Departure / Time
              </label>
              <input
                type="text"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Seats
              </label>
              <input
                type="number"
                min="1"
                value={availableSeats}
                onChange={(e) => setAvailableSeats(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vehicle Model
              </label>
              <input
                type="text"
                placeholder="e.g. Honda City / Swift Dzire"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vehicle / Service No.
              </label>
              <input
                type="text"
                placeholder="e.g. DL-01-AB-1234"
                value={serviceNumber}
                onChange={(e) => setServiceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Driver / Captain Name
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Driver Phone
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold rounded-lg flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Dispatching Ride...' : 'Confirm Special Ride'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
