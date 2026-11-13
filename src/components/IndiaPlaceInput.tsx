import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2, Navigation, X } from 'lucide-react';
import {
  SelectedIndiaPlace,
  useIndiaPlaceAutocomplete,
} from '../hooks/useIndiaPlaceAutocomplete';
import { NASHIK_CENTER, useIsMapsLoadedProvider } from '../services/mapsConfig';

export type { SelectedIndiaPlace };

interface IndiaPlaceInputProps {
  value: string;
  onChangeText: (val: string) => void;
  onSelectPlace: (place: SelectedIndiaPlace) => void;
  placeholder?: string;
  biasMode?: 'nashik' | 'india';
  inputClassName?: string;
  iconColorClassName?: string;
}

interface PlacesAutocompleteLayerProps {
  query: string;
  biasCenter?: { lat: number; lng: number; radius?: number };
  isOpen: boolean;
  userTyped: boolean;
  onSelectPlace: (place: SelectedIndiaPlace) => void;
  onClose: () => void;
  onLoadingChange: (loading: boolean) => void;
}

const PlacesAutocompleteLayer: React.FC<PlacesAutocompleteLayerProps> = ({
  query,
  biasCenter,
  isOpen,
  userTyped,
  onSelectPlace,
  onClose,
  onLoadingChange,
}) => {
  const { suggestions, isLoading, selectSuggestion, placesReady } =
    useIndiaPlaceAutocomplete(userTyped ? query : '', biasCenter);

  useEffect(() => {
    onLoadingChange(isLoading);
  }, [isLoading, onLoadingChange]);

  const handlePick = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    const picked = await selectSuggestion(suggestion);
    onClose();
    if (picked) {
      onSelectPlace(picked);
    }
  };

  if (!isOpen || (suggestions.length === 0 && !(userTyped && query.trim().length >= 2 && placesReady))) {
    return null;
  }

  return (
    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span>Google Maps Places · India &amp; Nashik</span>
        <Navigation className="w-3 h-3 text-emerald-500" />
      </div>

      {suggestions.length === 0 && !isLoading ? (
        <div className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
          Type a Nashik locality, landmark, or any Indian city (e.g. Panchavati, College Road, Pune Station)...
        </div>
      ) : (
        suggestions.map((s, idx) => {
          const mainText = s.placePrediction?.mainText?.text || s.placePrediction?.text?.text || '';
          const secondaryText = s.placePrediction?.secondaryText?.text || '';
          const key = s.placePrediction?.placeId || `sug-${idx}`;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handlePick(s)}
              className="w-full text-left px-3 py-2.5 text-xs hover:bg-sky-50 dark:hover:bg-slate-800 flex items-start gap-2.5 border-b border-slate-100/70 dark:border-slate-800/60 last:border-b-0 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-white truncate">{mainText}</div>
                {secondaryText && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {secondaryText}
                  </div>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};

export const IndiaPlaceInput: React.FC<IndiaPlaceInputProps> = ({
  value,
  onChangeText,
  onSelectPlace,
  placeholder = 'Search any place in Nashik or India...',
  biasMode = 'nashik',
  inputClassName,
  iconColorClassName = 'text-slate-400',
}) => {
  const isMapsAvailable = useIsMapsLoadedProvider();
  const [isOpen, setIsOpen] = useState(false);
  const [userTyped, setUserTyped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const biasCenter =
    biasMode === 'nashik'
      ? { lat: NASHIK_CENTER.lat, lng: NASHIK_CENTER.lng, radius: 45000 }
      : undefined;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${iconColorClassName}`} />
        <input
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setUserTyped(true);
            setIsOpen(true);
            onChangeText(e.target.value);
          }}
          placeholder={placeholder}
          className={
            inputClassName ||
            'w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500'
          }
        />
        {isLoading ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-sky-500" />
        ) : (
          value && (
            <button
              type="button"
              onClick={() => {
                setUserTyped(false);
                onChangeText('');
                setIsOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )
        )}
      </div>

      {isMapsAvailable && (
        <PlacesAutocompleteLayer
          query={value}
          biasCenter={biasCenter}
          isOpen={isOpen}
          userTyped={userTyped}
          onSelectPlace={onSelectPlace}
          onClose={() => {
            setUserTyped(false);
            setIsOpen(false);
          }}
          onLoadingChange={setIsLoading}
        />
      )}
    </div>
  );
};
