'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Locality, PropertyType } from '@/lib/types';
import { GoogleMapsLinkField } from '@/components/locations/google-maps-link-field';
import { UseCurrentLocation, type Coordinates } from '@/components/locations/use-current-location';
import { CityDataAttribution } from '@/components/locations/city-data-attribution';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { distanceKm } from '@/lib/geo';
import { AdminHeader, Panel } from '../../admin-ui';

interface City {
  id: string;
  name: string;
  state: { name: string };
  country: { name: string };
  latitude: number | null;
  longitude: number | null;
}

const TYPES: { value: PropertyType; label: string }[] = [
  { value: 'APARTMENT', label: 'Apartment' }, { value: 'PG', label: 'Paying guest (PG)' }, { value: 'CO_LIVING', label: 'Co-living' },
  { value: 'HOSTEL', label: 'Hostel' }, { value: 'INDEPENDENT_HOUSE', label: 'Independent house' }, { value: 'VILLA', label: 'Villa' }, { value: 'BUILDER_PROPERTY', label: 'Builder property' },
];

function labelCity(city: City) {
  return `${city.name} · ${city.state.name}, ${city.country.name}`;
}

export default function NewPropertyPage() {
  const { request } = useAuth();
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [cityQuery, setCityQuery] = useState('');
  const [cityId, setCityId] = useState('');
  const [localityId, setLocalityId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('APARTMENT');
  const [mapsUrl, setMapsUrl] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [developer, setDeveloper] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiFetch<City[]>('/cities'), apiFetch<Locality[]>('/localities')])
      .then(([cityResult, localityResult]) => {
        setCities(cityResult.data);
        setLocalities(localityResult.data);
      })
      .catch(() => setError('We could not load the location catalogue. Check that the API is running and retry.'))
      .finally(() => setLoadingLocations(false));
  }, []);

  const cityLocalities = useMemo(
    () => localities.filter((locality) => locality.cityId === cityId),
    [cityId, localities],
  );

  function applyCoordinates(coordinates: Coordinates) {
    setLatitude(coordinates.latitude);
    setLongitude(coordinates.longitude);
    const nearest = cities
      .map((city) => ({ city, distance: distanceKm(coordinates, city) }))
      .filter((candidate) => candidate.distance !== null)
      .sort((a, b) => a.distance! - b.distance!)[0];

    if (!nearest || nearest.distance! > 100) return 'Map pin added. Choose the city or town from the list.';
    setCityId(nearest.city.id);
    setCityQuery(labelCity(nearest.city));
    const nearestLocality = localities
      .filter((locality) => locality.cityId === nearest.city.id)
      .map((locality) => ({ locality, distance: distanceKm(coordinates, locality) }))
      .filter((candidate) => candidate.distance !== null)
      .sort((a, b) => a.distance! - b.distance!)[0];
    if (nearestLocality && nearestLocality.distance! <= 15) setLocalityId(nearestLocality.locality.id);
    else setLocalityId('');
    return `${labelCity(nearest.city)} selected from the map pin.`;
  }

  function chooseCity(value: string) {
    setCityQuery(value);
    const exact = cities.find((city) => labelCity(city).toLocaleLowerCase() === value.trim().toLocaleLowerCase());
    setCityId(exact?.id ?? '');
    setLocalityId('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const property = await request<{ id: string }>('/properties', {
        method: 'POST',
        body: JSON.stringify({
          displayName: name.trim(), propertyType: type, localityId: localityId || undefined,
          address: { cityId, ...(localityId ? { localityId } : {}) },
          latitude, longitude, developer: developer.trim() || undefined,
          googleMapsUrl: mapsUrl.trim() || undefined,
        }),
      });
      router.push(`/properties/${property.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create property.'); }
    finally { setBusy(false); }
  }

  return <div><AdminHeader title="Add a property" description="Start with the name and place. A Maps link or your location can fill the pin and choose a nearby city for you." />
    {error && <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-4 py-3 t-meta text-destructive">{error}</p>}
    <Panel className="max-w-2xl p-5 md:p-6"><form onSubmit={(event) => void submit(event)} className="space-y-6">
      <section aria-labelledby="property-place-step" className="space-y-3">
        <h2 id="property-place-step" className="t-label text-foreground">1. Place it</h2>
        <GoogleMapsLinkField value={mapsUrl} onChange={setMapsUrl} onParsed={(details) => {
          setLatitude(details.latitude); setLongitude(details.longitude);
          if (details.city) {
            const city = cities.find((item) => item.id === details.city?.id);
            if (city) {
              setCityId(city.id); setCityQuery(labelCity(city));
              const locality = localities.find((item) => item.cityId === city.id && item.name.toLocaleLowerCase() === details.localityName?.toLocaleLowerCase());
              setLocalityId(locality?.id ?? '');
            }
          } else applyCoordinates(details);
          const resolvedName = details.localityName ?? details.placeName;
          if (resolvedName) setName((current) => current.trim() ? current : resolvedName);
        }} />
        <Field label="City or town" htmlFor="property-city" hint="Type to search. State and country keep similarly named places distinct."><Input id="property-city" list="property-city-options" value={cityQuery} onChange={(event) => chooseCity(event.target.value)} required disabled={loadingLocations || cities.length === 0} placeholder={loadingLocations ? 'Loading places…' : 'Start typing a city'} autoComplete="address-level2" /><datalist id="property-city-options">{cities.map((city) => <option key={city.id} value={labelCity(city)} />)}</datalist></Field>
        <CityDataAttribution />
        <UseCurrentLocation onLocation={applyCoordinates} />
        <Field label="Neighbourhood" htmlFor="property-locality" hint="Optional"><select id="property-locality" value={localityId} onChange={(event) => setLocalityId(event.target.value)} disabled={!cityId || cityLocalities.length === 0} className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground disabled:cursor-not-allowed disabled:opacity-60"><option value="">{!cityId ? 'Choose a city first' : cityLocalities.length ? 'Choose a neighbourhood' : 'No neighbourhoods listed yet'}</option>{cityLocalities.map((locality) => <option key={locality.id} value={locality.id}>{locality.name}</option>)}</select></Field>
      </section>
      <section aria-labelledby="property-details-step" className="space-y-3 border-t border-border pt-5">
        <h2 id="property-details-step" className="t-label text-foreground">2. About the property</h2>
        <Field label="Property name" htmlFor="property-name"><Input id="property-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={200} placeholder="e.g. Lakeview Residency" autoComplete="organization" /></Field>
        <Field label="Property type" htmlFor="property-type"><select id="property-type" value={type} onChange={(event) => setType(event.target.value as PropertyType)} className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground">{TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Developer or builder" htmlFor="property-developer" hint="Optional"><Input id="property-developer" value={developer} onChange={(event) => setDeveloper(event.target.value)} maxLength={200} placeholder="e.g. ABC Homes" /></Field>
      </section>
      {latitude !== undefined && longitude !== undefined && <p className="inline-flex items-center gap-1.5 t-helper"><MapPin className="size-3.5" aria-hidden />Pin: {latitude.toFixed(5)}, {longitude.toFixed(5)}</p>}
      <Button type="submit" loading={busy} disabled={!cityId || !name.trim()}><Building2 className="size-4" aria-hidden />Create property</Button>
    </form></Panel>
  </div>;
}
