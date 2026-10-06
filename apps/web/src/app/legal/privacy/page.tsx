import type { Metadata } from 'next';
import { LegalPage } from '../legal-page';

export const metadata: Metadata = {
  title: 'Privacy · RentTrust',
  description: 'What data RentTrust collects, how it is used, and how reviewer anonymity is protected.',
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy" updated="October 2026">
      <p>
        Privacy is central to how RentTrust works — residents can only be honest if they can be anonymous. This page
        explains what we collect, how we use it, and the specific protections around reviewer identity. It is a
        plain-language summary, not legal advice.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your email, a password (stored only as a secure hash), and an optional display name.</li>
        <li><strong>Content you submit:</strong> reviews, saved properties, claims, and any verification documents you upload.</li>
        <li><strong>Usage data:</strong> basic technical information needed to run and secure the service.</li>
      </ul>

      <h2>Reviewer anonymity</h2>
      <p>
        Your reviews are <strong>anonymous in public</strong>. We display only a non-identifying alias and your tenure
        band — never your name, email, or unit. Your identity as a reviewer is not exposed to property owners or other
        residents. Only our trust &amp; safety team can associate a review with an account, and only for moderation
        and abuse-prevention purposes.
      </p>

      <h2>Verification documents</h2>
      <p>
        Documents you upload to verify residency are stored privately. They are never shown publicly, and access is
        limited to authorised staff via short-lived, audit-logged links. Images are processed to strip embedded
        metadata before storage.
      </p>

      <h2>How we use your data</h2>
      <ul>
        <li>To operate the platform — authentication, reviews, trust scores, and locality intelligence.</li>
        <li>To moderate content and keep the community safe.</li>
        <li>To communicate essential account and verification updates.</li>
      </ul>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t sell your personal data.</li>
        <li>We don&apos;t let owners pay to see who wrote a review.</li>
        <li>We don&apos;t publish your verification evidence.</li>
      </ul>

      <h2>Your choices</h2>
      <p>
        You can update your profile, sign out of sessions, and request help with your data from our support team.
        Reviews may be retained in anonymised form even after account changes, so the community record stays intact.
      </p>

      <h2>Contact</h2>
      <p>For privacy questions, contact our support team.</p>
    </LegalPage>
  );
}
