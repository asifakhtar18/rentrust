'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, MapPin, Sparkles, UsersRound } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { GoogleMapsLinkField } from '@/components/locations/google-maps-link-field';
import { UseCurrentLocation, type Coordinates } from '@/components/locations/use-current-location';
import { CityDataAttribution } from '@/components/locations/city-data-attribution';
import { Button } from '@/components/ui/button';
import { Field, Input, Section } from '@/components/ui/primitives';
import { distanceKm } from '@/lib/geo';

interface City {
  id: string;
  name: string;
  state?: { name: string };
  country?: { name: string };
  latitude?: number | null;
  longitude?: number | null;
}
interface Stats {
  cities: number;
  localities: number;
  pendingSuggestions: number;
  approvedSuggestions: number;
}

function cityLabel(city: City) {
  return `${city.name}${city.state ? ` · ${city.state.name}` : ''}${city.country ? `, ${city.country.name}` : ''}`;
}

function defaultCity(cities: City[]) {
  const commonStartingPoints = [
    'Bengaluru',
    'Hyderabad',
    'Mumbai',
    'Delhi',
    'Chennai',
    'Pune',
    'Ahmedabad',
    'Kolkata',
  ];
  return (
    commonStartingPoints
      .map((name) =>
        cities.find((city) => city.name.toLocaleLowerCase() === name.toLocaleLowerCase()),
      )
      .find(Boolean) ?? cities[0]
  );
}

