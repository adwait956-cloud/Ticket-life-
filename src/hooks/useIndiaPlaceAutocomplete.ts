import { useEffect, useRef, useState, useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { checkAndTriggerMapsQuotaError } from '../services/mapsConfig';

export interface SelectedIndiaPlace {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  shortCode: string;
  viewport?: google.maps.LatLngBounds | null;
}

export function derivePlaceShortCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].slice(0, 2) + words[1].slice(0, 2)).toUpperCase();
  }
  return clean.replace(/\s+/g, '').slice(0, 4).toUpperCase() || 'IND';
}

export function useIndiaPlaceAutocomplete(
  inputString: string,
  biasCenter?: { lat: number; lng: number; radius?: number }
) {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
  }, []);

  useEffect(() => {
    const trimmed = inputString.trim();
    if (!placesLib || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }

        setIsLoading(true);
        const request: google.maps.places.AutocompleteRequest = {
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['in'],
          language: 'en',
          region: 'IN',
        };

        if (biasCenter) {
          request.locationBias = {
            center: { lat: biasCenter.lat, lng: biasCenter.lng },
            radius: biasCenter.radius ?? 35000,
          };
        }

        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (!cancelled) {
          setSuggestions(res?.suggestions || []);
        }
      } catch (err) {
        checkAndTriggerMapsQuotaError(err);
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placesLib, inputString, biasCenter?.lat, biasCenter?.lng, biasCenter?.radius]);

  const selectSuggestion = useCallback(
    async (
      suggestion: google.maps.places.AutocompleteSuggestion
    ): Promise<SelectedIndiaPlace | null> => {
      if (!placesLib || !suggestion.placePrediction) return null;
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'viewport'],
        });
        resetSession();

        const loc = place.location;
        if (!loc) return null;

        const displayName =
          place.displayName ||
          suggestion.placePrediction.mainText?.text ||
          suggestion.placePrediction.text?.text ||
          'Selected Place';
        const formattedAddress =
          place.formattedAddress || suggestion.placePrediction.text?.text || displayName;

        return {
          placeId: place.id || '',
          name: displayName,
          formattedAddress,
          lat: loc.lat(),
          lng: loc.lng(),
          shortCode: derivePlaceShortCode(displayName),
          viewport: place.viewport || null,
        };
      } catch (err) {
        checkAndTriggerMapsQuotaError(err);
        return null;
      }
    },
    [placesLib, resetSession]
  );

  return {
    suggestions,
    isLoading,
    selectSuggestion,
    resetSession,
    placesReady: Boolean(placesLib),
  };
}
