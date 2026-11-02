import { Suspense } from 'react';
import { VerificationForm } from './verification-form';

export const metadata = { title: 'Verify your residency' };

export default function NewVerificationPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-2xl px-6 py-12 t-meta">Loading…</p>}>
      <VerificationForm />
    </Suspense>
  );
}
