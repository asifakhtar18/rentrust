'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { MapPin, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { GoogleMapsLinkField } from '@/components/locations/google-maps-link-field';
import { AdminHeader, Panel, TableEmpty, TableLoading, Td, Th } from '../admin-ui';

interface Country { id: string; name: string; iso2: string }
interface State { id: string; countryId: string; name: string; code: string | null }
interface City {
  id: string;
  stateId: string;
  countryId: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  state?: { name: string };
  country?: { name: string };
}
interface Locality {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

function coordinates(latitude: string, longitude: string) {
  return {
    ...(latitude.trim() ? { latitude: Number(latitude) } : {}),
    ...(longitude.trim() ? { longitude: Number(longitude) } : {}),
  };
}

export default function AdminLocationsPage() {
  const { request } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryId, setCountryId] = useState('');
  const [states, setStates] = useState<State[]>([]);
  const [allStates, setAllStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'city' | 'locality' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cityName, setCityName] = useState('');
  const [cityStateId, setCityStateId] = useState('');
  const [cityLatitude, setCityLatitude] = useState('');
  const [cityLongitude, setCityLongitude] = useState('');
  const [localityCityId, setLocalityCityId] = useState('');
  const [localityName, setLocalityName] = useState('');
  const [localityDescription, setLocalityDescription] = useState('');
  const [localityLatitude, setLocalityLatitude] = useState('');
  const [localityLongitude, setLocalityLongitude] = useState('');
  const [localityMapsUrl, setLocalityMapsUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [countryResult, cityResult, localityResult] = await Promise.all([
        apiFetch<Country[]>('/countries'),
        apiFetch<City[]>('/cities'),
        apiFetch<Locality[]>('/localities'),
      ]);
      setCountries(countryResult.data);
      setCities(cityResult.data);
      setLocalities(localityResult.data);

      const preferredCountry = countryResult.data.find((country) => country.iso2 === 'IN') ?? countryResult.data[0];
      if (preferredCountry) {
        setCountryId((current) => current || preferredCountry.id);
        const currentCountryId = countryId || preferredCountry.id;
        const stateResults = await Promise.all(countryResult.data.map((country) => apiFetch<State[]>(`/countries/${country.id}/states`)));
        const loadedStates = stateResults.flatMap((result) => result.data);
        setAllStates(loadedStates);
        const selectedStates = loadedStates.filter((state) => state.countryId === currentCountryId);
        setStates(selectedStates);
        setCityStateId((current) => current || selectedStates.find((state) => state.code === 'KA')?.id || selectedStates[0]?.id || '');
      } else {
        setStates([]);
        setAllStates([]);
      }
      setLocalityCityId((current) => current || cityResult.data[0]?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load location data.');
    } finally {
      setLoading(false);
    }
  }, [countryId]);

  useEffect(() => { void load(); }, [load]);

  const citiesById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities]);
  const statesById = useMemo(() => new Map(allStates.map((state) => [state.id, state])), [allStates]);

  async function changeCountry(nextCountryId: string) {
    setCountryId(nextCountryId);
    setCityStateId('');
    try {
      const result = await apiFetch<State[]>(`/countries/${nextCountryId}/states`);
      setStates(result.data);
      setAllStates((current) => [...current.filter((state) => state.countryId !== nextCountryId), ...result.data]);
      setCityStateId(result.data[0]?.id ?? '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load states.');
    }
  }

  async function createCity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('city');
    setError(null);
    setNotice(null);
    try {
      await request<City>('/cities', {
        method: 'POST',
        body: JSON.stringify({ stateId: cityStateId, name: cityName.trim(), ...coordinates(cityLatitude, cityLongitude) }),
      });
      setCityName('');
      setCityLatitude('');
      setCityLongitude('');
      setNotice('City added. You can now add localities to it.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not create city.');
    } finally {
      setSaving(null);
    }
  }

  async function createLocality(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('locality');
    setError(null);
    setNotice(null);
    try {
      await request<Locality>('/localities', {
        method: 'POST',
        body: JSON.stringify({
          cityId: localityCityId,
          name: localityName.trim(),
          description: localityDescription.trim() || undefined,
          ...coordinates(localityLatitude, localityLongitude),
        }),
      });
      setLocalityName('');
      setLocalityDescription('');
      setLocalityLatitude('');
      setLocalityLongitude('');
      setLocalityMapsUrl('');
      setNotice('Locality added.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not create locality.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <AdminHeader
        title="Locations"
        description="Set up the cities and neighbourhoods residents use to find and review rental properties."
        actions={<Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className="size-4" aria-hidden /> Refresh</Button>}
      />

      {error && <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-4 py-3 t-body text-destructive">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-md bg-success/10 px-4 py-3 t-body text-success">{notice}</p>}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel className="p-5 md:p-6">
          <div className="mb-5 flex items-center gap-2"><MapPin className="size-4 text-primary" aria-hidden /><h2 className="t-section-title text-foreground">Add a city</h2></div>
          <form onSubmit={(event) => void createCity(event)} className="space-y-4">
            <Field label="Country" htmlFor="location-country">
              <select id="location-country" value={countryId} onChange={(event) => void changeCountry(event.target.value)} required className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground">
                {countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
              </select>
            </Field>
            <Field label="State or union territory" htmlFor="location-state">
              <select id="location-state" value={cityStateId} onChange={(event) => setCityStateId(event.target.value)} required disabled={!states.length} className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground disabled:opacity-60">
                {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
              </select>
            </Field>
            <Field label="City name" htmlFor="city-name">
              <Input id="city-name" value={cityName} onChange={(event) => setCityName(event.target.value)} minLength={2} maxLength={120} required placeholder="e.g. Bengaluru" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Latitude (optional)" htmlFor="city-latitude"><Input id="city-latitude" type="number" min={-90} max={90} step="any" value={cityLatitude} onChange={(event) => setCityLatitude(event.target.value)} /></Field>
              <Field label="Longitude (optional)" htmlFor="city-longitude"><Input id="city-longitude" type="number" min={-180} max={180} step="any" value={cityLongitude} onChange={(event) => setCityLongitude(event.target.value)} /></Field>
            </div>
            <Button type="submit" disabled={!cityStateId} loading={saving === 'city'}><Plus className="size-4" aria-hidden /> Add city</Button>
          </form>
        </Panel>

        <Panel className="p-5 md:p-6">
          <div className="mb-5 flex items-center gap-2"><MapPin className="size-4 text-primary" aria-hidden /><h2 className="t-section-title text-foreground">Add a locality</h2></div>
          <form onSubmit={(event) => void createLocality(event)} className="space-y-4">
            <Field label="City" htmlFor="locality-city">
              <select id="locality-city" value={localityCityId} onChange={(event) => setLocalityCityId(event.target.value)} required disabled={!cities.length} className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground disabled:opacity-60">
                {cities.map((city) => <option key={city.id} value={city.id}>{city.name}{city.state ? ` · ${city.state.name}` : ''}</option>)}
              </select>
            </Field>
            <Field label="Locality name" htmlFor="locality-name"><Input id="locality-name" value={localityName} onChange={(event) => setLocalityName(event.target.value)} minLength={2} maxLength={120} required placeholder="e.g. Indiranagar" /></Field>
            <Field label="Description (optional)" htmlFor="locality-description"><Input id="locality-description" value={localityDescription} onChange={(event) => setLocalityDescription(event.target.value)} maxLength={2000} placeholder="Short orientation for residents" /></Field>
            <GoogleMapsLinkField value={localityMapsUrl} onChange={setLocalityMapsUrl} onParsed={(details) => { setLocalityLatitude(String(details.latitude)); setLocalityLongitude(String(details.longitude)); if (details.placeName && !localityName) setLocalityName(details.placeName); }} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Latitude (optional)" htmlFor="locality-latitude"><Input id="locality-latitude" type="number" min={-90} max={90} step="any" value={localityLatitude} onChange={(event) => setLocalityLatitude(event.target.value)} /></Field>
              <Field label="Longitude (optional)" htmlFor="locality-longitude"><Input id="locality-longitude" type="number" min={-180} max={180} step="any" value={localityLongitude} onChange={(event) => setLocalityLongitude(event.target.value)} /></Field>
            </div>
            <Button type="submit" disabled={!cities.length || !localityCityId} loading={saving === 'locality'}><Plus className="size-4" aria-hidden /> Add locality</Button>
          </form>
          {!cities.length && !loading && <p className="mt-3 t-helper">Add a city first to make localities available.</p>}
        </Panel>
      </div>

      <Panel className="mt-5">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div><h2 className="t-label text-foreground">Current locations</h2><p className="mt-0.5 t-helper">{cities.length} cities · {localities.length} localities</p></div>
        </div>
        {loading ? <TableLoading /> : localities.length === 0 ? <TableEmpty title="No localities yet" body="Add a city and start with its neighbourhoods above." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead><tr className="border-b border-border bg-muted/40"><Th>Locality</Th><Th>City</Th><Th>State / UT</Th><Th>Coordinates</Th></tr></thead>
              <tbody>{localities.map((locality) => {
                const city = citiesById.get(locality.cityId);
                const state = city ? statesById.get(city.stateId) : undefined;
                return <tr key={locality.id} className="border-b border-border last:border-0"><Td className="font-medium text-foreground">{locality.name}</Td><Td>{city?.name ?? '—'}</Td><Td>{state?.name ?? '—'}</Td><Td className="tabular text-muted-foreground">{locality.latitude != null && locality.longitude != null ? `${locality.latitude}, ${locality.longitude}` : '—'}</Td></tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
