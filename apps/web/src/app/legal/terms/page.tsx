import type { Metadata } from 'next';
import { LegalPage } from '../legal-page';

export const metadata: Metadata = {
  title: 'Terms of use · RentTrust',
  description: 'The terms that govern your use of RentTrust.',
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of use" updated="October 2026">
      <p>
        These terms govern your use of RentTrust. By creating an account or using the platform, you agree to them.
        This is a plain-language summary of how the service works and what we expect from each other; it is not legal
        advice.
      </p>

      <h2>What RentTrust is</h2>
      <p>
        RentTrust is a rental-property intelligence and resident-review platform. It helps you research properties,
        landlords, and localities before you rent. It is <strong>not</strong> a rental marketplace: we don&apos;t
        collect rent, process bookings, broker deals, or handle lease agreements or payments.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must provide accurate information and keep your login credentials secure.</li>
        <li>You&apos;re responsible for activity under your account.</li>
        <li>You must be legally able to enter into these terms.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You keep ownership of the reviews and content you submit. By posting, you grant RentTrust a licence to display
        and distribute that content on the platform in anonymised form. You&apos;re responsible for ensuring your
        content is truthful and follows our{' '}
        <a href="/guidelines">review guidelines</a> and <a href="/legal/content">content policy</a>.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to misuse the platform, including by:</p>
      <ul>
        <li>posting false, misleading, or paid reviews;</li>
        <li>attempting to identify anonymous reviewers;</li>
        <li>scraping, overloading, or interfering with the service;</li>
        <li>infringing others&apos; rights or breaking applicable law.</li>
      </ul>

      <h2>Reviews &amp; trust scores</h2>
      <p>
        Reviews reflect individual resident experiences, not verified platform facts. Trust scores are computed from
        resident reviews and are always shown with their sample size. They are provided for information only and are
        not a guarantee about any property.
      </p>

      <h2>Owners &amp; claims</h2>
      <p>
        Verified owners and managers can respond publicly to reviews on properties they have successfully claimed.
        They cannot edit, delete, suppress, or de-anonymise reviews, and cannot alter or purchase a trust score.
      </p>

      <h2>Availability &amp; changes</h2>
      <p>
        We may update, suspend, or discontinue features, and we may revise these terms. If we make material changes,
        we&apos;ll update the date above. Continued use after a change means you accept the revised terms.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms can be sent to our support team.</p>
    </LegalPage>
  );
}
