'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Building2, CheckCircle2, MapPin, Search, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import {
  GoogleMapsLinkField,
  type ResolvedGoogleMap,
} from '@/components/locations/google-maps-link-field';
import { Button } from '@/components/ui/button';
import { Field, Input, Section } from '@/components/ui/primitives';
import type { PropertyType } from '@/lib/types';

interface City {
  id: string;
  name: string;
  state: { name: string };
  country: { name: string };
}
interface Candidate {
  id: string;
  displayName: string;
  propertyType: PropertyType;
  localityName: string | null;
  confidence: number;
  distanceMeters: number | null;
}
type Kind = 'ADD_PROPERTY' | 'EDIT_PROPERTY' | 'ADD_PHOTO';
const TYPES: Array<[PropertyType, string]> = [
  ['APARTMENT', 'Apartment'],
  ['PG', 'Paying guest'],
  ['CO_LIVING', 'Co-living'],
  ['HOSTEL', 'Hostel'],
  ['INDEPENDENT_HOUSE', 'Independent house'],
  ['VILLA', 'Villa'],
  ['BUILDER_PROPERTY', 'Builder property'],
];

function cityLabel(city: City) {
  return `${city.name} · ${city.state.name}, ${city.country.name}`;
}

export default function SuggestPropertyPage() {
  const { user, loading, request } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [kind, setKind] = useState<Kind>('ADD_PROPERTY');
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('APARTMENT');
  const [cityId, setCityId] = useState('');
  const [localityId, setLocalityId] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [latitude, setLatitude] = useState<number>();
  const [longitude, setLongitude] = useState<number>();
  const [description, setDescription] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedCity = useMemo(() => cities.find((city) => city.id === cityId), [cities, cityId]);

  useEffect(() => {
    void apiFetch<City[]>('/cities')
      .then((result) => setCities(result.data))
      .catch(() =>
        setError('Could not load city options. You can still paste a map link and try again.'),
      );
  }, []);

  useEffect(() => {
    if (name.trim().length < 3) {
      setCandidates([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setChecking(true);
      const params = new URLSearchParams({ name: name.trim() });
      if (cityId) params.set('cityId', cityId);
      if (latitude !== undefined) params.set('latitude', String(latitude));
      if (longitude !== undefined) params.set('longitude', String(longitude));
      void apiFetch<Candidate[]>(`/properties/similar?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(({ data }) => setCandidates(data))
        .catch(() => {
          if (!controller.signal.aborted) setCandidates([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [cityId, kind, latitude, longitude, name]);

  function useResolvedMap(details: ResolvedGoogleMap) {
    setLatitude(details.latitude);
    setLongitude(details.longitude);
    const resolvedCity = cities.find(
      (city) =>
        city.name.toLowerCase() ===
          (details.city?.name ?? details.resolvedCityName)?.toLowerCase() &&
        (!details.city?.stateName ||
          city.state.name.toLowerCase() === details.city.stateName.toLowerCase()),
    );
    if (resolvedCity) setCityId(resolvedCity.id);
    if (details.placeName && !name.trim()) setName(details.placeName.replaceAll('+', ' '));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (kind !== 'ADD_PROPERTY' && !propertyId) {
      setError('Select the matching property from the suggestions before sending this request.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        kind,
        ...(kind !== 'ADD_PROPERTY' ? { propertyId } : {}),
        ...(name.trim() ? { displayName: name.trim() } : {}),
        ...(kind !== 'ADD_PHOTO'
          ? {
              propertyType,
              ...(cityId ? { cityId } : {}),
              ...(localityId ? { localityId } : {}),
              ...(latitude !== undefined ? { latitude } : {}),
              ...(longitude !== undefined ? { longitude } : {}),
              ...(mapsUrl.trim() ? { googleMapsUrl: mapsUrl.trim() } : {}),
              ...(description.trim() ? { description: description.trim() } : {}),
            }
          : {}),
        ...(photoUrl.trim() ? { imageUrl: photoUrl.trim() } : {}),
        ...(note.trim() ? { message: note.trim() } : {}),
      };
      await request('/properties/contributions', { method: 'POST', body: JSON.stringify(payload) });
      setNotice(
        'Thanks for helping keep RenTrust accurate. Your suggestion is now waiting for a moderator to review it.',
      );
      setName('');
      setDescription('');
      setMapsUrl('');
      setLatitude(undefined);
      setLongitude(undefined);
      setPropertyId('');
      setPhotoUrl('');
      setNote('');
      setCandidates([]);
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
          href="/login?next=%2Fproperties%2Fsuggest"
          className="inline-flex items-center gap-2 t-meta text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Sign in to suggest a property
        </Link>
        <h1 className="mt-6 t-page-title">Help someone find a better home</h1>
        <p className="mt-3 max-w-xl t-body text-muted-foreground">
          Add a place you know, improve a listing, or share a photo. A moderator checks each change
          before it appears.
        </p>
      </Section>
    );

  return (
    <Section className="max-w-3xl py-8 sm:py-12">
      <Link href="/map" className="inline-flex items-center gap-2 t-meta text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        Back to the map
      </Link>
      <div className="mt-5 flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <p className="eyebrow">Community powered</p>
          <h1 className="mt-1 t-page-title text-foreground">Add or improve a place</h1>
          <p className="mt-2 max-w-2xl t-body text-muted-foreground">
            Your local knowledge helps renters make more confident choices. We check every
            suggestion before publishing it.
          </p>
        </div>
      </div>
      <div
        className="mt-6 grid gap-2 sm:grid-cols-3"
        role="group"
        aria-label="What would you like to do?"
      >
        {(
          [
            ['ADD_PROPERTY', 'Add a property'],
            ['EDIT_PROPERTY', 'Fix a listing'],
            ['ADD_PHOTO', 'Suggest a photo'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setKind(value);
              setPropertyId('');
            }}
            aria-pressed={kind === value}
            className={`min-h-12 rounded-lg border px-4 text-left t-label transition ${kind === value ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-foreground hover:bg-muted/40'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <form
        onSubmit={submit}
        className="mt-5 space-y-5 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
      >
        {kind !== 'ADD_PROPERTY' && (
          <Field
            label="Property to update"
            htmlFor="property-choice"
            hint="Search the name below and select the matching listing."
          >
            <Input
              id="property-choice"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setPropertyId('');
              }}
              placeholder="Start typing the property name"
              autoComplete="off"
              required
            />
            {candidates.length > 0 && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      setPropertyId(candidate.id);
                      setName(candidate.displayName);
                    }}
                    className={`flex w-full items-center justify-between gap-3 border-b border-border px-3 py-3 text-left last:border-0 hover:bg-muted/50 ${propertyId === candidate.id ? 'bg-primary/5' : ''}`}
                  >
                    <span>
                      <strong className="block t-label text-foreground">
                        {candidate.displayName}
                      </strong>
                      <span className="t-helper text-muted-foreground">
                        {candidate.localityName ?? candidate.propertyType.replaceAll('_', ' ')}
                      </span>
                    </span>
                    <span className="t-helper text-primary">
                      {propertyId === candidate.id ? 'Selected' : `${candidate.confidence}% match`}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {checking && (
              <span className="mt-1 block t-helper text-muted-foreground">
                Checking for existing listings…
              </span>
            )}
            {propertyId && (
              <span className="mt-2 block t-helper text-success">
                Listing selected. Your request will be attached to this property.
              </span>
            )}
          </Field>
        )}
        {kind !== 'ADD_PHOTO' && (
          <>
            <Field
              label={kind === 'EDIT_PROPERTY' ? 'Correct name (optional)' : 'Property name'}
              htmlFor="suggest-name"
              hint="Use the name residents see on the building or signboard."
            >
              <Input
                id="suggest-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                required={kind === 'ADD_PROPERTY'}
                placeholder="e.g. MKS Residency"
              />
            </Field>
            {kind === 'ADD_PROPERTY' && (
              <Field label="Property type" htmlFor="suggest-type">
                <select
                  id="suggest-type"
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value as PropertyType)}
                  className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground"
                >
                  {TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <GoogleMapsLinkField value={mapsUrl} onChange={setMapsUrl} onParsed={useResolvedMap} />
            <Field
              label="City or town"
              htmlFor="suggest-property-city"
              hint={
                selectedCity
                  ? cityLabel(selectedCity)
                  : 'The city matched from your map link is selected automatically when available.'
              }
            >
              <select
                id="suggest-property-city"
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
                required={kind === 'ADD_PROPERTY'}
                className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground"
              >
                <option value="">Choose a city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {cityLabel(city)}
                  </option>
                ))}
              </select>
            </Field>
            {latitude !== undefined && longitude !== undefined && (
              <p className="inline-flex items-center gap-1.5 t-helper text-primary">
                <MapPin className="size-3.5" aria-hidden />
                Map pin saved · {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            )}
            <Field
              label="What should we know?"
              htmlFor="suggest-description"
              hint="Share an address, nearby landmark, or details about the correction."
            >
              <textarea
                id="suggest-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={5000}
                className="w-full rounded-md border border-input bg-card px-3.5 py-2.5 t-body text-foreground"
                placeholder="Optional details to help our moderators verify it"
              />
            </Field>
          </>
        )}
        {kind === 'ADD_PHOTO' && (
          <Field
            label="Photo link (optional)"
            htmlFor="photo-link"
            hint="Use a public link the moderator can open. Never share a private document link."
          >
            <Input
              id="photo-link"
              type="url"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="https://…"
            />
          </Field>
        )}
        <Field
          label={
            kind === 'EDIT_PROPERTY' || kind === 'ADD_PHOTO'
              ? 'Describe your request'
              : 'Extra note (optional)'
          }
          htmlFor="suggest-note"
        >
          <textarea
            id="suggest-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={5000}
            className="w-full rounded-md border border-input bg-card px-3.5 py-2.5 t-body text-foreground"
            placeholder={
              kind === 'EDIT_PROPERTY'
                ? 'What needs to be corrected?'
                : kind === 'ADD_PHOTO'
                  ? 'Why does this photo help renters?'
                  : 'Anything else to help verify this property?'
            }
            required={kind !== 'ADD_PROPERTY'}
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-md bg-destructive/5 px-3 py-2 t-meta text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-md bg-success/10 px-3 py-2 t-meta text-success"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            {notice}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="max-w-sm t-helper text-muted-foreground">
            Suggestions are reviewed before they appear. Thank you for contributing.
          </p>
          <Button type="submit" loading={busy}>
            <Building2 className="size-4" aria-hidden />
            Send for review
          </Button>
        </div>
      </form>
      <p className="mt-4 t-helper text-muted-foreground">
        <Search className="mr-1 inline size-3.5" aria-hidden />
        We check names and map coordinates for possible duplicates before asking the community to
        add a new record.
      </p>
    </Section>
  );
}
