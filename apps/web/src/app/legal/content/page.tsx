import type { Metadata } from 'next';
import { LegalPage } from '../legal-page';

export const metadata: Metadata = {
  title: 'Content policy · RentTrust',
  description: 'The rules for content on RentTrust and how we enforce them.',
};

export default function ContentPolicyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Content policy" updated="October 2026">
      <p>
        This policy sets out what is and isn&apos;t allowed on RentTrust and how we enforce it. It works alongside the{' '}
        <a href="/guidelines">review guidelines</a> and applies to reviews, responses, and any other content.
      </p>

      <h2>Our principles</h2>
      <ul>
        <li><strong>Honesty over flattery.</strong> Genuine criticism is welcome; manipulation is not.</li>
        <li><strong>Privacy by default.</strong> Reviewers are anonymous and others&apos; privacy is protected.</li>
        <li><strong>Fair to owners.</strong> Owners can respond, but can&apos;t silence honest feedback.</li>
      </ul>

      <h2>Prohibited content</h2>
      <ul>
        <li>Personal information about any individual (names, contact details, unit numbers).</li>
        <li>Harassment, threats, hate speech, or discrimination.</li>
        <li>False statements of fact or fabricated experiences.</li>
        <li>Paid, incentivised, or self-interested reviews.</li>
        <li>Spam, advertising, or content unrelated to the rental experience.</li>
        <li>Anything unlawful or that infringes others&apos; rights.</li>
      </ul>

      <h2>How we enforce it</h2>
      <p>
        Every review passes through moderation before publication. Content can be reported by anyone, and reports are
        reviewed individually. Depending on the issue, a moderator may publish, hide, reject, or remove content, and
        each decision is logged.
      </p>
      <p>
        A <strong>negative review is never removed just for being negative</strong>. We act only when content breaks
        this policy.
      </p>

      <h2>Owner responses</h2>
      <p>
        Verified owners and managers may add a public, clearly-labelled response to a review on a property they&apos;ve
        claimed. Responses must follow this same policy. Owners can never edit, delete, hide, or de-anonymise a review.
      </p>

      <h2>Appeals</h2>
      <p>
        If your content was actioned and you believe it follows this policy, you can appeal from your profile. A
        moderator will re-examine the case and either restore the content or confirm the decision with a reason. See
        the <a href="/guidelines">review guidelines</a> for the full appeals flow.
      </p>
    </LegalPage>
  );
}
