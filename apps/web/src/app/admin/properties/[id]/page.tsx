'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Check, ExternalLink, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { PropertyDetail, PropertyType } from '@/lib/types';
import { Button, LinkButton } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { GoogleMapsLinkField } from '@/components/locations/google-maps-link-field';
import { PropertyImages } from '@/components/property/property-images';
import type { Locality } from '@/lib/types';
import { AdminHeader, Panel } from '../../admin-ui';

const TYPES: { value: PropertyType; label: string }[] = [
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'PG', label: 'Paying guest (PG)' },
  { value: 'CO_LIVING', label: 'Co-living' },
  { value: 'HOSTEL', label: 'Hostel' },
  { value: 'INDEPENDENT_HOUSE', label: 'Independent house' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'BUILDER_PROPERTY', label: 'Builder property' },
];
const STATUSES = ['ACTIVE', 'HIDDEN', 'ARCHIVED'] as const;
type EditableStatus = (typeof STATUSES)[number];
interface City { id: string; name: string; state: { name: string }; country: { name: string } }

function cityLabel(city: City) { return `${city.name} · ${city.state.name}, ${city.country.name}`; }

export default function EditPropertyPage({ params }: { params: { id: string } }) {
  const { request } = useAuth();
  const router = useRouter();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('APARTMENT');
  const [status, setStatus] = useState<EditableStatus>('ACTIVE');
  const [aliases, setAliases] = useState('');
  const [developer, setDeveloper] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [amenities, setAmenities] = useState('');
  const [description, setDescription] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [cityId, setCityId] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [localityId, setLocalityId] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, cityResult, localityResult] = await Promise.all([
        apiFetch<PropertyDetail>(`/properties/${encodeURIComponent(params.id)}`),
        apiFetch<City[]>('/cities'),
        apiFetch<Locality[]>('/localities'),
      ]);
      const item = result.data;
      setCities(cityResult.data);
      setLocalities(localityResult.data);
      setProperty(item);
      setName(item.displayName);
      setType(item.propertyType);
      setStatus(
        (STATUSES as readonly string[]).includes(item.status)
          ? (item.status as EditableStatus)
          : 'ACTIVE',
      );
      setAliases(item.aliases.join('\n'));
      setDeveloper(item.developer ?? '');
      setYearBuilt(item.yearBuilt === null ? '' : String(item.yearBuilt));
      setAmenities(item.amenities.join('\n'));
      setDescription(item.description ?? '');
      setMapsUrl(item.googleMapsUrl ?? '');
      const savedCityId = item.address?.cityId ?? item.locality?.cityId ?? '';
      setCityId(savedCityId);
      const savedCity = cityResult.data.find((city) => city.id === savedCityId);
      setCityQuery(savedCity ? cityLabel(savedCity) : '');
      setLocalityId(item.localityId ?? '');
      setAddressLine1(item.address?.line1 ?? '');
      setAddressLine2(item.address?.line2 ?? '');
      setPostalCode(item.address?.postalCode ?? '');
      setLatitude(item.latitude);
      setLongitude(item.longitude);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load this property.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  function readList(value: string) {
    return [
      ...new Set(
        value
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }

  const cityLocalities = useMemo(() => localities.filter((item) => item.cityId === cityId), [cityId, localities]);

  function chooseCity(value: string) {
    setCityQuery(value);
    const match = cities.find((city) => cityLabel(city).toLocaleLowerCase() === value.trim().toLocaleLowerCase());
    setCityId(match?.id ?? '');
    setLocalityId('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!property) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await request(`/properties/${encodeURIComponent(property.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: name.trim(),
          propertyType: type,
          status,
          aliases: readList(aliases),
          developer: developer.trim() || null,
          yearBuilt: yearBuilt ? Number(yearBuilt) : null,
          amenities: readList(amenities),
          description: description.trim() || null,
          latitude,
          longitude,
          ...(cityId ? { cityId } : {}),
          ...(property.address || property.localityId || localityId ? { localityId: localityId || null } : {}),
          ...(property.address || cityId ? {
            addressLine1: addressLine1.trim() || null,
            addressLine2: addressLine2.trim() || null,
            postalCode: postalCode.trim() || null,
          } : {}),
          googleMapsUrl: mapsUrl.trim() || null,
        }),
      });
      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save property changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-14 text-center t-meta">Loading property details…</div>;

  return (
    <div>
      <AdminHeader
        title={property ? 'Edit property' : 'Property not available'}
        description={
          property
            ? 'Keep names, location details, and resident-facing information accurate.'
            : undefined
        }
        actions={
          property ? (
            <LinkButton href={`/properties/${property.id}`} variant="secondary" size="sm">
              <ExternalLink className="size-4" aria-hidden />
              View listing
            </LinkButton>
          ) : undefined
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 t-meta text-destructive"
        >
          <span>{error}</span>
          {!property && (
            <button onClick={() => void load()} className="underline">
              Try again
            </button>
          )}
        </div>
      )}
      {!property ? (
        <Panel className="max-w-2xl p-6">
          <p className="t-body text-muted-foreground">
            This property may have been removed or you may not have access to it.
          </p>
          <Link
            href="/admin/properties"
            className="mt-4 inline-flex min-h-10 items-center gap-2 t-label text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to properties
          </Link>
        </Panel>
      ) : (
        <Panel className="max-w-3xl p-5 md:p-7">
          <form onSubmit={(event) => void submit(event)} className="space-y-7">
            <section aria-labelledby="identity-title" className="space-y-4">
              <h2 id="identity-title" className="t-label text-foreground">
                Property details
              </h2>
              <Field label="Property name" htmlFor="edit-property-name">
                <Input
                  id="edit-property-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  maxLength={200}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Property type" htmlFor="edit-property-type">
                  <select
                    id="edit-property-type"
                    value={type}
                    onChange={(event) => setType(event.target.value as PropertyType)}
                    className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground"
                  >
                    {TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Listing status"
                  htmlFor="edit-property-status"
                  hint="Hidden and archived listings stay out of public search."
                >
                  <select
                    id="edit-property-status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as EditableStatus)}
                    className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground"
                  >
                    {STATUSES.map((option) => (
                      <option key={option} value={option}>
                        {option[0] + option.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field
                label="Alternative names"
                htmlFor="edit-property-aliases"
                hint="One per line. Helps residents find the property using other names."
              >
                <textarea
                  id="edit-property-aliases"
                  value={aliases}
                  onChange={(event) => setAliases(event.target.value)}
                  rows={3}
                  maxLength={3000}
                  className="w-full rounded-md border border-input bg-card px-3.5 py-3 t-body text-foreground"
                />
              </Field>
            </section>

            <section
              aria-labelledby="location-title"
              className="space-y-4 border-t border-border pt-6"
            >
              <h2 id="location-title" className="t-label text-foreground">
                Address and map location
              </h2>
              <GoogleMapsLinkField
                value={mapsUrl}
                onChange={setMapsUrl}
                onParsed={(details) => {
                  setLatitude(details.latitude);
                  setLongitude(details.longitude);
                  if (details.city) {
                    const matched = cities.find((city) => city.id === details.city?.id);
                    if (matched) { setCityId(matched.id); setCityQuery(cityLabel(matched)); }
                    const locality = localities.find((item) => item.cityId === details.city?.id && item.name.toLocaleLowerCase() === details.localityName?.toLocaleLowerCase());
                    setLocalityId(locality?.id ?? '');
                  }
                }}
              />
              <Field label="City or town" htmlFor="edit-property-city">
                <Input id="edit-property-city" list="edit-property-city-options" value={cityQuery} onChange={(event) => chooseCity(event.target.value)} autoComplete="address-level2" />
                <datalist id="edit-property-city-options">{cities.map((city) => <option key={city.id} value={cityLabel(city)} />)}</datalist>
              </Field>
              <Field label="Neighbourhood" htmlFor="edit-property-locality">
                <select id="edit-property-locality" value={localityId} onChange={(event) => setLocalityId(event.target.value)} disabled={!cityId} className="h-11 w-full rounded-md border border-input bg-card px-3.5 t-body text-foreground disabled:opacity-60">
                  <option value="">No neighbourhood selected</option>{cityLocalities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Address line 1" htmlFor="edit-property-address1"><Input id="edit-property-address1" value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} maxLength={240} /></Field>
                <Field label="Address line 2" htmlFor="edit-property-address2"><Input id="edit-property-address2" value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} maxLength={240} /></Field>
                <Field label="Postal code" htmlFor="edit-property-postal"><Input id="edit-property-postal" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} maxLength={16} /></Field>
              </div>
              {latitude !== null && longitude !== null ? (
                <p className="inline-flex items-center gap-1.5 t-helper">
                  <MapPin className="size-3.5" aria-hidden />
                  Current pin: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </p>
              ) : (
                <p className="t-helper">
                  No map pin saved. Paste a Google Maps link to add or correct coordinates.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Latitude" htmlFor="edit-property-lat">
                  <Input
                    id="edit-property-lat"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={latitude ?? ''}
                    onChange={(event) =>
                      setLatitude(event.target.value === '' ? null : Number(event.target.value))
                    }
                  />
                </Field>
                <Field label="Longitude" htmlFor="edit-property-lng">
                  <Input
                    id="edit-property-lng"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={longitude ?? ''}
                    onChange={(event) =>
                      setLongitude(event.target.value === '' ? null : Number(event.target.value))
                    }
                  />
                </Field>
              </div>
            </section>

            <section aria-labelledby="more-title" className="space-y-4 border-t border-border pt-6">
              <h2 id="more-title" className="t-label text-foreground">
                More information
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Developer or builder" htmlFor="edit-property-developer">
                  <Input
                    id="edit-property-developer"
                    value={developer}
                    onChange={(event) => setDeveloper(event.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Year built" htmlFor="edit-property-year">
                  <Input
                    id="edit-property-year"
                    type="number"
                    min={1800}
                    max={2100}
                    value={yearBuilt}
                    onChange={(event) => setYearBuilt(event.target.value)}
                  />
                </Field>
              </div>
              <Field
                label="Amenities"
                htmlFor="edit-property-amenities"
                hint="One amenity per line."
              >
                <textarea
                  id="edit-property-amenities"
                  value={amenities}
                  onChange={(event) => setAmenities(event.target.value)}
                  rows={3}
                  maxLength={3000}
                  className="w-full rounded-md border border-input bg-card px-3.5 py-3 t-body text-foreground"
                />
              </Field>
              <Field
                label="Description"
                htmlFor="edit-property-description"
                hint="Shown on the public property page."
              >
                <textarea
                  id="edit-property-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  maxLength={5000}
                  className="w-full rounded-md border border-input bg-card px-3.5 py-3 t-body text-foreground"
                />
              </Field>
            </section>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <Button type="submit" loading={saving} disabled={!name.trim()}>
                <Check className="size-4" aria-hidden />
                Save changes
              </Button>
              <LinkButton href="/admin/properties" variant="secondary">
                Back to catalogue
              </LinkButton>
              {saved && (
                <p role="status" className="t-meta text-success">
                  <Building2 className="mr-1 inline size-4" aria-hidden />
                  Changes saved.
                </p>
              )}
            </div>
          </form>
        </Panel>
      )}
      {property && <div className="mt-6 max-w-3xl"><PropertyImages propertyId={property.id} propertyName={property.displayName} images={property.images ?? []} /></div>}
    </div>
  );
}
