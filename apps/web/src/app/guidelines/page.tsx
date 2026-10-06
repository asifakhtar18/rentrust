import type { Metadata } from 'next';
import { LegalPage } from '../legal/legal-page';

export const metadata: Metadata = {
  title: 'Review guidelines · RentTrust',
  description:
    'How to write a helpful review, how to report one, and how moderation and appeals work on RentTrust.',
};

export default function GuidelinesPage() {
  return (
    <LegalPage eyebrow="Community" title="Review guidelines" updated="October 2026">
      <p>
        RentTrust is only as useful as the honesty of its reviews. These guidelines keep reviews fair, factual, and
        safe for everyone — residents sharing experiences and property owners reading them.
      </p>

      <h2 id="writing">Writing a good review</h2>
      <p>Base your review on your own, first-hand experience living at the property. Helpful reviews are:</p>
      <ul>
        <li><strong>Specific.</strong> Describe what actually happened — a slow repair, a deposit dispute, reliable water supply.</li>
        <li><strong>Factual.</strong> Stick to what you experienced rather than rumour or second-hand accounts.</li>
        <li><strong>Balanced.</strong> Mention what worked as well as what didn&apos;t, where relevant.</li>
        <li><strong>Current.</strong> Note roughly when you lived there; management and conditions change over time.</li>
      </ul>

      <h2 id="privacy">Protecting privacy</h2>
      <p>
        Your review is <strong>anonymous in public</strong> — it shows only a non-identifying alias and your tenure
        band, never your name, email, or unit number. In return, please protect others&apos; privacy too:
      </p>
      <ul>
        <li>Don&apos;t name individual staff, neighbours, or other residents.</li>
        <li>Don&apos;t include phone numbers, unit numbers, or other personal details.</li>
        <li>Don&apos;t post photos of documents or people.</li>
      </ul>

      <h2 id="not-allowed">What isn&apos;t allowed</h2>
      <ul>
        <li>Harassment, threats, hate speech, or discriminatory content.</li>
        <li>Reviews you were paid or incentivised to write, or reviews of your own property.</li>
        <li>False statements presented as fact.</li>
        <li>Spam, advertising, or off-topic content.</li>
      </ul>

      <h2 id="verification">Verification</h2>
      <p>
        You can optionally verify your residency by submitting private documents (for example a rental agreement).
        Verified reviews carry a <strong>&ldquo;Verified Resident&rdquo;</strong> badge. Your documents are never made
        public and are visible only to our trust &amp; safety team.
      </p>

      <h2 id="report">Reporting a review</h2>
      <p>
        If a review breaks these guidelines, report it from the review itself. Tell us why — for example that it
        contains personal information, looks fake, or is abusive. Reports go to our moderation team, who review each
        case individually.
      </p>
      <p>
        Importantly, a <strong>negative review is not a reason to remove it</strong>. Honest criticism stays up.
        We act on reviews that break the rules, not on reviews an owner simply dislikes.
      </p>

      <h2 id="moderation">How moderation works</h2>
      <p>
        Every submitted review goes to moderation before it&apos;s published. Moderators can publish, hide, or reject a
        review based on these guidelines, and each decision is recorded. Owners can add a public, clearly-labelled
        response to a review, but they can never edit, delete, hide, or de-anonymise it.
      </p>

      <h2 id="appeals">Appeals</h2>
      <p>
        If your review was hidden or rejected and you believe that was a mistake, you can appeal the decision from
        your profile. Explain why you think the review follows these guidelines. A moderator will re-examine it and
        either restore it or confirm the original decision with a reason.
      </p>
    </LegalPage>
  );
}
