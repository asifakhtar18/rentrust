'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from './ui';

/**
 * Save/unsave toggle for a property. Requires auth; anonymous visitors are
 * routed to sign in with a return path. Optimistic with rollback on failure.
 */
export function SaveButton({ propertyId }: { propertyId: string }) {
  const { user, request } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user) {
      router.push(`/login?next=/properties/${propertyId}`);
      return;
    }
    const nextSaved = !saved;
    setSaved(nextSaved);
    setBusy(true);
    try {
      await request(`/properties/${propertyId}/save`, { method: nextSaved ? 'POST' : 'DELETE' });
    } catch {
      setSaved(!nextSaved); // rollback
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={saved ? 'primary' : 'secondary'} size="md" loading={busy} onClick={toggle}>
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}
