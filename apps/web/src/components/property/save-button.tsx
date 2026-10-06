'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

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
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      await request(`/properties/${propertyId}/save`, { method: next ? 'POST' : 'DELETE' });
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" size="md" loading={busy} onClick={toggle}>
      {saved ? <BookmarkCheck className="size-4 text-primary" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}
