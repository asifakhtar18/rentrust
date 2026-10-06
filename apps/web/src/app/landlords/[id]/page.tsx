import { Card } from '@/components/ui';

export const metadata = { title: 'Landlord' };

/**
 * Landlord profile. The public API currently exposes landlords through search
 * and property relations rather than a dedicated detail endpoint, so this page
 * presents the available context and routes research back through properties.
 * A dedicated landlord-detail endpoint is a natural next backend addition.
 */
export default function LandlordPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Card className="p-8 text-center">
        <h1 className="text-title2 font-semibold tracking-tight text-ink">Landlord profiles</h1>
        <p className="mx-auto mt-2 max-w-md text-body text-ink-secondary">
          Landlord-level reputation pages are coming next. For now, find a landlord&apos;s
          properties through search and review each property&apos;s trust score and resident
          experiences.
        </p>
      </Card>
    </div>
  );
}