export default function SuggestLocalityPage() {
  const { user, loading, request } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cityId, setCityId] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reloadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setError('');
    const [cityResult, statsResult] = await Promise.allSettled([
      apiFetch<City[]>('/cities'),
      apiFetch<Stats>('/locality-suggestions/stats'),
    ]);

    if (cityResult.status === 'fulfilled') {
      setCities(cityResult.value.data);
      const first = defaultCity(cityResult.value.data);
      setCityId((current) => current || first?.id || '');
      setCityQuery((current) => current || (first ? cityLabel(first) : ''));
    } else {
      setError(
        'We could not connect to the location catalogue. Check that the API is running, then try again.',
      );
    }

    if (statsResult.status === 'fulfilled') setStats(statsResult.value.data);
    setLoadingCatalog(false);
  }, []);

  useEffect(() => {
    void reloadCatalog();
  }, [catalogAttempt, reloadCatalog]);

  function setCoordinatesFromLocation(coordinates: Coordinates) {
    setLatitude(coordinates.latitude);
    setLongitude(coordinates.longitude);
    const nearest = cities
      .map((city) => ({ city, distance: distanceKm(coordinates, city) }))
      .filter((candidate) => candidate.distance !== null)
      .sort((a, b) => a.distance! - b.distance!)[0];
    if (!nearest || nearest.distance! > 100)
      return 'Map pin added. Choose the city or town from the list.';
    setCityId(nearest.city.id);
    setCityQuery(cityLabel(nearest.city));
    return `${cityLabel(nearest.city)} selected. Your pin will only be sent with this suggestion.`;
  }

  function chooseCity(value: string) {
    setCityQuery(value);
    const exact = cities.find(
      (city) => cityLabel(city).toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
    );
    setCityId(exact?.id ?? '');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/locality-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          cityId,
          name: name.trim(),
          description: description.trim() || undefined,
          googleMapsUrl: mapsUrl.trim() || undefined,
          latitude,
          longitude,
        }),
      });
      setNotice(
        'Thanks! Your neighbourhood is in the review queue. We’ll add it to the catalogue after a moderator checks for duplicates.',
      );
      setName('');
      setDescription('');
      setMapsUrl('');
      setLatitude(undefined);
      setLongitude(undefined);
      apiFetch<Stats>('/locality-suggestions/stats')
        .then((result) => setStats(result.data))
        .catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your suggestion.');
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <Section className="py-16">
        <p role="status" className="t-meta">
          Checking your account…
        </p>
      </Section>
    );
  if (!user)
    return (
      <Section className="max-w-3xl py-14">
        <Link
          href="/login?next=%2Flocations%2Fsuggest"
          className="inline-flex items-center gap-2 t-meta text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Sign in to suggest a locality
        </Link>
        <h1 className="mt-6 t-page-title">Help map your neighbourhood</h1>
        <p className="mt-3 max-w-xl t-body text-muted-foreground">
          Residents know the names that never make it onto official lists. Sign in to add one for
          the community to review.
        </p>
      </Section>
    );

  return (
    <Section className="max-w-4xl py-10 sm:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-2 t-meta text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back home
      </Link>
      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-center gap-2 eyebrow">
            <Sparkles className="size-4" aria-hidden />
            Local knowledge, shared
          </div>
          <h1 className="mt-4 t-page-title">Add a neighbourhood</h1>
          <p className="mt-3 max-w-xl t-body text-muted-foreground">
            Know a layout, colony, or area we missed? Send it in. A moderator checks each suggestion
            so the directory stays tidy.
          </p>
          {error && (
            <div
              role="alert"
              className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md bg-destructive/10 px-4 py-3 t-meta text-destructive"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setCatalogAttempt((attempt) => attempt + 1)}
                className="min-h-10 rounded-md border border-current px-3 font-semibold"
              >
                Try again
              </button>
            </div>
          )}
          {notice && (
            <p
              role="status"
              className="mt-5 rounded-md bg-success/10 px-4 py-3 t-meta text-success"
            >
              {notice}
            </p>
          )}
          <form
            onSubmit={(event) => void submit(event)}
            className="mt-6 space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <section aria-labelledby="locality-place-step" className="space-y-3">
              <h2 id="locality-place-step" className="t-label text-foreground">
                1. Place it on the map
              </h2>
              <GoogleMapsLinkField
                value={mapsUrl}
                onChange={setMapsUrl}
                onParsed={(coords) => {
                  setLatitude(coords.latitude);
                  setLongitude(coords.longitude);
                  if (coords.city) {
                    const city = cities.find((item) => item.id === coords.city?.id);
                    if (city) {
                      setCityId(city.id);
                      setCityQuery(cityLabel(city));
                    }
                  } else setCoordinatesFromLocation(coords);
                  const resolvedName = coords.localityName ?? coords.placeName;
                  if (resolvedName) setName((current) => (current.trim() ? current : resolvedName));
                }}
              />
              <Field
                label="City or town"
                htmlFor="suggest-city"
                hint="Type a few letters to find it. State and country help distinguish similar names."
              >
                <Input
                  id="suggest-city"
                  list="rentrust-city-options"
                  value={cityQuery}
                  onChange={(event) => chooseCity(event.target.value)}
                  disabled={loadingCatalog || cities.length === 0}
                  required
                  placeholder={loadingCatalog ? 'Loading places…' : 'Start typing a city'}
                  autoComplete="address-level2"
                />
                <datalist id="rentrust-city-options">
                  {cities.map((city) => (
                    <option key={city.id} value={cityLabel(city)} />
                  ))}
                </datalist>
              </Field>
              <CityDataAttribution />
              <UseCurrentLocation onLocation={setCoordinatesFromLocation} />
            </section>
            <section
              aria-labelledby="locality-details-step"
              className="space-y-3 border-t border-border pt-5"
            >
              <h2 id="locality-details-step" className="t-label text-foreground">
                2. Name the neighbourhood
              </h2>
              <Field
                label="Neighbourhood name"
                htmlFor="suggest-name"
                hint="Use the name residents commonly say and search for."
              >
                <Input
                  id="suggest-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={120}
                  required
                  placeholder="e.g. BTM 2nd Stage"
                />
              </Field>
              <Field
                label="A landmark or spelling hint"
                htmlFor="suggest-description"
                hint="Optional"
              >
                <textarea
                  id="suggest-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Near the lake, also called…"
                  className="w-full rounded-md border border-input bg-card px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </Field>
            </section>
            {latitude !== undefined && longitude !== undefined && (
              <p className="t-helper">
                Map pin: {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            )}
            <Button type="submit" loading={busy} disabled={!cityId || !name.trim()}>
              <MapPin className="size-4" aria-hidden />
              Send for review
            </Button>
          </form>
        </div>
        <aside className="h-fit rounded-xl border border-border bg-muted/50 p-5">
          <div className="flex items-center gap-2">
            <UsersRound className="size-4 text-primary" aria-hidden />
            <h2 className="t-label text-foreground">The directory grows with you</h2>
          </div>
          <p className="mt-2 t-meta">
            Community suggestions are checked before they appear, which keeps duplicate names and
            incorrect pins out.
          </p>
          {stats && (
            <dl className="mt-5 grid grid-cols-2 gap-3">
              {[
                ['Cities', stats.cities],
                ['Localities', stats.localities],
                ['In review', stats.pendingSuggestions],
                ['Added by neighbours', stats.approvedSuggestions],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border bg-card p-3">
                  <dd className="font-serif text-2xl text-foreground">{value}</dd>
                  <dt className="mt-1 text-[11px] text-muted-foreground">{label}</dt>
                </div>
              ))}
            </dl>
          )}
        </aside>
      </div>
    </Section>
  );
}
