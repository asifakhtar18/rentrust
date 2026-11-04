'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { parseGoogleMapsUrl } from '@/lib/google-maps';
import { apiFetch } from '@/lib/api';

export interface ResolvedGoogleMap {
  latitude: number;
  longitude: number;
  placeName?: string;
  localityName?: string | null;
  city?: { id: string; name: string; stateName: string; countryName: string } | null;
  resolvedCityName?: string | null;
  stateName?: string | null;
  countryName?: string | null;
}

export function GoogleMapsLinkField({ value, onChange, onParsed }: { value: string; onChange: (value: string) => void; onParsed: (details: ResolvedGoogleMap) => void }) {
  const [message, setMessage] = useState('');
  const [resolving, setResolving] = useState(false);
  const requestId = useRef(0);
  const onParsedRef = useRef(onParsed);

  useEffect(() => { onParsedRef.current = onParsed; }, [onParsed]);

  useEffect(() => {
    const current = value.trim();
    if (!current) {
      setMessage('');
      setResolving(false);
      return;
    }

    const parsed = parseGoogleMapsUrl(current);
    if (parsed) onParsedRef.current(parsed);
    let active = true;
    const id = ++requestId.current;
    const timeout = window.setTimeout(() => {
      setResolving(true);
      setMessage('Checking the place and city from the map link…');
      void apiFetch<ResolvedGoogleMap>('/locations/maps/resolve', {
        method: 'POST',
        body: JSON.stringify({ googleMapsUrl: current }),
      }).then(({ data }) => {
        if (!active || requestId.current !== id) return;
        onParsedRef.current(data);
        const place = [data.localityName ?? data.placeName, data.city?.name ?? data.resolvedCityName, data.city?.stateName ?? data.stateName].filter(Boolean).join(', ');
        setMessage(place ? `Location matched: ${place}` : 'Coordinates found. Choose the matching city from the list.');
      }).catch((cause: unknown) => {
        if (!active || requestId.current !== id) return;
        setMessage(parsed
          ? 'Coordinates found. City lookup is unavailable; confirm the city below.'
          : cause instanceof Error ? cause.message : 'Could not resolve this map link. Choose a city manually.');
      }).finally(() => {
        if (active && requestId.current === id) setResolving(false);
      });
    }, 700);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [value]);

  function changeValue(nextValue: string) {
    onChange(nextValue);
  }
  return <div>
    <label className="mb-1.5 block text-sm font-medium text-foreground">Google Maps link <span className="font-normal text-muted-foreground">(optional)</span></label>
    <div className="relative min-w-0"><MapPinned className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><input value={value} onChange={(event) => changeValue(event.target.value)} type="url" inputMode="url" placeholder="Paste a Google Maps place link" className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground" /></div>
    <p className="mt-1.5 text-xs text-muted-foreground">We resolve the place and city from the link on the server. Google short links are supported where they redirect to a public Maps place.</p>
    {resolving && <p role="status" className="mt-1 text-xs text-muted-foreground">Resolving map link…</p>}
    {message && <p role="status" className="mt-1 text-xs text-primary">{message}</p>}
  </div>;
}
