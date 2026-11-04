'use client';

import { useState } from 'react';
import { LocateFixed, LoaderCircle } from 'lucide-react';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function UseCurrentLocation({
  onLocation,
}: {
  onLocation: (coordinates: Coordinates) => string | void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function locate() {
    if (!navigator.geolocation) {
      setMessage('Location is not supported by this browser. You can paste a Maps link instead.');
      return;
    }

    setBusy(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const feedback = onLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setMessage(feedback ?? 'Nearby city selected. Your exact pin will only be sent with this suggestion.');
        setBusy(false);
      },
      (error) => {
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was not granted. You can choose a city or paste a Maps link.'
            : 'We could not read your location. You can choose a city or paste a Maps link.',
        );
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={locate}
        disabled={busy}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />}
        {busy ? 'Finding nearby city…' : 'Use my location'}
      </button>
      {message && <p role="status" className="mt-1.5 text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
