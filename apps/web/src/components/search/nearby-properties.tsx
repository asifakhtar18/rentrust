'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LocateFixed, MapPin, Navigation, Building2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, Eyebrow, Section } from '@/components/ui/primitives';

interface NearbyProperty { id: string; displayName: string; slug: string; localityName?: string | null; distanceMeters: number }

function distanceLabel(metres: number) {
  return metres < 1000 ? `${Math.max(50, Math.round(metres / 50) * 50)} m away` : `${(metres / 1000).toFixed(1)} km away`;
}

export function NearbyProperties() {
  const [items, setItems] = useState<NearbyProperty[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Your location is used for this search only.');

  function findNearby() {
    if (!navigator.geolocation) { setMessage('Location is not available in this browser. You can still search by area.'); return; }
    setBusy(true);
    setMessage('Finding homes near you…');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const params = new URLSearchParams({ latitude: String(coords.latitude), longitude: String(coords.longitude), radiusMeters: '10000', limit: '6' });
        const result = await apiFetch<NearbyProperty[]>(`/properties/nearby?${params}`);
        setItems(result.data);
        setMessage(result.data.length ? 'Sorted from your current location.' : 'No catalogued properties within 10 km yet. Help us add some!');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not find nearby homes.'); }
      finally { setBusy(false); }
    }, (error) => {
      setBusy(false);
      setMessage(error.code === error.PERMISSION_DENIED ? 'Location permission was declined. Search by locality instead.' : 'We could not read your location. Try searching by locality.');
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  return <Section className="border-y border-border py-10 sm:py-12">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><Eyebrow>Right around the corner</Eyebrow><h2 className="mt-3 t-page-title">Find homes near you</h2><p className="mt-2 t-meta">Share your location once to see nearby catalogue entries.</p></div>
      <Button variant="secondary" onClick={findNearby} disabled={busy}><LocateFixed className="size-4" aria-hidden />{busy ? 'Locating…' : 'Use my location'}</Button>
    </div>
    {items.length > 0 ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <Link key={item.id} href={`/properties/${item.id}`}><Card interactive className="flex min-h-24 items-center gap-3 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Building2 className="size-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block truncate t-label text-foreground">{item.displayName}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" aria-hidden />{item.localityName || 'Locality not listed'} · {distanceLabel(item.distanceMeters)}</span></span><Navigation className="size-4 text-accent" aria-hidden /></Card></Link>)}</div> : <p role="status" className="mt-4 t-meta text-muted-foreground">{message}</p>}
  </Section>;
}
