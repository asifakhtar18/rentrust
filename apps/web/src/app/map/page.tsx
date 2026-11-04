import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Section } from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/button';
import { PropertyMap } from '@/components/map/property-map';

export default function MapPage() {
  return (
    <Section className="py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Explore by place</p>
          <h1 className="mt-2 t-page-title text-foreground">Homes on the map</h1>
          <p className="mt-2 max-w-2xl t-body text-muted-foreground">
            See listed homes around a neighbourhood, move around the map, or use your location to
            start nearby. The blue location dot stays on your device; property searches send only
            the map area currently in view.
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/search" variant="secondary" size="sm">
            Search listings
          </LinkButton>
          <LinkButton href="/properties/suggest" size="sm">
            <MapPin className="size-4" aria-hidden />
            Suggest a property
          </LinkButton>
        </div>
      </div>
      <PropertyMap />
      <p className="mt-3 t-helper">
        Only the map area in view is loaded, and property pins are fetched for that area. Map
        provider attribution appears on the map.{' '}
        <Link href="/legal/privacy" className="text-primary underline">
          Privacy details
        </Link>
        .
      </p>
    </Section>
  );
}
